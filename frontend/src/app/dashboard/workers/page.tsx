"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/Header";
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

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkers()
      .then((res) => {
        setWorkers(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Workers" />
      <main className="flex-1 p-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : workers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workers yet.</p>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Work Permit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
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
                    <TableCell>{w.email ?? "—"}</TableCell>
                    <TableCell>{w.nationality ?? "—"}</TableCell>
                    <TableCell>{w.work_permit_type ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[w.attendance_status]}`}
                      >
                        {STATUS_LABELS[w.attendance_status]}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
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
