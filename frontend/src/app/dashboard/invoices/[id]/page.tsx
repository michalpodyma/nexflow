"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
import { deleteInvoice, getClients, getInvoice, updateInvoice } from "@/lib/api";
import type { Client, InvoiceWithLineItems, Paginated, PaymentStatus } from "@/types/api";

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

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceWithLineItems | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getInvoice(id)
      .then((data) => {
        setInvoice(data);
        return getClients(1, 200);
      })
      .then((res: Paginated<Client>) => {
        const found = res.items.find((c) => c.id === invoice?.client_id);
        if (found) setClientName(found.company_name);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Second pass to get client name once invoice is loaded
  useEffect(() => {
    if (!invoice) return;
    getClients(1, 200)
      .then((res: Paginated<Client>) => {
        const found = res.items.find((c) => c.id === invoice.client_id);
        if (found) setClientName(found.company_name);
      })
      .catch(() => {});
  }, [invoice?.client_id]);

  async function handleStatusChange(status: PaymentStatus) {
    if (!invoice) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateInvoice(invoice.id, { payment_status: status });
      setInvoice((prev) => prev ? { ...prev, ...updated } : prev);
    } catch (err: unknown) {
      alert((err as Error).message ?? "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      router.push("/dashboard/invoices");
    } catch (err: unknown) {
      alert((err as Error).message ?? "Failed to delete invoice");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Invoice" />
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Invoice" />
        <div className="p-6">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error ?? "Invoice not found"}</div>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>Back</Button>
        </div>
      </div>
    );
  }

  const isDraft = invoice.payment_status === "pending";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title={invoice.invoice_number} />

      <div className="flex-1 overflow-auto p-6">
        {/* Back + actions */}
        <div className="mb-6 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/invoices")}>
            ← All Invoices
          </Button>
          <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.payment_status]}`}>
            {STATUS_LABELS[invoice.payment_status]}
          </span>
          <div className="ml-auto flex gap-2">
            {isDraft && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange("paid")}
                >
                  Mark as Paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deleting}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDelete}
                >
                  Delete Draft
                </Button>
              </>
            )}
            {invoice.payment_status === "overdue" && (
              <Button
                size="sm"
                variant="outline"
                disabled={updatingStatus}
                onClick={() => handleStatusChange("paid")}
              >
                Mark as Paid
              </Button>
            )}
          </div>
        </div>

        {/* Invoice summary card */}
        <div className="mb-6 rounded-lg border bg-white p-6">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            <LabelValue label="Invoice number" value={<span className="font-mono font-semibold">{invoice.invoice_number}</span>} />
            <LabelValue label="Client" value={clientName ?? invoice.client_id} />
            <LabelValue label="Currency" value={invoice.currency} />
            <LabelValue label="VAT rate" value={`${invoice.vat_rate}%`} />
            <LabelValue label="Sale date" value={formatDate(invoice.sale_date)} />
            <LabelValue label="Due date" value={formatDate(invoice.due_date)} />
            <LabelValue
              label="Period"
              value={
                invoice.period_start && invoice.period_end
                  ? `${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}`
                  : "—"
              }
            />
          </dl>

          {/* Totals */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Net amount</span>
                  <span>{formatAmount(invoice.net_amount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VAT ({invoice.vat_rate}%)</span>
                  <span>{formatAmount(invoice.vat_amount, invoice.currency)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 text-base font-semibold">
                  <span>Gross amount</span>
                  <span>{formatAmount(invoice.gross_amount, invoice.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-lg border bg-white">
          <div className="border-b px-6 py-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Line items ({invoice.line_items.length})
            </h2>
          </div>
          {invoice.line_items.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">No line items</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Net amount</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell className="text-right text-sm">
                      {item.hours_worked ? parseFloat(item.hours_worked).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.unit_rate ? formatAmount(item.unit_rate, invoice.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatAmount(item.net_amount, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {item.period_start && item.period_end
                        ? `${item.period_start} – ${item.period_end}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Summary row */}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell colSpan={3} className="text-sm">Total net</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatAmount(invoice.net_amount, invoice.currency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
