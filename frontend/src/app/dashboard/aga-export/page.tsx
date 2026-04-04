"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClients } from "@/lib/api";
import type { Client } from "@/types/api";

// ── AGA export types ──────────────────────────────────────────────────────────

interface ExportSection {
  key: "workers" | "contracts" | "hours" | "assignments";
  label: string;
  description: string;
}

const EXPORT_SECTIONS: ExportSection[] = [
  {
    key: "workers",
    label: "Pracownicy",
    description: "Dane osobowe, PESEL, obywatelstwo, dokumenty, zezwolenia — do importu jako kartoteki pracownicze.",
  },
  {
    key: "contracts",
    label: "Umowy",
    description: "Szczegóły umów o pracę tymczasową: daty, pracodawca użytkownik, stanowisko, stawki.",
  },
  {
    key: "hours",
    label: "Godziny / Ewidencja czasu",
    description: "Przepracowane godziny, nadgodziny, typy nieobecności — z zatwierdzonych importów arkuszy.",
  },
  {
    key: "assignments",
    label: "Delegowania",
    description: "Mapowania pracownik→klient z datami — do śledzenia limitów 18/36 miesięcy w AGA.",
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function AgaExportPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    getClients(1, 200).then((res) => setClients(res.items)).catch(() => {});

    // Default date range: first and last day of current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFrom(firstDay.toISOString().slice(0, 10));
    setDateTo(lastDay.toISOString().slice(0, 10));
  }, []);

  function buildUrl(section: ExportSection["key"]): string {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const params = new URLSearchParams();
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (selectedClientId) params.set("client_id", selectedClientId);
    return `${apiBase}/api/v1/export/aga/${section}?${params}`;
  }

  function handleDownload(section: ExportSection["key"]) {
    setDownloading(section);
    try {
      window.open(buildUrl(section), "_blank");
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Eksport AGA by Streamsoft" />
      <main className="flex-1 space-y-6 p-6">

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtry eksportu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Klient (opcjonalnie)</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">— wszyscy klienci —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Data od</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Data do</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Format eksportu: CSV z separatorem &quot;;&quot; i kodowaniem UTF-8 BOM (kompatybilny z MS Excel i importerem AGA).
            </p>
          </CardContent>
        </Card>

        {/* Export sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXPORT_SECTIONS.map((section) => (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  {section.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{section.description}</p>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={downloading === section.key}
                  onClick={() => handleDownload(section.key)}
                >
                  <Download className="h-4 w-4" />
                  {downloading === section.key ? "Generuję..." : "Pobierz CSV"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Format notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uwagi dotyczące formatu AGA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Separator kolumn: <code className="font-mono">;</code> (średnik)</p>
            <p>• Kodowanie: UTF-8 z BOM (wymagane przez importer AGA)</p>
            <p>• Format dat: DD.MM.RRRR</p>
            <p>• Liczby dziesiętne z przecinkiem (np. <code className="font-mono">8,50</code>)</p>
            <p>• Plik pracowników — import do modułu &quot;Kartoteka pracowników&quot;</p>
            <p>• Plik umów — import do modułu &quot;Umowy o pracę tymczasową&quot;</p>
            <p>• Plik godzin — import do modułu &quot;Ewidencja czasu pracy&quot;</p>
            <p className="pt-1 text-xs">
              Uwaga: Format CSV dopasowany do standardu importu AGA. W razie problemów z importem
              skontaktuj się z administratorem systemu — możliwe jest dostosowanie nagłówków kolumn.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
