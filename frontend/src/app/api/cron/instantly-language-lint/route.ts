/**
 * GET/POST /api/cron/instantly-language-lint
 *
 * Pre-send language linter for the Instantly AI SDR main campaign.
 *
 * The AI SDR enriches leads in batches and stages personalized drafts into each
 * lead's `custom_variables` under keys like `_email_1`, `_email_followup_1..3`
 * (or the campaign-prefixed variants `{campaignId}_email_1`, etc.). Leads with
 * `status_summary == {}` have not been sent yet — their staged drafts are still
 * mutable via `PATCH /api/v2/leads/{id}`.
 *
 * This route walks unsent leads in the main campaign, and for each recipient
 * on a `.pl`/`.com.pl` domain it asks a cheap LLM whether each staged draft
 * is primarily Polish. If not, it rewrites the draft in formal Polish and
 * PATCHes the custom_variables back. The next time the AI SDR fires a send
 * for that lead, the template `{{...email_1}}` resolves to the rewritten copy.
 *
 * Authentication: standard Vercel cron `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Counter-metric: comments to Paperclip issue EUR-2139 on every regenerated
 * draft (one comment per lead), so weekly review can count rewrites by domain.
 */

import { NextRequest, NextResponse } from "next/server";

const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

const PAPERCLIP_API_URL =
  process.env.PAPERCLIP_API_URL ?? "https://app.paperclip.ing";
const PAPERCLIP_BOT_API_KEY =
  process.env.PAPERCLIP_BOT_API_KEY ?? process.env.PAPERCLIP_API_KEY ?? "";

const MAIN_CAMPAIGN_ID = "a842e444-8676-40e0-9c47-2328a72b2d3a";
const AI_SDR_AGENT_ID = "019d409e-fc35-7009-ba4e-877318ead276";

// Paperclip issue EUR-2139 — log destination for regenerated drafts
const PAPERCLIP_TRACKING_ISSUE_ID = process.env
  .INSTANTLY_LINT_TRACKING_ISSUE_ID ?? "";

// Hard cap so the cron always returns within Vercel's function budget,
// even if many leads are staged. Each lead = up to 4 LLM classify calls
// + up to 4 LLM rewrite calls. Tune via env.
const MAX_LEADS_PER_RUN = Number(
  process.env.INSTANTLY_LINT_MAX_LEADS_PER_RUN ?? 25,
);

type LeadCustomVariables = Record<string, string | null | undefined>;

interface InstantlyLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  custom_variables?: LeadCustomVariables | string | null;
  status_summary?: Record<string, unknown>;
}

interface InstantlyListResponse {
  items?: InstantlyLead[];
  next_starting_after?: string;
}

interface LintOutcome {
  leadId: string;
  email: string;
  domain: string;
  drafts_checked: number;
  drafts_rewritten: number;
  rewritten_keys: string[];
}

// Draft keys the AI SDR is known to populate on a lead. Both the bare and
// campaign-prefixed forms are accepted; whichever shape Instantly stores is
// what we read and PATCH back.
const DRAFT_KEY_SUFFIXES = [
  "_email_1",
  "_email_followup_1",
  "_email_followup_2",
  "_email_followup_3",
];

function isPolishDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain.endsWith(".pl") || domain.endsWith(".com.pl");
}

function getDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function normalizeVars(
  raw: InstantlyLead["custom_variables"],
): LeadCustomVariables {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object" ? parsed : {}) as LeadCustomVariables;
    } catch {
      return {};
    }
  }
  return raw;
}

function collectDraftEntries(
  vars: LeadCustomVariables,
): Array<{ key: string; value: string }> {
  const entries: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value !== "string" || value.length === 0) continue;
    if (DRAFT_KEY_SUFFIXES.some((suf) => key.endsWith(suf))) {
      entries.push({ key, value });
    }
  }
  return entries;
}

