/**
 * POST /api/webhooks/instantly
 *
 * Receives Instantly.ai webhook events:
 *
 * - reply_received: For positive replies ("Interested", "Meeting Booked",
 *   "Meeting Requested"), this handler:
 *   1. Finds or creates a HubSpot contact for the replying lead.
 *   2. Finds or creates a HubSpot deal and advances its stage to
 *      HUBSPOT_STAGE_MEETING_REQUESTED (env var).
 *   3. Pushes a notification record into Upstash Redis for the recruiter dashboard.
 *
 * - email_sent: Validates the outbound email body for chain-of-thought artifact
 *   leakage (numbered tokens, bare Yes./No., mixed language). On detection:
 *   1. Alerts Paperclip issue EUR-1517 with lead, violations, and snippet.
 *   2. Disables the lead in Instantly (lt_interest_status: -1) to halt follow-ups.
 *
 * NOTE on email_sent webhook subscription: As of 2026-06-01, the Instantly
 * dashboard (Settings → Webhooks) should have a subscription for event_type
 * "email_sent" pointing to https://nexflow.work/api/webhooks/instantly. If this
 * subscription does not yet exist, it must be created manually via the Instantly
 * dashboard — the API does not expose webhook management endpoints. Check whether
 * the subscription is active before deploying; without it this validator is a no-op.
 *
 * Optionally verifies the Instantly-Signature header when
 * INSTANTLY_WEBHOOK_SECRET is set.
 */

import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import {
  isGermanCompanyDomain,
  looksNonGermanForGermanLead,
} from "@/lib/german-companies";

// ── env ──────────────────────────────────────────────────────────────────────

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const HUBSPOT_PIPELINE_ID = process.env.HUBSPOT_PIPELINE_ID ?? "default";
// Stage to advance the deal to when a positive reply is received.
// Default: "appointmentscheduled" (HubSpot built-in "Appointment Scheduled").
// Override with your pipeline's custom "Meeting Requested" stage ID.
const HUBSPOT_STAGE_MEETING_REQUESTED =
  process.env.HUBSPOT_STAGE_MEETING_REQUESTED ?? "appointmentscheduled";

const INSTANTLY_WEBHOOK_SECRET = process.env.INSTANTLY_WEBHOOK_SECRET ?? "";
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY ?? "";

const PAPERCLIP_API_URL =
  process.env.PAPERCLIP_API_URL ?? "https://app.paperclip.ing";
const PAPERCLIP_BOT_API_KEY =
  process.env.PAPERCLIP_BOT_API_KEY ?? process.env.PAPERCLIP_API_KEY ?? "";

// Paperclip issue UUID for EUR-1517 — artifact alert destination
const PAPERCLIP_ALERT_ISSUE_ID = "3b9cbffa-3cf7-4405-b98e-dbf65262555d";

const MAX_NOTIFICATIONS = 100;

// ── Redis client ─────────────────────────────────────────────────────────────

const redis = (() => {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
})();

// ── Types ─────────────────────────────────────────────────────────────────────

interface InstantlyLead {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  website?: string;
}

interface InstantlyReply {
  timestamp?: string;
  subject?: string;
  body?: string;
  from_address?: string;
  to_address?: string;
}

interface InstantlyWebhookPayload {
  event_type: string;
  timestamp?: string;
  campaign_id?: string;
  campaign_name?: string;
  lead?: InstantlyLead;
  reply_category?: string;
  reply?: InstantlyReply;
  // email_sent fields
  lead_email?: string;
  email_account?: string;
  step?: number;
  variant?: number;
  is_first?: boolean;
  email_id?: string;
  email_subject?: string;
  email_text?: string;
  email_html?: string;
}

export interface ReplyNotification {
  id: string;
  type: "instantly_reply";
  createdAt: string;
  read: boolean;
  leadEmail: string;
  leadName: string;
  companyName: string;
  campaignName: string;
  replyCategory: string;
  replySnippet: string;
  hubspotDealId: string | null;
}

// ── Artifact detection ────────────────────────────────────────────────────────

interface ArtifactViolation {
  type: "numbered_token" | "bare_yes_no" | "mixed_language" | "german_company_non_german";
  description: string;
}

/**
 * Detect language mismatch for German-owned company leads.
 * Called separately from detectArtifacts because it needs the lead email context.
 */
function detectGermanMismatch(text: string, leadEmail: string): ArtifactViolation | null {
  if (!isGermanCompanyDomain(leadEmail)) return null;
  if (!looksNonGermanForGermanLead(text)) return null;
  return {
    type: "german_company_non_german",
    description: `Lead at German-owned company domain (${leadEmail.split("@")[1] ?? ""}) received non-German email`,
  };
}

