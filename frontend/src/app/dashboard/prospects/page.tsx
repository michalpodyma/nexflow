"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  convertProspect,
  createProspect,
  getProspects,
  updateProspect,
} from "@/lib/api";
import type {
  Prospect,
  ProspectCreate,
  ProspectSource,
  ProspectStatus,
  ProspectUpdate,
} from "@/types/api";

// ── Constants ──────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: ProspectSource; label: string }[] = [
  { value: "referral", label: "Referral" },
  { value: "cold_call", label: "Cold Call" },
  { value: "website", label: "Website" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: { value: ProspectStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "negotiating", label: "Negotiating" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const STATUS_COLORS: Record<ProspectStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  proposal_sent: "bg-orange-100 text-orange-700",
  negotiating: "bg-indigo-100 text-indigo-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-500",
};

const EMPTY_FORM: ProspectCreate = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  source: "other",
  status: "new",
  estimated_monthly_value: "",
  notes: "",
  next_follow_up: "",
  assigned_to: "",
};

// ── Form Dialog ────────────────────────────────────────────────────────────────

interface ProspectFormDialogProps {
  prospect?: Prospect;
  onClose: () => void;
  onSaved: (p: Prospect) => void;
}

function ProspectFormDialog({ prospect, onClose, onSaved }: ProspectFormDialogProps) {
  const isEdit = !!prospect;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<ProspectCreate>(
    prospect
      ? {
          company_name: prospect.company_name,
          contact_name: prospect.contact_name ?? "",
          contact_email: prospect.contact_email ?? "",
          contact_phone: prospect.contact_phone ?? "",
          source: prospect.source,
          status: prospect.status,
          estimated_monthly_value: prospect.estimated_monthly_value ?? "",
          notes: prospect.notes ?? "",
          next_follow_up: prospect.next_follow_up ?? "",
          assigned_to: prospect.assigned_to ?? "",
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function set<K extends keyof ProspectCreate>(key: K, value: ProspectCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: ProspectCreate | ProspectUpdate = {
        ...form,
        contact_name: (form.contact_name as string)?.trim() || null,
        contact_email: (form.contact_email as string)?.trim() || null,
        contact_phone: (form.contact_phone as string)?.trim() || null,
        estimated_monthly_value: (form.estimated_monthly_value as string)?.trim() || null,
        notes: (form.notes as string)?.trim() || null,
        next_follow_up: (form.next_follow_up as string)?.trim() || null,
        assigned_to: (form.assigned_to as string)?.trim() || null,
      };

      const saved = isEdit
        ? await updateProspect(prospect!.id, payload as ProspectUpdate)
        : await createProspect(payload as ProspectCreate);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit Prospect" : "Add Prospect"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Company
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Company name *</label>
                <Input
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="Acme GmbH"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Source</label>
                <select
                  className={selectClass}
                  value={form.source as string}
                  onChange={(e) => set("source", e.target.value as ProspectSource)}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select
                  className={selectClass}
                  value={form.status as string}
                  onChange={(e) => set("status", e.target.value as ProspectStatus)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Contact
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Contact name</label>
                <Input
                  value={(form.contact_name as string) ?? ""}
                  onChange={(e) => set("contact_name", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={(form.contact_email as string) ?? ""}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input
                  value={(form.contact_phone as string) ?? ""}
                  onChange={(e) => set("contact_phone", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Deal
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Est. monthly value (PLN)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(form.estimated_monthly_value as string) ?? ""}
                  onChange={(e) => set("estimated_monthly_value", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Assigned to</label>
                <Input
                  value={(form.assigned_to as string) ?? ""}
                  onChange={(e) => set("assigned_to", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Next follow-up</label>
                <Input
                  type="date"
                  value={(form.next_follow_up as string) ?? ""}
                  onChange={(e) => set("next_follow_up", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={3}
              value={(form.notes as string) ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional notes…"
            />
          </section>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add prospect"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function followUpClass(dateStr: string | null): string {
  if (!dateStr) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  if (d < today) return "bg-red-50";
  if (d.getTime() === today.getTime()) return "bg-yellow-50";
  return "";
}

function formatFollowUp(dateStr: string | null): string {
  if (!dateStr) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  if (d < today) return `${dateStr} ⚠`;
  if (d.getTime() === today.getTime()) return "Today";
  return dateStr;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Prospect | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<ProspectStatus | "">("");
  const [filterSource, setFilterSource] = useState<ProspectSource | "">("");
  const [converting, setConverting] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  async function load(status?: ProspectStatus | "", source?: ProspectSource | "") {
    setLoading(true);
    try {
      const res = await getProspects(
        1,
        100,
        (status || undefined) as ProspectStatus | undefined,
        (source || undefined) as ProspectSource | undefined,
      );
      setProspects(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filterStatus, filterSource);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterSource]);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(p: Prospect) {
    setEditing(p);
    setDialogOpen(true);
  }

  function handleSaved(saved: Prospect) {
    setProspects((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      setTotal((t) => t + 1);
      return [saved, ...prev];
    });
    setDialogOpen(false);
  }

  async function handleConvert(p: Prospect) {
    if (!confirm(`Convert "${p.company_name}" to a client?`)) return;
    setConverting(p.id);
    setConvertError(null);
    try {
      const res = await convertProspect(p.id);
      setProspects((prev) => prev.map((x) => (x.id === p.id ? res.prospect : x)));
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setConverting(null);
    }
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Prospects" />
      <main className="flex-1 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground mr-auto">{total} total</p>

          {/* Filters */}
          <select
            className={selectClass}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ProspectStatus | "")}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            className={selectClass}
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as ProspectSource | "")}
          >
            <option value="">All sources</option>
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <Button onClick={openCreate}>Add Prospect</Button>
        </div>

        {convertError && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{convertError}</p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : prospects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prospects found.</p>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Est. Monthly Value</TableHead>
                  <TableHead>Next Follow-up</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((p) => {
                  const rowClass = followUpClass(p.next_follow_up);
                  return (
                    <TableRow key={p.id} className={rowClass}>
                      <TableCell className="font-medium">
                        {p.converted_to_client_id ? (
                          <Link
                            href={`/dashboard/clients/${p.converted_to_client_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {p.company_name}
                          </Link>
                        ) : (
                          p.company_name
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{p.contact_name ?? "—"}</div>
                        {p.contact_email && (
                          <div className="text-xs text-muted-foreground">{p.contact_email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {SOURCE_OPTIONS.find((s) => s.value === p.source)?.label ?? p.source}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status]}`}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === p.status)?.label ?? p.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.estimated_monthly_value
                          ? `${Number(p.estimated_monthly_value).toLocaleString("pl-PL")} PLN`
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatFollowUp(p.next_follow_up)}
                      </TableCell>
                      <TableCell>{p.assigned_to ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                          {p.status !== "converted" && p.status !== "lost" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConvert(p)}
                              disabled={converting === p.id}
                            >
                              {converting === p.id ? "…" : "Convert"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {dialogOpen && (
        <ProspectFormDialog
          prospect={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
