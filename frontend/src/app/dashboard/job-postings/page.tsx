"use client";

import { useCallback, useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = "olx" | "pracuj";
type PostingStatus = "active" | "expired" | "removed";
type Currency = "PLN" | "EUR";

interface JobPosting {
  id: string;
  platform: Platform;
  external_id: string | null;
  listing_url: string | null;
  title: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: Currency | null;
  description: string | null;
  apply_url: string;
  posted_at: string | null;
  status: PostingStatus;
  created_at: string;
}

interface CreateResult {
  postings: JobPosting[];
  errors: Record<string, string>;
}

interface PaginatedPostings {
  items: JobPosting[];
  total: number;
  page: number;
  page_size: number;
}

interface FormState {
  title: string;
  location: string;
  salary_min: string;
  salary_max: string;
  currency: Currency;
  description: string;
  apply_url: string;
  platforms: Record<Platform, boolean>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const EMPTY_FORM: FormState = {
  title: "",
  location: "",
  salary_min: "",
  salary_max: "",
  currency: "PLN",
  description: "",
  apply_url: "https://nexflow.work/oferty",
  platforms: { olx: true, pracuj: false },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: PostingStatus) {
  const map: Record<PostingStatus, string> = {
    active: "bg-green-100 text-green-800",
    expired: "bg-yellow-100 text-yellow-700",
    removed: "bg-red-100 text-red-700",
  };
  return `inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`;
}

function platformLabel(p: Platform) {
  return p === "olx" ? "OLX" : "Pracuj.pl";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL");
}

// ---------------------------------------------------------------------------
// Post-to-board form modal (no external Dialog dep — inline overlay)
// ---------------------------------------------------------------------------

interface PostModalProps {
  onClose: () => void;
  onSuccess: (result: CreateResult) => void;
}

function PostModal({ onClose, onSuccess }: PostModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(p: Platform) {
    setForm((prev) => ({
      ...prev,
      platforms: { ...prev.platforms, [p]: !prev.platforms[p] },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const selectedPlatforms = (Object.keys(form.platforms) as Platform[]).filter(
      (p) => form.platforms[p],
    );
    if (selectedPlatforms.length === 0) {
      setError("Select at least one platform.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/job-postings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          title: form.title,
          location: form.location || null,
          salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
          salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
          currency: form.currency,
          description: form.description,
          apply_url: form.apply_url,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { detail?: string | { message?: string } };
        const msg =
          typeof body.detail === "string"
            ? body.detail
            : (body.detail as { message?: string })?.message ?? "Submission failed";
        throw new Error(msg);
      }

      const result = (await res.json()) as CreateResult;
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Post to Job Boards</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Platforms */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-700">Platforms</p>
            <div className="flex gap-4">
              {(["olx", "pracuj"] as Platform[]).map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.platforms[p]}
                    onChange={() => togglePlatform(p)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {platformLabel(p)}
                </label>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Job title *</label>
            <Input
              required
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. Magazynier / Warehouse Picker"
              className="h-9 text-sm"
            />
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Location</label>
            <Input
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="e.g. Słubice, 69-100"
              className="h-9 text-sm"
            />
          </div>

          {/* Salary */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">Salary min</label>
              <Input
                type="number"
                min={0}
                value={form.salary_min}
                onChange={(e) => setField("salary_min", e.target.value)}
                placeholder="3500"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">Salary max</label>
              <Input
                type="number"
                min={0}
                value={form.salary_max}
                onChange={(e) => setField("salary_max", e.target.value)}
                placeholder="5000"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value as Currency)}
                className="h-9 rounded-md border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Job requirements, responsibilities, benefits…"
              className="w-full rounded-md border px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Apply URL */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Apply URL</label>
            <Input
              value={form.apply_url}
              onChange={(e) => setField("apply_url", e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Posting…" : "Post vacancy"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result toast (partial-success feedback)
// ---------------------------------------------------------------------------

interface ResultToastProps {
  result: CreateResult;
  onDismiss: () => void;
}

function ResultToast({ result, onDismiss }: ResultToastProps) {
  const successPlatforms = result.postings.map((p) => platformLabel(p.platform));
  const errorEntries = Object.entries(result.errors);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-lg border bg-white p-4 shadow-lg">
      {successPlatforms.length > 0 && (
        <p className="text-sm font-medium text-green-700">
          Posted to: {successPlatforms.join(", ")}
        </p>
      )}
      {result.postings.some((p) => p.listing_url) && (
        <div className="mt-1 space-y-0.5">
          {result.postings
            .filter((p) => p.listing_url)
            .map((p) => (
              <a
                key={p.id}
                href={p.listing_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary underline-offset-2 hover:underline"
              >
                {platformLabel(p.platform)} listing →
              </a>
            ))}
        </div>
      )}
      {errorEntries.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {errorEntries.map(([platform, msg]) => (
            <p key={platform} className="text-xs text-red-600">
              {platformLabel(platform as Platform)}: {msg}
            </p>
          ))}
        </div>
      )}
      <button
        onClick={onDismiss}
        className="mt-3 text-xs text-muted-foreground underline"
      >
        Dismiss
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function JobPostingsPage() {
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [lastResult, setLastResult] = useState<CreateResult | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchPostings = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(`${API_BASE}/api/v1/job-postings?page=1&page_size=50`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load job postings");
      const data = (await res.json()) as PaginatedPostings;
      setPostings(data.items);
      setTotal(data.total);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPostings();
  }, [fetchPostings]);

  async function handleRemove(postingId: string) {
    setRemovingId(postingId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/job-postings/${postingId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Remove failed");
      setPostings((prev) =>
        prev.map((p) => (p.id === postingId ? { ...p, status: "removed" } : p)),
      );
    } catch {
      void fetchPostings();
    } finally {
      setRemovingId(null);
    }
  }

  function handlePostSuccess(result: CreateResult) {
    setModalOpen(false);
    setLastResult(result);
    void fetchPostings();
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Job Board Postings" />

      <main className="flex-1 p-4 md:p-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} posting{total !== 1 ? "s" : ""} total
          </p>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Post to Job Boards
          </Button>
        </div>

        {/* Error */}
        {fetchError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {fetchError}{" "}
            <button onClick={() => void fetchPostings()} className="underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !postings.length && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {/* Empty state */}
        {!loading && postings.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">No job postings yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setModalOpen(true)}
            >
              Post your first vacancy
            </Button>
          </div>
        )}

        {/* Table */}
        {postings.length > 0 && (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3">Posted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {postings.map((p) => {
                  const salary =
                    p.salary_min || p.salary_max
                      ? [p.salary_min, p.salary_max].filter(Boolean).join("–") +
                        ` ${p.currency ?? ""}`
                      : "—";

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {p.listing_url ? (
                          <a
                            href={p.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {p.title}
                          </a>
                        ) : (
                          p.title
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {platformLabel(p.platform)}
                        {p.external_id && (
                          <span className="ml-1 text-xs text-gray-400">#{p.external_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.location ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{salary}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(p.posted_at)}</td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(p.status)}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "active" && (
                          <button
                            disabled={removingId === p.id}
                            onClick={() => void handleRemove(p.id)}
                            className="text-xs text-red-500 hover:underline disabled:opacity-50"
                          >
                            {removingId === p.id ? "Removing…" : "Remove"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Post modal */}
      {modalOpen && (
        <PostModal onClose={() => setModalOpen(false)} onSuccess={handlePostSuccess} />
      )}

      {/* Result toast */}
      {lastResult && (
        <ResultToast result={lastResult} onDismiss={() => setLastResult(null)} />
      )}
    </div>
  );
}