function detectArtifacts(text: string): ArtifactViolation[] {
  const violations: ArtifactViolation[] = [];
  if (/\(\d+\)/.test(text)) {
    violations.push({
      type: "numbered_token",
      description: "Contains numbered parenthesized tokens like (1), (2)",
    });
  }
  if (/^\s*(Yes|No)\s*\.\s*$/m.test(text)) {
    violations.push({
      type: "bare_yes_no",
      description: "Contains bare Yes./No. chain-of-thought confirmations",
    });
  }
  const hasPolish = /[ąęóśźżćńłĄĘÓŚŹŻĆŃŁ]/.test(text);
  const hasEnglishSalutation =
    /\b(Dear|Hi |Hello |Best regards|Kind regards|Sincerely|Thank you for)\b/i.test(
      text,
    );
  if (hasPolish && hasEnglishSalutation) {
    violations.push({
      type: "mixed_language",
      description: "Mixed Polish characters with English salutations/closings",
    });
  }
  return violations;
}

// ── Paperclip alert ───────────────────────────────────────────────────────────

async function alertPaperclip({
  leadEmail,
  payload,
  violations,
  snippet,
}: {
  leadEmail: string;
  payload: InstantlyWebhookPayload;
  violations: ArtifactViolation[];
  snippet: string;
}): Promise<void> {
  if (!PAPERCLIP_BOT_API_KEY) return;

  const violationList = violations
    .map((v) => `- **${v.type}**: ${v.description}`)
    .join("\n");
  const body = [
    `🚨 **AI artifact detected in outbound email** (EUR-1520)`,
    ``,
    `**Lead:** ${leadEmail}`,
    `**Campaign:** ${payload.campaign_name ?? "unknown"}`,
    `**Timestamp:** ${payload.timestamp ?? new Date().toISOString()}`,
    ``,
    `**Violations:**`,
    violationList,
    ``,
    `**Email snippet (first 300 chars):**`,
    `\`\`\``,
    snippet,
    `\`\`\``,
  ].join("\n");

  await fetch(
    `${PAPERCLIP_API_URL}/api/issues/${PAPERCLIP_ALERT_ISSUE_ID}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}`,
      },
      body: JSON.stringify({ body }),
    },
  );
}

// ── Instantly lead management ─────────────────────────────────────────────────

async function disableInstantlyLead(email: string): Promise<void> {
  if (!INSTANTLY_API_KEY) return;

  // Step 1: look up the lead UUID
  const listRes = await fetch("https://api.instantly.ai/api/v2/leads/list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INSTANTLY_API_KEY}`,
    },
    body: JSON.stringify({ contacts: [email], limit: 1 }),
  });

  if (!listRes.ok) {
    throw new Error(
      `Instantly leads/list ${listRes.status}: ${await listRes.text()}`,
    );
  }

  const listData = (await listRes.json()) as {
    data?: Array<{ id: string }>;
    items?: Array<{ id: string }>;
  };
  const leads = listData.data ?? listData.items ?? [];
  if (leads.length === 0) return; // lead not found — nothing to disable

  const leadId = leads[0].id;

  // Step 2: mark as Not Interested to halt follow-up sequences
  const patchRes = await fetch(
    `https://api.instantly.ai/api/v2/leads/${leadId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INSTANTLY_API_KEY}`,
      },
      body: JSON.stringify({ lt_interest_status: -1 }),
    },
  );

  if (!patchRes.ok) {
    throw new Error(
      `Instantly leads PATCH ${patchRes.status}: ${await patchRes.text()}`,
    );
  }
}

// ── email_sent handler ────────────────────────────────────────────────────────

async function handleEmailSent(
  payload: InstantlyWebhookPayload,
): Promise<void> {
  const body = payload.email_text ?? payload.email_html ?? "";
  const leadEmail = payload.lead_email ?? "";
  const violations = detectArtifacts(body);

  // Check German company language mismatch independently of artifact leakage
  const germanMismatch = detectGermanMismatch(body, leadEmail);
  if (germanMismatch) violations.push(germanMismatch);

  if (violations.length === 0) return;

  const leadEmail = payload.lead_email ?? "unknown";
  const snippet = body.length > 300 ? body.slice(0, 300) + "..." : body;

  console.error("[instantly-validator] ARTIFACT DETECTED", {
    leadEmail,
    campaignName: payload.campaign_name,
    violations: violations.map((v) => v.type),
  });

  const [alertResult, disableResult] = await Promise.allSettled([
    alertPaperclip({ leadEmail, payload, violations, snippet }),
    disableInstantlyLead(leadEmail),
  ]);
  if (alertResult.status === "rejected") {
    console.error(
      "[instantly-validator] Failed to alert Paperclip:",
      alertResult.reason,
    );
  }
  if (disableResult.status === "rejected") {
    console.error(
      "[instantly-validator] Failed to disable lead:",
      disableResult.reason,
    );
  }
}

// ── HubSpot helpers ───────────────────────────────────────────────────────────

async function hs(
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return {};
  return res.json() as Promise<Record<string, unknown>>;
}

/** Find a HubSpot contact by email. Returns contact id or null. */
async function findContact(email: string): Promise<string | null> {
  try {
    const result = await hs("/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: email },
            ],
          },
        ],
        properties: ["firstname", "lastname"],
        limit: 1,
      }),
    });
    const results = result.results as Array<{ id: string }> | undefined;
    return results?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** Create a HubSpot contact and return its id. */
