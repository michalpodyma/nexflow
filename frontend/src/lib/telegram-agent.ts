/**
 * Telegram AI Agent
 *
 * Internal assistant for Nexflow staff. Handles text + voice messages,
 * supports Paperclip task management, and daily briefings.
 *
 * LLM: OpenAI GPT-4o (function calling)
 * Voice: OpenAI Whisper
 * State: Upstash Redis (conversation history, 24h TTL)
 */

import { Redis } from "@upstash/redis";

// ─── Config ───────────────────────────────────────────────────────────────────

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const PAPERCLIP_API_URL = process.env.PAPERCLIP_API_URL ?? "https://app.paperclip.ing";
const PAPERCLIP_BOT_API_KEY = process.env.PAPERCLIP_BOT_API_KEY ?? "";
const PAPERCLIP_COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID ?? "";

const CONV_TTL = 24 * 60 * 60; // 24h
const MAX_HISTORY = 20; // keep last 20 turns
const AGENT_MODEL = "gpt-4o";
const BRIEFING_MODEL = "gpt-4o";

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

interface ConvMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

// ─── Redis client ─────────────────────────────────────────────────────────────

const memStore = new Map<string, { v: string; exp: number }>();

const redis = (() => {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (redisUrl && redisToken) {
    const client = new Redis({ url: redisUrl, token: redisToken });
    return {
      get: (k: string) => client.get<string>(k),
      set: (k: string, v: string, ttl: number) =>
        client.set(k, v, { ex: ttl }).then(() => undefined as void),
      del: (k: string) => client.del(k).then(() => undefined as void),
    };
  }
  console.warn("[tg-agent] UPSTASH not configured — using in-memory store (dev only)");
  return {
    get: async (k: string) => {
      const e = memStore.get(k);
      if (!e || Date.now() > e.exp) return null;
      return e.v;
    },
    set: async (k: string, v: string, ttl: number) => {
      memStore.set(k, { v, exp: Date.now() + ttl * 1000 });
    },
    del: async (k: string) => { memStore.delete(k); },
  };
})();

// ─── Telegram API helpers ─────────────────────────────────────────────────────

