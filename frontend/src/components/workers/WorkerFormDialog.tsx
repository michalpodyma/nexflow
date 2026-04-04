"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorker, updateWorker } from "@/lib/api";
import type { AttendanceStatus, Worker, WorkerCreate, WorkPermitType } from "@/types/api";

interface WorkerFormDialogProps {
  /** Worker to edit; undefined = create mode */
  worker?: Worker;
  onClose: () => void;
  onSaved: (worker: Worker) => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  nationality: string;
  phone: string;
  email: string;
  address: string;
  date_of_birth: string;
  work_permit_type: string;
  work_permit_expiry: string;
  health_cert_expiry: string;
  safety_cert_expiry: string;
  a1_cert_status: string;
  attendance_status: AttendanceStatus;
  gdpr_consent: boolean;
  // praca.gov fields
  gender: string;
  citizenship: string;
  travel_document_type: string;
  travel_document_series: string;
  travel_document_number: string;
  travel_document_issue_date: string;
  travel_document_expiry: string;
}

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— wybierz —" },
  { value: "kobieta", label: "Kobieta" },
  { value: "mężczyzna", label: "Mężczyzna" },
];

const WORK_PERMIT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— select —" },
  { value: "UE", label: "EU citizen" },
  { value: "non_UE_permit", label: "Non-EU (work permit)" },
  { value: "none", label: "None" },
];

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "off", label: "Off" },
  { value: "terminated", label: "Terminated" },
];

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  // Backend returns full ISO datetime; date input needs YYYY-MM-DD
  return iso.slice(0, 10);
}

function toIsoDatetime(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return `${dateStr}T00:00:00Z`;
}

