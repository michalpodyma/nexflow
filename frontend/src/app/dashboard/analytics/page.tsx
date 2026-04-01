"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsOverview } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/api";

const STAGE_COLOURS: Record<string, string> = {
  new: "#6366f1",
  chatbot_in_progress: "#8b5cf6",
  screened_pass: "#22c55e",
  screened_fail: "#ef4444",
  offered: "#f59e0b",
  hired: "#10b981",
  rejected: "#94a3b8",
};

function stageName(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPLN(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalyticsOverview()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  const kpiCards = data
    ? [
        {
          title: "Active Workers",
          value: data.active_workers.toString(),
          sub: "currently deployed",
        },
        {
          title: "Placement Rate",
          value: `${(data.placement_rate * 100).toFixed(1)}%`,
          sub: "hired / total candidates",
        },
        {
          title: "Pipeline Velocity",
          value: data.pipeline_velocity.toString(),
          sub: "new candidates this week",
        },
        {
          title: "Rev. Forecast (Monthly)",
          value: formatPLN(data.revenue_forecast_monthly_pln),
          sub: "workers × avg rate × 22 days",
        },
      ]
    : [];

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Analytics" />
      <main className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
                  </CardContent>
                </Card>
              ))
            : kpiCards.map((card) => (
                <Card key={card.title}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {error && (
          <p className="text-sm text-red-500">Failed to load analytics: {error}</p>
        )}

        {data && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Weekly candidate intake trend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Weekly Candidate Intake
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    last 8 weeks
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.weekly_trends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.weekly_trends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="week_start"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) =>
                          new Date(v).toLocaleDateString("en-GB", { month: "short", day: "numeric" })
                        }
                      />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        labelFormatter={(v: string) =>
                          `Week of ${new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        }
                        formatter={(value: number) => [value, "New candidates"]}
                      />
                      <Bar dataKey="new_candidates" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pipeline breakdown pie */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Pipeline by Stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.pipeline_by_stage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No candidates yet.</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={data.pipeline_by_stage}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {data.pipeline_by_stage.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STAGE_COLOURS[entry.status] ?? "#94a3b8"}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [value, stageName(name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="flex-1 space-y-1.5 text-sm">
                      {data.pipeline_by_stage.map((entry) => (
                        <li key={entry.status} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: STAGE_COLOURS[entry.status] ?? "#94a3b8" }}
                            />
                            <span className="text-gray-700">{stageName(entry.status)}</span>
                          </span>
                          <span className="font-medium tabular-nums">{entry.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
