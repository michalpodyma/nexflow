"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createClientActivity,
  createClientContact,
  deleteClientContact,
  getClient,
  getClientActivities,
  getClientContacts,
  getJobOrders,
  updateClientContact,
} from "@/lib/api";
import type {
  ActivityType,
  Client,
  ClientActivity,
  ClientActivityCreate,
  ClientContact,
  ClientContactCreate,
  ClientContactUpdate,
  JobOrder,
} from "@/types/api";

type Tab = "activity" | "job_orders" | "revenue" | "contacts";

// ── Activity Log tab ──────────────────────────────────────────────────────────

function ActivityTab({ clientId }: { clientId: string }) {
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientActivityCreate>({
    activity_type: "note",
    description: "",
    created_by: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getClientActivities(clientId, 1, 50);
      setActivities(res.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createClientActivity(clientId, {
        ...form,
        created_by: form.created_by?.trim() || null,
      });
      setActivities((prev) => [created, ...prev]);
      setForm({ activity_type: "note", description: "", created_by: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  const typeLabel: Record<ActivityType, string> = {
    note: "Note",
    call: "Call",
    email: "Email",
    meeting: "Meeting",
  };

  const typeBadge: Record<ActivityType, string> = {
    note: "bg-gray-100 text-gray-700",
    call: "bg-blue-100 text-blue-700",
    email: "bg-purple-100 text-purple-700",
    meeting: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Log Activity"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-md border bg-white p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                className={selectClass}
                value={form.activity_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, activity_type: e.target.value as ActivityType }))
                }
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Created by</label>
              <Input
                value={form.created_by ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, created_by: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Description *</label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What happened?"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activities yet.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-md border bg-white px-4 py-3 flex gap-3">
              <span
                className={`mt-0.5 h-fit rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge[a.activity_type]}`}
              >
                {typeLabel[a.activity_type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap">{a.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                  {a.created_by && ` · ${a.created_by}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Job Orders tab ────────────────────────────────────────────────────────────

function JobOrdersTab({ clientId }: { clientId: string }) {
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getJobOrders({ client_id: clientId })
      .then((res) => setOrders(res.items))
      .finally(() => setLoading(false));
  }, [clientId]);

  const statusLabel: Record<string, string> = {
    open: "Open",
    sourcing: "Sourcing",
    submitted: "Submitted",
    interview: "Interview",
    filled: "Filled",
    on_hold: "On Hold",
    cancelled: "Cancelled",
  };

  const urgencyBadge: Record<string, string> = {
    normal: "bg-gray-100 text-gray-700",
    urgent: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return loading ? (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ) : orders.length === 0 ? (
    <p className="text-sm text-muted-foreground">No job orders for this client.</p>
  ) : (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Headcount</TableHead>
            <TableHead>Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium">{o.title}</TableCell>
              <TableCell>{statusLabel[o.status] ?? o.status}</TableCell>
              <TableCell>
                <span className={`rounded-full px-2 py-0.5 text-xs ${urgencyBadge[o.urgency]}`}>
                  {o.urgency}
                </span>
              </TableCell>
              <TableCell>
                {o.headcount_filled}/{o.headcount_needed}
              </TableCell>
              <TableCell>{o.deadline ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Revenue tab ───────────────────────────────────────────────────────────────

function RevenueTab({ client }: { client: Client }) {
  return (
    <div className="rounded-md border bg-white px-6 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        Revenue reporting is coming soon. Billing currency: <strong>{client.currency}</strong> ·
        Payment terms: <strong>{client.payment_terms_days} days</strong>
      </p>
    </div>
  );
}

// ── Contacts tab ──────────────────────────────────────────────────────────────

interface ContactFormProps {
  contact?: ClientContact;
  onClose: () => void;
  onSaved: (contact: ClientContact) => void;
  clientId: string;
}

function ContactFormDialog({ contact, onClose, onSaved, clientId }: ContactFormProps) {
  const isEdit = !!contact;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<ClientContactCreate>({
    name: contact?.name ?? "",
    role: contact?.role ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    is_primary: contact?.is_primary ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: ClientContactCreate = {
        ...form,
        name: (form.name as string).trim(),
        role: (form.role as string)?.trim() || null,
        phone: (form.phone as string)?.trim() || null,
        email: (form.email as string)?.trim() || null,
      };
      const saved = isEdit
        ? await updateClientContact(clientId, contact!.id, payload as ClientContactUpdate)
        : await createClientContact(clientId, payload);
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
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Contact" : "Add Contact"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Name *</label>
            <Input
              value={form.name as string}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Role / Title</label>
            <Input
              value={(form.role as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Procurement Manager"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <Input
              value={(form.phone as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input
              type="email"
              value={(form.email as string) ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={form.is_primary as boolean}
              onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="is_primary" className="text-sm">
              Primary contact
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContactsTab({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | undefined>(undefined);

  async function load() {
    setLoading(true);
    try {
      const res = await getClientContacts(clientId);
      setContacts(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  function handleSaved(saved: ClientContact) {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setDialogOpen(false);
  }

  async function handleDelete(contactId: string) {
    try {
      await deleteClientContact(clientId, contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingContact(undefined);
            setDialogOpen(true);
          }}
        >
          Add Contact
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.role ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>
                    {c.is_primary ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Primary
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingContact(c);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogOpen && (
        <ContactFormDialog
          contact={editingContact}
          clientId={clientId}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: "activity", label: "Activity Log" },
  { key: "job_orders", label: "Job Orders" },
  { key: "revenue", label: "Revenue" },
  { key: "contacts", label: "Contacts" },
];

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("activity");

  useEffect(() => {
    setLoading(true);
    getClient(clientId)
      .then(setClient)
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <Header title="Client" />
        <main className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-1 flex-col overflow-auto">
        <Header title="Client not found" />
        <main className="flex-1 p-6">
          <p className="text-sm text-muted-foreground">
            Client not found.{" "}
            <Link href="/dashboard/clients" className="text-blue-600 hover:underline">
              Back to clients
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title={client.company_name} />
      <main className="flex-1 p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <Link href="/dashboard/clients" className="text-blue-600 hover:underline">
            Clients
          </Link>{" "}
          / {client.company_name}
        </div>

        {/* Info card */}
        <div className="rounded-md border bg-white px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
          <div>
            <span className="text-muted-foreground">NIP:</span>{" "}
            <span className="font-medium">{client.nip ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Country:</span>{" "}
            <span className="font-medium">{client.country ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Currency:</span>{" "}
            <span className="font-medium">{client.currency}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Payment terms:</span>{" "}
            <span className="font-medium">{client.payment_terms_days}d</span>
          </div>
          {client.email && (
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium">{client.phone}</span>
            </div>
          )}
          {client.account_manager_name && (
            <div>
              <span className="text-muted-foreground">Account manager:</span>{" "}
              <span className="font-medium">{client.account_manager_name}</span>
            </div>
          )}
          <div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                client.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {client.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 border-b mb-4">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "activity" && <ActivityTab clientId={clientId} />}
          {activeTab === "job_orders" && <JobOrdersTab clientId={clientId} />}
          {activeTab === "revenue" && <RevenueTab client={client} />}
          {activeTab === "contacts" && <ContactsTab clientId={clientId} />}
        </div>
      </main>
    </div>
  );
}
