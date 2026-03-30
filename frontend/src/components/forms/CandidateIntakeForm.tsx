"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCandidate } from "@/lib/api";
import type { CandidateCreate, LanguageCode, PreferredPosition } from "@/types/api";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Locale = "pl" | "de";

interface Messages {
  languageToggle: string;
  title: string;
  subtitle: string;
  firstName: string;
  firstNamePlaceholder: string;
  lastName: string;
  lastNamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  nationality: string;
  nationalityPlaceholder: string;
  availabilityFrom: string;
  preferredPosition: string;
  preferredPositionPlaceholder: string;
  languages: string;
  locationPreference: string;
  locationPreferencePlaceholder: string;
  gdprConsent: string;
  privacyPolicyLabel: string;
  privacyPolicyText: string;
  submit: string;
  submitting: string;
  retry: string;
  successTitle: string;
  successMessage: string;
  errorTitle: string;
  positions: Record<PreferredPosition, string>;
  languageOptions: Record<LanguageCode, string>;
  errors: {
    firstNameRequired: string;
    lastNameRequired: string;
    phoneRequired: string;
    phoneInvalid: string;
    nationalityRequired: string;
    availabilityRequired: string;
    positionRequired: string;
    languagesRequired: string;
    gdprRequired: string;
    submitFailed: string;
  };
}

