"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listPayslips, type PayslipPeriod } from "@/lib/worker-api";
import { getWorkerLocale, type WorkerLocale } from "@/lib/worker-auth";

const MONTH_NAMES: Record<WorkerLocale, Record<number, string>> = {
  pl: {
    1: "Styczeń", 2: "Luty", 3: "Marzec", 4: "Kwiecień",
    5: "Maj", 6: "Czerwiec", 7: "Lipiec", 8: "Sierpień",
    9: "Wrzesień", 10: "Październik", 11: "Listopad", 12: "Grudzień",
  },
  uk: {
    1: "Січень", 2: "Лютий", 3: "Березень", 4: "Квітень",
    5: "Травень", 6: "Червень", 7: "Липень", 8: "Серпень",
    9: "Вересень", 10: "Жовтень", 11: "Листопад", 12: "Грудень",
  },
};

const MESSAGES = {
  pl: { title: "Wypłaty", empty: "Brak danych o wypłatach", hours: "h", details: "Szczegóły →" },
  uk: { title: "Виплати", empty: "Немає даних про виплати", hours: "год", details: "Деталі →" },
} as const;

export default function PayslipsPage() {
  const [locale, setLocale] = useState<WorkerLocale>("pl");
  const [periods, setPeriods] = useState<PayslipPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLocale(getWorkerLocale()); }, []);

  useEffect(() => {
    listPayslips().then(setPeriods).finally(() => setLoading(false));
  }, []);

  const t = MESSAGES[locale];
  const months = MONTH_NAMES[locale];

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
      {periods.length === 0 ? (
        <p className="text-gray-400 text-center mt-12">{t.empty}</p>
      ) : (
        <div className="space-y-3">
          {periods.map((p) => (
            <Link
              key={`${p.year}-${p.month}`}
              href={`/worker/payslips/${p.year}/${p.month}`}
              className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {months[p.month]} {p.year}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {Number(p.total_hours).toFixed(1)} {t.hours}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-700">
                    {Number(p.total_pay).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">{p.currency}</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2 text-right">{t.details}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
