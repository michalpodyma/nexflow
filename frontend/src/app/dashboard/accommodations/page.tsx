"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  assignWorkerToAccommodation,
  createAccommodation,
  getAccommodation,
  getAccommodations,
  getWorkers,
  updateAccommodation,
  updateAccommodationAssignment,
} from "@/lib/api";
import type {
  Accommodation,
  AccommodationDetail,
  AssignmentCreate,
  ResidentSummary,
  Worker,
} from "@/types/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function OccupancyBadge({ current, total }: { current: number; total: number }) {
  const full = current >= total;
  const nearFull = !full && current / total >= 0.8;
  const style = full
    ? "bg-red-100 text-red-700"
    : nearFull
    ? "bg-yellow-100 text-yellow-800"
    : "bg-green-100 text-green-800";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {current}/{total}
    </span>
  );
}

function fmt(value: string | null, suffix = " PLN") {
  if (!value) return "—";
  return `${Number(value).toLocaleString("pl-PL", { minimumFractionDigits: 2 })}${suffix}`;
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

interface AccommodationFormProps {
  initial?: Accommodation;
  onClose: () => void;
  onSaved: (acc: Accommodation) => void;
}

function AccommodationFormDialog({ initial, onClose, onSaved }: AccommodationFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [totalCapacity, setTotalCapacity] = useState(String(initial?.total_capacity ?? ""));
  const [roomsCount, setRoomsCount] = useState(String(initial?.rooms_count ?? ""));
  const [monthlyRent, setMonthlyRent] = useState(initial?.monthly_rent ?? "");
  const [monthlyUtilities, setMonthlyUtilities] = useState(initial?.monthly_utilities ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !totalCapacity) {
      setError("Name and total capacity are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        total_capacity: Number(totalCapacity),
        rooms_count: roomsCount ? Number(roomsCount) : undefined,
        monthly_rent: monthlyRent || undefined,
        monthly_utilities: monthlyUtilities || undefined,
        notes: notes.trim() || undefined,
        is_active: isActive,
      };
      const saved = initial
        ? await updateAccommodation(initial.id, payload)
        : await createAccommodation(payload);
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold">
          {initial ? "Edit Accommodation" : "Add Accommodation"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
            <input
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ul. Kościuszki 12"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Address</label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Total capacity (beds) *
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Rooms count</label>
              <input
                type="number"
                min={1}
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={roomsCount}
                onChange={(e) => setRoomsCount(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Monthly rent (PLN)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Monthly utilities (PLN)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={monthlyUtilities}
                onChange={(e) => setMonthlyUtilities(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
            <textarea
              rows={2}
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active (available for assignments)
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Add accommodation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assign worker dialog ──────────────────────────────────────────────────────

interface AssignWorkerDialogProps {
  accommodation: Accommodation;
  onClose: () => void;
  onAssigned: () => void;
}

function AssignWorkerDialog({ accommodation, onClose, onAssigned }: AssignWorkerDialogProps) {
  const [search, setSearch] = useState("");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyCost, setMonthlyCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      getWorkers(1, 50, false, false, search || undefined).then((res) => setWorkers(res.items));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedWorkerId || !moveInDate) {
      setError("Worker and move-in date are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: AssignmentCreate = {
        worker_id: selectedWorkerId,
        room_number: roomNumber.trim() || undefined,
        move_in_date: new Date(moveInDate).toISOString(),
        monthly_cost_to_worker: monthlyCost || undefined,
      };
      await assignWorkerToAccommodation(accommodation.id, payload);
      onAssigned();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign worker.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold">Assign Worker</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {accommodation.name} — {accommodation.current_occupancy}/{accommodation.total_capacity}{" "}
          beds occupied
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Worker *</label>
            <input
              type="text"
              className="mb-1 w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedWorkerId(""); }}
            />
            <select
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
            >
              <option value="">{workers.length === 0 ? "No results" : "Select worker…"}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.first_name} {w.last_name}
                  {w.nationality ? ` (${w.nationality})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Room number</label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 4A"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Move-in date *</label>
              <input
                type="date"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Monthly cost to worker (PLN)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={monthlyCost}
              onChange={(e) => setMonthlyCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Assigning…" : "Assign worker"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail panel (current residents) ─────────────────────────────────────────

interface DetailPanelProps {
  accommodation: Accommodation;
  onClose: () => void;
  onMoveOut: (assignmentId: string, moveOutDate: string) => void;
}

function DetailPanel({ accommodation, onClose, onMoveOut }: DetailPanelProps) {
  const [detail, setDetail] = useState<AccommodationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [moveOutPending, setMoveOutPending] = useState<{ assignmentId: string; workerName: string } | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    getAccommodation(accommodation.id)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [accommodation.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{accommodation.name}</h2>
            {accommodation.address && (
              <p className="text-xs text-muted-foreground">
                {accommodation.address}
                {accommodation.city ? `, ${accommodation.city}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3 rounded-md border bg-gray-50 p-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Occupancy</p>
            <p className="text-lg font-semibold">
              {accommodation.current_occupancy}/{accommodation.total_capacity}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Monthly rent</p>
            <p className="text-sm font-medium">{fmt(accommodation.monthly_rent)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Monthly utilities</p>
            <p className="text-sm font-medium">{fmt(accommodation.monthly_utilities)}</p>
          </div>
        </div>

        <h3 className="mb-2 text-sm font-medium">Current residents</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !detail || detail.residents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No current residents.</p>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Move-in</TableHead>
                  <TableHead>Cost/mo</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.residents.map((r: ResidentSummary) => (
                  <TableRow key={r.assignment_id}>
                    <TableCell className="font-medium">{r.worker_name}</TableCell>
                    <TableCell>{r.room_number ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(r.move_in_date).toLocaleDateString("pl-PL")}
                    </TableCell>
                    <TableCell>{fmt(r.monthly_cost_to_worker)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                        onClick={() => {
                          setMoveOutDate(new Date().toISOString().slice(0, 10));
                          setMoveOutPending({ assignmentId: r.assignment_id, workerName: r.worker_name });
                        }}
                      >
                        Move out
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {accommodation.notes && (
          <p className="mt-4 text-xs text-muted-foreground">
            <span className="font-medium">Notes:</span> {accommodation.notes}
          </p>
        )}
      </div>

      {moveOutPending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-semibold">Confirm move-out</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Recording move-out for <strong>{moveOutPending.workerName}</strong>.
            </p>
            <div className="mb-5">
              <label className="mb-1 block text-xs font-medium text-gray-700">Move-out date *</label>
              <input
                type="date"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMoveOutPending(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!moveOutDate}
                onClick={() => {
                  onMoveOut(moveOutPending.assignmentId, moveOutDate);
                  setMoveOutPending(null);
                }}
              >
                Confirm move-out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AccommodationsPage() {
  const router = useRouter();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);

  const [formTarget, setFormTarget] = useState<Accommodation | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Accommodation | null>(null);
  const [detailTarget, setDetailTarget] = useState<Accommodation | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAccommodations(1, 50, activeOnly)
      .then((res) => {
        setAccommodations(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [activeOnly]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setFormTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(e: React.MouseEvent, acc: Accommodation) {
    e.stopPropagation();
    setFormTarget(acc);
    setFormOpen(true);
  }

  function openAssign(e: React.MouseEvent, acc: Accommodation) {
    e.stopPropagation();
    setAssignTarget(acc);
  }

  function handleFormSaved(saved: Accommodation) {
    setFormOpen(false);
    setAccommodations((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (!formTarget) setTotal((t) => t + 1);
  }

  async function handleMoveOut(assignmentId: string, moveOutDate: string) {
    await updateAccommodationAssignment(assignmentId, {
      move_out_date: new Date(moveOutDate).toISOString(),
    });
    setDetailTarget(null);
    load();
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Accommodations" />
      <main className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{total} total</p>
          <div className="flex items-center gap-2">
            <Button
              variant={activeOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveOnly((v) => !v)}
            >
              {activeOnly ? "All properties" : "Active only"}
            </Button>
            <Button size="sm" onClick={openAdd}>
              + Add accommodation
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : accommodations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accommodations yet.</p>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Monthly cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[160px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {accommodations.map((acc) => (
                  <TableRow
                    key={acc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setDetailTarget(acc)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <span>{acc.name}</span>
                        {acc.address && (
                          <p className="text-xs text-muted-foreground">{acc.address}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{acc.city ?? "—"}</TableCell>
                    <TableCell>
                      <OccupancyBadge
                        current={acc.current_occupancy}
                        total={acc.total_capacity}
                      />
                      {acc.rooms_count && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {acc.rooms_count} rooms
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        {acc.monthly_rent && <span>Rent: {fmt(acc.monthly_rent)}</span>}
                        {acc.monthly_utilities && (
                          <span className="text-muted-foreground">
                            Util: {fmt(acc.monthly_utilities)}
                          </span>
                        )}
                        {!acc.monthly_rent && !acc.monthly_utilities && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          acc.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {acc.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => openEdit(e, acc)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={
                            !acc.is_active || acc.current_occupancy >= acc.total_capacity
                          }
                          onClick={(e) => openAssign(e, acc)}
                        >
                          Assign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {formOpen && (
        <AccommodationFormDialog
          initial={formTarget}
          onClose={() => setFormOpen(false)}
          onSaved={handleFormSaved}
        />
      )}

      {assignTarget && (
        <AssignWorkerDialog
          accommodation={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            setAssignTarget(null);
            load();
          }}
        />
      )}

      {detailTarget && (
        <DetailPanel
          accommodation={detailTarget}
          onClose={() => setDetailTarget(null)}
          onMoveOut={handleMoveOut}
        />
      )}
    </div>
  );
}
