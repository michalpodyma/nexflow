"use client";

import { useCallback, useEffect, useState } from "react";

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
  assignWorkerToRoute,
  createTransportRoute,
  createVehicle,
  getRoutePassengers,
  getTransportRoutes,
  getVehicles,
  getWorkers,
  updateTransportAssignment,
  updateTransportRoute,
  updateVehicle,
} from "@/lib/api";
import type {
  RouteCreate,
  RoutePassenger,
  RouteUpdate,
  TransportRoute,
  Vehicle,
  VehicleCreate,
  VehicleUpdate,
  Worker,
} from "@/types/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function fmtTime(t: string | null) {
  if (!t) return "—";
  return t.slice(0, 5); // "HH:MM"
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground text-xs">—</span>;
  const d = new Date(date);
  const now = new Date();
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  const label = d.toLocaleDateString("pl-PL");
  if (daysLeft < 0)
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Expired {label}
      </span>
    );
  if (daysLeft <= 30)
    return (
      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        {label} ({daysLeft}d)
      </span>
    );
  return <span className="text-xs">{label}</span>;
}

// ── Vehicle form dialog ───────────────────────────────────────────────────────

interface VehicleFormProps {
  initial?: Vehicle;
  onClose: () => void;
  onSaved: (v: Vehicle) => void;
}

