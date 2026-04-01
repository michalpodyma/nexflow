"use client";

import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bulkUpdateCandidates,
  createCandidateReminder,
  dismissCandidateReminder,
  getCandidateReminders,
  getCandidates,
  updateCandidate,
} from "@/lib/api";
import type { Candidate, CandidateReminder } from "@/types/api";

// ---- Status colour map ----
const STATUS_COLOURS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  chatbot_in_progress: "bg-yellow-100 text-yellow-700",
  screened_pass: "bg-green-100 text-green-700",
  screened_fail: "bg-red-100 text-red-700",
  offered: "bg-purple-100 text-purple-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-gray-100 text-gray-500",
};

const ALL_STATUSES = [
  "new",
  "chatbot_in_progress",
  "screened_pass",
  "screened_fail",
  "offered",
  "hired",
  "rejected",
] as const;

// ---- Toast ----
interface ToastState {
  message: string;
  kind: "success" | "error";
}

function ResultToast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
        toast.kind === "success"
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      {toast.message}
      <button onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

// ---- Candidate detail modal ----
interface DetailModalProps {
  candidate: Candidate;
  onClose: () => void;
  onSaved: (updated: Candidate) => void;
}

function CandidateDetailModal({ candidate, onClose, onSaved }: DetailModalProps) {
  const [notes, setNotes] = useState(candidate.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState("");

  const [reminders, setReminders] = useState<CandidateReminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);

  const [reminderDate, setReminderDate] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState("");

  useEffect(() => {
    getCandidateReminders(candidate.id)
      .then(setReminders)
      .finally(() => setRemindersLoading(false));
  }, [candidate.id]);

  async function handleSaveNotes() {
    setNotesSaving(true);
    setNotesError("");
    try {
      const updated = await updateCandidate(candidate.id, { notes });
      onSaved(updated);
    } catch {
      setNotesError("Failed to save notes.");
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleAddReminder() {
    if (!reminderDate || !reminderText.trim()) {
      setReminderError("Date and text are required.");
      return;
    }
    setReminderSaving(true);
    setReminderError("");
    try {
      const created = await createCandidateReminder(candidate.id, {
        reminder_date: new Date(reminderDate).toISOString(),
        reminder_text: reminderText.trim(),
      });
      setReminders((prev) => [...prev, created]);
      setReminderDate("");
      setReminderText("");
    } catch {
      setReminderError("Failed to create reminder.");
    } finally {
      setReminderSaving(false);
    }
  }

  async function handleDismiss(reminderId: string) {
    try {
      const updated = await dismissCandidateReminder(candidate.id, reminderId);
      setReminders((prev) => prev.map((r) => (r.id === reminderId ? updated : r)));
    } catch {
      // best-effort
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {candidate.first_name} {candidate.last_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="mt-0.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    STATUS_COLOURS[candidate.screening_status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {candidate.screening_status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Phone</span>
              <p className="mt-0.5 font-medium">{candidate.phone ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="mt-0.5 font-medium">{candidate.email ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Nationality</span>
              <p className="mt-0.5 font-medium">{candidate.nationality ?? "—"}</p>
            </div>
            {candidate.contacted_at && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Contacted</span>
                <p className="mt-0.5 font-medium text-green-700">
                  {new Date(candidate.contacted_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Recruiter Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add notes about this candidate…"
            />
            {notesError && <p className="mt-1 text-xs text-red-600">{notesError}</p>}
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => void handleSaveNotes()}
                disabled={notesSaving}
              >
                {notesSaving ? "Saving…" : "Save Notes"}
              </Button>
            </div>
          </div>

          {/* Reminders */}
          <div>
            <p className="text-sm font-medium mb-2">Reminders</p>
            {remindersLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : reminders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No reminders yet.</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {reminders.map((r) => (
                  <li
                    key={r.id}
                    className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                      r.dismissed ? "opacity-40" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.reminder_text}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.reminder_date).toLocaleString()}
                      </p>
                    </div>
                    {!r.dismissed && (
                      <button
                        onClick={() => void handleDismiss(r.id)}
                        className="shrink-0 text-xs text-gray-400 hover:text-gray-700"
                      >
                        Dismiss
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Add reminder form */}
            <div className="space-y-2 rounded-md border bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-600">Add reminder</p>
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                placeholder="What to follow up on…"
                className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {reminderError && (
                <p className="text-xs text-red-600">{reminderError}</p>
              )}
              <Button
                size="sm"
                onClick={() => void handleAddReminder()}
                disabled={reminderSaving}
                className="w-full"
              >
                {reminderSaving ? "Adding…" : "Add Reminder"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main page ----
export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk action UI
  const [bulkAction, setBulkAction] = useState<"set_status" | "assign_posting" | "mark_contacted" | "">("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Detail modal
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string, kind: "success" | "error") {
    setToast({ message, kind });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    getCandidates()
      .then((res) => {
        setCandidates(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, []);

  // ---- select helpers ----
  const allIds = candidates.map((c) => c.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ---- bulk apply ----
  async function handleBulkApply() {
    if (!bulkAction) return;
    if (bulkAction === "set_status" && !bulkStatus) {
      showToast("Pick a status first.", "error");
      return;
    }
    setBulkLoading(true);
    try {
      const updated = await bulkUpdateCandidates({
        candidate_ids: [...selected],
        action: bulkAction,
        ...(bulkAction === "set_status" ? { status_value: bulkStatus } : {}),
      });
      // merge updated candidates back into list
      const updatedMap = new Map(updated.map((c) => [c.id, c]));
      setCandidates((prev) => prev.map((c) => updatedMap.get(c.id) ?? c));
      setSelected(new Set());
      setBulkAction("");
      setBulkStatus("");
      showToast(`Updated ${updated.length} candidate(s).`, "success");
    } catch {
      showToast("Bulk action failed. Please try again.", "error");
    } finally {
      setBulkLoading(false);
    }
  }

  function handleCandidateSaved(updated: Candidate) {
    setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    if (detailCandidate?.id === updated.id) setDetailCandidate(updated);
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Candidates" />
      <main className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>

        {/* Bulk action toolbar — shown when any row is selected */}
        {someSelected && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-blue-50 px-4 py-3">
            <span className="text-sm font-medium text-blue-800">
              {selected.size} selected
            </span>

            <select
              value={bulkAction}
              onChange={(e) =>
                setBulkAction(e.target.value as typeof bulkAction)
              }
              className="rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose action…</option>
              <option value="set_status">Update status</option>
              <option value="assign_posting">Assign to job posting</option>
              <option value="mark_contacted">Mark as contacted</option>
            </select>

            {bulkAction === "set_status" && (
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pick status…</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            {bulkAction === "assign_posting" && (
              <span className="text-xs text-gray-500 italic">
                (job posting ID required — paste in next sprint)
              </span>
            )}

            <Button
              size="sm"
              disabled={bulkLoading || !bulkAction}
              onClick={() => void handleBulkApply()}
            >
              {bulkLoading ? "Applying…" : "Apply"}
            </Button>

            <button
              onClick={() => {
                setSelected(new Set());
                setBulkAction("");
                setBulkStatus("");
              }}
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates yet.</p>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300"
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Contacted</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      selected.has(c.id) ? "bg-blue-50" : ""
                    }`}
                  >
                    <TableCell
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOne(c.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300"
                        aria-label={`Select ${c.first_name} ${c.last_name}`}
                      />
                    </TableCell>
                    <TableCell
                      className="font-medium"
                      onClick={() => setDetailCandidate(c)}
                    >
                      <span className="hover:underline">
                        {c.first_name} {c.last_name}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => setDetailCandidate(c)}>
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell onClick={() => setDetailCandidate(c)}>
                      {c.email ?? "—"}
                    </TableCell>
                    <TableCell onClick={() => setDetailCandidate(c)}>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          STATUS_COLOURS[c.screening_status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.screening_status}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => setDetailCandidate(c)}>
                      {c.nationality ?? "—"}
                    </TableCell>
                    <TableCell onClick={() => setDetailCandidate(c)}>
                      {c.contacted_at ? (
                        <span className="text-green-700 text-xs">✓ contacted</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell onClick={() => setDetailCandidate(c)}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Detail modal */}
      {detailCandidate && (
        <CandidateDetailModal
          candidate={detailCandidate}
          onClose={() => setDetailCandidate(null)}
          onSaved={handleCandidateSaved}
        />
      )}

      {/* Toast */}
      {toast && (
        <ResultToast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
