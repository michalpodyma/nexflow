/**
 * POST /api/telegram/briefing
 *
 * Daily morning briefing endpoint — called by Vercel cron (weekdays 07:00 CET).
 * Generates an AI briefing from Paperclip open tasks and sends it to all
 * registered Telegram chat IDs.
 *
 * Security: validated via CRON_SECRET header (Vercel standard).
 *
 * Chat IDs are configured via TELEGRAM_BRIEFING_CHAT_IDS env var
 * (comma-separated list of Telegram chat IDs, e.g. "123456789,987654321").
 */

import { NextRequest, NextResponse } from "next/server";

import { generateBriefing, sendMessage } from "@/lib/telegram-agent";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validate Vercel cron secret
  const secret = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatIdsRaw = process.env.TELEGRAM_BRIEFING_CHAT_IDS ?? "";
  const chatIds = chatIdsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));

  if (!chatIds.length) {
    console.warn("[tg-briefing] TELEGRAM_BRIEFING_CHAT_IDS not set — nothing to send");
    return NextResponse.json({ ok: true, sent: 0, reason: "no_chat_ids" });
  }

  const briefing = await generateBriefing();

  const results = await Promise.allSettled(
    chatIds.map((chatId) => sendMessage(chatId, briefing)),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    console.error(`[tg-briefing] Failed to send to ${failed}/${chatIds.length} chats`);
  }

  return NextResponse.json({ ok: true, sent, failed });
}

// Also support GET for easy manual testing from the browser/curl
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req);
}
