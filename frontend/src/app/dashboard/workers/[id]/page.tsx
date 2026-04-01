"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWorker, updateWorkerAttendanceStatus } from "@/lib/api";
import type { AttendanceStatus, WorkerDetail } from "@/types/api";

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

const ALL_STATUSES: AttendanceStatus[] = ["active", "off", "terminated"];

export default function WorkerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    getWorker(id)
      .then(setWorker)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load worker"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(status: AttendanceStatus) {
    if (!worker || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const updated = await updateWorkerAttendanceStatus(worker.id, status);
      setWorker((prev) => prev ? { ...prev, attendance_status: updated.attendance_status } : prev);
    } catch {
      // revert is implicit — state unchanged on error
    } finally {
      setStatusUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <Header title="Worker Profile" />
        <main className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <Header title="Worker Profile" />
        <main className="flex-1 p-6">
          <p className="text-sm text-destructive">{error ?? "Worker not found"}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title={`${worker.first_name} ${worker.last_name}`} />
      <main className="flex-1 space-y-6 p-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.push("/dashboard/workers")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workers
        </Button>

        {/* Worker details card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Worker Details</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-normal text-muted-foreground">Status:</span>
                <select
                  value={worker.attendance_status}
                  disabled={statusUpdating}
                  onChange={(e) => handleStatusChange(e.target.value as AttendanceStatus)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${STATUS_STYLES[worker.attendance_status]}`}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{worker.first_name} {worker.last_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{worker.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{worker.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Nationality</dt>
                <dd className="font-medium">{worker.nationality ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Work Permit</dt>
                <dd className="font-medium">{worker.work_permit_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Permit Expiry</dt>
                <dd className="font-medium">
                  {worker.work_permit_expiry
                    ? new Date(worker.work_permit_expiry).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Health Cert Expiry</dt>
                <dd className="font-medium">
                  {worker.health_cert_expiry
                    ? new Date(worker.health_cert_expiry).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">A1 Status</dt>
                <dd className="font-medium">{worker.a1_cert_status ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Added</dt>
                <dd className="font-medium">{new Date(worker.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Assignment history */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment History</CardTitle>
          </CardHeader>
          <CardContent>
            {worker.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments recorded.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worker.assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.position}</TableCell>
                        <TableCell>{a.client_name}</TableCell>
                        <TableCell>{new Date(a.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {a.end_date ? new Date(a.end_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              a.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {a.is_active ? "Active" : "Ended"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