export function WorkerFormDialog({ worker, onClose, onSaved }: WorkerFormDialogProps) {
  const isEdit = !!worker;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    first_name: worker?.first_name ?? "",
    last_name: worker?.last_name ?? "",
    nationality: worker?.nationality ?? "",
    phone: worker?.phone ?? "",
    email: worker?.email ?? "",
    address: worker?.address ?? "",
    date_of_birth: toDateInput(worker?.date_of_birth),
    work_permit_type: worker?.work_permit_type ?? "",
    work_permit_expiry: toDateInput(worker?.work_permit_expiry),
    health_cert_expiry: toDateInput(worker?.health_cert_expiry),
    safety_cert_expiry: toDateInput(worker?.safety_cert_expiry),
    a1_cert_status: worker?.a1_cert_status ?? "",
    attendance_status: worker?.attendance_status ?? "active",
    gdpr_consent: worker?.gdpr_consent ?? false,
    // praca.gov fields
    gender: worker?.gender ?? "",
    citizenship: worker?.citizenship ?? "",
    travel_document_type: worker?.travel_document_type ?? "",
    travel_document_series: worker?.travel_document_series ?? "",
    travel_document_number: worker?.travel_document_number ?? "",
    travel_document_issue_date: toDateInput(worker?.travel_document_issue_date),
    travel_document_expiry: toDateInput(worker?.travel_document_expiry),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let saved: Worker;
      if (isEdit) {
        saved = await updateWorker(worker!.id, {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          nationality: form.nationality.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          date_of_birth: toIsoDatetime(form.date_of_birth) ?? null,
          work_permit_type: (form.work_permit_type as WorkPermitType) || null,
          work_permit_expiry: toIsoDatetime(form.work_permit_expiry) ?? null,
          health_cert_expiry: toIsoDatetime(form.health_cert_expiry) ?? null,
          safety_cert_expiry: toIsoDatetime(form.safety_cert_expiry) ?? null,
          a1_cert_status: form.a1_cert_status.trim() || null,
          attendance_status: form.attendance_status,
          gender: form.gender || null,
          citizenship: form.citizenship.trim() || null,
          travel_document_type: form.travel_document_type.trim() || null,
          travel_document_series: form.travel_document_series.trim() || null,
          travel_document_number: form.travel_document_number.trim() || null,
          travel_document_issue_date: toIsoDatetime(form.travel_document_issue_date) ?? null,
          travel_document_expiry: toIsoDatetime(form.travel_document_expiry) ?? null,
        });
      } else {
        const payload: WorkerCreate = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          nationality: form.nationality.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          address: form.address.trim() || undefined,
          date_of_birth: toIsoDatetime(form.date_of_birth),
          work_permit_type: (form.work_permit_type as WorkPermitType) || undefined,
          work_permit_expiry: toIsoDatetime(form.work_permit_expiry),
          health_cert_expiry: toIsoDatetime(form.health_cert_expiry),
          safety_cert_expiry: toIsoDatetime(form.safety_cert_expiry),
          a1_cert_status: form.a1_cert_status.trim() || undefined,
          attendance_status: form.attendance_status,
          gdpr_consent: form.gdpr_consent,
          gdpr_consent_at: form.gdpr_consent ? new Date().toISOString() : undefined,
          gender: form.gender || undefined,
          citizenship: form.citizenship.trim() || undefined,
          travel_document_type: form.travel_document_type.trim() || undefined,
          travel_document_series: form.travel_document_series.trim() || undefined,
          travel_document_number: form.travel_document_number.trim() || undefined,
          travel_document_issue_date: toIsoDatetime(form.travel_document_issue_date),
          travel_document_expiry: toIsoDatetime(form.travel_document_expiry),
        };
        saved = await createWorker(payload);
      }
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative mx-4 w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-lg bg-white shadow-xl sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Worker" : "Add Worker"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Personal */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Personal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">First name *</label>
                <Input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  placeholder="Jan"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Last name *</label>
                <Input
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  placeholder="Kowalski"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date of birth</label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nationality (ISO 2)</label>
                <Input
                  value={form.nationality}
                  onChange={(e) => set("nationality", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="PL"
                  maxLength={2}
                />
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+48 600 123 456"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jan@example.com"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Address</label>
                <Input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="ul. Mickiewicza 1/2, 69-100 Słubice"
                />
              </div>
            </div>
          </section>

          {/* Documents */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Work permit type</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.work_permit_type}
                  onChange={(e) => set("work_permit_type", e.target.value)}
                >
                  {WORK_PERMIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Work permit expiry</label>
                <Input
                  type="date"
                  value={form.work_permit_expiry}
                  onChange={(e) => set("work_permit_expiry", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Health cert expiry (Med)</label>
                <Input
                  type="date"
                  value={form.health_cert_expiry}
                  onChange={(e) => set("health_cert_expiry", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Safety cert expiry (BHP)</label>
                <Input
                  type="date"
                  value={form.safety_cert_expiry}
                  onChange={(e) => set("safety_cert_expiry", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">A1 cert status</label>
                <Input
                  value={form.a1_cert_status}
                  onChange={(e) => set("a1_cert_status", e.target.value)}
                  placeholder="valid / pending / n/a"
                />
              </div>
            </div>
          </section>

          {/* Dokumenty podróży / praca.gov */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dokumenty podróży / praca.gov
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Płeć</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Obywatelstwo</label>
                <Input
                  value={form.citizenship}
                  onChange={(e) => set("citizenship", e.target.value)}
                  placeholder="ukraińskie"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Rodzaj dokumentu</label>
                <Input
                  value={form.travel_document_type}
                  onChange={(e) => set("travel_document_type", e.target.value)}
                  placeholder="paszport / dowód osobisty"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Seria dokumentu</label>
                <Input
                  value={form.travel_document_series}
                  onChange={(e) => set("travel_document_series", e.target.value)}
                  placeholder="AA"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Numer dokumentu</label>
                <Input
                  value={form.travel_document_number}
                  onChange={(e) => set("travel_document_number", e.target.value)}
                  placeholder="1234567"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Data wydania</label>
                <Input
                  type="date"
                  value={form.travel_document_issue_date}
                  onChange={(e) => set("travel_document_issue_date", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Data ważności dokumentu</label>
                <Input
                  type="date"
                  value={form.travel_document_expiry}
                  onChange={(e) => set("travel_document_expiry", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Employment */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Employment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.attendance_status}
                  onChange={(e) => set("attendance_status", e.target.value as AttendanceStatus)}
                >
                  {ATTENDANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* GDPR — only shown on create */}
          {!isEdit && (
            <section>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.gdpr_consent}
                  onChange={(e) => set("gdpr_consent", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Worker has given GDPR consent for data processing
              </label>
            </section>
          )}

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add worker"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
