"use client";

import { useCallback, useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stage {
  id: string;
  label: string;
}

interface DealContact {
  firstname: string;
  lastname: string;
  phone: string;
  candidate_languages: string;
  candidate_preferred_position: string;
  candidate_form_locale: string;
}

interface Deal {
  id: string;
  dealname: string;
  stage: string;
  createdAt: string;
  daysAgo: number;
  contact: DealContact | null;
}

interface PipelineData {
  stages: Stage[];
  deals: Deal[];
}

// ---------------------------------------------------------------------------
// Stage badge colours
// ---------------------------------------------------------------------------

const STAGE_COLOURS: Record<string, string> = {
  // These keys are HubSpot stage IDs — we fall back to a neutral style
};

function stageBadgeClass(stageId: string, stages: Stage[]): string {
  const idx = stages.findIndex((s) => s.id === stageId);
  const classes = [
    "bg-slate-100 text-slate-700",
    "bg-blue-100 text-blue-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-emerald-100 text-emerald-800",
  ];
  return classes[idx] ?? classes[0]!;
}

// ---------------------------------------------------------------------------
// Position display name
// ---------------------------------------------------------------------------

const POSITION_LABELS: Record<string, string> = {
  warehouse_picker: "Warehouse",
  forklift_operator: "Forklift",
  logistics_driver: "Driver",
  other: "Other",
};

function positionLabel(raw: string): string {
  return POSITION_LABELS[raw] ?? raw;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PipelinePage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterStage, setFilterStage] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [filterPosition, setFilterPosition] = useState("");

  // Per-deal note state
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Per-deal stage change in-flight
  const [movingId, setMovingId] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hubspot/deals");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load pipeline");
      }
      const json = (await res.json()) as PipelineData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDeals();
  }, [fetchDeals]);

  async function handleStageChange(dealId: string, newStage: string) {
    setMovingId(dealId);
    try {
      const res = await fetch(`/api/hubspot/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Stage update failed");
      // Optimistic update
      setData((prev) =>
        prev
          ? {
              ...prev,
              deals: prev.deals.map((d) =>
                d.id === dealId ? { ...d, stage: newStage } : d,
              ),
            }
          : prev,
      );
    } catch {
      // Reload to get true state
      void fetchDeals();
    } finally {
      setMovingId(null);
    }
  }

  async function handleNoteSubmit(dealId: string) {
    if (!noteText.trim()) return;
    setNoteSubmitting(true);
    setNoteError("");
    try {
      const res = await fetch(`/api/hubspot/deals/${dealId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      setNoteOpen(null);
      setNoteText("");
    } catch {
      setNoteError("Could not save note. Try again.");
    } finally {
      setNoteSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const allLangs = data
    ? Array.from(
        new Set(
          data.deals.flatMap((d) =>
            d.contact?.candidate_languages
              ? d.contact.candidate_languages.split(";").filter(Boolean)
              : [],
          ),
        ),
      ).sort()
    : [];

  const allPositions = data
    ? Array.from(
        new Set(
          data.deals
            .map((d) => d.contact?.candidate_preferred_position ?? "")
            .filter(Boolean),
        ),
      ).sort()
    : [];

  const filtered =
    data?.deals.filter((d) => {
      if (filterStage && d.stage !== filterStage) return false;
      if (
        filterLang &&
        !d.contact?.candidate_languages
          .split(";")
          .includes(filterLang)
      )
        return false;
      if (
        filterPosition &&
        d.contact?.candidate_preferred_position !== filterPosition
      )
        return false;
      return true;
    }) ?? [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Candidate Pipeline" />

      <main className="flex-1 p-4 md:p-6">
        {/* Error / loading states */}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}{" "}
            <button
              onClick={() => void fetchDeals()}
              className="underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !data && (
          <p className="text-sm text-muted-foreground">Loading pipeline…</p>
        )}

        {data && (
          <>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="h-9 rounded-md border bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All stages</option>
                {data.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              {allLangs.length > 0 && (
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="h-9 rounded-md border bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All languages</option>
                  {allLangs.map((l) => (
                    <option key={l} value={l}>
                      {l.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}

              {allPositions.length > 0 && (
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="h-9 rounded-md border bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All positions</option>
                  {allPositions.map((p) => (
                    <option key={p} value={p}>
                      {positionLabel(p)}
                    </option>
                  ))}
                </select>
              )}

              <span className="ml-auto text-xs text-muted-foreground">
                {filtered.length} candidate{filtered.length !== 1 ? "s" : ""} · last 30 days
              </span>

              <button
                onClick={() => void fetchDeals()}
                className="text-xs text-muted-foreground underline"
              >
                Refresh
              </button>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">
                No candidates match the current filters.
              </p>
            )}

            {/* Deal cards */}
            <div className="space-y-3">
              {filtered.map((deal) => {
                const stageLabel =
                  data.stages.find((s) => s.id === deal.stage)?.label ?? deal.stage;
                const isMoving = movingId === deal.id;
                const isNoteOpen = noteOpen === deal.id;

                return (
                  <div
                    key={deal.id}
                    className="rounded-lg border bg-white p-4 shadow-sm"
                  >
                    {/* Top row: name + stage badge */}
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {deal.contact
                            ? `${deal.contact.firstname} ${deal.contact.lastname}`
                            : deal.dealname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Applied {deal.daysAgo === 0 ? "today" : `${deal.daysAgo}d ago`}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stageBadgeClass(deal.stage, data.stages)}`}
                      >
                        {stageLabel}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      {deal.contact?.phone && (
                        <span>
                          <a
                            href={`tel:${deal.contact.phone}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {deal.contact.phone}
                          </a>
                        </span>
                      )}
                      {deal.contact?.candidate_preferred_position && (
                        <span>{positionLabel(deal.contact.candidate_preferred_position)}</span>
                      )}
                      {deal.contact?.candidate_languages && (
                        <span className="uppercase tracking-wide text-xs text-gray-500">
                          {deal.contact.candidate_languages.replace(/;/g, " · ")}
                        </span>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Stage change */}
                      <select
                        value={deal.stage}
                        disabled={isMoving}
                        onChange={(e) => void handleStageChange(deal.id, e.target.value)}
                        className="h-8 rounded-md border bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      >
                        {data.stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {isMoving && s.id === deal.stage ? "Moving…" : s.label}
                          </option>
                        ))}
                      </select>

                      {/* Note toggle */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setNoteOpen(isNoteOpen ? null : deal.id);
                          setNoteText("");
                          setNoteError("");
                        }}
                      >
                        {isNoteOpen ? "Cancel" : "Add note"}
                      </Button>
                    </div>

                    {/* Note input (inline) */}
                    {isNoteOpen && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder="Add a note…"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleNoteSubmit(deal.id);
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={noteSubmitting || !noteText.trim()}
                          onClick={() => void handleNoteSubmit(deal.id)}
                        >
                          {noteSubmitting ? "Saving…" : "Save"}
                        </Button>
                        {noteError && (
                          <span className="text-xs text-red-600">{noteError}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
