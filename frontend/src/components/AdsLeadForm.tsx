"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  locale: "pl" | "de";
  source: string;
  ctaLabel?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

interface Labels {
  name: string;
  namePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  city: string;
  cityPlaceholder: string;
  consentText: string;
  privacyLabel: string;
  privacyHref: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successMsg: string;
  errorMsg: string;
}

const LABELS: Record<"pl" | "de", Labels> = {
  pl: {
    name: "Imię i nazwisko",
    namePlaceholder: "Jan Kowalski",
    phone: "Numer telefonu",
    phonePlaceholder: "+48 600 000 000",
    city: "Miasto",
    cityPlaceholder: "Twoje miasto",
    consentText:
      "Wyrażam zgodę na przetwarzanie moich danych osobowych przez Nexflow Sp. z o.o. w celu rekrutacji. Szczegóły w ",
    privacyLabel: "Polityce Prywatności",
    privacyHref: "/polityka-prywatnosci",
    submit: "Aplikuj teraz →",
    submitting: "Wysyłanie...",
    successTitle: "Dziękujemy!",
    successMsg: "Nasz rekruter skontaktuje się z Tobą w ciągu 24 godzin.",
    errorMsg: "Coś poszło nie tak. Zadzwoń do nas: +48 224 878 828",
  },
  de: {
    name: "Vor- und Nachname",
    namePlaceholder: "Max Mustermann",
    phone: "Telefonnummer",
    phonePlaceholder: "+49 151 000 0000",
    city: "Stadt",
    cityPlaceholder: "Ihre Stadt",
    consentText:
      "Ich stimme der Verarbeitung meiner personenbezogenen Daten durch Nexflow Sp. z o.o. zur Personalvermittlung gemäß DSGVO zu. Details in der ",
    privacyLabel: "Datenschutzerklärung",
    privacyHref: "/datenschutz",
    submit: "Jetzt bewerben →",
    submitting: "Senden...",
    successTitle: "Vielen Dank!",
    successMsg: "Unser Recruiter meldet sich innerhalb von 24 Stunden bei Ihnen.",
    errorMsg: "Etwas ist schiefgelaufen. Rufen Sie uns an: +48 224 878 828",
  },
};

export default function AdsLeadForm({ locale, source, ctaLabel }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const t = LABELS[locale];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setStatus("submitting");

    const now = new Date().toISOString();
    try {
      const res = await fetch("/api/ads-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, city, source, locale, gdpr_consent_at: now }),
      });
      if (!res.ok) throw new Error("submit failed");

      const w = window as Window & { dataLayer?: Record<string, unknown>[] };
      w.dataLayer = w.dataLayer ?? [];
      w.dataLayer.push({ event: "ads_lead_submit", source, locale });

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-meadow-green/15 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-meadow-green"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-nexflow-navy mb-2">{t.successTitle}</h3>
        <p className="text-slate text-sm">{t.successMsg}</p>
      </div>
    );
  }

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-graphite placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-nexflow-cyan/30 focus:border-nexflow-cyan transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="ads-name" className="block text-sm font-medium text-graphite mb-1.5">
          {t.name} <span className="text-red-400">*</span>
        </label>
        <input
          id="ads-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="ads-phone" className="block text-sm font-medium text-graphite mb-1.5">
          {t.phone} <span className="text-red-400">*</span>
        </label>
        <input
          id="ads-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.phonePlaceholder}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="ads-city" className="block text-sm font-medium text-graphite mb-1.5">
          {t.city}
        </label>
        <input
          id="ads-city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t.cityPlaceholder}
          className={inputCls}
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-nexflow-cyan focus:ring-nexflow-cyan/30 shrink-0 cursor-pointer"
        />
        <span className="text-xs text-slate leading-relaxed">
          {t.consentText}
          <Link href={t.privacyHref} className="underline hover:text-nexflow-navy transition-colors" target="_blank">
            {t.privacyLabel}
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "submitting" || !consent}
        className="w-full bg-nexflow-cyan text-nexflow-navy font-bold py-3.5 rounded-lg text-base hover:bg-opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "submitting" ? t.submitting : (ctaLabel ?? t.submit)}
      </button>

      {status === "error" && (
        <p className="text-red-500 text-xs text-center">{t.errorMsg}</p>
      )}
    </form>
  );
}
