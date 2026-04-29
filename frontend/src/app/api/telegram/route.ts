/**
 * POST /api/telegram
 *
 * Telegram webhook endpoint. Forwards all inbound messages to OpenClaw
 * (Paperclip Chief of Staff) by creating a Paperclip issue assigned to him.
 * OpenClaw replies directly via the Telegram Bot API using TELEGRAM_BOT_TOKEN
 * from his runtime — no LLM loop runs in this route.
 *
 * Security: validated via X-Telegram-Bot-Api-Secret-Token header.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  TELEGRAM_WEBHOOK_SECRET,
  type TelegramUpdate,
  forwardToOpenClaw,
  sendMessage,
  sendTyping,
  transcribeVoice,
} from "@/lib/telegram-agent";

export const maxDuration = 15;

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validate Telegram webhook secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (TELEGRAM_WEBHOOK_SECRET && secret !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse update
  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // 3. Forward to OpenClaw
  await handleUpdate(update);

  return NextResponse.json({ ok: true });
}

// ─── Update dispatcher ─────────────────────────────────────────────────────────

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = (msg.text ?? "").trim();

  try {
    // /start → static welcome, no forwarding needed
    if (text.startsWith("/start")) {
      await sendMessage(
        chatId,
        `Cześć ${msg.from.first_name}! 👋\n\n` +
          `Jestem asystentem AI Nexflow. Napisz lub nagraj wiadomość, a przekażę ją do OpenClaw.`,
      );
      return;
    }

    // Voice message → transcribe then forward with transcript
    if (msg.voice) {
      await sendTyping(chatId);
      const transcript = await transcribeVoice(msg.voice.file_id);
      if (transcript) {
        await sendMessage(chatId, `🎙️ _"${transcript}"_`);
      }
      await forwardToOpenClaw(msg, transcript ?? undefined);
      return;
    }

    // All text (including /help, /briefing, /zadania) → forward to OpenClaw
    if (text) {
      await forwardToOpenClaw(msg);
      return;
    }

    // Unsupported media type
    await sendMessage(chatId, "Obsługuję wiadomości tekstowe i głosowe. Napisz lub nagraj wiadomość!");
  } catch (err) {
    console.error("[tg-webhook] handleUpdate failed:", err);
    try {
      await sendMessage(chatId, "Wystąpił błąd podczas przekazywania wiadomości. Spróbuj ponownie.");
    } catch {
      // ignore send failure in error handler
    }
  }
}

// ─── GET — webhook health check ───────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
