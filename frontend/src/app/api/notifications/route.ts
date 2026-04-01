/**
 * GET  /api/notifications  — returns the latest reply notifications
 * POST /api/notifications/read — marks all notifications as read (resets unread count)
 */

import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import type { ReplyNotification } from "@/app/api/webhooks/instantly/route";

const redis = (() => {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
})();

export async function GET() {
  if (!redis) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  try {
    const [rawItems, unreadRaw] = await Promise.all([
      redis.lrange("notifications:instantly", 0, 49),
      redis.get<number>("notifications:unread_count"),
    ]);

    const notifications: ReplyNotification[] = (rawItems as string[])
      .map((item) => {
        try {
          return JSON.parse(item) as ReplyNotification;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as ReplyNotification[];

    return NextResponse.json({
      notifications,
      unreadCount: unreadRaw ?? 0,
    });
  } catch (err) {
    console.error("[notifications] GET failed:", err);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
