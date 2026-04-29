/**
 * POST /api/telegram
 *
 * Telegram webhook — validates the request then forwards each message
 * to OpenClaw (Chief of Staff) via a Paperclip issue. All LLM processing
 * has moved to OpenClaw; this route is now a thin forwarder shim (EUR-314).
 *
 * Security: validated via X-Telegram-Bot-Api-Secret-Token header.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  TELEGRAM_WEBHOOK_SECRET,
  type TelegramUpdate,
  forwardToOpenClaw,
} from "@/lib/telegram-agent";

export const maxDuration = 30;

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

  // 3. Forward to OpenClaw — awaited so errors are logged before we return 200
  await handleUpdate(update);

  return NextResponse.json({ ok: true });
}

// ─── Update dispatcher ─────────────────────────────────────────────────────────

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const user = msg.from;
  const text = (msg.text ?? "").trim();

  try {
    if (msg.voice) {
      await forwardToOpenClaw(chatId, user, "[Voice message]", "voice");
      return;
    }

    if (text) {
      await forwardToOpenClaw(chatId, user, text, "text");
      return;
    }

    // Non-text, non-voice update — silently ignore
  } catch (err) {
    console.error("[tg-webhook] handleUpdate failed:", err);
  }
}

// ─── GET — webhook health check ───────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
