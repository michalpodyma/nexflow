"use client";

import { useEffect, useState } from "react";

import { getWorkerAccessToken } from "@/lib/worker-auth";
import { listWorkerDocuments, type DocumentSummary } from "@/lib/worker-api";
import { getWorkerLocale, type WorkerLocale } from "@/lib/worker-auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const MESSAGES = {
  pl: {
    title: "Dokumenty",
    empty: "Brak dokumentów do pobrania",
    status: { final: "Gotowy", signed: "Podpisany" } as Record<string, string>,
    download: "Pobierz PDF",
    noPdf: "PDF niedostępny",
  },
  uk: {
    title: "Документи",
    empty: "Немає документів для завантаження",
    status: { final: "Готовий", signed: "Підписаний" } as Record<string, string>,
    download: "Завантажити PDF",
    noPdf: "PDF недоступний",
  },
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DocumentsPage() {
  const [locale, setLocale] = useState<WorkerLocale>("pl");
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLocale(getWorkerLocale()); }, []);

  useEffect(() => {
    listWorkerDocuments().then(setDocs).finally(() => setLoading(false));
  }, []);

  const t = MESSAGES[locale];

  async function handleDownload(docId: string) {
    const token = getWorkerAccessToken();
    const res = await fetch(`${BASE_URL}/api/v1/worker/documents/${docId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dokument_${docId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{t.title}</h1>

      {docs.length === 0 ? (
        <p className="text-gray-400 text-center mt-12">{t.empty}</p>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.template_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.created_at)}</p>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 ${
                    doc.status === "signed"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {t.status[doc.status] ?? doc.status}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  {doc.has_pdf ? (
                    <button
                      onClick={() => handleDownload(doc.id)}
                      className="flex items-center gap-1.5 text-sm bg-blue-700 text-white px-3 py-2 rounded-xl hover:bg-blue-800 transition-colors"
                    >
                      ⬇ {t.download}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">{t.noPdf}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
