"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { deleteInvoice, getClients, getInvoices } from "@/lib/api";
import type { Client, Invoice, Paginated, PaymentStatus } from "@/types/api";

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Draft",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

function formatAmount(amount: string, currency: string): string {
  return `${parseFloat(amount).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${currency}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL");
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [clientList, setClientList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    getClients(1, 200).then((res: Paginated<Client>) => {
      setClientList(res.items);
      const map: Record<string, string> = {};
      for (const c of res.items) map[c.id] = c.company_name;
      setClients(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getInvoices({
      client_id: filterClientId || undefined,
      status: filterStatus || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((res) => {
        setInvoices(res.items);
        setTotal(res.total);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, filterStatus, filterClientId]);

  async function handleDelete(invoice: Invoice) {
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    setDeleting(invoice.id);
    try {
      await deleteInvoice(invoice.id);
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
      setTotal((prev) => prev - 1);
    } catch (err: unknown) {
      alert((err as Error).message ?? "Failed to delete invoice");
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Invoices" />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="pending">Draft</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={filterClientId}
            onChange={(e) => { setFilterClientId(e.target.value); setPage(1); }}
          >
            <option value="">All clients</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>

          <span className="ml-auto text-sm text-gray-500">{total} invoice{total !== 1 ? "s" : ""}</span>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Sale Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-gray-400">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-gray-400">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{clients[inv.client_id] ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {inv.period_start && inv.period_end
                        ? `${formatDate(inv.period_start)} – ${formatDate(inv.period_end)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(inv.sale_date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.due_date)}</TableCell>
                    <TableCell className="text-right text-sm">{formatAmount(inv.net_amount, inv.currency)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatAmount(inv.gross_amount, inv.currency)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.payment_status]}`}>
                        {STATUS_LABELS[inv.payment_status]}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View
                        </Link>
                        {inv.payment_status === "pending" && (
                          <button
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            disabled={deleting === inv.id}
                            onClick={() => handleDelete(inv)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
