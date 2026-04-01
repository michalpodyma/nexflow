"use client";

import { Bell, Clock, LogOut, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { clearTokens } from "@/lib/auth";
import { getDueRemindersCount, logout } from "@/lib/api";
import type { ReplyNotification } from "@/app/api/webhooks/instantly/route";

interface HeaderProps {
  title: string;
}

const POLL_INTERVAL_MS = 30_000;

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<ReplyNotification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [dueReminders, setDueReminders] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: ReplyNotification[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const id = setInterval(() => void fetchNotifications(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Poll due reminders count
  useEffect(() => {
    function fetchDue() {
      getDueRemindersCount()
        .then((data) => setDueReminders(data.due_count))
        .catch(() => {
          // best-effort
        });
    }
    fetchDue();
    const id = setInterval(fetchDue, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  async function handleBellClick() {
    setPanelOpen((v) => !v);
    if (!panelOpen && unreadCount > 0) {
      setUnreadCount(0);
      try {
        await fetch("/api/notifications/read", { method: "POST" });
      } catch {
        // best-effort
      }
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore errors — we clear tokens regardless
    }
    clearTokens();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Due reminders badge */}
        {dueReminders > 0 && (
          <a
            href="/dashboard/candidates"
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-amber-600 transition-colors hover:bg-amber-50"
            title={`${dueReminders} reminder${dueReminders !== 1 ? "s" : ""} due`}
          >
            <Clock className="h-4 w-4" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {dueReminders > 9 ? "9+" : dueReminders}
            </span>
          </a>
        )}

        {/* Notifications bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => void handleBellClick()}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="absolute right-0 top-11 z-50 w-96 rounded-lg border bg-white shadow-lg">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-semibold">Reply Notifications</span>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No reply notifications yet
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="border-b px-4 py-3 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {n.leadName}
                            {n.companyName && (
                              <span className="text-gray-500"> · {n.companyName}</span>
                            )}
                          </p>
                          <p className="text-xs text-green-600">{n.replyCategory}</p>
                          {n.replySnippet && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                              {n.replySnippet}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
