/**
 * GET/POST /api/cron/instantly-german-routing
 *
 * Pre-send German language enforcer for Instantly AI campaigns.
 *
 * Scans unsent leads across configured campaigns. When a lead's email domain
 * belongs to a German-owned company (kuehne-nagel.com, dhl.com, arvato.com,
 * dbschenker.com, etc.), any staged draft that is not primarily German is
 * rewritten in formal German and PATCHed back via PATCH /api/v2/leads/{id}.
 * The next time the AI SDR fires a send for that lead, the template variable
 * resolves to the rewritten German copy.
 *
 * Fix for EUR-2562: German-owned company contacts were receiving Polish/English
 * outreach because the AI SDR routes by contact location, not company HQ.
 *
 * Authentication: standard Vercel cron `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Environment variables:
 *   INSTANTLY_API_KEY                          — required
 *   OPENAI_API_KEY                             — required
 *   INSTANTLY_GERMAN_ROUTING_CAMPAIGN_IDS      — comma-separated campaign UUIDs
 *                                                (defaults to main campaign)
 *   INSTANTLY_GERMAN_MAX_LEADS_PER_CAMPAIGN    — cap per campaign (default 25)
 *   INSTANTLY_GERMAN_ROUTING_TRACKING_ISSUE_ID — Paperclip issue for audit log
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isGermanCompanyDomain,
  getEmailDomain,
} from "@/lib/german-companies";

const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

const PAPERCLIP_API_URL =
  process.env.PAPERCLIP_API_URL ?? "https://app.paperclip.ing";
const PAPERCLIP_BOT_API_KEY =
  process.env.PAPERCLIP_BOT_API_KEY ?? process.env.PAPERCLIP_API_KEY ?? "";

const PAPERCLIP_TRACKING_ISSUE_ID =
  process.env.INSTANTLY_GERMAN_ROUTING_TRACKING_ISSUE_ID ?? "";

// Main campaign UUID (same as the Polish linter) + any rescue campaigns.
// Override with a comma-separated list to add RESCUE-2 and future campaigns.
const DEFAULT_CAMPAIGN_IDS = "a842e444-8676-40e0-9c47-2328a72b2d3a";
const CAMPAIGN_IDS = (
  process.env.INSTANTLY_GERMAN_ROUTING_CAMPAIGN_IDS ?? DEFAULT_CAMPAIGN_IDS
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MAX_LEADS_PER_CAMPAIGN = Number(
  process.env.INSTANTLY_GERMAN_MAX_LEADS_PER_CAMPAIGN ?? 25,
);

const DRAFT_KEY_SUFFIXES = [
  "_email_1",
  "_email_followup_1",
  "_email_followup_2",
  "_email_followup_3",
];

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

interface GermanRoutingOutcome {
  leadId: string;
  email: string;
  domain: string;
  campaignId: string;
  drafts_checked: number;
  drafts_rewritten: number;
  rewritten_keys: string[];
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

function normalizeVars(
  raw: InstantlyLead["custom_variables"],
): LeadCustomVariables {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object"
        ? parsed
        : {}) as LeadCustomVariables;
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

async function listGermanLeadsForCampaign(
  campaignId: string,
): Promise<InstantlyLead[]> {
  const collected: InstantlyLead[] = [];
  let cursor: string | undefined = undefined;
  const pageSize = 100;

  for (let i = 0; i < 8 && collected.length < MAX_LEADS_PER_CAMPAIGN; i++) {
    const body: Record<string, unknown> = {
      campaign: campaignId,
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
        `Instantly leads/list campaign=${campaignId} ${res.status}: ${await res.text()}`,
      );
    }

    const data = (await res.json()) as InstantlyListResponse;
    const page = data.items ?? [];
    for (const lead of page) {
      const summary = lead.status_summary ?? {};
      const unsent =
        summary &&
        typeof summary === "object" &&
        Object.keys(summary).length === 0;
      if (unsent && isGermanCompanyDomain(lead.email)) {
        collected.push(lead);
      }
      if (collected.length >= MAX_LEADS_PER_CAMPAIGN) break;
    }

    cursor = data.next_starting_after;
    if (!cursor || page.length < pageSize) break;
  }

  return collected;
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

async function isPrimarilyGerman(draft: string): Promise<boolean> {
  const answer = await openaiChat(
    "You classify business emails by primary language. Answer with a single token: 'de' if the email body is primarily German, or 'other' for any other language. German diacritics (ä, ö, ü, ß) alone are not sufficient — assess the overall body. Do not explain.",
    `Email body:\n\n${draft}`,
    { temperature: 0 },
  );
  return answer.toLowerCase().startsWith("de");
}

async function rewriteInGerman(
  original: string,
  context: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  },
): Promise<string> {
  const ctx = [
    context.firstName ? `Recipient first name: ${context.firstName}` : "",
    context.lastName ? `Recipient last name: ${context.lastName}` : "",
    context.companyName ? `Recipient company: ${context.companyName}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = [
    "You rewrite cold B2B sales emails into formal German for Nexflow, a Polish staffing agency placing temporary workers at German-owned companies.",
    "Output ONLY the rewritten email body. No commentary, no markdown, no reasoning, no numbered tokens like (1) (2), no standalone 'Ja.'/'Nein.' lines.",
    "Rules:",
    "- Address the recipient formally: 'Sehr geehrter Herr [Nachname]' or 'Sehr geehrte Frau [Nachname]' if a last name is known.",
    "- Without a last name: 'Sehr geehrte Damen und Herren'.",
    "- Preserve every concrete fact from the original (company observations, pain points, value props, call to action).",
    "- Match the original length within ±20%.",
    "- Close naturally in German: 'Mit freundlichen Grüßen,' or 'Freundliche Grüße,'.",
    "- Do not invent details. Do not add disclaimers. Do not include any Polish or English words, salutations, or closings.",
    "- Do not translate the sender's name or company name (Nexflow stays Nexflow).",
  ].join("\n");

  return openaiChat(
    systemPrompt,
    `${ctx ? ctx + "\n\n" : ""}Original draft (rewrite into formal German):\n\n${original}`,
    { temperature: 0.2 },
  );
}

async function patchLeadVars(
  leadId: string,
  patch: LeadCustomVariables,
): Promise<void> {
  const res = await fetch(
    `https://api.instantly.ai/api/v2/leads/${leadId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INSTANTLY_API_KEY}`,
      },
      body: JSON.stringify({ custom_variables: patch }),
    },
  );
  if (!res.ok) {
    throw new Error(`Instantly lead PATCH ${res.status}: ${await res.text()}`);
  }
}

async function logToPaperclip(outcome: GermanRoutingOutcome): Promise<void> {
  if (!PAPERCLIP_TRACKING_ISSUE_ID || !PAPERCLIP_BOT_API_KEY) return;
  const body = [
    `🇩🇪 **German company lead routed to German**`,
    ``,
    `- Lead: \`${outcome.email}\` (id \`${outcome.leadId}\`)`,
    `- Domain: \`${outcome.domain}\``,
    `- Campaign: \`${outcome.campaignId}\``,
    `- Drafts checked: ${outcome.drafts_checked}`,
    `- Drafts rewritten: ${outcome.drafts_rewritten}`,
    `- Keys: ${outcome.rewritten_keys.map((k) => `\`${k}\``).join(", ")}`,
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
    console.error("[instantly-german-routing] paperclip log failed:", err);
  }
}

async function routeLead(
  lead: InstantlyLead,
  campaignId: string,
): Promise<GermanRoutingOutcome | null> {
  const vars = normalizeVars(lead.custom_variables);
  const drafts = collectDraftEntries(vars);
  if (drafts.length === 0) return null;

  const rewritten: LeadCustomVariables = {};
  const rewrittenKeys: string[] = [];

  for (const { key, value } of drafts) {
    let german: boolean;
    try {
      german = await isPrimarilyGerman(value);
    } catch (err) {
      console.error("[instantly-german-routing] classify failed", {
        leadId: lead.id,
        key,
        err,
      });
      continue;
    }
    if (german) continue;

    try {
      const newBody = await rewriteInGerman(value, {
        firstName: lead.first_name,
        lastName: lead.last_name,
        companyName: lead.company_name,
      });
      if (newBody && newBody.length > 0) {
        rewritten[key] = newBody;
        rewrittenKeys.push(key);
      }
    } catch (err) {
      console.error("[instantly-german-routing] rewrite failed", {
        leadId: lead.id,
        key,
        err,
      });
    }
  }

  if (rewrittenKeys.length > 0) {
    await patchLeadVars(lead.id, { ...vars, ...rewritten });
  }

  return {
    leadId: lead.id,
    email: lead.email,
    domain: getEmailDomain(lead.email),
    campaignId,
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
  const outcomes: GermanRoutingOutcome[] = [];
  let totalLeadsScanned = 0;
  const campaignErrors: string[] = [];

  for (const campaignId of CAMPAIGN_IDS) {
    let leads: InstantlyLead[];
    try {
      leads = await listGermanLeadsForCampaign(campaignId);
    } catch (err) {
      const msg = `campaign=${campaignId}: ${String(err)}`;
      console.error("[instantly-german-routing] list failed", msg);
      campaignErrors.push(msg);
      continue;
    }
    totalLeadsScanned += leads.length;

    for (const lead of leads) {
      try {
        const result = await routeLead(lead, campaignId);
        if (result) outcomes.push(result);
      } catch (err) {
        console.error("[instantly-german-routing] lead failed", {
          leadId: lead.id,
          err,
        });
      }
    }
  }

  const rewritten = outcomes.filter((o) => o.drafts_rewritten > 0);
  for (const o of rewritten) {
    await logToPaperclip(o);
  }

  const summary = {
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    campaigns_scanned: CAMPAIGN_IDS.length,
    leads_scanned: totalLeadsScanned,
    german_company_leads: outcomes.length,
    leads_with_rewrite: rewritten.length,
    drafts_rewritten_total: rewritten.reduce(
      (n, o) => n + o.drafts_rewritten,
      0,
    ),
    campaign_errors: campaignErrors,
    samples: rewritten.slice(0, 5).map((o) => ({
      email: o.email,
      domain: o.domain,
      campaign: o.campaignId,
      keys: o.rewritten_keys,
    })),
  };

  console.log("[instantly-german-routing] run summary", summary);
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
