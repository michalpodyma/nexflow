/**
 * POST /api/twilio-webhook
 *
 * Twilio sends incoming WhatsApp / SMS messages here as
 * application/x-www-form-urlencoded POSTs.  We:
 *   1. Validate the Twilio HMAC-SHA1 signature (skipped in dev if env var unset)
 *   2. Load/update conversation state from Upstash Redis
 *   3. Reply with the next screening question as TwiML
 *   4. After the final answer: score, send result to candidate, notify recruiter
 */

import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

import {
  type ScreeningState,
  type ScreeningStep,
  type ScreeningAnswers,
  getNextStep,
  getQuestion,
  getResultMessage,
  scoreScreening,
  buildSummaryCard,
  screeningKey,
} from "@/lib/screening";

// ─── Config ───────────────────────────────────────────────────────────────────

const TWILIO_ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID   ?? "";
const TWILIO_AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN     ?? "";
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER ?? "";
const RECRUITER_WHATSAPP   = process.env.RECRUITER_WHATSAPP_NUMBER ?? "";
const RECRUITER_EMAIL      = process.env.RECRUITER_EMAIL       ?? "";
const RESEND_API_KEY       = process.env.RESEND_API_KEY        ?? "";
const RESEND_FROM          = process.env.RESEND_FROM_EMAIL     ?? "noreply@nexflow.work";
// Set TWILIO_SKIP_VALIDATION=true in local dev to bypass HMAC check
const SKIP_VALIDATION = process.env.TWILIO_SKIP_VALIDATION === "true";

const SCREENING_TTL_SECONDS = 24 * 60 * 60; // 24 h

// ─── Redis (Upstash or in-memory dev fallback) ────────────────────────────────

const memStore = new Map<string, { value: string; expiresAt: number }>();

const redis: {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  del: (key: string) => Promise<void>;
} = (() => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return {
      get: (k) => client.get<string>(k),
      set: (k, v, ttl) => client.set(k, v, { ex: ttl }).then(() => undefined),
      del: (k) => client.del(k).then(() => undefined),
    };
  }
  // Dev-only in-memory fallback
  console.warn("[screening] UPSTASH_REDIS_REST_URL not set — using in-memory store (dev only)");
  return {
    get: async (k) => {
      const entry = memStore.get(k);
      if (!entry || Date.now() > entry.expiresAt) return null;
      return entry.value;
    },
    set: async (k, v, ttl) => {
      memStore.set(k, { value: v, expiresAt: Date.now() + ttl * 1000 });
    },
    del: async (k) => { memStore.delete(k); },
  };
})();

// ─── Twilio signature validation ──────────────────────────────────────────────

function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  // Build sorted param string per Twilio spec
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  const expected = createHmac("sha1", authToken)
    .update(url + sortedParams)
    .digest("base64");
  return expected === signature;
}

// ─── Twilio outbound helper ────────────────────────────────────────────────────

async function twilioSend(to: string, body: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.warn("[screening] Twilio credentials not set — skipping outbound send");
    return;
  }
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
          ? TWILIO_WHATSAPP_FROM
          : `whatsapp:${TWILIO_WHATSAPP_FROM}`,
        To:   to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
        Body: body,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    console.error("[screening] Twilio send failed:", res.status, text);
  }
}

// ─── TwiML helper — respond to Twilio with empty ack (we use outbound API) ─────

function twimlEmpty(): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { status: 200, headers: { "Content-Type": "text/xml" } },
  );
}

// ─── Recruiter notification ───────────────────────────────────────────────────

async function notifyRecruiter(state: ScreeningState, result: "pass" | "fail"): Promise<void> {
  const summary = buildSummaryCard(state, result);

  // WhatsApp / SMS to recruiter
  if (RECRUITER_WHATSAPP && TWILIO_ACCOUNT_SID) {
    await twilioSend(RECRUITER_WHATSAPP, summary).catch((e) =>
      console.error("[screening] recruiter WhatsApp failed:", e),
    );
  }

  // Email to recruiter
  if (RECRUITER_EMAIL && RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [RECRUITER_EMAIL],
        subject: `[Nexflow] Screening ${result.toUpperCase()} — ${state.name} (${state.role})`,
        text: summary,
        html: `<pre style="font-family:monospace;font-size:14px">${summary}</pre>`,
      }),
    });
    if (!res.ok) {
      console.error("[screening] recruiter email failed:", await res.text());
    }
  }
}

// ─── Answer key → field mapping ───────────────────────────────────────────────

const STEP_ANSWER_KEY: Partial<Record<ScreeningStep, keyof ScreeningAnswers>> = {
  awaiting_availability: "availability",
  awaiting_medical:      "medical",
  awaiting_start_date:   "startDate",
  awaiting_udt:          "udt",
  awaiting_polish:       "polishLevel",
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  // 1. Parse URL-encoded body
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody)) as Record<string, string>;

  // 2. Validate Twilio signature
  if (!SKIP_VALIDATION && TWILIO_AUTH_TOKEN) {
    const signature = req.headers.get("x-twilio-signature") ?? "";
    const url = `${req.nextUrl.protocol}//${req.nextUrl.host}${req.nextUrl.pathname}`;
    if (!validateTwilioSignature(TWILIO_AUTH_TOKEN, signature, url, params)) {
      console.warn("[screening] Invalid Twilio signature — rejecting request");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const incomingBody = (params.Body ?? "").trim();
  const fromRaw      = params.From ?? "";                   // e.g. "whatsapp:+48123456789"
  const from         = fromRaw.replace(/^whatsapp:/, "");   // normalise to E.164

  if (!from) return twimlEmpty();

  // 3. Load state from Redis
  const key         = screeningKey(from);
  const storedJson  = await redis.get(key);
  const state: ScreeningState | null = storedJson ? JSON.parse(storedJson) : null;

  if (!state) {
    // No active screening session for this number — ignore (session is started by intake trigger)
    console.info("[screening] No active session for", from);
    return twimlEmpty();
  }

  if (state.step === "done") {
    // Conversation already complete — ignore further messages
    return twimlEmpty();
  }

  // 4. Record this answer
  const answerKey = STEP_ANSWER_KEY[state.step];
  if (answerKey) {
    state.answers[answerKey] = incomingBody;
  }

  // 5. Advance state
  const nextStep = getNextStep(state.step, state.role);
  state.step = nextStep;

  if (nextStep === "done") {
    // 6. Score and finalize
    const result = scoreScreening(state);
    await redis.del(key); // clean up session

    // Send result to candidate (async, don't block the response)
    const candidateMsg = getResultMessage(result, state.locale, state.name);
    twilioSend(from, candidateMsg).catch((e) =>
      console.error("[screening] candidate result message failed:", e),
    );

    // Notify recruiter (async)
    notifyRecruiter(state, result).catch((e) =>
      console.error("[screening] recruiter notification failed:", e),
    );
  } else {
    // 7. Save updated state and ask next question
    await redis.set(key, JSON.stringify(state), SCREENING_TTL_SECONDS);

    const nextQuestion = getQuestion(nextStep, state.locale);
    await twilioSend(from, nextQuestion);
  }

  // Always return empty TwiML ack — we send messages via outbound API
  return twimlEmpty();
}
