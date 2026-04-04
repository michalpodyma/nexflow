"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
import { createClient, getClients, updateClient } from "@/lib/api";
import type { Client, ClientCreate, Currency } from "@/types/api";

const EMPTY_FORM: ClientCreate = {
  company_name: "",
  nip: "",
  vat_eu: "",
  address: "",
  city: "",
  postal_code: "",
  country: "",
  phone: "",
  email: "",
  account_manager_name: "",
  payment_terms_days: 30,
  currency: "PLN",
  is_active: true,
};

interface ClientFormDialogProps {
  client?: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

function ClientFormDialog({ client, onClose, onSaved }: ClientFormDialogProps) {
  const isEdit = !!client;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<ClientCreate>(
    client
      ? {
          company_name: client.company_name,
          nip: client.nip ?? "",
          vat_eu: client.vat_eu ?? "",
          address: client.address ?? "",
          city: client.city ?? "",
          postal_code: client.postal_code ?? "",
          country: client.country ?? "",
          phone: client.phone ?? "",
          email: client.email ?? "",
          account_manager_name: client.account_manager_name ?? "",
          payment_terms_days: client.payment_terms_days,
          currency: client.currency,
          is_active: client.is_active,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function set<K extends keyof ClientCreate>(key: K, value: ClientCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!form.country?.trim()) {
      setError("Country (ISO 2) is required.");
      return;
    }
    if (form.nip) {
      const digits = (form.nip as string).replace(/[-\s]/g, "");
      if (!/^\d{10}$/.test(digits)) {
        setError("NIP must be exactly 10 digits.");
        return;
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email as string)) {
      setError("Invalid email address.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: ClientCreate = {
        ...form,
        nip: (form.nip as string)?.trim() || null,
        vat_eu: (form.vat_eu as string)?.trim() || null,
        address: (form.address as string)?.trim() || null,
        city: (form.city as string)?.trim() || null,
        postal_code: (form.postal_code as string)?.trim() || null,
        phone: (form.phone as string)?.trim() || null,
        email: (form.email as string)?.trim() || null,
        account_manager_name: (form.account_manager_name as string)?.trim() || null,
      };

      const saved = isEdit
        ? await updateClient(client!.id, payload)
        : await createClient(payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative mx-4 w-full max-w-2xl max-h-[90dvh] flex flex-col rounded-lg bg-white shadow-xl sm:mx-0">
        <div className="flex flex-shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Client" : "Add Client"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form id="client-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 min-h-0 px-6 py-5 space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Company
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Company name *</label>
                <Input
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="Acme GmbH"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">NIP (10 digits)</label>
                <Input
                  value={(form.nip as string) ?? ""}
                  onChange={(e) => set("nip", e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">VAT EU</label>
                <Input
                  value={(form.vat_eu as string) ?? ""}
                  onChange={(e) => set("vat_eu", e.target.value)}
                  placeholder="DE123456789"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Street address</label>
                <Input
                  value={(form.address as string) ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">City</label>
                <Input
                  value={(form.city as string) ?? ""}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Postal code</label>
                <Input
                  value={(form.postal_code as string) ?? ""}
                  onChange={(e) => set("postal_code", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Country (ISO 2) *</label>
                <Input
                  value={(form.country as string) ?? ""}
                  onChange={(e) => set("country", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="PL"
                  maxLength={2}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input
                  value={(form.phone as string) ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={(form.email as string) ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Account manager</label>
                <Input
                  value={(form.account_manager_name as string) ?? ""}
                  onChange={(e) => set("account_manager_name", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Billing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Currency *</label>
                <select
                  className={selectClass}
                  value={form.currency as string}
                  onChange={(e) => set("currency", e.target.value as Currency)}
                >
                  <option value="PLN">PLN</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Payment terms (days)</label>
                <Input
                  type="number"
                  min={0}
                  value={form.payment_terms_days as number}
                  onChange={(e) => set("payment_terms_days", Number(e.target.value))}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active as boolean}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm">
                  Active
                </label>
              </div>
            </div>
          </section>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

        </form>

        {/* Actions — outside scroll area so always visible */}
        <div className="flex flex-shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add client"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

  async function load() {
    setLoading(true);
    try {
      const res = await getClients(1, 100);
      setClients(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingClient(undefined);
    setDialogOpen(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setDialogOpen(true);
  }

  function handleSaved(saved: Client) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      setTotal((t) => t + 1);
      return [saved, ...prev];
    });
    setDialogOpen(false);
  }

  async function handleToggleActive(client: Client) {
    try {
      const updated = await updateClient(client.id, { is_active: !client.is_active });
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      // silently ignore — user can retry
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Clients" />
      <main className="flex-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} total</p>
          <Button onClick={openCreate}>Add Client</Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {c.company_name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.nip ?? "—"}</TableCell>
                    <TableCell>{c.country ?? "—"}</TableCell>
                    <TableCell>{c.currency}</TableCell>
                    <TableCell>{c.payment_terms_days}d</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          c.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(c)}
                        >
                          {c.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {dialogOpen && (
        <ClientFormDialog
          client={editingClient}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
