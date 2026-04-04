"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, CheckCircle, AlertCircle, Clock, ChevronRight } from "lucide-react";

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
import {
  getClients,
  uploadHoursFile,
  validateBatch,
  commitBatch,
  getClientHoursImportHistory,
} from "@/lib/api";
import type {
  Client,
  HoursImportBatch,
  PreviewRow,
  UploadResponse,
  Paginated,
} from "@/types/api";

// ── Constants ──────────────────────────────────────────────────────────────────

const INTERNAL_FIELDS = [
  { value: "", label: "— pomiń —" },
  { value: "worker_name", label: "Imię i nazwisko pracownika" },
  { value: "work_date", label: "Data pracy" },
  { value: "hours_worked", label: "Godziny przepracowane" },
  { value: "overtime_hours", label: "Nadgodziny" },
  { value: "absence_type", label: "Typ nieobecności" },
  { value: "notes", label: "Uwagi" },
  { value: "pesel", label: "PESEL" },
  { value: "employee_id", label: "ID pracownika" },
];

const MATCH_STATUS_STYLE: Record<string, string> = {
  matched: "bg-green-50 text-green-700",
  unmatched: "bg-amber-50 text-amber-700",
  flagged: "bg-red-50 text-red-700",
};

const MATCH_STATUS_LABEL: Record<string, string> = {
  matched: "Dopasowany",
  unmatched: "Niedopasowany",
  flagged: "Błąd",
};

const BATCH_STATUS_LABEL: Record<string, string> = {
  pending: "Oczekujący",
  mapped: "Zmapowany",
  validated: "Zwalidowany",
  imported: "Zaimportowany",
  failed: "Błąd",
};

type Step = "client" | "upload" | "mapping" | "preview" | "done";

// ── Component ──────────────────────────────────────────────────────────────────