async function telegramApi(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[tg-agent] Telegram ${method} failed: ${err}`);
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

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
  );
  const data = (await res.json()) as { ok: boolean; result?: { file_path?: string } };
  if (!data.ok || !data.result?.file_path) return null;
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
}

// ─── Voice transcription (OpenAI Whisper) ────────────────────────────────────

export async function transcribeVoice(fileId: string): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    console.warn("[tg-agent] OPENAI_API_KEY not set — cannot transcribe voice");
    return null;
  }

  const fileUrl = await getTelegramFileUrl(fileId);
  if (!fileUrl) return null;

  // Download audio from Telegram
  const audioRes = await fetch(fileUrl);
  if (!audioRes.ok) return null;
  const audioBlob = await audioRes.blob();

  // Send to Whisper
  const form = new FormData();
  form.append("file", audioBlob, "voice.ogg");
  form.append("model", "whisper-1");

  const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  if (!whisperRes.ok) {
    console.error("[tg-agent] Whisper transcription failed:", await whisperRes.text());
    return null;
  }

  const result = (await whisperRes.json()) as { text?: string };
  return result.text ?? null;
}

// ─── Paperclip API helpers ────────────────────────────────────────────────────

async function paperclip(path: string, init: RequestInit = {}): Promise<unknown> {
  if (!PAPERCLIP_BOT_API_KEY) {
    throw new Error("PAPERCLIP_BOT_API_KEY not configured");
  }
  const res = await fetch(`${PAPERCLIP_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PAPERCLIP_BOT_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paperclip ${path} → ${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: AnthropicTool[] = [
  {
    name: "list_tasks",
    description:
      "List open tasks in the company. Returns all todo and in_progress issues. Use this when the user asks about tasks, what needs to be done, or what is in progress.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["todo", "in_progress", "blocked", "all"],
          description: "Filter by status. Default: 'all' (shows todo + in_progress + blocked).",
        },
        search: {
          type: "string",
          description: "Optional keyword search to filter tasks by title or description.",
        },
      },
    },
  },
  {
    name: "create_task",
    description:
      "Create a new task in the company backlog. Use when the user wants to add a task, assign work, or log something that needs to be done.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short, clear task title." },
        description: {
          type: "string",
          description: "Detailed description. Include any context the user provided.",
        },
        priority: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Task priority. Default: medium.",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task_status",
    description:
      "Change the status of a task. Use when the user says they completed something, are blocked, or want to update task progress.",
    input_schema: {
      type: "object" as const,
      properties: {
        issue_identifier: {
          type: "string",
          description: "Issue identifier like EUR-42 or the issue id (UUID).",
        },
        status: {
          type: "string",
          enum: ["todo", "in_progress", "done", "blocked", "cancelled"],
          description: "New status for the task.",
        },
        comment: {
          type: "string",
          description: "Optional comment to explain the status change.",
        },
      },
      required: ["issue_identifier", "status"],
    },
  },
  {
    name: "get_dashboard",
    description:
      "Get company dashboard showing active goals, project summaries, and key metrics. Use for daily briefings or when asked for an overview.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "initiate_call",
    description:
      "Initiate an outbound phone call via Twilio to a given number. Use when the user asks to call someone.",
    input_schema: {
      type: "object" as const,
      properties: {
        to_number: {
          type: "string",
          description: "Phone number in E.164 format (e.g. +48123456789).",
        },
        message: {
          type: "string",
          description: "Message to read out when the call is answered (TwiML Say verb).",
        },
      },
      required: ["to_number"],
    },
  },
];

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "list_tasks": {
        const status = (input.status as string) ?? "all";
        const search = (input.search as string) ?? "";
        const statusFilter =
          status === "all" ? "todo,in_progress,blocked" : status;
        const qs = new URLSearchParams({ status: statusFilter });
        if (search) qs.set("q", search);

        const issues = (await paperclip(
          `/api/companies/${PAPERCLIP_COMPANY_ID}/issues?${qs}`,
        )) as Array<{
          identifier: string;
          title: string;
          status: string;
          priority: string;
          assigneeAgentId?: string;
        }>;

        if (!issues.length) return "No open tasks found.";

        const lines = issues.map(
          (i) =>
            `• [${i.identifier}] ${i.title} — ${i.status} (${i.priority})`,
        );
        return `Found ${issues.length} task(s):\n${lines.join("\n")}`;
      }

      case "create_task": {
        const issue = (await paperclip(`/api/companies/${PAPERCLIP_COMPANY_ID}/issues`, {
          method: "POST",
          body: JSON.stringify({
            title: input.title,
            description: input.description ?? "",
            priority: input.priority ?? "medium",
            status: "backlog",
          }),
        })) as { identifier: string; title: string };

        return `Created task ${issue.identifier}: "${issue.title}"`;
      }

      case "update_task_status": {
        const id = input.issue_identifier as string;
        // Support both identifier (EUR-42) and UUID
        const isUuid = /^[0-9a-f-]{36}$/.test(id);

        let issueId = id;
        if (!isUuid) {
          // Resolve identifier to UUID by searching
          const issues = (await paperclip(
            `/api/companies/${PAPERCLIP_COMPANY_ID}/issues?q=${encodeURIComponent(id)}`,
          )) as Array<{ id: string; identifier: string }>;
          const match = issues.find((i) => i.identifier === id);
          if (!match) return `Task ${id} not found.`;
          issueId = match.id;
        }

        await paperclip(`/api/issues/${issueId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: input.status,
            ...(input.comment ? { comment: input.comment } : {}),
          }),
        });

        return `Task ${input.issue_identifier} updated to "${input.status}".`;
      }

      case "get_dashboard": {
        const dashboard = (await paperclip(
          `/api/companies/${PAPERCLIP_COMPANY_ID}/dashboard`,
        )) as Record<string, unknown>;
        return JSON.stringify(dashboard, null, 2);
      }

      case "initiate_call": {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER;

        if (!sid || !token || !from) {
          return "Twilio is not configured — cannot initiate call. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.";
        }

        const twiml = `<Response><Say language="pl-PL">${input.message ?? "Połączenie z Nexflow."}</Say></Response>`;
        const creds = Buffer.from(`${sid}:${token}`).toString("base64");
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${creds}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: input.to_number as string,
              From: from,
              Twiml: twiml,
            }),
          },
        );

        if (!res.ok) {
          const err = await res.text();
          return `Call failed: ${err}`;
        }
        const call = (await res.json()) as { sid: string };
        return `Call initiated (SID: ${call.sid}) to ${input.to_number}.`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[tg-agent] Tool ${name} failed:`, msg);
    return `Tool failed: ${msg}`;
  }
}