async function listUnsentLeads(): Promise<InstantlyLead[]> {
  const collected: InstantlyLead[] = [];
  let cursor: string | undefined = undefined;
  const pageSize = 100;

  for (let i = 0; i < 8 && collected.length < MAX_LEADS_PER_RUN; i++) {
    const body: Record<string, unknown> = {
      campaign: MAIN_CAMPAIGN_ID,
      limit: pageSize,
    };
    if (cursor) body.starting_after = cursor;

    const res = await fetch("https://api.instantly.ai/api/v2/leads/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INSTANTLY_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(
        `Instantly leads/list ${res.status}: ${await res.text()}`,
      );
    }

    const data = (await res.json()) as InstantlyListResponse;
    const page = data.items ?? [];
    for (const lead of page) {
      const summary = lead.status_summary ?? {};
      const empty =
        summary && typeof summary === "object" &&
        Object.keys(summary).length === 0;
      if (empty) collected.push(lead);
      if (collected.length >= MAX_LEADS_PER_RUN) break;
    }

    cursor = data.next_starting_after;
    if (!cursor || page.length < pageSize) break;
  }

  return collected;
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

async function openaiChat(
  systemPrompt: string,
  userPrompt: string,
  options: { model?: string; temperature?: number } = {},
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o-mini",
      temperature: options.temperature ?? 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as OpenAIChatResponse;
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function isPrimarilyPolish(draft: string): Promise<boolean> {
  const answer = await openaiChat(
    "You classify business emails by primary language. Answer with a single token: 'pl' if the email body is primarily Polish, or 'other' for any other language. Polish characters are not sufficient — assess the overall body. Do not explain.",
    `Email body:\n\n${draft}`,
    { temperature: 0 },
  );
  return answer.toLowerCase().startsWith("pl");
}

async function rewriteInPolish(
  original: string,
  context: { firstName?: string; lastName?: string; companyName?: string },
): Promise<string> {
  const ctx = [
    context.firstName ? `Recipient first name: ${context.firstName}` : "",
    context.lastName ? `Recipient last name: ${context.lastName}` : "",
    context.companyName ? `Recipient company: ${context.companyName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = [
    "You rewrite cold B2B sales emails into formal Polish for Nexflow, a Polish staffing agency.",
    "Output ONLY the rewritten email body. No commentary, no markdown, no reasoning, no numbered tokens like (1) (2), no standalone 'Yes.'/'No.' lines.",
    "Rules:",
    "- Address the recipient formally with 'Szanowny Panie [Nazwisko]' or 'Szanowna Pani [Nazwisko]' if a last name is known.",
    "- If only a first name is available, fall back to 'Szanowna Pani' / 'Szanowny Panie' without a name.",
    "- Preserve every concrete fact from the original (company observations, pain points, value props, CTA).",
    "- Match the original length within ±20%.",
    "- Sign off naturally in Polish (e.g. 'Pozdrawiam,').",
    "- Do not invent details. Do not add disclaimers. Do not include any English words or salutations.",
  ].join("\n");

  return openaiChat(
    systemPrompt,
    `${ctx ? ctx + "\n\n" : ""}Original draft (rewrite into formal Polish):\n\n${original}`,
    { temperature: 0.2 },
  );
}

async function patchLeadVars(
  leadId: string,
  patch: LeadCustomVariables,
): Promise<void> {
  const res = await fetch(`https://api.instantly.ai/api/v2/leads/${leadId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INSTANTLY_API_KEY}`,
    },
    body: JSON.stringify({ custom_variables: patch }),
  });
  if (!res.ok) {
    throw new Error(`Instantly lead PATCH ${res.status}: ${await res.text()}`);
  }
}

