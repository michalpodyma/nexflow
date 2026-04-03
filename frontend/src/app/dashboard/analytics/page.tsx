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
import { getB2BAnalytics, getRecruiterAnalytics } from "@/lib/api";
import type { B2BAnalytics, RecruiterAnalytics } from "@/types/api";

const STAGE_COLOURS: Record<string, string> = {
  new: "#6366f1",
  chatbot_in_progress: "#8b5cf6",
  screened_pass: "#22c55e",
  screened_fail: "#ef4444",
  offered: "#f59e0b",
  hired: "#10b981",
  rejected: "#94a3b8",
};

const PROSPECT_COLOURS: Record<string, string> = {
  new: "#6366f1",
  contacted: "#8b5cf6",
  qualified: "#3b82f6",
  proposal_sent: "#f59e0b",
  negotiating: "#f97316",
  converted: "#22c55e",
  lost: "#ef4444",
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

function KpiCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
      </CardContent>
    </Card>
  );
}

function RecruiterTab() {
  const [data, setData] = useState<RecruiterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecruiterAnalytics()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : data ? (
          <>
            <KpiCard title="Active Workers" value={data.active_workers.toString()} sub="currently deployed" />
            <KpiCard
              title="Placement Rate"
              value={`${(data.placement_rate * 100).toFixed(1)}%`}
              sub="hired / total candidates"
            />
            <KpiCard
              title="Fill Rate"
              value={`${(data.fill_rate * 100).toFixed(1)}%`}
              sub="positions filled / needed"
            />
            <KpiCard
              title="Avg Time-to-Fill"
              value={data.avg_time_to_fill_days !== null ? `${data.avg_time_to_fill_days}d` : "—"}
              sub="days from order to filled"
            />
          </>
        ) : null}
      </div>

      {error && <p className="text-sm text-red-500">Failed to load analytics: {error}</p>}

      {data && (
        <>
          {/* Compliance summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Compliance — Expiring Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-red-500">{data.compliance_summary.expiring_7d}</p>
                  <p className="text-xs text-muted-foreground mt-1">within 7 days</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-500">{data.compliance_summary.expiring_30d}</p>
                  <p className="text-xs text-muted-foreground mt-1">within 30 days</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{data.compliance_summary.expiring_90d}</p>
                  <p className="text-xs text-muted-foreground mt-1">within 90 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Placements by month */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Active Placements by Month
                  <span className="ml-2 text-xs font-normal text-muted-foreground">last 6 months</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.placements_by_month.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No placement data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.placements_by_month} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value: number) => [value, "Placements"]} />
                      <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Weekly Candidate Intake */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Weekly Candidate Intake
                  <span className="ml-2 text-xs font-normal text-muted-foreground">last 8 weeks</span>
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
          </div>
        </>
      )}
    </div>
  );
}

function B2BTab() {
  const [data, setData] = useState<B2BAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getB2BAnalytics()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
        ) : data ? (
          <>
            <KpiCard
              title="Rev. Forecast (Monthly)"
              value={formatPLN(data.revenue_forecast_monthly_pln)}
              sub="workers × avg rate × 22 days"
            />
            <KpiCard
              title="Pipeline Velocity"
              value={data.pipeline_velocity.toString()}
              sub="new candidates this week"
            />
            <KpiCard
              title="Pipeline Value"
              value={formatPLN(data.pipeline_value_pln)}
              sub="open prospect estimated value"
            />
            <KpiCard
              title="Conversion Rate"
              value={`${(data.conversion_rate * 100).toFixed(1)}%`}
              sub="prospects converted to clients"
            />
          </>
        ) : null}
      </div>

      {error && <p className="text-sm text-red-500">Failed to load analytics: {error}</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue per Client */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Revenue per Client
                <span className="ml-2 text-xs font-normal text-muted-foreground">top 10, monthly</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.revenue_per_client.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active assignments yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    layout="vertical"
                    data={data.revenue_per_client}
                    margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => formatPLN(v)}
                    />
                    <YAxis type="category" dataKey="client_name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(value: number) => [formatPLN(value), "Monthly revenue"]} />
                    <Bar dataKey="revenue_monthly_pln" fill="#6366f1" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pipeline by Stage (candidate pipeline) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Pipeline by Stage</CardTitle>
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
                          <Cell key={entry.status} fill={STAGE_COLOURS[entry.status] ?? "#94a3b8"} />
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

          {/* Prospects Funnel */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Prospects Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {data.prospects_funnel.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data — Prospects module coming soon.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.prospects_funnel} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} tickFormatter={stageName} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={stageName}
                      formatter={(value: number) => [value, "Prospects"]}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {data.prospects_funnel.map((entry) => (
                        <Cell key={entry.status} fill={PROSPECT_COLOURS[entry.status] ?? "#94a3b8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

type Tab = "recruiter" | "b2b";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("recruiter");

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Analytics" />
      <main className="flex-1 p-6 space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-1 border-b border-gray-200">
          {(
            [
              { id: "recruiter", label: "Recruiter KPIs" },
              { id: "b2b", label: "B2B KPIs" },
            ] as { id: Tab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "recruiter" ? <RecruiterTab /> : <B2BTab />}
      </main>
    </div>
  );
}
