/**
 * POST /api/telegram
 *
 * Telegram webhook — validates the request, applies the allowlist gate,
 * then appends each message as a comment on a per-chat transcript issue
 * assigned to OpenClaw (EUR-335/EUR-347).
 *
 * Non-allowlisted senders receive a polite rejection; no Paperclip issue is created.
 *
 * Security: validated via X-Telegram-Bot-Api-Secret-Token header.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  TELEGRAM_WEBHOOK_SECRET,
  type TelegramUpdate,
  getAllowlistEntry,
  sendPoliteRejection,
  forwardToOpenClaw,
} from "@/lib/telegram-agent";

export const maxDuration = 30;

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validate Telegram webhook secret — always required (no open bypass)
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!TELEGRAM_WEBHOOK_SECRET || !secret || secret !== TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse update
  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // 3. Handle update — awaited so errors are logged before we return 200
  await handleUpdate(update);

  return NextResponse.json({ ok: true });
}

// ─── Update dispatcher ─────────────────────────────────────────────────────────

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  try {
    const chatId = msg.chat.id;
    const user = msg.from;

    // 1. Allowlist gate
    const entry = getAllowlistEntry(chatId);
    if (!entry) {
      console.log(`[tg-gateway] DROPPED | chatId:${chatId} | username:@${user?.username ?? "unknown"} | preview:${(msg.text ?? "").slice(0, 60)}`);
      await sendPoliteRejection(chatId);
      return;
    }

    // 2. Forward to transcript
    if (msg.voice) {
      await forwardToOpenClaw(chatId, entry, user, "[Voice message]", "voice");
      return;
    }

    const text = (msg.text ?? "").trim();
    if (text) {
      await forwardToOpenClaw(chatId, entry, user, text, "text");
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
