"use client";

import { useEffect, useState } from "react";

import { getWorkerSchedule, type UpcomingShift } from "@/lib/worker-api";
import { getWorkerLocale, type WorkerLocale } from "@/lib/worker-auth";

const MESSAGES = {
  pl: {
    title: "Grafik",
    subtitle: "Nadchodzące zmiany (30 dni)",
    empty: "Brak zaplanowanych zmian",
    notes: "Uwagi",
  },
  uk: {
    title: "Графік",
    subtitle: "Найближчі зміни (30 днів)",
    empty: "Немає запланованих змін",
    notes: "Примітки",
  },
} as const;

function formatShiftDate(iso: string, locale: WorkerLocale): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "pl" ? "pl-PL" : "uk-UA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatTime(iso: string, locale: WorkerLocale): string {
  return new Date(iso).toLocaleTimeString(locale === "uk" ? "uk-UA" : "pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function shiftDuration(start: string, end: string): string {
  const h = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000;
  return `${h.toFixed(1)}h`;
}

export default function SchedulePage() {
  const [locale, setLocale] = useState<WorkerLocale>("pl");
  const [shifts, setShifts] = useState<UpcomingShift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLocale(getWorkerLocale()); }, []);

  useEffect(() => {
    getWorkerSchedule().then(setShifts).finally(() => setLoading(false));
  }, []);

  const t = MESSAGES[locale];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">{t.title}</h1>
      <p className="text-sm text-gray-500 mb-4">{t.subtitle}</p>

      {shifts.length === 0 ? (
        <p className="text-gray-400 text-center mt-12">{t.empty}</p>
      ) : (
        <div className="space-y-3">
          {shifts.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 capitalize">
                    {formatShiftDate(s.shift_date, locale)}
                  </p>
                  <p className="text-sm text-blue-700 font-medium mt-0.5">
                    {formatTime(s.start_dt, locale)} – {formatTime(s.end_dt, locale)}
                    <span className="text-gray-400 font-normal ml-2">
                      ({shiftDuration(s.start_dt, s.end_dt)})
                    </span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">🏭 {s.client_name}</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {shiftDuration(s.start_dt, s.end_dt)}
                </span>
              </div>
              {s.notes && (
                <p className="text-xs text-gray-400 mt-2 bg-gray-50 rounded px-2 py-1">
                  {t.notes}: {s.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
