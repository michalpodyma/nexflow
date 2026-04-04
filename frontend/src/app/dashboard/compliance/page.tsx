"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getComplianceAlerts, renewComplianceDocument } from "@/lib/api";
import type { AlertSeverity, ComplianceAlert, ComplianceDocumentType } from "@/types/api";

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

const DOC_TYPE_OPTIONS: { value: ComplianceDocumentType | ""; label: string }[] = [
  { value: "", label: "All Documents" },
  { value: "work_permit", label: "Work Permit" },
  { value: "health_cert", label: "Health Certificate" },
  { value: "safety_cert", label: "Safety Certificate (BHP)" },
  { value: "legalization_permit", label: "Legalization Permit" },
];

const SEVERITY_OPTIONS: { value: AlertSeverity | ""; label: string }[] = [
  { value: "", label: "All Severities" },
  { value: "critical", label: "Critical (<30d)" },
  { value: "warning", label: "Warning (30–59d)" },
  { value: "info", label: "Info (60–90d)" },
];

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[severity]}`}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

interface RenewModalProps {
  alert: ComplianceAlert;
  onClose: () => void;
  onSuccess: () => void;
}

function RenewModal({ alert, onClose, onSuccess }: RenewModalProps) {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const minDate = today.toISOString().split("T")[0];

  const [newExpiry, setNewExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleConfirm() {
    if (!newExpiry) {
      setError("Please select a new expiry date.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await renewComplianceDocument({
        worker_id: alert.worker_id,
        document_type: alert.document_type,
        new_expiry_date: newExpiry,
      });
      onSuccess();
    } catch {
      setError("Failed to renew document. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Renew Document</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {alert.worker_name} — {alert.document_label}
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Current expiry
          </label>
          <p className="text-sm text-gray-600">
            {new Date(alert.expiry_date).toLocaleDateString("pl-PL")}
          </p>
        </div>

        <div className="mb-5">
          <label htmlFor="new-expiry" className="mb-1 block text-xs font-medium text-gray-700">
            New expiry date <span className="text-red-500">*</span>
          </label>
          <input
            ref={inputRef}
            id="new-expiry"
            type="date"
            min={minDate}
            value={newExpiry}
            onChange={(e) => setNewExpiry(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !newExpiry}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Confirm Renewal"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [counts, setCounts] = useState<{ critical: number; warning: number; info: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "">("");
  const [docTypeFilter, setDocTypeFilter] = useState<ComplianceDocumentType | "">("");
  const [renewingAlert, setRenewingAlert] = useState<ComplianceAlert | null>(null);

  function fetchAlerts() {
    setLoading(true);
    setFetchError(false);
    getComplianceAlerts({
      severity: severityFilter || undefined,
      document_type: docTypeFilter || undefined,
    })
      .then((data) => {
        setAlerts(data.alerts);
        setCounts({
          critical: data.critical_count,
          warning: data.warning_count,
          info: data.info_count,
          total: data.total,
        });
      })
      .catch(() => {
        setAlerts([]);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter, docTypeFilter]);

  function handleRenewSuccess() {
    setRenewingAlert(null);
    fetchAlerts();
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Compliance" />
      <main className="flex-1 p-6 space-y-6">
        {fetchError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load compliance alerts. Please refresh the page or try again.
          </div>
        )}

        {/* Summary cards — always reflect global totals (unaffected by active filters) */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical (&lt;30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${counts === null ? "text-muted-foreground" : "text-red-600"}`}>
                {counts === null ? "—" : counts.critical}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Warning (30–59 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${counts === null ? "text-muted-foreground" : "text-yellow-600"}`}>
                {counts === null ? "—" : counts.warning}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming (60–90 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${counts === null ? "text-muted-foreground" : "text-blue-600"}`}>
                {counts === null ? "—" : counts.info}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value as ComplianceDocumentType | "")}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {DOC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | "")}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Alerts table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Upcoming Expirations
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Next 90 days
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
            ) : alerts.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">
                No compliance alerts for the selected filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-6 py-3">Worker</th>
                      <th className="px-6 py-3">Document</th>
                      <th className="px-6 py-3">Expiry Date</th>
                      <th className="px-6 py-3">Days Remaining</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {alerts.map((alert, idx) => (
                      <tr key={`${alert.worker_id}-${alert.document_type}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          <Link
                            href={`/dashboard/workers/${alert.worker_id}`}
                            className="hover:underline underline-offset-2"
                          >
                            {alert.worker_name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{alert.document_label}</td>
                        <td className="px-6 py-3 text-gray-600">
                          {new Date(alert.expiry_date).toLocaleDateString("pl-PL")}
                        </td>
                        <td className="px-6 py-3 text-gray-600">{alert.days_remaining}d</td>
                        <td className="px-6 py-3">
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td className="px-6 py-3">
                          {alert.document_type === "legalization_permit" ? (
                            <Link
                              href={`/dashboard/workers/${alert.worker_id}`}
                              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                            >
                              Regenerate
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRenewingAlert(alert)}
                              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                            >
                              Renew
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {renewingAlert && (
        <RenewModal
          alert={renewingAlert}
          onClose={() => setRenewingAlert(null)}
          onSuccess={handleRenewSuccess}
        />
      )}
    </div>
  );
}