async function logRewriteToPaperclip(outcome: LintOutcome): Promise<void> {
  if (!PAPERCLIP_TRACKING_ISSUE_ID || !PAPERCLIP_BOT_API_KEY) return;
  const body = [
    `🔁 **Pre-send language rewrite**`,
    ``,
    `- Lead: \`${outcome.email}\` (id \`${outcome.leadId}\`)`,
    `- Domain: \`${outcome.domain}\``,
    `- Drafts checked: ${outcome.drafts_checked}`,
    `- Drafts rewritten: ${outcome.drafts_rewritten}`,
    `- Keys: ${outcome.rewritten_keys.map((k) => `\`${k}\``).join(", ")}`,
    `- AI SDR: \`${AI_SDR_AGENT_ID}\` · Campaign: \`${MAIN_CAMPAIGN_ID}\``,
  ].join("\n");

  try {
    await fetch(
      `${PAPERCLIP_API_URL}/api/issues/${PAPERCLIP_TRACKING_ISSUE_ID}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}`,
        },
        body: JSON.stringify({ body }),
      },
    );
  } catch (err) {
    console.error("[instantly-lint] paperclip log failed:", err);
  }
}

async function lintLead(lead: InstantlyLead): Promise<LintOutcome | null> {
  const email = lead.email;
  if (!isPolishDomain(email)) return null;

  const vars = normalizeVars(lead.custom_variables);
  const drafts = collectDraftEntries(vars);
  if (drafts.length === 0) return null;

  const rewritten: LeadCustomVariables = {};
  const rewrittenKeys: string[] = [];

  for (const { key, value } of drafts) {
    let polish: boolean;
    try {
      polish = await isPrimarilyPolish(value);
    } catch (err) {
      console.error("[instantly-lint] classify failed", { leadId: lead.id, key, err });
      continue;
    }
    if (polish) continue;

    try {
      const newBody = await rewriteInPolish(value, {
        firstName: lead.first_name,
        lastName: lead.last_name,
        companyName: lead.company_name,
      });
      if (newBody && newBody.length > 0) {
        rewritten[key] = newBody;
        rewrittenKeys.push(key);
      }
    } catch (err) {
      console.error("[instantly-lint] rewrite failed", { leadId: lead.id, key, err });
    }
  }

  if (rewrittenKeys.length === 0) {
    return {
      leadId: lead.id,
      email,
      domain: getDomain(email),
      drafts_checked: drafts.length,
      drafts_rewritten: 0,
      rewritten_keys: [],
    };
  }

  await patchLeadVars(lead.id, { ...vars, ...rewritten });

  return {
    leadId: lead.id,
    email,
    domain: getDomain(email),
    drafts_checked: drafts.length,
    drafts_rewritten: rewrittenKeys.length,
    rewritten_keys: rewrittenKeys,
  };
}

async function handleCron(): Promise<NextResponse> {
  if (!INSTANTLY_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "INSTANTLY_API_KEY not set" },
      { status: 500 },
    );
  }
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY not set" },
      { status: 500 },
    );
  }

  const startedAt = new Date().toISOString();
  const leads = await listUnsentLeads();

  const outcomes: LintOutcome[] = [];
  for (const lead of leads) {
    try {
      const result = await lintLead(lead);
      if (result) outcomes.push(result);
    } catch (err) {
      console.error("[instantly-lint] lead failed", { leadId: lead.id, err });
    }
  }

  const rewritten = outcomes.filter((o) => o.drafts_rewritten > 0);
  for (const o of rewritten) {
    await logRewriteToPaperclip(o);
  }

  const summary = {
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    leads_scanned: leads.length,
    polish_recipient_leads: outcomes.length,
    leads_with_rewrite: rewritten.length,
    drafts_rewritten_total: rewritten.reduce(
      (n, o) => n + o.drafts_rewritten,
      0,
    ),
    samples: rewritten.slice(0, 5).map((o) => ({
      email: o.email,
      keys: o.rewritten_keys,
    })),
  };

  console.log("[instantly-lint] run summary", summary);
  return NextResponse.json(summary);
}

function authorize(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return null;
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = authorize(req);
  if (denied) return denied;
  return handleCron();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
