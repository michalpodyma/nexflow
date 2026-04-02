"use client";

import { useEffect, useState } from "react";
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
import { getWorkers } from "@/lib/api";
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

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expiringOnly, setExpiringOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    getWorkers(1, 20, expiringOnly)
      .then((res) => {
        setWorkers(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [expiringOnly]);

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Workers" />
      <main className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} total</p>
          <Button
            variant={expiringOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setExpiringOnly((v) => !v)}
          >
            {expiringOnly ? "All workers" : "Expiring documents"}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : workers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {expiringOnly ? "No workers with documents expiring in the next 30 days." : "No workers yet."}
          </p>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Current Assignment</TableHead>
                  <TableHead>Doc Expiry</TableHead>
                  <TableHead>Status</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