// ─── Conversation history ─────────────────────────────────────────────────────

function convKey(chatId: number): string {
  return `tg:conv:${chatId}`;
}

async function loadHistory(chatId: number): Promise<ConvMessage[]> {
  const raw = await redis.get(convKey(chatId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ConvMessage[];
  } catch {
    return [];
  }
}

async function saveHistory(chatId: number, history: ConvMessage[]): Promise<void> {
  // Trim to MAX_HISTORY messages
  const trimmed = history.slice(-MAX_HISTORY);
  await redis.set(convKey(chatId), JSON.stringify(trimmed), CONV_TTL);
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(user: TelegramUser): string {
  const now = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
  return `Jesteś wewnętrznym asystentem AI firmy Nexflow (dawniej Eurojob-West) — agencji pracy tymczasowej specjalizującej się w logistyce i magazynowaniu, z siedzibą w Słubicach (granica PL-DE).

Rozmawiasz przez Telegrama z pracownikiem: ${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}${user.username ? ` (@${user.username})` : ""}.
Aktualny czas: ${now} (CET/CEST)

Twoje możliwości:
- Zarządzanie zadaniami przez Paperclip (listowanie, tworzenie, aktualizacja statusu)
- Inicjowanie rozmów telefonicznych przez Twilio
- Generowanie dziennych briefingów dla zespołu
- Odpowiadanie na pytania dotyczące operacji firmy

Styl komunikacji:
- Odpowiadaj po polsku, chyba że pracownik pisze po angielsku lub niemiecku
- Bądź zwięzły i konkretny — to jest komunikator, nie email
- Używaj emoji z umiarem do poprawy czytelności
- W przypadku zadań, używaj identyfikatorów (np. EUR-42) dla jasności

Kontekst firmy:
- Aktywnych pracowników tymczasowych: ~240 (cel: 1000+ w 36 mies.)
- Główna platforma: nexflow.work
- Zintegrowane systemy: HubSpot (kandydaci), Twilio (WhatsApp/SMS), Vercel (hosting)`;
}

// ─── Main agent loop ──────────────────────────────────────────────────────────

export async function runAgent(
  chatId: number,
  user: TelegramUser,
  userMessage: string,
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "⚠️ Agent AI nie jest skonfigurowany. Skontaktuj się z administratorem (brak OPENAI_API_KEY).";
  }

  let history: ConvMessage[] = [];
  try {
    history = await loadHistory(chatId);
  } catch (redisErr) {
    console.error("[tg-agent] Redis loadHistory failed (falling back to empty):", redisErr);
  }

  // Build OpenAI messages: system + history text turns + new user message
  const messages: Record<string, unknown>[] = [
    { role: "system", content: buildSystemPrompt(user) },
    ...history
      .filter((m) => typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  // Convert tool definitions to OpenAI function format
  const tools = TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));

  let finalText = "";

  // Agentic loop — handle function calls
  for (let iteration = 0; iteration < 5; iteration++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: AGENT_MODEL, max_tokens: 2048, messages, tools }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[tg-agent] OpenAI API error", res.status, errText);
      return "Przepraszam, wystąpił błąd podczas przetwarzania. Spróbuj ponownie.";
    }

    const response = (await res.json()) as {
      choices: [{
        message: {
          role: string;
          content: string | null;
          tool_calls?: [{ id: string; function: { name: string; arguments: string } }];
        };
        finish_reason: string;
      }];
    };

    const choice = response.choices[0];
    messages.push(choice.message);

    if (choice.finish_reason === "stop" || !choice.message.tool_calls?.length) {
      finalText = choice.message.content ?? "";
      break;
    }

    if (choice.finish_reason === "tool_calls") {
      for (const call of choice.message.tool_calls ?? []) {
        let input: Record<string, unknown> = {};
        try { input = JSON.parse(call.function.arguments) as Record<string, unknown>; }
        catch { /* use empty input */ }
        const result = await executeTool(call.function.name, input);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    } else {
      break;
    }
  }

  if (!finalText) finalText = "Przepraszam, nie udało się przetworzyć żądania.";

  // Save text-only history turns
  history.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: finalText },
  );
  try {
    await saveHistory(chatId, history);
  } catch (redisErr) {
    console.error("[tg-agent] Redis saveHistory failed (non-fatal):", redisErr);
  }

  return finalText;
}