export default function HoursImportPage() {
  const [step, setStep] = useState<Step>("client");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Upload step
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping step
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [saveMapping, setSaveMapping] = useState(true);

  // Preview step
  const [validating, setValidating] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewStats, setPreviewStats] = useState({ matched: 0, unmatched: 0, flagged: 0 });
  const [validateError, setValidateError] = useState<string | null>(null);

  // Commit step
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  // Import history
  const [history, setHistory] = useState<HoursImportBatch[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    getClients(1, 200).then((res) => setClients(res.items)).catch(() => {});
  }, []);

  const loadHistory = useCallback(async (clientId: string) => {
    setHistoryLoading(true);
    try {
      const res = await getClientHoursImportHistory(clientId, 1, 10);
      setHistory(res.items);
    } catch {
      // non-blocking
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    setStep("upload");
    loadHistory(id);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadHoursFile(selectedClientId, file);
      setUploadResult(result);
      // Pre-fill mappings from suggestions
      setMappings(result.suggested_mappings);
      setStep("mapping");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Błąd przesyłania pliku.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleValidate() {
    if (!uploadResult) return;
    setValidating(true);
    setValidateError(null);
    try {
      const res = await validateBatch(uploadResult.batch_id, mappings, saveMapping);
      setPreviewRows(res.rows);
      setPreviewStats({
        matched: res.matched_count,
        unmatched: res.unmatched_count,
        flagged: res.flagged_count,
      });
      setStep("preview");
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : "Błąd walidacji.");
    } finally {
      setValidating(false);
    }
  }

  async function handleCommit() {
    if (!uploadResult) return;
    setCommitting(true);
    setCommitError(null);
    try {
      const res = await commitBatch(uploadResult.batch_id, mappings, saveMapping);
      setCommitResult({ imported: res.imported_count, skipped: res.skipped_count });
      setStep("done");
      if (selectedClientId) loadHistory(selectedClientId);
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "Błąd importu.");
    } finally {
      setCommitting(false);
    }
  }

  function resetWizard() {
    setStep("upload");
    setUploadResult(null);
    setMappings({});
    setPreviewRows([]);
    setCommitResult(null);
    setUploadError(null);
    setValidateError(null);
    setCommitError(null);
  }

  // ── Step indicators ──────────────────────────────────────────────────────────

  const STEPS: { key: Step; label: string }[] = [
    { key: "client", label: "Klient" },
    { key: "upload", label: "Plik" },
    { key: "mapping", label: "Kolumny" },
    { key: "preview", label: "Podgląd" },
    { key: "done", label: "Gotowe" },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Import godzin" />
      <main className="flex-1 space-y-6 p-6">

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {STEPS.map((s, i) => (
            <span key={s.key} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 font-medium ${
                  i < stepIndex
                    ? "bg-green-100 text-green-700"
                    : i === stepIndex
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-300" />
              )}
            </span>
          ))}
        </div>

        {/* ── Step 1: Select client ─────────────────────────────────────── */}
        {step === "client" && (
          <Card>
            <CardHeader>
              <CardTitle>Wybierz klienta</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full max-w-md rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={selectedClientId}
                onChange={(e) => {
                  if (e.target.value) handleClientSelect(e.target.value);
                }}
              >
                <option value="">— wybierz klienta —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Upload file ───────────────────────────────────────── */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Prześlij plik godzin (.xlsx / .csv)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Klient: <strong>{clients.find((c) => c.id === selectedClientId)?.company_name}</strong>
              </p>

              <label
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors hover:border-primary/60 hover:bg-muted/30 ${
                  uploading ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {uploading ? "Przesyłam..." : "Kliknij lub przeciągnij plik"}
                </span>
                <span className="text-xs text-muted-foreground">
                  XLSX, XLS, CSV — max 10 MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  disabled={uploading}
                  onChange={handleFileChange}
                />
              </label>

              {uploadError && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {uploadError}
                </p>
              )}

              <Button variant="ghost" size="sm" onClick={() => setStep("client")}>
                ← Zmień klienta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Column mapping ────────────────────────────────────── */}
        {step === "mapping" && uploadResult && (
          <Card>
            <CardHeader>
              <CardTitle>Mapowanie kolumn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Wykryto {uploadResult.headers.length} kolumn w {uploadResult.row_count} wierszach.
                Przypisz każdą kolumnę do odpowiedniego pola systemu.
              </p>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nagłówek arkusza</TableHead>
                      <TableHead>Pole systemu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadResult.headers.map((header) => (
                      <TableRow key={header}>
                        <TableCell className="font-mono text-sm">{header}</TableCell>
                        <TableCell>
                          <select
                            className="rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                            value={mappings[header] ?? ""}
                            onChange={(e) =>
                              setMappings((prev) => ({ ...prev, [header]: e.target.value }))
                            }
                          >
                            {INTERNAL_FIELDS.map((f) => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveMapping}
                  onChange={(e) => setSaveMapping(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Zapisz mapowanie dla tego klienta (używaj przy przyszłych importach)
              </label>

              {validateError && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {validateError}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetWizard} disabled={validating}>
                  ← Wróć
                </Button>
                <Button onClick={handleValidate} disabled={validating}>
                  {validating ? "Walidacja..." : "Dalej: podgląd →"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: Preview & validate ────────────────────────────────── */}
        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Podgląd i walidacja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 font-medium text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  {previewStats.matched} dopasowanych
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                  <Clock className="h-4 w-4" />
                  {previewStats.unmatched} niedopasowanych
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 font-medium text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {previewStats.flagged} z błędami
                </div>
              </div>

              <div className="max-h-[50vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Pracownik</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Godziny</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Błędy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => (
                      <TableRow key={row.row_index}>
                        <TableCell className="text-muted-foreground text-xs">
                          {row.row_index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.raw_data["Pracownik"] ??
                            row.raw_data["pracownik"] ??
                            row.raw_data["worker_name"] ??
                            "—"}
                        </TableCell>
                        <TableCell>{row.work_date ?? "—"}</TableCell>
                        <TableCell>{row.hours_worked ?? "—"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              MATCH_STATUS_STYLE[row.match_status] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {MATCH_STATUS_LABEL[row.match_status] ?? row.match_status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-red-600">
                          {row.validation_errors.length > 0
                            ? row.validation_errors.join("; ")
                            : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {commitError && (
                <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {commitError}
                </p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("mapping")} disabled={committing}>
                  ← Wróć do mapowania
                </Button>
                <Button onClick={handleCommit} disabled={committing}>
                  {committing ? "Importuję..." : `Importuj ${previewStats.matched} dopasowanych wierszy →`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 5: Done ──────────────────────────────────────────────── */}
        {step === "done" && commitResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                Import zakończony
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <p>
                  <strong>{commitResult.imported}</strong> wierszy zaimportowanych.{" "}
                  <strong>{commitResult.skipped}</strong> pominięto (niedopasowane lub z błędami).
                </p>
              </div>
              <Button onClick={resetWizard}>Importuj kolejny plik</Button>
            </CardContent>
          </Card>
        )}

        {/* ── Import history ─────────────────────────────────────────────── */}
        {selectedClientId && step !== "client" && (
          <Card>
            <CardHeader>
              <CardTitle>Historia importów</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Ładowanie...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak poprzednich importów.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plik</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Wiersze</TableHead>
                        <TableHead>Dopasowane</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Użytkownik</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {b.original_filename}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                b.status === "imported"
                                  ? "bg-green-50 text-green-700"
                                  : b.status === "failed"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-yellow-50 text-yellow-700"
                              }`}
                            >
                              {BATCH_STATUS_LABEL[b.status] ?? b.status}
                            </span>
                          </TableCell>
                          <TableCell>{b.row_count ?? "—"}</TableCell>
                          <TableCell>{b.matched_count ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(b.created_at).toLocaleDateString("pl-PL")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {b.uploaded_by_user ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
