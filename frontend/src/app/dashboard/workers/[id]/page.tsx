"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { ArrowLeft, FileText, Download, ChevronDown, Pencil, Archive, RotateCcw, Upload, Trash2, Paperclip } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { WorkerFormDialog } from "@/components/workers/WorkerFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  archiveWorker,
  getWorker,
  restoreWorker,
  updateWorkerAttendanceStatus,
  getDocumentTemplates,
  generateDocument,
  finalizeDocument,
  getWorkerDocuments,
  listWorkerFiles,
  uploadWorkerFile,
  getWorkerFileDownloadUrl,
  deleteWorkerFile,
} from "@/lib/api";
import type {
  AttendanceStatus,
  DocumentTemplate,
  GeneratedDocument,
  WorkerDetail,
  WorkerFile,
  WorkerFileDocumentType,
} from "@/types/api";

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "Szkic",
  final: "Finalny",
  signed: "Podpisany",
};

const DOC_STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-50 text-yellow-700",
  final: "bg-green-50 text-green-700",
  signed: "bg-blue-50 text-blue-700",
};

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
  const [editOpen, setEditOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Generate document flow
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  // Worker documents list (generated contracts)
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<WorkerFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<WorkerFileDocumentType | "">("");
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    getWorker(id)
      .then(setWorker)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load worker"))
      .finally(() => setLoading(false));
    loadDocuments();
    loadUploadedFiles();
  }, [id]);

  async function loadDocuments() {
    setDocsLoading(true);
    try {
      const res = await getWorkerDocuments(id, 1, 10);
      setDocuments(res.items);
    } catch {
      // non-blocking
    } finally {
      setDocsLoading(false);
    }
  }

  async function loadUploadedFiles() {
    setFilesLoading(true);
    try {
      const res = await listWorkerFiles(id, 1, 50);
      setUploadedFiles(res.items);
    } catch {
      // non-blocking
    } finally {
      setFilesLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadWorkerFile(
        id,
        file,
        selectedDocType || undefined,
      );
      setUploadedFiles((prev) => [uploaded, ...prev]);
      setSelectedDocType("");
      e.target.value = "";
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadFile(fileId: string) {
    try {
      const { url } = await getWorkerFileDownloadUrl(id, fileId);
      window.open(url, "_blank");
    } catch {
      // non-blocking
    }
  }

  async function handleDeleteFile(fileId: string) {
    setDeletingFileId(fileId);
    try {
      await deleteWorkerFile(id, fileId);
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      // non-blocking
    } finally {
      setDeletingFileId(null);
    }
  }

  async function openGenDialog() {
    setGenError(null);
    setGeneratedDoc(null);
    setPreviewHtml(null);
    setSelectedTemplateId("");
    try {
      const res = await getDocumentTemplates(1, 50, true);
      setTemplates(res.items);
    } catch {
      setTemplates([]);
    }
    setGenDialogOpen(true);
  }

  async function handleGenerate() {
    if (!selectedTemplateId) {
      setGenError("Wybierz szablon.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const { getGeneratedDocument } = await import("@/lib/api");
      const doc = await generateDocument({ template_id: selectedTemplateId, worker_id: id });
      setGeneratedDoc(doc);
      const detail = await getGeneratedDocument(doc.id);
      setPreviewHtml(detail.rendered_html);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Błąd generowania dokumentu.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinalize() {
    if (!generatedDoc) return;
    setFinalizing(true);
    try {
      const finalized = await finalizeDocument(generatedDoc.id);
      setGeneratedDoc(finalized);
      loadDocuments();
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Błąd finalizacji.");
    } finally {
      setFinalizing(false);
    }
  }

  function handleDownloadPdf() {
    if (!generatedDoc) return;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    window.open(`${apiBase}/api/v1/documents/${generatedDoc.id}/pdf`, "_blank");
  }

  function handlePrint() {
    if (!previewHtml) return;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(previewHtml);
      win.document.close();
      win.print();
    }
  }

  async function handleArchive() {
    if (!worker) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      const updated = await archiveWorker(worker.id);
      setWorker((prev) => prev ? { ...prev, archived_at: updated.archived_at } : prev);
      setArchiveDialogOpen(false);
    } catch (e: unknown) {
      setArchiveError(e instanceof Error ? e.message : "Failed to archive worker.");
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore() {
    if (!worker) return;
    setArchiving(true);
    try {
      const updated = await restoreWorker(worker.id);
      setWorker((prev) => prev ? { ...prev, archived_at: updated.archived_at } : prev);
    } catch {
      // non-blocking
    } finally {
      setArchiving(false);
    }
  }

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
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/dashboard/workers")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workers
          </Button>
          <div className="flex gap-2">
            {worker.archived_at ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-blue-600 hover:text-blue-700"
                disabled={archiving}
                onClick={handleRestore}
              >
                <RotateCcw className="h-4 w-4" />
                {archiving ? "Restoring…" : "Restore"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700"
                onClick={() => { setArchiveError(null); setArchiveDialogOpen(true); }}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button size="sm" className="gap-2" onClick={openGenDialog}>
              <FileText className="h-4 w-4" />
              Generuj dokument
            </Button>
          </div>
        </div>

        {/* Archived banner */}
        {worker.archived_at && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            This worker was archived on{" "}
            <strong>{new Date(worker.archived_at).toLocaleDateString()}</strong>. They are hidden
            from active lists and assignment flows.
          </div>
        )}

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
        {/* Generated Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Wygenerowane dokumenty
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <p className="text-sm text-muted-foreground">Ładowanie...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak dokumentów dla tego pracownika.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Szablon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data wygenerowania</TableHead>
                      <TableHead>Wygenerował</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.template_name_snapshot}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              DOC_STATUS_STYLES[doc.status] ?? "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {DOC_STATUS_LABELS[doc.status] ?? doc.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("pl-PL")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.generated_by_user ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.status === "final" || doc.status === "signed" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const apiBase =
                                  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
                                window.open(
                                  `${apiBase}/api/v1/documents/${doc.id}/pdf`,
                                  "_blank",
                                );
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uploaded Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Przesłane pliki
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload controls */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as WorkerFileDocumentType | "")}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— typ dokumentu —</option>
                <option value="work_permit">Zezwolenie na pracę</option>
                <option value="passport">Paszport</option>
                <option value="medical_exam">Badanie lekarskie</option>
                <option value="bhp_cert">Certyfikat BHP</option>
                <option value="a1_cert">Certyfikat A1</option>
                <option value="id_card">Dowód osobisty</option>
                <option value="other">Inne</option>
              </select>
              <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                <Upload className="h-4 w-4" />
                {uploading ? "Przesyłam..." : "Prześlij plik"}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {uploadError && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadError}
              </p>
            )}

            {filesLoading ? (
              <p className="text-sm text-muted-foreground">Ładowanie...</p>
            ) : uploadedFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak przesłanych plików.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa pliku</TableHead>
                      <TableHead>Typ dokumentu</TableHead>
                      <TableHead>Rozmiar</TableHead>
                      <TableHead>Przesłano</TableHead>
                      <TableHead>Przez</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedFiles.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{f.file_name}</TableCell>
                        <TableCell>
                          {f.document_type ? (
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              {f.document_type}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {f.file_size > 1024 * 1024
                            ? `${(f.file_size / 1024 / 1024).toFixed(1)} MB`
                            : `${(f.file_size / 1024).toFixed(0)} KB`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(f.created_at).toLocaleDateString("pl-PL")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{f.uploaded_by_user ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadFile(f.id)}
                              title="Pobierz"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              disabled={deletingFileId === f.id}
                              onClick={() => handleDeleteFile(f.id)}
                              title="Usuń"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Archive confirmation dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={(v) => { if (!v) setArchiveDialogOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Archive worker?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{worker.first_name} {worker.last_name}</strong> will be hidden from the active
            workers list and assignment flows. You can restore them at any time.
          </p>
          {archiveError && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {archiveError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogOpen(false)} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              {archiving ? "Archiving…" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Worker dialog */}
      {editOpen && worker && (
        <WorkerFormDialog
          worker={worker}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setWorker((prev) => prev ? { ...prev, ...updated } : prev);
            setEditOpen(false);
          }}
        />
      )}

      {/* Generate Document dialog */}
      <Dialog open={genDialogOpen} onOpenChange={(v) => { if (!v) setGenDialogOpen(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generuj dokument</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {genError && <p className="text-sm text-destructive">{genError}</p>}

            {!generatedDoc && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Wybierz szablon</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">— wybierz szablon —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {previewHtml && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Podgląd dokumentu (szkic)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      Drukuj
                    </Button>
                    {generatedDoc?.status === "draft" && (
                      <Button size="sm" onClick={handleFinalize} disabled={finalizing}>
                        {finalizing ? "Finalizuję..." : "Finalizuj i generuj PDF"}
                      </Button>
                    )}
                    {(generatedDoc?.status === "final" || generatedDoc?.status === "signed") && (
                      <Button size="sm" className="gap-2" onClick={handleDownloadPdf}>
                        <Download className="h-4 w-4" />
                        Pobierz PDF
                      </Button>
                    )}
                  </div>
                </div>
                <div
                  className="max-h-[50vh] overflow-y-auto rounded border p-4 text-xs"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenDialogOpen(false)}
              disabled={generating || finalizing}
            >
              Zamknij
            </Button>
            {!generatedDoc && (
              <Button
                onClick={handleGenerate}
                disabled={generating || !selectedTemplateId}
              >
                {generating ? "Generuję..." : "Wygeneruj podgląd"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
