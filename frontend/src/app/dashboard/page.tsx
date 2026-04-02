"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsOverview, getWorkers } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/api";
import type { ReplyNotification } from "@/app/api/webhooks/instantly/route";

const CATEGORY_COLOUR: Record<string, string> = {
  Interested: "bg-green-100 text-green-700",
  "Meeting Booked": "bg-emerald-100 text-emerald-700",
  "Meeting Requested": "bg-blue-100 text-blue-700",
};

function categoryBadge(cat: string) {
  return CATEGORY_COLOUR[cat] ?? "bg-gray-100 text-gray-600";
}

function formatPln(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface StatCardProps {
  title: string;
  value: string | number;
  placeholder?: boolean;
}

function StatCard({ title, value, placeholder }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${placeholder ? "text-muted-foreground" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [activeWorkers, setActiveWorkers] = useState<number>(0);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [replyNotifications, setReplyNotifications] = useState<ReplyNotification[]>([]);

  useEffect(() => {
    async function load() {
      const [workersResult, analyticsResult] = await Promise.allSettled([
        getWorkers(1, 1),
        getAnalyticsOverview(),
      ]);
      if (workersResult.status === "fulfilled") {
        setActiveWorkers(workersResult.value.total);
      }
      if (analyticsResult.status === "fulfilled") {
        setAnalytics(analyticsResult.value);
      }
    }
    void load();
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

  const recruitmentCards: StatCardProps[] = [
    { title: "Open Job Orders", value: 0, placeholder: true },
    { title: "Active Workers", value: activeWorkers },
    { title: "Expiring Documents (30 days)", value: 0, placeholder: true },
    {
      title: "Fill Rate",
      value: analytics ? formatPercent(analytics.placement_rate) : "—",
    },
  ];

  const b2bCards: StatCardProps[] = [
    { title: "Pipeline Value", value: "—", placeholder: true },
    { title: "Deals In Progress", value: 0, placeholder: true },
    { title: "New Leads This Week", value: 0, placeholder: true },
    {
      title: "Revenue Forecast (monthly)",
      value: analytics ? formatPln(analytics.revenue_forecast_monthly_pln) : "—",
    },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Dashboard" />
      <main className="flex-1 p-6 space-y-8">
        {/* Recruitment Overview */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recruitment Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recruitmentCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* B2B Pipeline Overview */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            B2B Pipeline Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {b2bCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>
        </section>

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
                  <div
                    key={n.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
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
