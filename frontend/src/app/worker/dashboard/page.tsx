"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getWorkerDashboard, type DashboardData } from "@/lib/worker-api";
import { getWorkerLocale, type WorkerLocale } from "@/lib/worker-auth";

const MESSAGES = {
  pl: {
    title: "Pulpit",
    greeting: (name: string) => `Cześć, ${name}!`,
    assignment: "Aktualne zatrudnienie",
    noAssignment: "Brak aktywnego zatrudnienia",
    position: "Stanowisko",
    client: "Pracodawca",
    from: "Od",
    rate: "Stawka",
    nextShift: "Następna zmiana",
    noShift: "Brak zaplanowanych zmian",
    compliance: "Dokumenty do odnowienia",
    noCompliance: "Wszystkie dokumenty aktualne ✓",
    days: (n: number) => `${n} dni`,
    alertTypes: {
      health_cert_expiry: "Badanie lekarskie",
      bhp_cert_expiry: "Szkolenie BHP",
      a1_cert_expiry: "Certyfikat A1",
      contract_expiry: "Umowa",
      deployment_limit_warning: "Limit delegowania",
    } as Record<string, string>,
  },
  uk: {
    title: "Головна",
    greeting: (name: string) => `Привіт, ${name}!`,
    assignment: "Поточне працевлаштування",
    noAssignment: "Немає активного працевлаштування",
    position: "Посада",
    client: "Роботодавець",
    from: "З",
    rate: "Ставка",
    nextShift: "Наступна зміна",
    noShift: "Немає запланованих змін",
    compliance: "Документи для поновлення",
    noCompliance: "Усі документи актуальні ✓",
    days: (n: number) => `${n} днів`,
    alertTypes: {
      health_cert_expiry: "Медичний огляд",
      bhp_cert_expiry: "Інструктаж з охорони праці",
      a1_cert_expiry: "Сертифікат A1",
      contract_expiry: "Договір",
      deployment_limit_warning: "Ліміт відрядження",
    } as Record<string, string>,
  },
} as const;

function localeTag(locale: WorkerLocale): string {
  return locale === "uk" ? "uk-UA" : "pl-PL";
}

function formatDate(iso: string, locale: WorkerLocale): string {
  return new Date(iso).toLocaleDateString(localeTag(locale), { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(iso: string, locale: WorkerLocale): string {
  return new Date(iso).toLocaleTimeString(localeTag(locale), { hour: "2-digit", minute: "2-digit" });
}

export default function WorkerDashboardPage() {
  const router = useRouter();
  const [locale, setLocale] = useState<WorkerLocale>("pl");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocale(getWorkerLocale());
  }, []);

  useEffect(() => {
    getWorkerDashboard()
      .then(setData)
      .catch(() => setError("error"))
      .finally(() => setLoading(false));
  }, []);

  const t = MESSAGES[locale];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-red-500 text-center mt-8">Błąd ładowania danych.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">{t.greeting(data.worker_name)}</h1>

      {/* Current assignment */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.assignment}</h2>
        {data.current_assignment ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t.position}</span>
              <span className="font-medium text-gray-900">{data.current_assignment.position}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t.client}</span>
              <span className="font-medium text-gray-900">{data.current_assignment.client_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t.from}</span>
              <span className="font-medium text-gray-900">{formatDate(data.current_assignment.start_date, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t.rate}</span>
              <span className="font-medium text-gray-900">{Number(data.current_assignment.worker_rate).toFixed(2)} PLN/h</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t.noAssignment}</p>
        )}
      </section>

      {/* Next shift */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.nextShift}</h2>
        {data.next_shift ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">📅</span>
              <span className="font-medium text-gray-900">{formatDate(data.next_shift.shift_date, locale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">🕐</span>
              <span className="font-medium text-gray-900">
                {formatTime(data.next_shift.start_dt, locale)} – {formatTime(data.next_shift.end_dt, locale)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">🏭</span>
              <span className="font-medium text-gray-900">{data.next_shift.client_name}</span>
            </div>
            {data.next_shift.notes && (
              <p className="text-xs text-gray-400 mt-1">{data.next_shift.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">{t.noShift}</p>
        )}
      </section>

      {/* Compliance warnings */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t.compliance}</h2>
        {data.compliance_warnings.length === 0 ? (
          <p className="text-sm text-green-600">{t.noCompliance}</p>
        ) : (
          <ul className="space-y-2">
            {data.compliance_warnings.map((w, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {t.alertTypes[w.alert_type] ?? w.alert_type}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  w.days_remaining <= 7
                    ? "bg-red-100 text-red-700"
                    : w.days_remaining <= 14
                    ? "bg-orange-100 text-orange-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {t.days(w.days_remaining)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
