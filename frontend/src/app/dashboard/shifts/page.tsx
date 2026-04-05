"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  checkShiftConflicts,
  createShiftEntry,
  createShiftTemplate,
  deleteShiftEntry,
  deleteShiftTemplate,
  exportShiftSchedule,
  getShiftCapacity,
  getShiftSchedule,
  getShiftTemplates,
  updateShiftTemplate,
} from "@/lib/api";
import type {
  CapacitySlot,
  Client,
  ShiftEntry,
  ShiftEntryCreate,
  ShiftTemplate,
  ShiftTemplateCreate,
  Worker,
} from "@/types/api";

// Lightweight list fetchers (re-use existing endpoints)
async function fetchClients(): Promise<Client[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/clients?page=1&page_size=200`,
    {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("access_token") ?? "" : ""}`,
      },
      credentials: "include",
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: Client[] } | Client[];
  return Array.isArray(data) ? data : (data.items ?? []);
}

async function fetchWorkers(): Promise<Worker[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/workers?page=1&page_size=500&attendance_status=active`,
    {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("access_token") ?? "" : ""}`,
      },
      credentials: "include",
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: Worker[] } | Worker[];
  return Array.isArray(data) ? data : (data.items ?? []);
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function weekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Mon=0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// ── Colour palette for clients ────────────────────────────────────────────────

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

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "schedule" | "templates" | "capacity";

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const [tab, setTab] = useState<Tab>("schedule");
  const [weekOf, setWeekOf] = useState<Date>(() => weekStart(new Date()));
  const [clientFilter, setClientFilter] = useState<string>("");

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [capacity, setCapacity] = useState<CapacitySlot[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCell, setAssignCell] = useState<{ template: ShiftTemplate; date: string } | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ShiftTemplate | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toIso(addDays(weekOf, i))),
    [weekOf],
  );

  const weekLabel = useMemo(() => {
    const end = addDays(weekOf, 6);
    return `${formatDate(toIso(weekOf))} – ${formatDate(toIso(end))}`;
  }, [weekOf]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = toIso(weekOf);
      const end = toIso(addDays(weekOf, 6));
      const params = {
        start,
        end,
        ...(clientFilter ? { client_id: clientFilter } : {}),
      };
      const [tmpl, sched, cap, cls, wrks] = await Promise.all([
        getShiftTemplates({ ...(clientFilter ? { client_id: clientFilter } : {}) }),
        getShiftSchedule(params),
        getShiftCapacity(params),
        fetchClients(),
        fetchWorkers(),
      ]);
      setTemplates(tmpl);
      setEntries(sched);
      setCapacity(cap);
      setClients(cls);
      setWorkers(wrks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shift data");
    } finally {
      setLoading(false);
    }
  }, [weekOf, clientFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function prevWeek() {
    setWeekOf((w) => addDays(w, -7));
  }

  function nextWeek() {
    setWeekOf((w) => addDays(w, 7));
  }

  function today() {
    setWeekOf(weekStart(new Date()));
  }

  // ── Entry map: template+date → entries ──────────────────────────────────────

  const entryMap = useMemo(() => {
    const m: Record<string, ShiftEntry[]> = {};
    for (const e of entries) {
      const key = `${e.template_id ?? "adhoc"}::${e.shift_date}`;
      (m[key] ??= []).push(e);
    }
    return m;
  }, [entries]);

  const capacityMap = useMemo(() => {
    const m: Record<string, CapacitySlot> = {};
    for (const s of capacity) {
      m[`${s.template_id}::${s.shift_date}`] = s;
    }
    return m;
  }, [capacity]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleRemoveEntry(entryId: string) {
    try {
      await deleteShiftEntry(entryId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to remove entry");
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template? This cannot be undone if entries exist.")) return;
    try {
      await deleteShiftTemplate(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete template");
    }
  }

  async function handleToggleTemplate(t: ShiftTemplate) {
    try {
      await updateShiftTemplate(t.id, { is_active: !t.is_active });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update template");
    }
  }

  function openAssign(template: ShiftTemplate, date: string) {
    setAssignCell({ template, date });
    setAssignOpen(true);
  }

  function openNewTemplate() {
    setEditTemplate(null);
    setTemplateOpen(true);
  }

  function openEditTemplate(t: ShiftTemplate) {
    setEditTemplate(t);
    setTemplateOpen(true);
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  function handleExport() {
    const start = toIso(weekOf);
    const end = toIso(addDays(weekOf, 6));
    const url = exportShiftSchedule({ start, end, ...(clientFilter ? { client_id: clientFilter } : {}) });
    window.open(url, "_blank");
  }

  const today_ = toIso(new Date());

  return (
    <div className="flex h-full flex-col">
      <Header title="Shift Scheduling" />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab switcher */}
          <div className="flex rounded-md border bg-white overflow-hidden">
            {(["schedule", "templates", "capacity"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Week nav (schedule + capacity tabs) */}
          {tab !== "templates" && (
            <div className="flex items-center gap-1 rounded-md border bg-white">
              <button onClick={prevWeek} className="p-2 hover:bg-gray-50 rounded-l-md">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={today}
                className="px-3 py-2 text-sm font-medium hover:bg-gray-50 border-x"
              >
                {weekLabel}
              </button>
              <button onClick={nextWeek} className="p-2 hover:bg-gray-50 rounded-r-md">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Client filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-md border bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>

          <div className="ml-auto flex gap-2">
            {tab !== "templates" && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-1 h-4 w-4" />
                Export CSV
              </Button>
            )}
            {tab === "templates" && (
              <Button size="sm" onClick={openNewTemplate}>
                <Plus className="mr-1 h-4 w-4" />
                New Template
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-sm text-gray-500">Loading…</div>
        )}

        {/* ── Schedule tab ── */}
        {!loading && tab === "schedule" && (
          <ScheduleGrid
            templates={templates}
            weekDays={weekDays}
            entryMap={entryMap}
            capacityMap={capacityMap}
            today={today_}
            onAssign={openAssign}
            onRemoveEntry={handleRemoveEntry}
          />
        )}

        {/* ── Templates tab ── */}
        {!loading && tab === "templates" && (
          <TemplatesTable
            templates={templates}
            onEdit={openEditTemplate}
            onDelete={handleDeleteTemplate}
            onToggle={handleToggleTemplate}
          />
        )}

        {/* ── Capacity tab ── */}
        {!loading && tab === "capacity" && (
          <CapacityGrid
            templates={templates}
            weekDays={weekDays}
            capacityMap={capacityMap}
            today={today_}
          />
        )}
      </div>

      {/* Assign worker modal */}
      {assignOpen && assignCell && (
        <AssignWorkerModal
          template={assignCell.template}
          date={assignCell.date}
          workers={workers}
          existingEntries={entryMap[`${assignCell.template.id}::${assignCell.date}`] ?? []}
          onClose={() => setAssignOpen(false)}
          onSaved={async () => {
            setAssignOpen(false);
            await load();
          }}
        />
      )}

      {/* Template create/edit modal */}
      {templateOpen && (
        <TemplateFormModal
          template={editTemplate}
          clients={clients}
          onClose={() => setTemplateOpen(false)}
          onSaved={async () => {
            setTemplateOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule grid
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleGridProps {
  templates: ShiftTemplate[];
  weekDays: string[];
  entryMap: Record<string, ShiftEntry[]>;
  capacityMap: Record<string, CapacitySlot>;
  today: string;
  onAssign: (template: ShiftTemplate, date: string) => void;
  onRemoveEntry: (id: string) => void;
}

function ScheduleGrid({
  templates,
  weekDays,
  entryMap,
  capacityMap,
  today,
  onAssign,
  onRemoveEntry,
}: ScheduleGridProps) {
  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-500">
          <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">No shift templates</p>
          <p className="text-sm mt-1">Switch to the Templates tab to create your first shift template.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600 w-52">
              Shift / Client
            </th>
            {weekDays.map((d, i) => (
              <th
                key={d}
                className={`px-3 py-3 text-center font-medium min-w-[110px] ${
                  d === today ? "text-primary" : "text-gray-600"
                }`}
              >
                <div>{SHORT_DAYS[i]}</div>
                <div className={`text-xs font-normal ${d === today ? "text-primary" : "text-gray-400"}`}>
                  {formatDate(d)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {templates.map((tmpl) => (
            <tr key={tmpl.id} className={tmpl.is_active ? "" : "opacity-50"}>
              {/* Template info cell */}
              <td className="sticky left-0 z-10 bg-white border-r px-4 py-3 w-52">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: clientColor(tmpl.client_id) }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate text-gray-900">{tmpl.name}</div>
                    <div className="text-xs text-gray-500 truncate">{tmpl.client_name}</div>
                    <div className="text-xs text-gray-400">
                      {tmpl.start_time}–{tmpl.end_time} · cap {tmpl.capacity}
                    </div>
                  </div>
                </div>
              </td>

              {/* Day cells */}
              {weekDays.map((date, i) => {
                const dow = i; // 0=Mon
                const active = tmpl.days_of_week.includes(dow);
                const key = `${tmpl.id}::${date}`;
                const dayEntries = entryMap[key] ?? [];
                const slot = capacityMap[key];
                const full = slot ? slot.available === 0 : false;

                return (
                  <td
                    key={date}
                    className={`px-2 py-2 align-top min-w-[110px] ${
                      date === today ? "bg-primary/5" : ""
                    } ${active ? "" : "bg-gray-50/60"}`}
                  >
                    {active ? (
                      <div className="space-y-1">
                        {/* Assigned worker chips */}
                        {dayEntries.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between rounded px-2 py-0.5 text-xs text-white"
                            style={{ backgroundColor: clientColor(tmpl.client_id) }}
                          >
                            <span className="truncate">{e.worker_name.split(" ")[0]}</span>
                            <button
                              onClick={() => void onRemoveEntry(e.id)}
                              className="ml-1 shrink-0 opacity-70 hover:opacity-100"
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}

                        {/* Add button */}
                        {!full ? (
                          <button
                            onClick={() => onAssign(tmpl, date)}
                            className="w-full rounded border border-dashed border-gray-300 py-0.5 text-xs text-gray-400 hover:border-primary hover:text-primary transition-colors"
                          >
                            + add
                          </button>
                        ) : (
                          <span className="block text-center text-xs text-amber-600 font-medium">
                            Full
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates table
// ─────────────────────────────────────────────────────────────────────────────

interface TemplatesTableProps {
  templates: ShiftTemplate[];
  onEdit: (t: ShiftTemplate) => void;
  onDelete: (id: string) => void;
  onToggle: (t: ShiftTemplate) => void;
}

function TemplatesTable({ templates, onEdit, onDelete, onToggle }: TemplatesTableProps) {
  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-500">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium">No shift templates yet</p>
          <p className="text-sm mt-1">Click "New Template" to define your first shift pattern.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Client</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Position</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Days</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Hours</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Cap</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Active</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {templates.map((t) => (
            <tr key={t.id} className={t.is_active ? "" : "opacity-60"}>
              <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
              <td className="px-4 py-3 text-gray-600">{t.client_name}</td>
              <td className="px-4 py-3 text-gray-600">{t.position}</td>
              <td className="px-4 py-3 text-gray-600">
                {t.days_of_week.map((d) => SHORT_DAYS[d]).join(", ")}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {t.start_time}–{t.end_time}
              </td>
              <td className="px-4 py-3 text-center text-gray-600">{t.capacity}</td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => void onToggle(t)}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    t.is_active
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.is_active ? "Active" : "Inactive"}
                </button>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(t)}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:border-red-300"
                    onClick={() => void onDelete(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Capacity grid
// ─────────────────────────────────────────────────────────────────────────────

interface CapacityGridProps {
  templates: ShiftTemplate[];
  weekDays: string[];
  capacityMap: Record<string, CapacitySlot>;
  today: string;
}

function CapacityGrid({ templates, weekDays, capacityMap, today }: CapacityGridProps) {
  const activeTemplates = templates.filter((t) => t.is_active);

  if (activeTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500 text-sm">
          No active templates to show capacity for.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-600 w-52">
              Template
            </th>
            {weekDays.map((d, i) => (
              <th
                key={d}
                className={`px-3 py-3 text-center font-medium min-w-[100px] ${
                  d === today ? "text-primary" : "text-gray-600"
                }`}
              >
                <div>{SHORT_DAYS[i]}</div>
                <div className={`text-xs font-normal ${d === today ? "text-primary" : "text-gray-400"}`}>
                  {formatDate(d)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {activeTemplates.map((tmpl) => (
            <tr key={tmpl.id}>
              <td className="sticky left-0 z-10 bg-white border-r px-4 py-3 w-52">
                <div className="font-medium text-gray-900 truncate">{tmpl.name}</div>
                <div className="text-xs text-gray-500 truncate">{tmpl.client_name}</div>
              </td>
              {weekDays.map((date, i) => {
                const dow = i;
                const active = tmpl.days_of_week.includes(dow);
                const slot = capacityMap[`${tmpl.id}::${date}`];

                if (!active) {
                  return (
                    <td key={date} className="px-3 py-3 text-center bg-gray-50/60">
                      <span className="text-gray-300">—</span>
                    </td>
                  );
                }

                const booked = slot?.booked ?? 0;
                const cap = slot?.capacity ?? tmpl.capacity;
                const available = Math.max(0, cap - booked);
                const pct = cap > 0 ? (booked / cap) * 100 : 0;

                return (
                  <td
                    key={date}
                    className={`px-3 py-3 text-center ${date === today ? "bg-primary/5" : ""}`}
                  >
                    <div
                      className={`text-base font-semibold ${
                        available === 0 ? "text-red-600" : available === cap ? "text-gray-400" : "text-green-600"
                      }`}
                    >
                      {available}
                    </div>
                    <div className="text-xs text-gray-400">
                      {booked}/{cap}
                    </div>
                    {/* Mini bar */}
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-green-400"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assign worker modal
// ─────────────────────────────────────────────────────────────────────────────

interface AssignWorkerModalProps {
  template: ShiftTemplate;
  date: string;
  workers: Worker[];
  existingEntries: ShiftEntry[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function AssignWorkerModal({
  template,
  date,
  workers,
  existingEntries,
  onClose,
  onSaved,
}: AssignWorkerModalProps) {
  const alreadyAssigned = new Set(existingEntries.map((e) => e.worker_id));
  const [workerId, setWorkerId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const [y, m, d] = date.split("-").map(Number);
  const dateLabel = `${FULL_DAYS[new Date(y, m - 1, d).getDay() === 0 ? 6 : new Date(y, m - 1, d).getDay() - 1]}, ${d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]}`;

  async function handleWorkerChange(id: string) {
    setWorkerId(id);
    setConflictWarning(null);
    if (!id) return;

    // Build ISO datetimes
    const startDt = `${date}T${template.start_time}:00+00:00`;
    const endDt = `${date}T${template.end_time}:00+00:00`;
    try {
      const result = await checkShiftConflicts({
        worker_id: id,
        start_dt: startDt,
        end_dt: endDt,
      });
      if (result.has_conflict) {
        setConflictWarning(
          `⚠ This worker already has ${result.conflicting_entries.length} conflicting shift(s) on this day.`,
        );
      }
    } catch {
      // non-blocking
    }
  }

  async function handleSave() {
    if (!workerId) return;
    setSaving(true);
    try {
      const payload: ShiftEntryCreate = {
        template_id: template.id,
        worker_id: workerId,
        client_id: template.client_id,
        shift_date: date,
        start_time: template.start_time,
        end_time: template.end_time,
        notes: notes.trim() || undefined,
      };
      await createShiftEntry(payload);
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to assign worker");
    } finally {
      setSaving(false);
    }
  }

  const availableWorkers = workers.filter((w) => !alreadyAssigned.has(w.id));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Worker — {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <div>
              <span className="font-medium">{dateLabel}</span>
            </div>
            <div className="text-gray-500">
              {template.start_time}–{template.end_time} · {template.client_name} · {template.position}
            </div>
            <div className="text-gray-500">
              {existingEntries.length}/{template.capacity} assigned
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Worker</label>
            <select
              value={workerId}
              onChange={(e) => void handleWorkerChange(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select worker…</option>
              {availableWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.last_name}, {w.first_name}
                </option>
              ))}
            </select>
            {conflictWarning && (
              <p className="mt-1 text-xs text-amber-600">{conflictWarning}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Any notes for this assignment…"
            />
          </div>

          {/* Existing assignments */}
          {existingEntries.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">Already assigned</p>
              <div className="space-y-1">
                {existingEntries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm"
                  >
                    <span>{e.worker_name}</span>
                    {e.notes && <span className="text-xs text-gray-400 truncate ml-2 max-w-[120px]">{e.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={!workerId || saving}>
              {saving ? "Saving…" : "Assign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template form modal (create / edit)
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateFormModalProps {
  template: ShiftTemplate | null;
  clients: Client[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

function TemplateFormModal({ template, clients, onClose, onSaved }: TemplateFormModalProps) {
  const [form, setForm] = useState({
    client_id: template?.client_id ?? "",
    name: template?.name ?? "",
    position: template?.position ?? "",
    days_of_week: template?.days_of_week ?? [0, 1, 2, 3, 4],
    start_time: template?.start_time ?? "06:00",
    end_time: template?.end_time ?? "14:00",
    capacity: template?.capacity ?? 1,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggleDay(dow: number) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(dow)
        ? f.days_of_week.filter((d) => d !== dow)
        : [...f.days_of_week, dow].sort(),
    }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.client_id) e.client_id = "Required";
    if (!form.name.trim()) e.name = "Required";
    if (!form.position.trim()) e.position = "Required";
    if (form.days_of_week.length === 0) e.days_of_week = "Select at least one day";
    if (!form.start_time) e.start_time = "Required";
    if (!form.end_time) e.end_time = "Required";
    if (form.capacity < 1) e.capacity = "Must be at least 1";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (template) {
        await updateShiftTemplate(template.id, form);
      } else {
        const payload: ShiftTemplateCreate = { ...form };
        await createShiftTemplate(payload);
      }
      await onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "New Shift Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {/* Client */}
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
              {errors.client_id && <p className="mt-0.5 text-xs text-red-600">{errors.client_id}</p>}
            </div>

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Template Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Morning Shift"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.name && <p className="mt-0.5 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Position */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Position</label>
              <input
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                placeholder="e.g. Warehouse Picker"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.position && <p className="mt-0.5 text-xs text-red-600">{errors.position}</p>}
            </div>

            {/* Start time */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.start_time && <p className="mt-0.5 text-xs text-red-600">{errors.start_time}</p>}
            </div>

            {/* End time */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.end_time && <p className="mt-0.5 text-xs text-red-600">{errors.end_time}</p>}
            </div>

            {/* Capacity */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Capacity</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 1 }))}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {errors.capacity && <p className="mt-0.5 text-xs text-red-600">{errors.capacity}</p>}
            </div>
          </div>

          {/* Days of week */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Days of Week</label>
            <div className="flex flex-wrap gap-2">
              {SHORT_DAYS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium border transition-colors ${
                    form.days_of_week.includes(i)
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {errors.days_of_week && (
              <p className="mt-0.5 text-xs text-red-600">{errors.days_of_week}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : template ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
