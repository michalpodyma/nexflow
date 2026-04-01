"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidates, getClients, getWorkers } from "@/lib/api";
import type { ReplyNotification } from "@/app/api/webhooks/instantly/route";

interface Stats {
  candidates: number;
  workers: number;
  clients: number;
}

const CATEGORY_COLOUR: Record<string, string> = {
  Interested: "bg-green-100 text-green-700",
  "Meeting Booked": "bg-emerald-100 text-emerald-700",
  "Meeting Requested": "bg-blue-100 text-blue-700",
};

function categoryBadge(cat: string) {
  return CATEGORY_COLOUR[cat] ?? "bg-gray-100 text-gray-600";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ candidates: 0, workers: 0, clients: 0 });
  const [replyNotifications, setReplyNotifications] = useState<ReplyNotification[]>([]);

  useEffect(() => {
    async function load() {
      const [c, w, cl] = await Promise.allSettled([
        getCandidates(1, 1),
        getWorkers(1, 1),
        getClients(1, 1),
      ]);
      setStats({
        candidates: c.status === "fulfilled" ? c.value.total : 0,
        workers: w.status === "fulfilled" ? w.value.total : 0,
        clients: cl.status === "fulfilled" ? cl.value.total : 0,
      });
    }
    load();
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = (await res.json()) as { notifications: ReplyNotification[] };
        setReplyNotifications(data.notifications.slice(0, 10));
      } catch {
        // best-effort
      }
    }
    void loadNotifications();
  }, []);

  const statCards = [
    { title: "Total Candidates", value: stats.candidates },
    { title: "Active Workers", value: stats.workers },
    { title: "Clients", value: stats.clients },
    { title: "Scheduled (soon)", value: "—" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Dashboard" />
      <main className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reply notifications panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Recent Reply Notifications
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Instantly.ai → HubSpot
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {replyNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No positive replies received yet. Notifications will appear here when
                Instantly.ai campaigns get interested responses.
              </p>
            ) : (
              <div className="divide-y">
                {replyNotifications.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{n.leadName}</span>
                        {n.companyName && (
                          <span className="text-xs text-muted-foreground">{n.companyName}</span>
                        )}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadge(n.replyCategory)}`}
                        >
                          {n.replyCategory}
                        </span>
                        {n.hubspotDealId && (
                          <a
                            href={`https://app.hubspot.com/contacts/${process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID}/deal/${n.hubspotDealId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline-offset-2 hover:underline"
                          >
                            View deal
                          </a>
                        )}
                      </div>
                      {n.replySnippet && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {n.replySnippet}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        via {n.campaignName || "Instantly.ai campaign"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
