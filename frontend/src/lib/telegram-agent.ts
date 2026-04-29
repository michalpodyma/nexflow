/**
 * Telegram bot helpers — gateway + transcript forwarder to OpenClaw (Paperclip).
 *
 * Inbound flow (EUR-335/EUR-347):
 *   1. Allowlist gate: non-allowlisted chatIds are dropped with a polite rejection.
 *   2. Allowlisted chatIds: messages are appended as comments on a per-chat
 *      "transcript" issue (reused across messages). OpenClaw wakes via comment wake.
 *
 * Outbound: OpenClaw replies via Telegram API directly using TELEGRAM_BOT_TOKEN
 *           exposed in his adapter env.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL ?? "https://app.paperclip.ing";
const PAPERCLIP_BOT_API_KEY = process.env.PAPERCLIP_BOT_API_KEY ?? "";
const PAPERCLIP_COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID ?? "";

const OPENCLAW_AGENT_ID = "5864221d-6a66-42e7-a99c-5b0e9274b9ee";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: TelegramFile;
  audio?: TelegramFile;
  document?: TelegramFile & { file_name?: string; mime_type?: string };
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  first_name?: string;
}

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  duration?: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// ─── Allowlist ────────────────────────────────────────────────────────────────

export interface AllowlistEntry {
  chatId: number;
  role: "owner" | "team";
  name: string;
}

function parseAllowlist(): AllowlistEntry[] {
  const raw = process.env.TELEGRAM_ALLOWLIST_JSON ?? "[]";
  try { return JSON.parse(raw); } catch { return []; }
}

export function getAllowlistEntry(chatId: number): AllowlistEntry | null {
  return parseAllowlist().find(e => e.chatId === chatId) ?? null;
}

// ─── Telegram API helpers ─────────────────────────────────────────────────────

async function telegramApi(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[tg-forwarder] Telegram ${method} failed: ${err}`);
  }
  return res.json();
}

export async function sendMessage(chatId: number, text: string): Promise<void> {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  });
}

export async function sendTyping(chatId: number): Promise<void> {
  await telegramApi("sendChatAction", { chat_id: chatId, action: "typing" });
}

export async function sendPoliteRejection(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    "Ten bot jest wewnętrzny dla Nexflow. Jeśli chcesz dołączyć do naszego programu pracowniczego, skontaktuj się z nami przez stronę nexflow.pl."
  );
}

// ─── Transcript helpers ───────────────────────────────────────────────────────

async function findOpenTranscript(chatId: number): Promise<string | null> {
  const q = encodeURIComponent(`[Telegram Transcript] chat ${chatId}`);
  const res = await fetch(
    `${PAPERCLIP_API_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/issues?q=${q}&status=in_progress`,
    { headers: { Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}` } }
  );
  if (!res.ok) return null;
  const issues = await res.json() as Array<{ id: string; title: string }>;
  const match = issues.find(i => i.title.includes(`(chat ${chatId})`));
  return match?.id ?? null;
}

async function createTranscriptIssue(
  entry: AllowlistEntry,
  user: TelegramUser,
): Promise<string | null> {
  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const userHandle = user.username ? ` (@${user.username})` : "";

  const description = `## Telegram Conversation Transcript

**Chat ID:** \`${entry.chatId}\`
**Primary sender:** ${entry.name} | ${userName}${userHandle} (Telegram ID: \`${user.id}\`)
**Role:** \`${entry.role}\`

---

**OpenClaw:** handle each new comment in this thread as a Telegram message from this chat.

- **Reply:** \`POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage\` with \`{"chat_id": ${entry.chatId}, "text": "...", "parse_mode": "Markdown"}\`
- **Role rules:**
  - \`owner\`: full ops authority — create issues for any agent, run briefings, read any thread
  - \`team\`: own tasks only — answer own assigned tasks; escalate own blockers; cannot create issues for others
- **Issue-creation triggers (owner only):** "utwórz zadanie", "stwórz ticket", "zrób ticket", "dodaj do paperclip", "file this", "create an issue", "add to paperclip"
- **Close this issue** when the conversation has no pending follow-up.`;

  const res = await fetch(
    `${PAPERCLIP_API_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/issues`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `[Telegram Transcript] ${entry.name} (chat ${entry.chatId})`,
        description,
        status: "in_progress",
        priority: entry.role === "owner" ? "high" : "medium",
        assigneeAgentId: OPENCLAW_AGENT_ID,
        goalId: "b6976126-bb68-4311-8dc4-1902aa7ef9d4",
      }),
    }
  );
  if (!res.ok) return null;
  const issue = await res.json() as { id: string; identifier: string };
  console.log(`[tg-gateway] Created transcript ${issue.identifier} for chat ${entry.chatId}`);
  return issue.id;
}

async function appendMessageToTranscript(
  issueId: string,
  entry: AllowlistEntry,
  user: TelegramUser,
  text: string,
  messageType: "text" | "voice",
): Promise<void> {
  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const userHandle = user.username ? ` (@${user.username})` : "";
  const ts = new Date().toISOString();
  const typeLabel = messageType === "voice" ? "🎤 Voice | " : "";

  const body = `**📩 Telegram | ${typeLabel}${entry.role} | ${userName}${userHandle}** — ${ts}

${text}`;

  await fetch(
    `${PAPERCLIP_API_URL}/api/issues/${issueId}/comments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }
  );
}

// ─── Paperclip gateway ────────────────────────────────────────────────────────

export async function forwardToOpenClaw(
  chatId: number,
  entry: AllowlistEntry,
  user: TelegramUser,
  text: string,
  messageType: "text" | "voice" = "text",
): Promise<void> {
  if (!PAPERCLIP_BOT_API_KEY) {
    console.error("[tg-gateway] PAPERCLIP_BOT_API_KEY not configured");
    return;
  }

  let issueId = await findOpenTranscript(chatId);
  if (!issueId) {
    issueId = await createTranscriptIssue(entry, user);
  }
  if (!issueId) {
    console.error(`[tg-gateway] Failed to find or create transcript for chat ${chatId}`);
    return;
  }

  await appendMessageToTranscript(issueId, entry, user, text, messageType);
  console.log(`[tg-gateway] Appended message to transcript for chat ${chatId}`);
}

// ─── Daily briefing (task-list summary, no LLM) ───────────────────────────────

export async function generateBriefing(): Promise<string> {
  if (!PAPERCLIP_BOT_API_KEY) {
    return "Brak konfiguracji — PAPERCLIP_BOT_API_KEY nie ustawiony.";
  }

  const now = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });

  try {
    const res = await fetch(
      `${PAPERCLIP_API_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/issues?status=todo,in_progress,blocked`,
      {
        headers: {
          Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) throw new Error(`${res.status}`);

    const issues = (await res.json()) as Array<{
      identifier: string;
      title: string;
      status: string;
      priority: string;
    }>;

    if (!issues.length) {
      return `📋 *Dzienny briefing — ${now}*\n\nBrak otwartych zadań. Dobrego dnia! 🚀`;
    }

    const critical = issues.filter((i) => i.priority === "critical");
    const high = issues.filter((i) => i.priority === "high");
    const rest = issues.filter(
      (i) => i.priority !== "critical" && i.priority !== "high",
    );

    const lines: string[] = [`📋 *Dzienny briefing — ${now}*\n`];

    if (critical.length) {
      lines.push("🔴 *Krytyczne:*");
      critical.forEach((i) => lines.push(`  • [${i.identifier}] ${i.title} — _${i.status}_`));
    }
    if (high.length) {
      lines.push("🟠 *Wysokie:*");
      high.forEach((i) => lines.push(`  • [${i.identifier}] ${i.title} — _${i.status}_`));
    }
    if (rest.length) {
      lines.push("🟡 *Pozostałe:*");
      rest.slice(0, 10).forEach((i) =>
        lines.push(`  • [${i.identifier}] ${i.title} — _${i.status}_`),
      );
      if (rest.length > 10) lines.push(`  … i ${rest.length - 10} więcej`);
    }

    lines.push(`\nRazem otwartych: *${issues.length}*. Powodzenia! 💪`);
    return lines.join("\n");
  } catch (err) {
    console.error("[tg-briefing] Task fetch failed:", err);
    return `📋 *Dzienny briefing — ${now}*\n\nNie udało się pobrać zadań. Spróbuj ponownie później.`;
  }
}
