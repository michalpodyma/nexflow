"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getWorkerProfile,
  requestGdprDeletion,
  updateWorkerProfile,
  type WorkerProfile,
} from "@/lib/worker-api";
import { getWorkerLocale, type WorkerLocale } from "@/lib/worker-auth";

const MESSAGES = {
  pl: {
    title: "Profil",
    phone: "Telefon",
    email: "Email",
    bankAccount: "Numer konta (IBAN)",
    bankPlaceholder: "PL61 1090 1014 0000 0712 1981 2874",
    save: "Zapisz zmiany",
    saving: "Zapisywanie...",
    saved: "✓ Zapisano",
    gdprTitle: "Prawo do usunięcia danych",
    gdprDesc: "Możesz zażądać usunięcia swoich danych osobowych zgodnie z RODO. Wniosek zostanie rozpatrzony w ciągu 7 dni.",
    gdprBtn: "Zażądaj usunięcia danych",
    gdprConfirm: "Czy na pewno? Złożony wniosek uruchomi procedurę usunięcia danych. Nie można go cofnąć.",
    gdprDone: "✓ Wniosek złożony. Skontaktujemy się z Tobą.",
    errorSave: "Błąd zapisu. Spróbuj ponownie.",
  },
  uk: {
    title: "Профіль",
    phone: "Телефон",
    email: "Електронна пошта",
    bankAccount: "Номер рахунку (IBAN)",
    bankPlaceholder: "PL61 1090 1014 0000 0712 1981 2874",
    save: "Зберегти зміни",
    saving: "Збереження...",
    saved: "✓ Збережено",
    gdprTitle: "Право на видалення даних",
    gdprDesc: "Ви можете запросити видалення своїх персональних даних відповідно до GDPR. Запит буде розглянуто протягом 7 днів.",
    gdprBtn: "Запросити видалення даних",
    gdprConfirm: "Ви впевнені? Запит запустить процедуру видалення даних. Це незворотно.",
    gdprDone: "✓ Запит подано. Ми зв'яжемося з вами.",
    errorSave: "Помилка збереження. Спробуйте ще раз.",
  },
} as const;

export default function ProfilePage() {
  const [locale, setLocale] = useState<WorkerLocale>("pl");
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [gdprDone, setGdprDone] = useState(false);

  useEffect(() => { setLocale(getWorkerLocale()); }, []);

  useEffect(() => {
    getWorkerProfile().then((p) => {
      setProfile(p);
      setPhone(p.phone ?? "");
      setEmail(p.email ?? "");
      setBankAccount(p.bank_account ?? "");
    });
  }, []);

  const t = MESSAGES[locale];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus("idle");
    try {
      await updateWorkerProfile({
        phone: phone || undefined,
        email: email || undefined,
        bank_account: bankAccount || undefined,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleGdpr() {
    if (!window.confirm(t.gdprConfirm)) return;
    await requestGdprDeletion();
    setGdprDone(true);
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>

      {/* Name display */}
      <div className="bg-blue-700 text-white rounded-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">
          {profile.first_name[0]}{profile.last_name[0]}
        </div>
        <div>
          <p className="font-bold text-lg">{profile.first_name} {profile.last_name}</p>
          <p className="text-sm opacity-80">{profile.attendance_status}</p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone}</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+48501234567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.bankAccount}</label>
          <Input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder={t.bankPlaceholder}
          />
        </div>
        {saveStatus === "error" && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{t.errorSave}</p>
        )}
        <Button
          type="submit"
          disabled={saving}
          className={`w-full py-3 font-semibold rounded-xl ${
            saveStatus === "saved"
              ? "bg-green-600 hover:bg-green-600 text-white"
              : "bg-blue-700 hover:bg-blue-800 text-white"
          }`}
        >
          {saving ? t.saving : saveStatus === "saved" ? t.saved : t.save}
        </Button>
      </form>

      {/* GDPR deletion */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-800 mb-2">{t.gdprTitle}</h2>
        <p className="text-sm text-gray-500 mb-3">{t.gdprDesc}</p>
        {gdprDone ? (
          <p className="text-sm text-green-600 bg-green-50 rounded px-3 py-2">{t.gdprDone}</p>
        ) : (
          <button
            onClick={handleGdpr}
            className="text-sm text-red-600 border border-red-300 rounded-xl px-4 py-2 hover:bg-red-50 transition-colors"
          >
            {t.gdprBtn}
          </button>
        )}
      </div>
    </div>
  );
}