async function createContact(lead: InstantlyLead): Promise<string | null> {
  try {
    const result = await hs("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          email: lead.email,
          firstname: lead.firstName ?? "",
          lastname: lead.lastName ?? "",
          company: lead.companyName ?? "",
          website: lead.website ?? "",
        },
      }),
    });
    return (result.id as string) ?? null;
  } catch {
    return null;
  }
}

/** Find an existing open deal for the given contact. Returns deal id or null. */
async function findDealForContact(contactId: string): Promise<string | null> {
  try {
    const result = await hs(
      `/crm/v4/objects/contacts/${contactId}/associations/deals`,
    );
    const results = result.results as Array<{ toObjectId: string }> | undefined;
    return results?.[0]?.toObjectId ?? null;
  } catch {
    return null;
  }
}

/** Create a HubSpot deal associated to a contact and return its id. */
async function createDeal(
  contactId: string,
  lead: InstantlyLead,
  campaignName: string,
): Promise<string | null> {
  try {
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
    const result = await hs("/crm/v3/objects/deals", {
      method: "POST",
      body: JSON.stringify({
        properties: {
          dealname: `${name}${lead.companyName ? ` – ${lead.companyName}` : ""} (Instantly reply)`,
          pipeline: HUBSPOT_PIPELINE_ID,
          dealstage: HUBSPOT_STAGE_MEETING_REQUESTED,
          description: `Reply received via Instantly.ai campaign: ${campaignName}`,
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 3, // deal→contact
              },
            ],
          },
        ],
      }),
    });
    return (result.id as string) ?? null;
  } catch {
    return null;
  }
}

/** Advance an existing deal to the Meeting Requested stage. */
async function advanceDealStage(dealId: string): Promise<void> {
  await hs(`/crm/v3/objects/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: { dealstage: HUBSPOT_STAGE_MEETING_REQUESTED },
    }),
  });
}

// ── Webhook signature verification ───────────────────────────────────────────

async function verifySignature(
  req: NextRequest,
  rawBody: string,
): Promise<boolean> {
  if (!INSTANTLY_WEBHOOK_SECRET) return true; // not configured → skip
  const sig = req.headers.get("x-instantly-signature") ?? "";
  if (!sig) return false;

  const enc = new TextEncoder();
  const keyData = enc.encode(INSTANTLY_WEBHOOK_SECRET);
  const msgData = enc.encode(rawBody);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, msgData);
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === sig;
}

// ── Positive reply categories ─────────────────────────────────────────────────

const POSITIVE_CATEGORIES = new Set([
  "Interested",
  "Meeting Booked",
  "Meeting Requested",
]);

function isPositiveReply(category: string | undefined): boolean {
  if (!category) return false;
  return POSITIVE_CATEGORIES.has(category);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature
  const validSig = await verifySignature(req, rawBody);
  if (!validSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: InstantlyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as InstantlyWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // email_sent: validate for AI artifact leakage — must return 200 to prevent retries
  if (payload.event_type === "email_sent") {
    await handleEmailSent(payload).catch((err) =>
      console.error("[instantly-validator] Unhandled error:", err),
    );
    return NextResponse.json({ ok: true, validated: true });
  }

  // Only process reply events
  if (payload.event_type !== "reply_received") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const lead = payload.lead;
  if (!lead?.email) {
    return NextResponse.json({ error: "Missing lead email" }, { status: 400 });
  }

  // Only process positive replies
  if (!isPositiveReply(payload.reply_category)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let hubspotDealId: string | null = null;

  if (HUBSPOT_TOKEN) {
    try {
      // Find or create contact
      let contactId = await findContact(lead.email);
      if (!contactId) {
        contactId = await createContact(lead);
      }

      if (contactId) {
        // Find or create deal
        const existingDealId = await findDealForContact(contactId);
        if (existingDealId) {
          await advanceDealStage(existingDealId);
          hubspotDealId = existingDealId;
        } else {
          hubspotDealId = await createDeal(
            contactId,
            lead,
            payload.campaign_name ?? "",
          );
        }
      }
    } catch (err) {
      // Log but don't fail the webhook — we still want to store the notification
      console.error("[instantly-webhook] HubSpot sync error:", err);
    }
  }

  // Store notification in Redis
  if (redis) {
    const leadName =
      [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
    const replyBody = payload.reply?.body ?? "";
    const snippet =
      replyBody.length > 200 ? replyBody.slice(0, 200) + "…" : replyBody;

    const notification: ReplyNotification = {
      id: `instantly_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "instantly_reply",
      createdAt: new Date().toISOString(),
      read: false,
      leadEmail: lead.email,
      leadName,
      companyName: lead.companyName ?? "",
      campaignName: payload.campaign_name ?? "",
      replyCategory: payload.reply_category ?? "Interested",
      replySnippet: snippet,
      hubspotDealId,
    };

    try {
      await redis.lpush("notifications:instantly", JSON.stringify(notification));
      await redis.ltrim("notifications:instantly", 0, MAX_NOTIFICATIONS - 1);
      await redis.incr("notifications:unread_count");
    } catch (err) {
      console.error("[instantly-webhook] Redis push error:", err);
    }
  }

  return NextResponse.json({ ok: true, hubspotDealId });
}
