"use client";

import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

import { createJobOrder, getClients, getJobOrderCandidates, getJobOrders, updateJobOrder } from "@/lib/api";
import type { Client, JobOrder, JobOrderCreate, JobOrderStatus, JobOrderUrgency } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { status: JobOrderStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "sourcing", label: "Sourcing" },
  { status: "submitted", label: "Submitted" },
  { status: "interview", label: "Interview" },
  { status: "filled", label: "Filled" },
  { status: "on_hold", label: "On Hold" },
  { status: "cancelled", label: "Cancelled" },
];

const URGENCY_STYLES: Record<JobOrderUrgency, string> = {
  normal: "bg-gray-100 text-gray-600",
  urgent: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const COLUMN_HEADER_STYLES: Record<JobOrderStatus, string> = {
  open: "bg-blue-50 border-blue-200",
  sourcing: "bg-purple-50 border-purple-200",
  submitted: "bg-yellow-50 border-yellow-200",
  interview: "bg-orange-50 border-orange-200",
  filled: "bg-green-50 border-green-200",
  on_hold: "bg-gray-50 border-gray-200",
  cancelled: "bg-red-50 border-red-200",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: JobOrderUrgency }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[urgency]}`}>
      {urgency}
    </span>
  );
}

interface KanbanCardProps {
  order: JobOrder;
  clientName: string;
  candidateCount: number;
  onStatusChange: (id: string, status: JobOrderStatus) => void;
  draggable: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

function KanbanCard({ order, clientName, candidateCount, onStatusChange, draggable, onDragStart }: KanbanCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart(e, order.id)}
      className="rounded-lg border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-semibold text-gray-900 leading-snug">{order.title}</p>
      <Link
        href={`/dashboard/clients/${order.client_id}`}
        className="mt-1 block text-xs text-blue-600 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {clientName}
      </Link>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <UrgencyBadge urgency={order.urgency} />
        <span className="text-xs text-gray-500">
          {order.headcount_filled}/{order.headcount_needed} filled
        </span>
        {candidateCount > 0 && (
          <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
            {candidateCount} candidate{candidateCount !== 1 ? "s" : ""}
          </span>
        )}
        {order.deadline && (
          <span className="text-xs text-gray-400">
            Due {order.deadline}
          </span>
        )}
      </div>

      {order.location && (
        <p className="mt-1 text-xs text-gray-400">{order.location}</p>
      )}

      <div className="mt-2">
        <select
          value={order.status}
          onChange={(e) => onStatusChange(order.id, e.target.value as JobOrderStatus)}
          className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {COLUMNS.map((col) => (
            <option key={col.status} value={col.status}>
              {col.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── New Job Order Modal ───────────────────────────────────────────────────────

interface NewOrderModalProps {
  clients: Client[];
  onClose: () => void;
  onCreate: (order: JobOrder) => void;
}

function NewOrderModal({ clients, onClose, onCreate }: NewOrderModalProps) {
  const [form, setForm] = useState<Partial<JobOrderCreate>>({
    urgency: "normal",
    status: "open",
    headcount_needed: 1,
    currency: "PLN",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof JobOrderCreate, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.title) {
      setError("Client and title are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createJobOrder(form as JobOrderCreate);
      onCreate(created);
      onClose();
    } catch {
      setError("Failed to create job order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">New Job Order</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Client *</label>
            <select
              required
              value={form.client_id ?? ""}
              onChange={(e) => set("client_id", e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Position title *</label>
            <Input
              required
              placeholder="e.g. Warehouse Picker"
              value={form.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Headcount</label>
              <Input
                type="number"
                min={1}
                value={form.headcount_needed ?? 1}
                onChange={(e) => set("headcount_needed", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Urgency</label>
              <select
                value={form.urgency ?? "normal"}
                onChange={(e) => set("urgency", e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Location</label>
            <Input
              placeholder="e.g. Frankfurt, DE"
              value={form.location ?? ""}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Deadline</label>
              <Input
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Currency</label>
              <select
                value={form.currency ?? "PLN"}
                onChange={(e) => set("currency", e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function JobOrdersPage() {
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
  const draggingId = useRef<string | null>(null);

  useEffect(() => {
    Promise.all([getJobOrders(), getClients(1, 100)])
      .then(([ordersRes, clientsRes]) => {
        setOrders(ordersRes.items);
        setClients(clientsRes.items);
        // Fetch candidate counts for all job orders in parallel
        Promise.all(
          ordersRes.items.map((o) =>
            getJobOrderCandidates(o.id).then((r) => ({ id: o.id, count: r.total }))
          )
        ).then((results) => {
          const map: Record<string, number> = {};
          results.forEach(({ id, count }) => { map[id] = count; });
          setCandidateCounts(map);
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.company_name]));

  async function handleStatusChange(id: string, newStatus: JobOrderStatus) {
    const prev = orders.find((o) => o.id === id);
    if (!prev || prev.status === newStatus) return;

    // Optimistic update
    setOrders((all) => all.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    try {
      const updated = await updateJobOrder(id, { status: newStatus });
      setOrders((all) => all.map((o) => (o.id === id ? updated : o)));
    } catch {
      // Revert on failure
      setOrders((all) => all.map((o) => (o.id === id ? prev : o)));
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, targetStatus: JobOrderStatus) {
    e.preventDefault();
    const id = draggingId.current;
    draggingId.current = null;
    if (!id) return;
    await handleStatusChange(id, targetStatus);
  }

  const ordersPerColumn = (status: JobOrderStatus) => orders.filter((o) => o.status === status);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Job Orders" />
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <p className="text-sm text-muted-foreground">{orders.length} total</p>
        <Button size="sm" onClick={() => setShowModal(true)}>
          + New Job Order
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {COLUMNS.map((col) => {
            const colOrders = ordersPerColumn(col.status);
            return (
              <div
                key={col.status}
                className="flex w-64 flex-shrink-0 flex-col rounded-xl border bg-gray-50"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.status)}
              >
                <div className={`rounded-t-xl border-b px-3 py-2 ${COLUMN_HEADER_STYLES[col.status]}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 shadow-sm">
                      {colOrders.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {colOrders.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">No orders</p>
                  )}
                  {colOrders.map((order) => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      clientName={clientMap[order.client_id] ?? "Unknown client"}
                      candidateCount={candidateCounts[order.id] ?? 0}
                      onStatusChange={handleStatusChange}
                      draggable={true}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NewOrderModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onCreate={(order) => setOrders((prev) => [order, ...prev])}
        />
      )}
    </div>
  );
}
