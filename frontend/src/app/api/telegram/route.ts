/**
 * POST /api/telegram
 *
 * Telegram webhook endpoint. Telegram sends all bot updates here as JSON.
 *
 * Security: validated via X-Telegram-Bot-Api-Secret-Token header.
 * Processing: async via unstable_after (responds 200 immediately to Telegram).
 *
 * Handles:
 *   - Text messages → AI agent
 *   - Voice messages → Whisper transcription → AI agent
 *   - /start, /help commands → onboarding message
 *   - /briefing command → on-demand daily briefing
 */

import { unstable_after as after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

import {
  TELEGRAM_WEBHOOK_SECRET,
  type TelegramUpdate,
  generateBriefing,
  runAgent,
  sendMessage,
  sendTyping,
  transcribeVoice,
} from "@/lib/telegram-agent";

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

  // 3. Respond 200 immediately — process async so Telegram doesn't time out
  after(async () => {
    await handleUpdate(update);
  });

  return NextResponse.json({ ok: true });
}

// ─── Update dispatcher ─────────────────────────────────────────────────────────

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return; // ignore non-message updates (e.g. edited messages)

  const chatId = msg.chat.id;
  const user = msg.from;
  const text = (msg.text ?? "").trim();

  try {
    // ── Commands ──────────────────────────────────────────────────────────────
    if (text.startsWith("/start")) {
      await sendMessage(
        chatId,
        `Cześć ${user.first_name}! 👋\n\n` +
          `Jestem asystentem AI Nexflow. Mogę pomóc Ci:\n` +
          `• 📋 Sprawdzić i zarządzać zadaniami (Paperclip)\n` +
          `• 📞 Zainicjować połączenie telefoniczne\n` +
          `• 📊 Wygenerować dzienny briefing\n` +
          `• 🎙️ Przetworzyć wiadomości głosowe\n\n` +
          `Napisz lub powiedz, czego potrzebujesz!`,
      );
      return;
    }

    if (text.startsWith("/help")) {
      await sendMessage(
        chatId,
        `*Dostępne komendy:*\n\n` +
          `/briefing — Dzienny briefing zespołu\n` +
          `/zadania — Lista otwartych zadań\n` +
          `/help — Ta wiadomość\n\n` +
          `Możesz też pisać lub nagrywać wiadomości głosowe w naturalnym języku.`,
      );
      return;
    }

    if (text.startsWith("/briefing")) {
      await sendTyping(chatId);
      const briefing = await generateBriefing();
      await sendMessage(chatId, briefing);
      return;
    }

    if (text.startsWith("/zadania") || text.startsWith("/tasks")) {
      await sendTyping(chatId);
      const reply = await runAgent(chatId, user, "Pokaż mi listę wszystkich otwartych zadań.");
      await sendMessage(chatId, reply);
      return;
    }

    // ── Voice message ─────────────────────────────────────────────────────────
    if (msg.voice) {
      await sendTyping(chatId);
      const transcript = await transcribeVoice(msg.voice.file_id);

      if (!transcript) {
        await sendMessage(
          chatId,
          "Nie udało się przetworzyć wiadomości głosowej. " +
            "Upewnij się, że OPENAI_API_KEY jest ustawione.",
        );
        return;
      }

      // Echo transcript so user knows what was understood
      await sendMessage(chatId, `🎙️ _"${transcript}"_`);

      const reply = await runAgent(chatId, user, transcript);
      await sendMessage(chatId, reply);
      return;
    }

    // ── Regular text message ──────────────────────────────────────────────────
    if (text) {
      await sendTyping(chatId);
      const reply = await runAgent(chatId, user, text);
      await sendMessage(chatId, reply);
      return;
    }

    // ── Unsupported message type ──────────────────────────────────────────────
    await sendMessage(
      chatId,
      "Obsługuję tylko wiadomości tekstowe i głosowe. Napisz lub nagraj wiadomość!",
    );
  } catch (err) {
    console.error("[tg-webhook] handleUpdate failed:", err);
    try {
      await sendMessage(
        chatId,
        "Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę.",
      );
    } catch {
      // ignore send failure in error handler
    }
  }
}

// ─── GET — webhook health check ───────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