const messages: Record<Locale, Messages> = {
  pl: {
    languageToggle: "Język",
    title: "Formularz Rejestracyjny",
    subtitle: "Wypełnij formularz, aby dołączyć do naszej bazy kandydatów.",
    firstName: "Imię",
    firstNamePlaceholder: "Jan",
    lastName: "Nazwisko",
    lastNamePlaceholder: "Kowalski",
    phone: "Telefon",
    phonePlaceholder: "+48 123 456 789",
    email: "Email (opcjonalnie)",
    emailPlaceholder: "jan@example.com",
    nationality: "Obywatelstwo",
    nationalityPlaceholder: "Wybierz kraj...",
    availabilityFrom: "Dostępność od",
    preferredPosition: "Preferowane stanowisko",
    preferredPositionPlaceholder: "Wybierz stanowisko...",
    languages: "Znajomość języków",
    locationPreference: "Preferowana lokalizacja (opcjonalnie)",
    locationPreferencePlaceholder: "np. Warszawa, Słubice",
    gdprConsent:
      "Wyrażam zgodę na przetwarzanie moich danych osobowych przez Nexflow sp. z o.o. w celu rekrutacji, zgodnie z RODO.",
    privacyPolicyLabel: "Polityka prywatności",
    privacyPolicyText:
      "Nexflow sp. z o.o. przetwarza Twoje dane osobowe w celu przeprowadzenia rekrutacji na podstawie art. 6 ust. 1 lit. b RODO. Dane będą przechowywane przez 12 miesięcy od momentu złożenia aplikacji, chyba że zostaniesz zatrudniony/a — wówczas dane są przechowywane przez czas trwania stosunku pracy. Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia oraz przenoszenia. Kontakt: kontakt@nexflow.eu",
    submit: "Wyślij zgłoszenie",
    submitting: "Wysyłanie...",
    retry: "Spróbuj ponownie",
    successTitle: "Zgłoszenie wysłane!",
    successMessage: "Dziękujemy. Skontaktujemy się z Tobą wkrótce.",
    errorTitle: "Błąd wysyłania",
    positions: {
      warehouse_picker: "Pracownik magazynowy",
      forklift_operator: "Operator wózka widłowego",
      logistics_driver: "Kierowca logistyczny",
      other: "Inne",
    },
    languageOptions: {
      pl: "Polski",
      de: "Niemiecki",
      en: "Angielski",
      uk: "Ukraiński",
      ru: "Rosyjski",
    },
    errors: {
      firstNameRequired: "Imię jest wymagane",
      lastNameRequired: "Nazwisko jest wymagane",
      phoneRequired: "Numer telefonu jest wymagany",
      phoneInvalid:
        "Podaj numer w formacie E.164 dla Polski (+48XXXXXXXXX) lub Niemiec (+49XXXXXXXXX)",
      nationalityRequired: "Obywatelstwo jest wymagane",
      availabilityRequired: "Data dostępności jest wymagana",
      positionRequired: "Preferowane stanowisko jest wymagane",
      languagesRequired: "Wybierz co najmniej jeden język",
      gdprRequired: "Zgoda na przetwarzanie danych jest wymagana",
      submitFailed: "Wysyłanie nie powiodło się. Spróbuj ponownie.",
    },
  },
  de: {
    languageToggle: "Sprache",
    title: "Anmeldeformular",
    subtitle:
      "Füllen Sie das Formular aus, um in unsere Kandidatendatenbank aufgenommen zu werden.",
    firstName: "Vorname",
    firstNamePlaceholder: "Max",
    lastName: "Nachname",
    lastNamePlaceholder: "Müller",
    phone: "Telefon",
    phonePlaceholder: "+49 123 456 789",
    email: "E-Mail (optional)",
    emailPlaceholder: "max@beispiel.de",
    nationality: "Staatsangehörigkeit",
    nationalityPlaceholder: "Land auswählen...",
    availabilityFrom: "Verfügbar ab",
    preferredPosition: "Bevorzugte Stelle",
    preferredPositionPlaceholder: "Stelle auswählen...",
    languages: "Sprachkenntnisse",
    locationPreference: "Bevorzugter Standort (optional)",
    locationPreferencePlaceholder: "z.B. Frankfurt, Słubice",
    gdprConsent:
      "Ich stimme der Verarbeitung meiner personenbezogenen Daten durch Nexflow sp. z o.o. zum Zweck der Personalvermittlung gemäß DSGVO zu.",
    privacyPolicyLabel: "Datenschutzhinweis",
    privacyPolicyText:
      "Nexflow sp. z o.o. verarbeitet Ihre personenbezogenen Daten zum Zweck der Durchführung des Bewerbungsverfahrens gemäß Art. 6 Abs. 1 lit. b DSGVO. Die Daten werden 12 Monate nach Einreichung der Bewerbung aufbewahrt, es sei denn, Sie werden eingestellt — in diesem Fall werden die Daten für die Dauer des Beschäftigungsverhältnisses aufbewahrt. Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit. Kontakt: kontakt@nexflow.eu",
    submit: "Bewerbung absenden",
    submitting: "Wird gesendet...",
    retry: "Erneut versuchen",
    successTitle: "Bewerbung gesendet!",
    successMessage: "Vielen Dank. Wir werden uns in Kürze bei Ihnen melden.",
    errorTitle: "Fehler beim Senden",
    positions: {
      warehouse_picker: "Lagerarbeiter",
      forklift_operator: "Gabelstaplerfahrer",
      logistics_driver: "Logistikfahrer",
      other: "Sonstiges",
    },
    languageOptions: {
      pl: "Polnisch",
      de: "Deutsch",
      en: "Englisch",
      uk: "Ukrainisch",
      ru: "Russisch",
    },
    errors: {
      firstNameRequired: "Vorname ist erforderlich",
      lastNameRequired: "Nachname ist erforderlich",
      phoneRequired: "Telefonnummer ist erforderlich",
      phoneInvalid:
        "Bitte geben Sie eine E.164-Nummer für Polen (+48XXXXXXXXX) oder Deutschland (+49XXXXXXXXX) ein",
      nationalityRequired: "Staatsangehörigkeit ist erforderlich",
      availabilityRequired: "Verfügbarkeitsdatum ist erforderlich",
      positionRequired: "Bevorzugte Stelle ist erforderlich",
      languagesRequired: "Wählen Sie mindestens eine Sprache aus",
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

const LANGUAGE_CODES: LanguageCode[] = ["pl", "de", "en", "uk", "ru"];

// Top nationality options shown first in the select, then a divider, then the rest
const TOP_NATIONALITIES = ["PL", "UA", "DE", "BY", "MD", "RO"] as const;
const OTHER_NATIONALITIES = [
  "AL", "AM", "AT", "AZ", "BA", "BE", "BG", "CZ", "DK", "EE",
  "ES", "FI", "FR", "GB", "GE", "GR", "HR", "HU", "IN", "IT",
  "KZ", "LT", "LU", "LV", "MK", "NL", "NO", "PK", "PT", "RS",
  "RU", "SE", "SI", "SK", "TR", "UZ", "VN", "XK",
].sort();

const COUNTRY_NAMES: Record<Locale, Record<string, string>> = {
  pl: {
    PL: "Polska", UA: "Ukraina", DE: "Niemcy", BY: "Białoruś", MD: "Mołdawia", RO: "Rumunia",
    AL: "Albania", AM: "Armenia", AT: "Austria", AZ: "Azerbejdżan", BA: "Bośnia i Hercegowina",
    BE: "Belgia", BG: "Bułgaria", CZ: "Czechy", DK: "Dania", EE: "Estonia",
    ES: "Hiszpania", FI: "Finlandia", FR: "Francja", GB: "Wielka Brytania", GE: "Gruzja",
    GR: "Grecja", HR: "Chorwacja", HU: "Węgry", IN: "Indie", IT: "Włochy",
    KZ: "Kazachstan", LT: "Litwa", LU: "Luksemburg", LV: "Łotwa", MK: "Macedonia Płn.",
    NL: "Holandia", NO: "Norwegia", PK: "Pakistan", PT: "Portugalia", RS: "Serbia",
    RU: "Rosja", SE: "Szwecja", SI: "Słowenia", SK: "Słowacja", TR: "Turcja",
    UZ: "Uzbekistan", VN: "Wietnam", XK: "Kosowo",
  },
  de: {
    PL: "Polen", UA: "Ukraine", DE: "Deutschland", BY: "Weißrussland", MD: "Moldau", RO: "Rumänien",
    AL: "Albanien", AM: "Armenien", AT: "Österreich", AZ: "Aserbaidschan", BA: "Bosnien und Herzegowina",
    BE: "Belgien", BG: "Bulgarien", CZ: "Tschechien", DK: "Dänemark", EE: "Estland",
    ES: "Spanien", FI: "Finnland", FR: "Frankreich", GB: "Großbritannien", GE: "Georgien",
    GR: "Griechenland", HR: "Kroatien", HU: "Ungarn", IN: "Indien", IT: "Italien",
    KZ: "Kasachstan", LT: "Litauen", LU: "Luxemburg", LV: "Lettland", MK: "Nordmazedonien",
    NL: "Niederlande", NO: "Norwegen", PK: "Pakistan", PT: "Portugal", RS: "Serbien",
    RU: "Russland", SE: "Schweden", SI: "Slowenien", SK: "Slowakei", TR: "Türkei",
    UZ: "Usbekistan", VN: "Vietnam", XK: "Kosovo",
  },
};

// E.164: PL = +48 + 9 digits, DE = +49 + 9–12 digits
const E164_PL_DE = /^\+(48\d{9}|49\d{9,12})$/;

function todayISO(): string {
  return new Date().toISOString().split("T")[0]!;
}

// ---------------------------------------------------------------------------
// Form state type
// ---------------------------------------------------------------------------

interface FormState {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  nationality: string;
  availability_from: string;
  preferred_position: PreferredPosition | "";
  languages: Set<LanguageCode>;
  location_preference: string;
  gdpr_consent: boolean;
}

type ErrorMap = Partial<Record<keyof Omit<FormState, "languages"> | "languages", string>>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateField(
  field: keyof FormState,
  value: FormState[keyof FormState],
  t: Messages["errors"],
): string {
  switch (field) {
    case "first_name":
      return typeof value === "string" && value.trim() ? "" : t.firstNameRequired;
    case "last_name":
      return typeof value === "string" && value.trim() ? "" : t.lastNameRequired;
    case "phone": {
      const v = typeof value === "string" ? value.trim() : "";
      if (!v) return t.phoneRequired;
      return E164_PL_DE.test(v) ? "" : t.phoneInvalid;
    }
    case "nationality":
      return typeof value === "string" && value ? "" : t.nationalityRequired;
    case "availability_from":
      return typeof value === "string" && value ? "" : t.availabilityRequired;
    case "preferred_position":
      return typeof value === "string" && value ? "" : t.positionRequired;
    case "languages":
      return value instanceof Set && value.size > 0 ? "" : t.languagesRequired;
    case "gdpr_consent":
      return value === true ? "" : t.gdprRequired;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CandidateIntakeForm() {
  const [locale, setLocale] = useState<Locale>("pl");
  const t = messages[locale];

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    nationality: "",
    availability_from: "",
    preferred_position: "",
    languages: new Set<LanguageCode>(),
    location_preference: "",
    gdpr_consent: false,
  });

  const [errors, setErrors] = useState<ErrorMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [policyExpanded, setPolicyExpanded] = useState(false);

  // Validate a single field on blur
  function handleBlur(field: keyof FormState) {
    const msg = validateField(field, form[field], t.errors);
    setErrors((prev) => ({ ...prev, [field]: msg }));
  }

  // Validate all fields and return true if clean
  function validateAll(): boolean {
    const next: ErrorMap = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((field) => {
      const msg = validateField(field, form[field], t.errors);
      if (msg) next[field as keyof ErrorMap] = msg;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function toggleLanguage(code: LanguageCode) {
    setForm((prev) => {
      const next = new Set(prev.languages);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return { ...prev, languages: next };
    });
    // Re-validate languages on change
    setErrors((prev) => ({ ...prev, languages: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    setSubmitting(true);
    setSubmitError("");

    const payload: CandidateCreate = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      nationality: form.nationality,
      availability_from: form.availability_from,
      preferred_position: form.preferred_position as PreferredPosition,
      languages: Array.from(form.languages),
      gdpr_consent: form.gdpr_consent,
      gdpr_consent_at: new Date().toISOString(),
      ...(form.email.trim() && { email: form.email.trim() }),
      ...(form.location_preference.trim() && {
        location_preference: form.location_preference.trim(),
      }),
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

  function handleRetry() {
    setSubmitError("");
  }

  // ---------------------------
  // Success screen
  // ---------------------------
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cloud-white p-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
              ✓
            </span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-green-600">{t.successTitle}</h2>
          <p className="text-gray-600">{t.successMessage}</p>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Error screen (API failure)
  // ---------------------------
  if (submitError && !submitting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cloud-white p-4">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              !
            </span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-red-600">{t.errorTitle}</h2>
          <p className="mb-6 text-gray-600">{submitError}</p>
          <Button onClick={handleRetry} variant="outline" className="w-full">
            {t.retry}
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------
  // Form
  // ---------------------------
  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="min-h-screen bg-cloud-white p-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Language toggle */}
        <div className="mb-6 flex items-center justify-end gap-1">
          <span className="mr-2 text-sm text-gray-500">{t.languageToggle}:</span>
          {(["pl", "de"] as Locale[]).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocale(loc)}
              className={`rounded px-3 py-1 text-sm font-semibold transition-colors ${
                locale === loc
                  ? "bg-primary text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {loc.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          <h1 className="mb-1 text-2xl font-bold">{t.title}</h1>
          <p className="mb-6 text-sm text-gray-500">{t.subtitle}</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* First name + Last name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t.firstName} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.first_name}
                  placeholder={t.firstNamePlaceholder}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  onBlur={() => handleBlur("first_name")}
                  aria-invalid={!!errors.first_name}
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t.lastName} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.last_name}
                  placeholder={t.lastNamePlaceholder}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  onBlur={() => handleBlur("last_name")}
                  aria-invalid={!!errors.last_name}
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t.phone} <span className="text-destructive">*</span>
              </label>
              <Input
                type="tel"
                value={form.phone}
                placeholder={t.phonePlaceholder}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                onBlur={() => handleBlur("phone")}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium">{t.email}</label>
              <Input
                type="email"
                value={form.email}
                placeholder={t.emailPlaceholder}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            {/* Nationality + Availability */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t.nationality} <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.nationality}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, nationality: e.target.value }));
                    setErrors((prev) => ({ ...prev, nationality: undefined }));
                  }}
                  onBlur={() => handleBlur("nationality")}
                  className={selectClass}
                  aria-invalid={!!errors.nationality}
                >
                  <option value="">{t.nationalityPlaceholder}</option>
                  <optgroup label="—">
                    {TOP_NATIONALITIES.map((code) => (
                      <option key={code} value={code}>
                        {code} — {COUNTRY_NAMES[locale][code]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="──────────">
                    {OTHER_NATIONALITIES.map((code) => (
                      <option key={code} value={code}>
                        {code} — {COUNTRY_NAMES[locale][code] ?? code}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {errors.nationality && (
                  <p className="mt-1 text-xs text-destructive">{errors.nationality}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t.availabilityFrom} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.availability_from}
                  min={todayISO()}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, availability_from: e.target.value }))
                  }
                  onBlur={() => handleBlur("availability_from")}
                  aria-invalid={!!errors.availability_from}
                />
                {errors.availability_from && (
                  <p className="mt-1 text-xs text-destructive">{errors.availability_from}</p>
                )}
              </div>
            </div>

            {/* Preferred position */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t.preferredPosition} <span className="text-destructive">*</span>
              </label>
              <select
                value={form.preferred_position}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    preferred_position: e.target.value as PreferredPosition | "",
                  }));
                  setErrors((prev) => ({ ...prev, preferred_position: undefined }));
                }}
                onBlur={() => handleBlur("preferred_position")}
                className={selectClass}
                aria-invalid={!!errors.preferred_position}
              >
                <option value="">{t.preferredPositionPlaceholder}</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {t.positions[pos]}
                  </option>
                ))}
              </select>
              {errors.preferred_position && (
                <p className="mt-1 text-xs text-destructive">{errors.preferred_position}</p>
              )}
            </div>

            {/* Languages */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t.languages} <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {LANGUAGE_CODES.map((code) => (
                  <label key={code} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.languages.has(code)}
                      onChange={() => toggleLanguage(code)}
                      className="h-4 w-4 rounded border-gray-300 accent-primary"
                    />
                    <span className="text-sm">{t.languageOptions[code]}</span>
                  </label>
                ))}
              </div>
              {errors.languages && (
                <p className="mt-1 text-xs text-destructive">{errors.languages}</p>
              )}
            </div>

            {/* Location preference */}
            <div>
              <label className="mb-1 block text-sm font-medium">{t.locationPreference}</label>
              <Input
                value={form.location_preference}
                placeholder={t.locationPreferencePlaceholder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location_preference: e.target.value }))
                }
              />
            </div>

            {/* GDPR consent */}
            <div className="rounded-md border border-input p-4">
              {/* Expandable privacy policy */}
              <button
                type="button"
                onClick={() => setPolicyExpanded((v) => !v)}
                className="mb-3 flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                <span>{policyExpanded ? "▾" : "▸"}</span>
                {t.privacyPolicyLabel}
              </button>
              {policyExpanded && (
                <p className="mb-3 rounded bg-cloud-white p-3 text-xs leading-relaxed text-gray-600">
                  {t.privacyPolicyText}
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.gdpr_consent}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, gdpr_consent: e.target.checked }));
                    setErrors((prev) => ({ ...prev, gdpr_consent: undefined }));
                  }}
                  onBlur={() => handleBlur("gdpr_consent")}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 accent-primary"
                />
                <span className="text-xs text-gray-700">{t.gdprConsent}</span>
              </label>
              {errors.gdpr_consent && (
                <p className="mt-1 text-xs text-destructive">{errors.gdpr_consent}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.submitting}
                </span>
              ) : (
                t.submit
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
