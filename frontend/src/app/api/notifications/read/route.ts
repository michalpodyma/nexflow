/**
 * POST /api/notifications/read — resets the unread notification count to 0
 */

import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = (() => {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
})();

export async function POST() {
  if (!redis) {
    return NextResponse.json({ ok: true });
  }
  try {
    await redis.set("notifications:unread_count", 0);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications/read] POST failed:", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