// ─── Daily briefing generator ─────────────────────────────────────────────────

export async function generateBriefing(): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "Brak konfiguracji — OPENAI_API_KEY nie ustawiony.";
  }

  const now = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });

  // Fetch open tasks
  let tasksText = "Brak otwartych zadań.";
  try {
    const issues = (await paperclip(
      `/api/companies/${PAPERCLIP_COMPANY_ID}/issues?status=todo,in_progress,blocked`,
    )) as Array<{
      identifier: string;
      title: string;
      status: string;
      priority: string;
    }>;

    if (issues.length) {
      const critical = issues.filter((i) => i.priority === "critical");
      const high = issues.filter((i) => i.priority === "high");
      const rest = issues.filter((i) => !["critical", "high"].includes(i.priority));

      const lines: string[] = [];
      if (critical.length) {
        lines.push("🔴 Krytyczne:");
        critical.forEach((i) => lines.push(`  • [${i.identifier}] ${i.title} — ${i.status}`));
      }
      if (high.length) {
        lines.push("🟠 Wysokie:");
        high.forEach((i) => lines.push(`  • [${i.identifier}] ${i.title} — ${i.status}`));
      }
      if (rest.length) {
        lines.push("🟡 Pozostałe:");
        rest.forEach((i) => lines.push(`  • [${i.identifier}] ${i.title} — ${i.status}`));
      }
      tasksText = lines.join("\n");
    }
  } catch (err) {
    console.error("[tg-agent] Briefing task fetch failed:", err);
  }

  // Generate briefing with GPT-4o
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: BRIEFING_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Napisz krótki dzienny briefing dla zespołu Nexflow (agencja pracy tymczasowej).
Data/czas: ${now}

Otwarte zadania:
${tasksText}

Briefing powinien być:
- Zwięzły (max 5 zdań + lista zadań priorytetowych)
- Motywujący i profesjonalny
- W języku polskim
- Zakończony życzeniem dobrego dnia pracy`,
        },
      ],
    }),
  });

  if (!res.ok) return `📋 *Dzienny briefing — ${now}*\n\n${tasksText}`;

  const data = (await res.json()) as {
    choices: [{ message: { content: string } }];
  };
  const text = data.choices[0]?.message?.content ?? "";

  return `📋 *Dzienny briefing*\n\n${text}`;
}
