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
import { WorkerFormDialog } from "@/components/workers/WorkerFormDialog";
import { archiveWorker, getWorkers } from "@/lib/api";
import type { AttendanceStatus, Worker } from "@/types/api";

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  active: "bg-green-100 text-green-800",
  off: "bg-yellow-100 text-yellow-800",
  terminated: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  active: "Active",
  off: "Off",
  terminated: "Terminated",
};

/** Returns days until the given ISO date string. Negative = already expired. */
function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

interface ExpiryBadgeProps {
  label: string;
  dateStr: string | null;
}

function ExpiryBadge({ label, dateStr }: ExpiryBadgeProps) {
  if (!dateStr) return null;
  const days = daysUntil(dateStr);

  let style: string;
  let text: string;

  if (days < 0) {
    style = "bg-red-100 text-red-800 font-bold";
    text = `${label}: EXPIRED`;
  } else if (days < 30) {
    style = "bg-red-100 text-red-700";
    text = `${label}: ${days}d`;
  } else if (days < 90) {
    style = "bg-yellow-100 text-yellow-800";
    text = `${label}: ${days}d`;
  } else {
    style = "bg-green-100 text-green-800";
    text = `${label}: ${days}d`;
  }

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {text}
    </span>
  );
}

function DocExpiryCell({ worker }: { worker: Worker }) {
  const docs = [
    { label: "WP", dateStr: worker.work_permit_expiry },
    { label: "Med", dateStr: worker.health_cert_expiry },
    { label: "BHP", dateStr: worker.safety_cert_expiry },
  ].filter((d) => d.dateStr !== null);

  if (docs.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {docs.map((d) => (
        <ExpiryBadge key={d.label} label={d.label} dateStr={d.dateStr} />
      ))}
    </div>
  );
}

interface ArchiveConfirmProps {
  worker: Worker;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
}

function ArchiveConfirm({ worker, onConfirm, onCancel, loading, error }: ArchiveConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-base font-semibold">Archive worker?</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          <strong>{worker.first_name} {worker.last_name}</strong> will be hidden from the active
          workers list. You can view archived workers using the toggle.
        </p>
        {error && (
          <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Archiving…" : "Archive"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Dialog state
  const [formTarget, setFormTarget] = useState<Worker | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  // Archive confirm state
  const [archiveTarget, setArchiveTarget] = useState<Worker | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getWorkers(1, 20, expiringOnly, showArchived)
      .then((res) => {
        setWorkers(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [expiringOnly, showArchived]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddDialog() {
    setFormTarget(undefined);
    setFormOpen(true);
  }

  function openEditDialog(e: React.MouseEvent, worker: Worker) {
    e.stopPropagation();
    setFormTarget(worker);
    setFormOpen(true);
  }

  function openArchiveConfirm(e: React.MouseEvent, worker: Worker) {
    e.stopPropagation();
    setArchiveError(null);
    setArchiveTarget(worker);
  }

  function handleFormSaved(saved: Worker) {
    setFormOpen(false);
    // Update in-place or prepend
    setWorkers((prev) => {
      const idx = prev.findIndex((w) => w.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (!formTarget) setTotal((t) => t + 1);
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveWorker(archiveTarget.id);
      setArchiveTarget(null);
      // Remove from list (archived are hidden by default)
      if (!showArchived) {
        setWorkers((prev) => prev.filter((w) => w.id !== archiveTarget.id));
        setTotal((t) => t - 1);
      } else {
        // Refresh to get updated archived_at timestamp
        load();
      }
    } catch (err: unknown) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive worker. Please try again.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Workers" />
      <main className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{total} total</p>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button
              variant={expiringOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setExpiringOnly((v) => !v)}
            >
              {expiringOnly ? "All workers" : "Expiring documents"}
            </Button>
            <Button size="sm" onClick={openAddDialog}>
              + Add worker
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : workers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {expiringOnly
              ? "No workers with documents expiring in the next 30 days."
              : "No workers yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Current Assignment</TableHead>
                  <TableHead>Doc Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((w) => (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/workers/${w.id}`)}
                  >
                    <TableCell className="font-medium">
                      {w.first_name} {w.last_name}
                      {w.archived_at && (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                          archived
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{w.phone ?? "—"}</TableCell>
                    <TableCell>{w.nationality ?? "—"}</TableCell>
                    <TableCell>
                      {w.current_client_name ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{w.current_client_name}</span>
                          {w.assignment_start_date && (
                            <span className="text-xs text-muted-foreground">
                              since {new Date(w.assignment_start_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DocExpiryCell worker={w} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[w.attendance_status]}`}
                      >
                        {STATUS_LABELS[w.attendance_status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => openEditDialog(e, w)}
                        >
                          Edit
                        </Button>
                        {!w.archived_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                            onClick={(e) => openArchiveConfirm(e, w)}
                          >
                            Archive
                          </Button>
                        )}
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
        <WorkerFormDialog
          worker={formTarget}
          onClose={() => setFormOpen(false)}
          onSaved={handleFormSaved}
        />
      )}

      {archiveTarget && (
        <ArchiveConfirm
          worker={archiveTarget}
          onConfirm={handleArchiveConfirm}
          onCancel={() => { setArchiveTarget(null); setArchiveError(null); }}
          loading={archiving}
          error={archiveError}
        />
      )}
    </div>
  );
}
