"use client";

import { useEffect, useMemo, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPlacementCalendar } from "@/lib/api";
import type { CalendarEntry } from "@/types/api";

// ── colour helpers ──────────────────────────────────────────────────────────

const PALETTE = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

function clientColor(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

// ── date helpers ────────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), diff);
}

function monthLabel(d: Date): string {
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

function weekLabel(start: Date, end: Date): string {
  return `${start.toLocaleDateString("default", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" })}`;
}

function daysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipData {
  entry: CalendarEntry;
  x: number;
  y: number;
}

function CalendarTooltip({ data }: { data: TooltipData }) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-sm"
      style={{ left: data.x + 12, top: data.y - 8 }}
    >
      <p className="font-semibold">{data.entry.worker_name}</p>
      <p className="text-gray-600">{data.entry.client_name}</p>
      <p className="text-gray-500">{data.entry.position}</p>
      <p className="mt-1 text-xs text-gray-400">
        {data.entry.start_date} → {data.entry.end_date ?? "open-ended"}
      </p>
      {!data.entry.is_active && (
        <p className="mt-1 text-xs text-amber-500">Inactive</p>
      )}
    </div>
  );
}

// ── Timeline bar ────────────────────────────────────────────────────────────

interface BarProps {
  entry: CalendarEntry;
  rangeStart: Date;
  totalDays: number;
  onHover: (data: TooltipData | null) => void;
}

function AssignmentBar({ entry, rangeStart, totalDays, onHover }: BarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const barStart = parseDate(entry.start_date);
  const barEnd = entry.end_date ? parseDate(entry.end_date) : today;
  const rangeEnd = addDays(rangeStart, totalDays - 1);

  const visStart = barStart < rangeStart ? rangeStart : barStart;
  const visEnd = barEnd > rangeEnd ? rangeEnd : barEnd;

  const offsetDays = Math.max(0, (visStart.getTime() - rangeStart.getTime()) / 86_400_000);
  const spanDays = Math.max(1, (visEnd.getTime() - visStart.getTime()) / 86_400_000 + 1);

  const leftPct = (offsetDays / totalDays) * 100;
  const widthPct = (spanDays / totalDays) * 100;
  const color = clientColor(entry.client_id);

  return (
    <div
      className="absolute top-1 bottom-1 rounded cursor-default select-none flex items-center overflow-hidden"
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        backgroundColor: color,
        opacity: entry.is_active ? 1 : 0.45,
        minWidth: 4,
      }}
      onMouseEnter={(e) => onHover({ entry, x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => onHover({ entry, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => onHover(null)}
    >
      <span className="px-1.5 text-[10px] font-medium text-white truncate">
        {entry.client_name} · {entry.position}
      </span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week";

export default function PlacementCalendarPage() {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(today);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const { windowStart, windowEnd } = useMemo(() => {
    if (view === "month") {
      return { windowStart: startOfMonth(anchor), windowEnd: endOfMonth(anchor) };
    }
    const ws = startOfWeek(anchor);
    return { windowStart: ws, windowEnd: addDays(ws, 6) };
  }, [view, anchor]);

  const totalDays = useMemo(
    () => Math.round((windowEnd.getTime() - windowStart.getTime()) / 86_400_000) + 1,
    [windowStart, windowEnd],
  );

  const days = useMemo(() => daysInRange(windowStart, windowEnd), [windowStart, windowEnd]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPlacementCalendar({
      start: toIso(windowStart),
      end: toIso(windowEnd),
      active_only: activeOnly || undefined,
    })
      .then(setEntries)
      .catch((e: Error) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [windowStart, windowEnd, activeOnly]);

  const filteredEntries = useMemo(
    () => (clientFilter === "all" ? entries : entries.filter((e) => e.client_id === clientFilter)),
    [entries, clientFilter],
  );

  const workerRows = useMemo(() => {
    const map = new Map<string, { name: string; entries: CalendarEntry[] }>();
    for (const e of filteredEntries) {
      if (!map.has(e.worker_id)) {
        map.set(e.worker_id, { name: e.worker_name, entries: [] });
      }
      map.get(e.worker_id)!.entries.push(e);
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [filteredEntries]);

  const clients = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) seen.set(e.client_id, e.client_name);
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  function navigate(dir: -1 | 1) {
    if (view === "month") {
      setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
    } else {
      setAnchor((a) => addDays(a, dir * 7));
    }
  }

  function goToday() {
    setAnchor(new Date(today));
  }

  const label = view === "month" ? monthLabel(windowStart) : weekLabel(windowStart, windowEnd);

  function dayLabel(d: Date, compact: boolean): string {
    if (compact) return String(d.getDate());
    return `${d.toLocaleString("default", { weekday: "short" })} ${d.getDate()}`;
  }

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const todayInView = windowStart <= today && today <= windowEnd;
  const todayOffset = todayInView
    ? Math.round((today.getTime() - windowStart.getTime()) / 86_400_000)
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Placement Calendar" />
      <main className="flex flex-1 flex-col gap-4 p-6 overflow-auto">
        {/* Controls */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 py-3 px-3 sm:gap-3 sm:px-4">
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
              <button
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "month" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                onClick={() => setView("month")}
              >
                Month
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "week" ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                onClick={() => setView("week")}
              >
                Week
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>‹</Button>
              <span className="text-sm font-semibold w-36 text-center sm:w-48">{label}</span>
              <Button variant="outline" size="sm" onClick={() => navigate(1)}>›</Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>

            <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Active only
              </label>

              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="h-8 w-40 rounded-md border border-gray-200 px-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:w-48"
              >
                <option value="all">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Calendar grid */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0 overflow-auto h-full">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
                Loading…
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-24 text-red-500 text-sm">
                {error}
              </div>
            ) : workerRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2">
                <p className="text-gray-500 text-sm">No assignments in this period.</p>
                {clientFilter !== "all" && (
                  <p className="text-gray-400 text-xs">Try clearing the client filter.</p>
                )}
              </div>
            ) : (
              <table className="w-full border-collapse text-xs" style={{ minWidth: totalDays * 28 + 160 }}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 sticky top-0 z-20">
                    <th className="sticky left-0 z-30 bg-gray-50 w-40 min-w-40 px-3 py-2 text-left text-gray-500 font-medium border-r border-gray-200">
                      Worker
                    </th>
                    {days.map((d) => (
                      <th
                        key={d.toISOString()}
                        className={`px-0 py-2 text-center font-normal border-r border-gray-100 ${isToday(d) ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-gray-400"}`}
                      >
                        {dayLabel(d, view === "month")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workerRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="sticky left-0 z-10 bg-white hover:bg-gray-50/50 w-40 min-w-40 px-3 py-0 text-gray-700 font-medium border-r border-gray-200 truncate" style={{ height: 36 }}>
                        {row.name}
                      </td>
                      <td colSpan={totalDays} className="p-0 relative" style={{ height: 36 }}>
                        {todayOffset !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-indigo-300 z-10 pointer-events-none"
                            style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                          />
                        )}
                        {row.entries.map((entry) => (
                          <AssignmentBar
                            key={entry.id}
                            entry={entry}
                            rangeStart={windowStart}
                            totalDays={totalDays}
                            onHover={setTooltip}
                          />
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        {clients.length > 0 && (
          <div className="flex flex-wrap gap-3 pb-2">
            {clients.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: clientColor(c.id) }}
                />
                {c.name}
              </div>
            ))}
          </div>
        )}
      </main>

      {tooltip && <CalendarTooltip data={tooltip} />}
    </div>
  );
}
