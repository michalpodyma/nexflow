"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getComplianceAlerts } from "@/lib/api";
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

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [counts, setCounts] = useState<{ critical: number; warning: number; info: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "">("");
  const [docTypeFilter, setDocTypeFilter] = useState<ComplianceDocumentType | "">("");

  useEffect(() => {
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
  }, [severityFilter, docTypeFilter]);

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
                          {alert.worker_name}
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
                          <Link
                            href={`/dashboard/workers/${alert.worker_id}`}
                            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                          >
                            Renew
                          </Link>
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
    </div>
  );
}