function VehicleFormDialog({ initial, onClose, onSaved }: VehicleFormProps) {
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [year, setYear] = useState(String(initial?.year ?? ""));
  const [plate, setPlate] = useState(initial?.license_plate ?? "");
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? ""));
  const [insurance, setInsurance] = useState(initial?.insurance_expiry_date ?? "");
  const [inspection, setInspection] = useState(initial?.inspection_expiry_date ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!make.trim() || !model.trim() || !plate.trim() || !capacity) {
      setError("Make, model, plate and capacity are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: VehicleCreate | VehicleUpdate = {
        make: make.trim(),
        model: model.trim(),
        year: year ? Number(year) : undefined,
        license_plate: plate.trim().toUpperCase(),
        capacity: Number(capacity),
        insurance_expiry_date: insurance || undefined,
        inspection_expiry_date: inspection || undefined,
        is_active: isActive,
        notes: notes.trim() || undefined,
      };
      const saved = initial
        ? await updateVehicle(initial.id, payload as VehicleUpdate)
        : await createVehicle(payload as VehicleCreate);
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
          {initial ? "Edit Vehicle" : "Add Vehicle"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Make *</label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Volkswagen"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Model *</label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Transporter"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                License plate *
              </label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm uppercase outline-none focus:ring-1 focus:ring-primary"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="e.g. FZI 12345"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Year</label>
              <input
                type="number"
                min={1990}
                max={2030}
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Capacity (seats) *
              </label>
              <input
                type="number"
                min={1}
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Insurance expiry
              </label>
              <input
                type="date"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Inspection expiry (przegląd)
              </label>
              <input
                type="date"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={inspection}
                onChange={(e) => setInspection(e.target.value)}
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
              id="v_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="v_is_active" className="text-sm text-gray-700">
              Active (in service)
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Add vehicle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Route form dialog ─────────────────────────────────────────────────────────

interface RouteFormProps {
  initial?: TransportRoute;
  vehicles: Vehicle[];
  workers: Worker[];
  onClose: () => void;
  onSaved: (r: TransportRoute) => void;
}

function RouteFormDialog({ initial, vehicles, workers, onClose, onSaved }: RouteFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [vehicleId, setVehicleId] = useState(initial?.vehicle_id ?? "");
  const [driverWorkerId, setDriverWorkerId] = useState(initial?.driver_worker_id ?? "");
  const [departure, setDeparture] = useState(initial?.departure_time?.slice(0, 5) ?? "");
  const [returnTime, setReturnTime] = useState(initial?.return_time?.slice(0, 5) ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !origin.trim() || !destination.trim()) {
      setError("Name, origin and destination are required.");
      return;
    }
    setSaving(true);
    try {
      const payload: RouteCreate | RouteUpdate = {
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        vehicle_id: vehicleId || undefined,
        driver_worker_id: driverWorkerId || undefined,
        departure_time: departure || undefined,
        return_time: returnTime || undefined,
        is_active: isActive,
      };
      const saved = initial
        ? await updateTransportRoute(initial.id, payload as RouteUpdate)
        : await createTransportRoute(payload as RouteCreate);
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
          {initial ? "Edit Route" : "Add Route"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Route name *</label>
            <input
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Słubice → Rzepin Amazon"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Origin *</label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Słubice"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Destination *
              </label>
              <input
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Rzepin Amazon"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Departure time
              </label>
              <input
                type="time"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Return time</label>
              <input
                type="time"
                className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Vehicle</label>
            <select
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">No vehicle assigned</option>
              {vehicles
                .filter((v) => v.is_active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.license_plate} — {v.make} {v.model} ({v.capacity} seats)
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Driver (worker)</label>
            <select
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={driverWorkerId}
              onChange={(e) => setDriverWorkerId(e.target.value)}
            >
              <option value="">No driver assigned</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.first_name} {w.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="r_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="r_is_active" className="text-sm text-gray-700">
              Active route
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Add route"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assign worker to route dialog ─────────────────────────────────────────────

interface AssignRouteWorkerProps {
  route: TransportRoute;
  workers: Worker[];
  onClose: () => void;
  onAssigned: () => void;
}

function AssignRouteWorkerDialog({
  route,
  workers,
  onClose,
  onAssigned,
}: AssignRouteWorkerProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [startDate, setStartDate] = useState(TODAY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedWorkerId || !startDate) {
      setError("Worker and start date are required.");
      return;
    }
    setSaving(true);
    try {
      await assignWorkerToRoute(route.id, {
        worker_id: selectedWorkerId,
        start_date: startDate,
      });
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
        <h2 className="mb-1 text-base font-semibold">Assign Worker to Route</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {route.name} — {route.origin} → {route.destination}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Worker *</label>
            <select
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
            >
              <option value="">Select worker…</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.first_name} {w.last_name}
                  {w.nationality ? ` (${w.nationality})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Start date *</label>
            <input
              type="date"
              className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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

// ── Route passengers panel ────────────────────────────────────────────────────

interface PassengersPanelProps {
  route: TransportRoute;
  onClose: () => void;
  onRemoved: () => void;
}

function PassengersPanel({ route, onClose, onRemoved }: PassengersPanelProps) {
  const [passengers, setPassengers] = useState<RoutePassenger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRoutePassengers(route.id)
      .then(setPassengers)
      .finally(() => setLoading(false));
  }, [route.id]);

  async function handleRemove(assignmentId: string) {
    await updateTransportAssignment(assignmentId, { end_date: TODAY });
    setPassengers((prev) => prev.filter((p) => p.assignment_id !== assignmentId));
    onRemoved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{route.name}</h2>
            <p className="text-xs text-muted-foreground">
              {route.origin} → {route.destination}
              {route.departure_time ? ` · Dep: ${fmtTime(route.departure_time)}` : ""}
              {route.return_time ? ` · Ret: ${fmtTime(route.return_time)}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-gray-900">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3 rounded-md border bg-gray-50 p-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Passengers</p>
            <p className="text-lg font-semibold">{route.assigned_workers}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Vehicle</p>
            <p className="text-sm font-medium">{route.vehicle_plate ?? "—"}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Driver</p>
            <p className="text-sm font-medium">{route.driver_name ?? "—"}</p>
          </div>
        </div>

        <h3 className="mb-2 text-sm font-medium">Current passengers</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : passengers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passengers assigned.</p>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {passengers.map((p) => (
                  <TableRow key={p.assignment_id}>
                    <TableCell className="font-medium">{p.worker_name}</TableCell>
                    <TableCell>{new Date(p.start_date).toLocaleDateString("pl-PL")}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                        onClick={() => handleRemove(p.assignment_id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vehicles tab ──────────────────────────────────────────────────────────────

interface VehiclesTabProps {
  vehicles: Vehicle[];
  total: number;
  loading: boolean;
  onAdd: () => void;
  onEdit: (v: Vehicle) => void;
}

function VehiclesTab({ vehicles, total, loading, onAdd, onEdit }: VehiclesTabProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{total} vehicles</p>
        <Button size="sm" onClick={onAdd}>
          + Add vehicle
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vehicles yet.</p>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Inspection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.license_plate}</TableCell>
                  <TableCell>
                    {v.make} {v.model}
                    {v.year ? (
                      <span className="ml-1 text-xs text-muted-foreground">({v.year})</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{v.capacity} seats</TableCell>
                  <TableCell>
                    <ExpiryBadge date={v.insurance_expiry_date} />
                  </TableCell>
                  <TableCell>
                    <ExpiryBadge date={v.inspection_expiry_date} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {v.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onEdit(v)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

// ── Routes tab ────────────────────────────────────────────────────────────────

interface RoutesTabProps {
  routes: TransportRoute[];
  total: number;
  loading: boolean;
  vehicles: Vehicle[];
  workers: Worker[];
  onAdd: () => void;
  onEdit: (r: TransportRoute) => void;
  onAssign: (r: TransportRoute) => void;
  onViewPassengers: (r: TransportRoute) => void;
}

function RoutesTab({
  routes,
  total,
  loading,
  onAdd,
  onEdit,
  onAssign,
  onViewPassengers,
}: RoutesTabProps) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{total} routes</p>
        <Button size="sm" onClick={onAdd}>
          + Add route
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : routes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No routes yet.</p>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Times</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Passengers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[160px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewPassengers(r)}
                >
                  <TableCell>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.origin} → {r.destination}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.departure_time || r.return_time ? (
                      <>
                        {fmtTime(r.departure_time)} / {fmtTime(r.return_time)}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{r.vehicle_plate ?? "—"}</TableCell>
                  <TableCell>{r.driver_name ?? "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {r.assigned_workers} workers
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.is_active ? "Active" : "Inactive"}
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
                        onClick={() => onEdit(r)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={!r.is_active}
                        onClick={() => onAssign(r)}
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
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "vehicles" | "routes";

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>("vehicles");

  // Vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesTotal, setVehiclesTotal] = useState(0);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleFormOpen, setVehicleFormOpen] = useState(false);
  const [vehicleFormTarget, setVehicleFormTarget] = useState<Vehicle | undefined>(undefined);

  // Routes state
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [routesTotal, setRoutesTotal] = useState(0);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [routeFormTarget, setRouteFormTarget] = useState<TransportRoute | undefined>(undefined);
  const [assignRouteTarget, setAssignRouteTarget] = useState<TransportRoute | null>(null);
  const [passengersRouteTarget, setPassengersRouteTarget] = useState<TransportRoute | null>(null);

  // Shared data for forms
  const [workers, setWorkers] = useState<Worker[]>([]);

  const loadVehicles = useCallback(() => {
    setVehiclesLoading(true);
    getVehicles(1, 100)
      .then((res) => {
        setVehicles(res.items);
        setVehiclesTotal(res.total);
      })
      .finally(() => setVehiclesLoading(false));
  }, []);

  const loadRoutes = useCallback(() => {
    setRoutesLoading(true);
    getTransportRoutes(1, 100)
      .then((res) => {
        setRoutes(res.items);
        setRoutesTotal(res.total);
      })
      .finally(() => setRoutesLoading(false));
  }, []);

  useEffect(() => {
    loadVehicles();
    loadRoutes();
    getWorkers(1, 500).then((res) => setWorkers(res.items));
  }, [loadVehicles, loadRoutes]);

  function handleVehicleSaved(saved: Vehicle) {
    setVehicleFormOpen(false);
    setVehicles((prev) => {
      const idx = prev.findIndex((v) => v.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (!vehicleFormTarget) setVehiclesTotal((t) => t + 1);
  }

  function handleRouteSaved(saved: TransportRoute) {
    setRouteFormOpen(false);
    setRoutes((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (!routeFormTarget) setRoutesTotal((t) => t + 1);
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Transport" />
      <main className="flex-1 p-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b">
          {(["vehicles", "routes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "vehicles" && (
          <VehiclesTab
            vehicles={vehicles}
            total={vehiclesTotal}
            loading={vehiclesLoading}
            onAdd={() => {
              setVehicleFormTarget(undefined);
              setVehicleFormOpen(true);
            }}
            onEdit={(v) => {
              setVehicleFormTarget(v);
              setVehicleFormOpen(true);
            }}
          />
        )}

        {tab === "routes" && (
          <RoutesTab
            routes={routes}
            total={routesTotal}
            loading={routesLoading}
            vehicles={vehicles}
            workers={workers}
            onAdd={() => {
              setRouteFormTarget(undefined);
              setRouteFormOpen(true);
            }}
            onEdit={(r) => {
              setRouteFormTarget(r);
              setRouteFormOpen(true);
            }}
            onAssign={(r) => setAssignRouteTarget(r)}
            onViewPassengers={(r) => setPassengersRouteTarget(r)}
          />
        )}
      </main>

      {vehicleFormOpen && (
        <VehicleFormDialog
          initial={vehicleFormTarget}
          onClose={() => setVehicleFormOpen(false)}
          onSaved={handleVehicleSaved}
        />
      )}

      {routeFormOpen && (
        <RouteFormDialog
          initial={routeFormTarget}
          vehicles={vehicles}
          workers={workers}
          onClose={() => setRouteFormOpen(false)}
          onSaved={handleRouteSaved}
        />
      )}

      {assignRouteTarget && (
        <AssignRouteWorkerDialog
          route={assignRouteTarget}
          workers={workers}
          onClose={() => setAssignRouteTarget(null)}
          onAssigned={() => {
            setAssignRouteTarget(null);
            loadRoutes();
          }}
        />
      )}

      {passengersRouteTarget && (
        <PassengersPanel
          route={passengersRouteTarget}
          onClose={() => setPassengersRouteTarget(null)}
          onRemoved={loadRoutes}
        />
      )}
    </div>
  );
}
