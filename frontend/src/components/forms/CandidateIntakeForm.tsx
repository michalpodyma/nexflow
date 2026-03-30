"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCandidate } from "@/lib/api";
import type { CandidateCreate, PreferredPosition } from "@/types/api";

type Locale = "pl" | "de";

const messages = {
  pl: {
    title: "Formularz Rejestracyjny",
    subtitle: "Wypełnij formularz, aby dołączyć do naszej bazy kandydatów",
    firstName: "Imię",
    lastName: "Nazwisko",
    phone: "Telefon",
    email: "Email",
    nationality: "Obywatelstwo (np. PL)",
    availabilityFrom: "Dostępność od",
    preferredPosition: "Preferowane stanowisko",
    locationPreference: "Preferowana lokalizacja",
    languages: "Języki (np. pl,en)",
    gdprConsent:
      "Wyrażam zgodę na przetwarzanie moich danych osobowych przez Eurojob-West sp. z o.o. w celu rekrutacji, zgodnie z RODO.",
    submit: "Wyślij zgłoszenie",
    submitting: "Wysyłanie...",
    successTitle: "Zgłoszenie wysłane!",
    successMessage: "Dziękujemy. Skontaktujemy się z Tobą wkrótce.",
    positions: {
      warehouse_picker: "Pracownik magazynowy",
      forklift_operator: "Operator wózka widłowego",
      logistics_driver: "Kierowca logistyczny",
      other: "Inne",
    },
    errors: {
      firstNameRequired: "Imię jest wymagane",
      lastNameRequired: "Nazwisko jest wymagane",
      gdprRequired: "Zgoda na przetwarzanie danych jest wymagana",
      submitFailed: "Wysyłanie nie powiodło się. Spróbuj ponownie.",
    },
  },
  de: {
    title: "Anmeldeformular",
    subtitle:
      "Füllen Sie das Formular aus, um in unsere Kandidatendatenbank aufgenommen zu werden",
    firstName: "Vorname",
    lastName: "Nachname",
    phone: "Telefon",
    email: "E-Mail",
    nationality: "Staatsangehörigkeit (z.B. PL)",
    availabilityFrom: "Verfügbar ab",
    preferredPosition: "Bevorzugte Stelle",
    locationPreference: "Bevorzugter Standort",
    languages: "Sprachen (z.B. pl,en)",
    gdprConsent:
      "Ich stimme der Verarbeitung meiner personenbezogenen Daten durch Eurojob-West sp. z o.o. zum Zweck der Personalvermittlung gemäß DSGVO zu.",
    submit: "Bewerbung absenden",
    submitting: "Wird gesendet...",
    successTitle: "Bewerbung gesendet!",
    successMessage: "Vielen Dank. Wir werden uns in Kürze bei Ihnen melden.",
    positions: {
      warehouse_picker: "Lagerarbeiter",
      forklift_operator: "Gabelstaplerfahrer",
      logistics_driver: "Logistikfahrer",
      other: "Sonstiges",
    },
    errors: {
      firstNameRequired: "Vorname ist erforderlich",
      lastNameRequired: "Nachname ist erforderlich",
      gdprRequired: "Die Einwilligung zur Datenverarbeitung ist erforderlich",
      submitFailed: "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.",
    },
  },
};

const POSITIONS: PreferredPosition[] = [
  "warehouse_picker",
  "forklift_operator",
  "logistics_driver",
  "other",
];

export function CandidateIntakeForm() {
  const [locale, setLocale] = useState<Locale>("pl");
  const t = messages[locale];

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    nationality: "",
    availability_from: "",
    preferred_position: "" as PreferredPosition | "",
    languages: "",
    location_preference: "",
    gdpr_consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.first_name.trim()) newErrors.first_name = t.errors.firstNameRequired;
    if (!form.last_name.trim()) newErrors.last_name = t.errors.lastNameRequired;
    if (!form.gdpr_consent) newErrors.gdpr_consent = t.errors.gdprRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");

    const payload: CandidateCreate = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      gdpr_consent: form.gdpr_consent,
      ...(form.phone && { phone: form.phone.trim() }),
      ...(form.email && { email: form.email.trim() }),
      ...(form.nationality && { nationality: form.nationality.trim().toUpperCase().slice(0, 2) }),
      ...(form.availability_from && { availability_from: form.availability_from }),
      ...(form.preferred_position && { preferred_position: form.preferred_position }),
      ...(form.languages && {
        languages: form.languages
          .split(",")
          .map((l) => l.trim().toLowerCase())
          .filter(Boolean),
      }),
      ...(form.location_preference && { location_preference: form.location_preference.trim() }),
    };

    try {
      await createCandidate(payload);
      setSubmitted(true);
    } catch {
      setSubmitError(t.errors.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">✓</div>
          <h2 className="mb-2 text-2xl font-bold text-green-600">{t.successTitle}</h2>
          <p className="text-gray-600">{t.successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Language toggle */}
        <div className="mb-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setLocale("pl")}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              locale === "pl"
                ? "bg-primary text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            PL
          </button>
          <button
            type="button"
            onClick={() => setLocale("de")}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              locale === "de"
                ? "bg-primary text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            DE
          </button>
        </div>

        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold">{t.title}</h1>
          <p className="mb-6 text-sm text-gray-500">{t.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.firstName} *</label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder={t.firstName}
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.lastName} *</label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder={t.lastName}
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.phone}</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+48 123 456 789"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.email}</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t.nationality}</label>
                <Input
                  value={form.nationality}
                  onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                  maxLength={2}
                  placeholder="PL"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t.availabilityFrom}</label>
                <Input
                  type="date"
                  value={form.availability_from}
                  onChange={(e) => setForm((f) => ({ ...f, availability_from: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.preferredPosition}</label>
              <select
                value={form.preferred_position}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    preferred_position: e.target.value as PreferredPosition | "",
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">—</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {t.positions[pos]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.locationPreference}</label>
              <Input
                value={form.location_preference}
                onChange={(e) => setForm((f) => ({ ...f, location_preference: e.target.value }))}
                placeholder="Warszawa, Słubice..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t.languages}</label>
              <Input
                value={form.languages}
                onChange={(e) => setForm((f) => ({ ...f, languages: e.target.value }))}
                placeholder="pl, en, uk"
              />
            </div>

            <div className="rounded-md border border-input p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.gdpr_consent}
                  onChange={(e) => setForm((f) => ({ ...f, gdpr_consent: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300"
                />
                <span className="text-xs text-gray-600">{t.gdprConsent}</span>
              </label>
              {errors.gdpr_consent && (
                <p className="mt-1 text-xs text-destructive">{errors.gdpr_consent}</p>
              )}
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t.submitting : t.submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
