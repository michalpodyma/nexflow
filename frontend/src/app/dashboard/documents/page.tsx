"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { FileText, Plus, Pencil, Eye, EyeOff } from "lucide-react";

import { Header } from "@/components/layout/Header";
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
  createDocumentTemplate,
  getDocumentTemplates,
  updateDocumentTemplate,
} from "@/lib/api";
import type {
  DocumentTemplate,
  DocumentTemplateCreate,
  DocumentTemplateUpdate,
  TemplateType,
} from "@/types/api";

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  employment_contract: "Umowa o pracę",
  mandate_contract: "Umowa zlecenie",
  annex: "Aneks",
  other: "Inne",
};

const TEMPLATE_TYPE_OPTIONS: { value: TemplateType; label: string }[] = [
  { value: "employment_contract", label: "Umowa o pracę" },
  { value: "mandate_contract", label: "Umowa zlecenie" },
  { value: "annex", label: "Aneks" },
  { value: "other", label: "Inne" },
];

// ── Placeholder token reference ───────────────────────────────────────────────

const TOKEN_GROUPS = [
  {
    group: "Pracownik",
    tokens: [
      "worker.full_name", "worker.first_name", "worker.last_name",
      "worker.pesel", "worker.date_of_birth", "worker.address",
      "worker.nationality", "worker.phone", "worker.email",
      "worker.passport_number",
    ],
  },
  {
    group: "Klient",
    tokens: [
      "client.company_name", "client.nip", "client.address",
      "client.city", "client.country",
    ],
  },
  {
    group: "Zlecenie",
    tokens: [
      "assignment.position", "assignment.start_date",
      "assignment.end_date", "assignment.hourly_rate",
    ],
  },
  {
    group: "Meta",
    tokens: ["generated_date"],
  },
];

// ── Template editor dialog ────────────────────────────────────────────────────

interface TemplateFormData {
  name: string;
  template_type: TemplateType;
  body_html: string;
  is_active: boolean;
}

function TemplateDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: (DocumentTemplate & { body_html?: string }) | null;
  onClose: () => void;
  onSave: (tpl: DocumentTemplate) => void;
}) {
  const isEdit = initial !== null;
  const [form, setForm] = useState<TemplateFormData>({
    name: "",
    template_type: "employment_contract",
    body_html: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? "",
        template_type: initial?.template_type ?? "employment_contract",
        body_html: (initial as { body_html?: string } | null)?.body_html ?? "",
        is_active: initial?.is_active ?? true,
      });
      setError(null);
    }
  }, [open, initial]);

  async function handleSave() {
    if (!form.name.trim() || !form.body_html.trim()) {
      setError("Nazwa i treść szablonu są wymagane.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let saved: DocumentTemplate;
      if (isEdit && initial) {
        const update: DocumentTemplateUpdate = {
          name: form.name,
          template_type: form.template_type,
          body_html: form.body_html,
          is_active: form.is_active,
        };
        saved = await updateDocumentTemplate(initial.id, update);
      } else {
        const create: DocumentTemplateCreate = {
          name: form.name,
          template_type: form.template_type,
          body_html: form.body_html,
          is_active: form.is_active,
        };
        saved = await createDocumentTemplate(create);
      }
      onSave(saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd zapisu szablonu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edytuj szablon" : "Nowy szablon"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nazwa szablonu *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="np. Umowa o pracę — standard"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Typ umowy</label>
              <select
                value={form.template_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, template_type: e.target.value as TemplateType }))
                }
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {TEMPLATE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium">Aktywny</label>
          </div>

          {/* Token reference */}
          <div>
            <button
              type="button"
              onClick={() => setShowTokens((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              {showTokens ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showTokens ? "Ukryj tokeny" : "Pokaż dostępne tokeny {{...}}"}
            </button>
            {showTokens && (
              <div className="mt-2 grid grid-cols-2 gap-3 rounded-md border bg-gray-50 p-3 text-xs">
                {TOKEN_GROUPS.map((g) => (
                  <div key={g.group}>
                    <p className="mb-1 font-semibold text-gray-600">{g.group}</p>
                    <div className="space-y-0.5">
                      {g.tokens.map((t) => (
                        <code
                          key={t}
                          className="block cursor-pointer rounded bg-white px-1.5 py-0.5 font-mono text-primary hover:bg-primary/10"
                          onClick={() => {
                            setForm((f) => ({ ...f, body_html: f.body_html + `{{${t}}}` }));
                          }}
                          title="Kliknij aby wstawić"
                        >
                          {`{{${t}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Treść HTML *</label>
            <textarea
              value={form.body_html}
              onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))}
              rows={20}
              className="w-full rounded-md border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="<html>...</html>"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Wprowadź pełny dokument HTML z tokenami {`{{...}}`} dla danych zmiennych.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Anuluj</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Zapisuję..." : isEdit ? "Zapisz zmiany" : "Utwórz szablon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  html,
  onClose,
}: {
  html: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Podgląd szablonu</DialogTitle>
        </DialogHeader>
        <div
          className="prose max-w-none rounded border p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zamknij</Button>
          <Button
            onClick={() => {
              const win = window.open("", "_blank");
              if (win) {
                win.document.write(DOMPurify.sanitize(html));
                win.document.close();
                win.print();
              }
            }}
          >
            Drukuj podgląd
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<(DocumentTemplate & { body_html?: string }) | null>(null);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await getDocumentTemplates(1, 50);
      setTemplates(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd ładowania szablonów.");
    } finally {
      setLoading(false);
    }
  }

  function handleSaved(tpl: DocumentTemplate) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === tpl.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = tpl;
        return next;
      }
      return [tpl, ...prev];
    });
    if (total === templates.length) setTotal((n) => n + 1);
    setDialogOpen(false);
    setEditTarget(null);
  }

  async function openEdit(tpl: DocumentTemplate) {
    setLoadingDetail(tpl.id);
    setDetailError(null);
    try {
      const { getDocumentTemplate } = await import("@/lib/api");
      const detail = await getDocumentTemplate(tpl.id);
      setEditTarget(detail);
      setDialogOpen(true);
    } catch {
      setDetailError("Nie udało się załadować treści szablonu. Spróbuj ponownie.");
    } finally {
      setLoadingDetail(null);
    }
  }

  async function openPreview(tpl: DocumentTemplate) {
    setLoadingDetail(tpl.id);
    try {
      const { getDocumentTemplate } = await import("@/lib/api");
      const detail = await getDocumentTemplate(tpl.id);
      setPreviewHtml(detail.body_html);
    } catch {
      setPreviewHtml("<p>Nie można załadować podglądu.</p>");
    } finally {
      setLoadingDetail(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Szablony dokumentów" />
      <main className="flex-1 space-y-6 p-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wszystkich szablonów
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aktywnych</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {templates.filter((t) => t.is_active).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Umów o pracę
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {templates.filter((t) => t.template_type === "employment_contract").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detail fetch error */}
        {detailError && (
          <div className="flex items-center justify-between rounded border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <span>{detailError}</span>
            <button
              className="ml-4 text-destructive hover:opacity-70"
              onClick={() => setDetailError(null)}
              aria-label="Zamknij"
            >
              ✕
            </button>
          </div>
        )}

        {/* Templates table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Szablony umów
              </CardTitle>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => { setEditTarget(null); setDialogOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                Nowy szablon
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Ładowanie...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak szablonów. Utwórz pierwszy.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nazwa</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Wersja</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Utworzony</TableHead>
                      <TableHead className="text-right">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((tpl) => (
                      <TableRow key={tpl.id}>
                        <TableCell className="font-medium">{tpl.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {TEMPLATE_TYPE_LABELS[tpl.template_type]}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">v{tpl.version}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              tpl.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {tpl.is_active ? "Aktywny" : "Nieaktywny"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(tpl.created_at).toLocaleDateString("pl-PL")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={loadingDetail === tpl.id}
                              onClick={() => openPreview(tpl)}
                              title="Podgląd"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={loadingDetail === tpl.id}
                              onClick={() => openEdit(tpl)}
                              title="Edytuj"
                            >
                              <Pencil className="h-4 w-4" />
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

      <TemplateDialog
        open={dialogOpen}
        initial={editTarget}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        onSave={handleSaved}
      />

      {previewHtml !== null && (
        <PreviewModal html={previewHtml} onClose={() => setPreviewHtml(null)} />
      )}
    </div>
  );
}
