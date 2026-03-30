"use client";

import { useEffect, useState } from "react";

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
import type { Worker } from "@/types/api";

export default function WorkersPage() {
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
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      {w.first_name} {w.last_name}
                    </TableCell>
                    <TableCell>{w.phone ?? "—"}</TableCell>
                    <TableCell>{w.email ?? "—"}</TableCell>
                    <TableCell>{w.nationality ?? "—"}</TableCell>
                    <TableCell>{w.work_permit_type ?? "—"}</TableCell>
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
