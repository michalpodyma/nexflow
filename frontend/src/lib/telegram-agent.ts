/**
 * Telegram bot helpers — forwarder shim to OpenClaw (Paperclip).
 *
 * Inbound: each message creates a Paperclip issue assigned to OpenClaw.
 * Outbound: OpenClaw replies via Telegram API directly using TELEGRAM_BOT_TOKEN
 *           exposed in his adapter env.
 *
 * The old LLM loop (OpenRouter/Qwen + Whisper + Redis) has been removed.
 * See EUR-314 for the migration rationale.
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

// ─── Paperclip forwarder ──────────────────────────────────────────────────────

export async function forwardToOpenClaw(
  chatId: number,
  user: TelegramUser,
  text: string,
  messageType: "text" | "voice" = "text",
): Promise<{ identifier: string } | null> {
  if (!PAPERCLIP_BOT_API_KEY) {
    console.error("[tg-forwarder] PAPERCLIP_BOT_API_KEY not configured");
    return null;
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const userHandle = user.username ? ` (@${user.username})` : "";
  const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;

  const description = `Incoming Telegram ${messageType === "voice" ? "voice " : ""}message forwarded to OpenClaw.

**From:** ${userName}${userHandle} (Telegram user id: \`${user.id}\`)
**Chat id:** \`${chatId}\`
**Message:**
${text}

---

**To reply**, send a POST request to Telegram (TELEGRAM_BOT_TOKEN is in your env):
\`\`\`
POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage
Content-Type: application/json

{ "chat_id": ${chatId}, "text": "your reply here", "parse_mode": "Markdown" }
\`\`\``;

  const res = await fetch(`${PAPERCLIP_API_URL}/api/companies/${PAPERCLIP_COMPANY_ID}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `[Telegram] ${userName}: ${preview}`,
      description,
      priority: "medium",
      status: "todo",
      assigneeAgentId: OPENCLAW_AGENT_ID,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[tg-forwarder] Paperclip issue creation failed: ${res.status} ${err}`);
    return null;
  }

  const issue = (await res.json()) as { identifier: string; id: string };
  console.log(`[tg-forwarder] Created ${issue.identifier} → OpenClaw (chat ${chatId})`);
  return { identifier: issue.identifier };
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
