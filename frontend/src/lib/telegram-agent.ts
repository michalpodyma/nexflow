/**
 * Telegram bot helpers — allowlist gate, outbound messaging, daily briefing.
 *
 * Inbound Telegram messages are handled by the VPS shim at /opt/tg-webhook/server.js
 * which forwards directly to OpenClaw. This module is used only for outbound helpers
 * (rejections, briefings) invoked from /api/telegram/briefing.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

export const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
export const TELEGRAM_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
const PAPERCLIP_API_URL = (process.env.PAPERCLIP_API_URL ?? "https://app.paperclip.ing").trim();
const PAPERCLIP_BOT_API_KEY = (process.env.PAPERCLIP_BOT_API_KEY ?? "").trim();
const PAPERCLIP_COMPANY_ID = (process.env.PAPERCLIP_COMPANY_ID ?? "").trim();

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
    console.error(`[tg] Telegram ${method} failed: ${err}`);
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
