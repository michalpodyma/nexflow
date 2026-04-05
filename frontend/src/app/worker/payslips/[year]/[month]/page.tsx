"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getPayslip, type PayslipDetail } from "@/lib/worker-api";
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
  pl: {
    back: "← Wróć",
    rate: "Stawka godzinowa",
    totalHours: "Łącznie godzin",
    overtime: "Nadgodziny",
    totalPay: "Łączna wypłata",
    date: "Data",
    worked: "Godz.",
    ot: "Nadg.",
    pay: "Kwota",
    hours: "h",
  },
  uk: {
    back: "← Назад",
    rate: "Годинна ставка",
    totalHours: "Всього годин",
    overtime: "Понаднормово",
    totalPay: "Загальна виплата",
    date: "Дата",
    worked: "Год.",
    ot: "Надн.",
    pay: "Сума",
    hours: "год",
  },
} as const;

function fmt(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayslipDetailPage() {
  const params = useParams<{ year: string; month: string }>();
  const router = useRouter();
  const year = Number(params.year);
  const month = Number(params.month);

  const [locale, setLocale] = useState<WorkerLocale>("pl");
  const [detail, setDetail] = useState<PayslipDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLocale(getWorkerLocale()); }, []);

  useEffect(() => {
    getPayslip(year, month).then(setDetail).finally(() => setLoading(false));
  }, [year, month]);

  const t = MESSAGES[locale];
  const months = MONTH_NAMES[locale];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-blue-600 mb-4 flex items-center gap-1">
        {t.back}
      </button>
      <h1 className="text-xl font-bold text-gray-900 mb-4">
        {months[month]} {year}
      </h1>

      {/* Summary card */}
      <div className="bg-blue-700 text-white rounded-2xl p-5 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="opacity-80">{t.rate}</span>
          <span className="font-semibold">{Number(detail.worker_rate).toFixed(2)} PLN/h</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="opacity-80">{t.totalHours}</span>
          <span className="font-semibold">{Number(detail.total_hours).toFixed(1)} {t.hours}</span>
        </div>
        {Number(detail.overtime_hours) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="opacity-80">{t.overtime}</span>
            <span className="font-semibold">{Number(detail.overtime_hours).toFixed(1)} {t.hours}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-blue-500 pt-2 mt-2">
          <span className="font-bold">{t.totalPay}</span>
          <span className="text-xl font-bold">{Number(detail.total_pay).toFixed(2)} {detail.currency}</span>
        </div>
      </div>

      {/* Daily breakdown */}
      {detail.days.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-4 text-xs text-gray-400 font-medium px-4 py-2 border-b bg-gray-50">
            <span>{t.date}</span>
            <span className="text-center">{t.worked}</span>
            <span className="text-center">{t.ot}</span>
            <span className="text-right">{t.pay}</span>
          </div>
          {detail.days.map((d) => (
            <div key={d.work_date} className="grid grid-cols-4 text-sm px-4 py-2.5 border-b last:border-0">
              <span className="text-gray-700 font-medium">{fmt(d.work_date)}</span>
              <span className="text-center text-gray-600">{Number(d.hours_worked).toFixed(1)}</span>
              <span className="text-center text-gray-400">{Number(d.overtime_hours) > 0 ? Number(d.overtime_hours).toFixed(1) : "–"}</span>
              <span className="text-right font-semibold text-gray-900">{Number(d.daily_pay).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
