"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitCandidateIntake } from "@/lib/api";
import type { CandidateCreate, DocumentType, LanguageCode, PreferredPosition } from "@/types/api";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Locale = "pl" | "de" | "en" | "uk" | "id" | "nl";

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
  documentType: string;
  documentTypePlaceholder: string;
  documentTypes: Record<DocumentType, string>;
  cvUpload: string;
  cvHint: string;
  referredBy: string;
  referredByPlaceholder: string;
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
    successMessage: "Dziękujemy! Skontaktujemy się z Tobą w ciągu 24 godzin.",
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
      id: "Indonezyjski",
      es: "Hiszpański",
      nl: "Niderlandzki",
    },
    documentType: "Typ dokumentu (opcjonalnie)",
    documentTypePlaceholder: "Wybierz typ dokumentu...",
    documentTypes: {
      ukrainian_passport: "Paszport ukraiński",
      eu_id: "Dowód tożsamości UE",
      work_permit: "Zezwolenie na pracę",
      none: "Inny / Brak",
    },
    cvUpload: "CV (PDF, max 10 MB — opcjonalnie)",
    cvHint: "Prześlij CV w formacie PDF",
    referredBy: "Kto Cię polecił? (opcjonalne)",
    referredByPlaceholder: "Imię i nazwisko osoby polecającej",
    errors: {
      firstNameRequired: "Imię jest wymagane",
      lastNameRequired: "Nazwisko jest wymagane",
      phoneRequired: "Numer telefonu jest wymagany",
      phoneInvalid:
        "Podaj numer w formacie E.164 (np. +380 12 345 6789)",
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
    successMessage: "Vielen Dank! Wir werden uns innerhalb von 24 Stunden bei Ihnen melden.",
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
      id: "Indonesisch",
      es: "Spanisch",
      nl: "Niederländisch",
    },
    documentType: "Dokumententyp (optional)",
    documentTypePlaceholder: "Dokumententyp auswählen...",
    documentTypes: {
      ukrainian_passport: "Ukrainischer Reisepass",
      eu_id: "EU-Personalausweis",
      work_permit: "Arbeitserlaubnis",
      none: "Sonstiges / Kein",
    },
    cvUpload: "Lebenslauf (PDF, max. 10 MB — optional)",
    cvHint: "Lebenslauf im PDF-Format hochladen",
    referredBy: "Wer hat Sie empfohlen? (optional)",
    referredByPlaceholder: "Name der empfehlenden Person",
    errors: {
      firstNameRequired: "Vorname ist erforderlich",
      lastNameRequired: "Nachname ist erforderlich",
      phoneRequired: "Telefonnummer ist erforderlich",
      phoneInvalid:
        "Bitte geben Sie eine internationale E.164-Nummer ein (z.B. +380 12 345 6789)",
      nationalityRequired: "Staatsangehörigkeit ist erforderlich",
      availabilityRequired: "Verfügbarkeitsdatum ist erforderlich",
      positionRequired: "Bevorzugte Stelle ist erforderlich",
      languagesRequired: "Wählen Sie mindestens eine Sprache aus",
      gdprRequired: "Die Einwilligung zur Datenverarbeitung ist erforderlich",
      submitFailed: "Senden fehlgeschlagen. Bitte versuchen Sie es erneut.",
    },
  },
  en: {
    languageToggle: "Language",
    title: "Registration Form",
    subtitle: "Fill in the form to join our candidate database.",
    firstName: "First Name",
    firstNamePlaceholder: "John",
    lastName: "Last Name",
    lastNamePlaceholder: "Smith",
    phone: "Phone",
    phonePlaceholder: "+380 12 345 6789",
    email: "Email (optional)",
    emailPlaceholder: "john@example.com",
    nationality: "Nationality",
    nationalityPlaceholder: "Select country...",
    availabilityFrom: "Available from",
    preferredPosition: "Preferred position",
    preferredPositionPlaceholder: "Select position...",
    languages: "Language skills",
    locationPreference: "Preferred location (optional)",
    locationPreferencePlaceholder: "e.g. Warsaw, Słubice",
    gdprConsent:
      "I consent to the processing of my personal data by Nexflow sp. z o.o. for recruitment purposes, in accordance with GDPR.",
    privacyPolicyLabel: "Privacy Policy",
    privacyPolicyText:
      "Nexflow sp. z o.o. processes your personal data for the purpose of conducting the recruitment process pursuant to Art. 6(1)(b) GDPR. Data will be stored for 12 months from application submission, unless you are hired — in which case data is retained for the duration of employment. You have the right to access, rectify, erase, and port your data. Contact: kontakt@nexflow.eu",
    submit: "Submit application",
    submitting: "Submitting...",
    retry: "Try again",
    successTitle: "Application submitted!",
    successMessage: "Thank you! We will contact you within 24 hours.",
    errorTitle: "Submission error",
    positions: {
      warehouse_picker: "Warehouse worker",
      forklift_operator: "Forklift operator",
      logistics_driver: "Logistics driver",
      other: "Other",
    },
    languageOptions: {
      pl: "Polish",
      de: "German",
      en: "English",
      uk: "Ukrainian",
      id: "Indonesian",
      es: "Spanish",
      nl: "Dutch",
    },
    documentType: "Document type (optional)",
    documentTypePlaceholder: "Select document type...",
    documentTypes: {
      ukrainian_passport: "Ukrainian passport",
      eu_id: "EU ID card",
      work_permit: "Work permit",
      none: "Other / None",
    },
    cvUpload: "CV (PDF, max 10 MB — optional)",
    cvHint: "Upload your CV in PDF format",
    referredBy: "Referred by (optional)",
    referredByPlaceholder: "Name of the person who referred you",
    errors: {
      firstNameRequired: "First name is required",
      lastNameRequired: "Last name is required",
      phoneRequired: "Phone number is required",
      phoneInvalid:
        "Enter a valid international phone number in E.164 format (e.g. +380 12 345 6789)",
      nationalityRequired: "Nationality is required",
      availabilityRequired: "Availability date is required",
      positionRequired: "Preferred position is required",
      languagesRequired: "Select at least one language",
      gdprRequired: "Consent to data processing is required",
      submitFailed: "Submission failed. Please try again.",
    },
  },
  uk: {
    languageToggle: "Мова",
    title: "Реєстраційна форма",
    subtitle: "Заповніть форму, щоб приєднатися до нашої бази кандидатів.",
    firstName: "Ім'я",
    firstNamePlaceholder: "Іван",
    lastName: "Прізвище",
    lastNamePlaceholder: "Коваленко",
    phone: "Телефон",
    phonePlaceholder: "+380 12 345 6789",
    email: "Email (необов'язково)",
    emailPlaceholder: "ivan@example.com",
    nationality: "Громадянство",
    nationalityPlaceholder: "Оберіть країну...",
    availabilityFrom: "Доступний з",
    preferredPosition: "Бажана посада",
    preferredPositionPlaceholder: "Оберіть посаду...",
    languages: "Знання мов",
    locationPreference: "Бажане місце роботи (необов'язково)",
    locationPreferencePlaceholder: "напр. Варшава, Слубіце",
    gdprConsent:
      "Я даю згоду на обробку моїх персональних даних компанією Nexflow sp. z o.o. з метою рекрутингу відповідно до GDPR.",
    privacyPolicyLabel: "Політика конфіденційності",
    privacyPolicyText:
      "Nexflow sp. z o.o. обробляє ваші персональні дані з метою проведення процесу підбору персоналу на підставі ст. 6(1)(b) GDPR. Дані зберігатимуться протягом 12 місяців після подання заявки, якщо вас не буде прийнято на роботу — у такому випадку дані зберігаються протягом трудових відносин. Ви маєте право на доступ, виправлення, видалення та перенесення даних. Контакт: kontakt@nexflow.eu",
    submit: "Надіслати заявку",
    submitting: "Надсилання...",
    retry: "Спробувати знову",
    successTitle: "Заявку надіслано!",
    successMessage: "Дякуємо! Ми зв'яжемося з вами протягом 24 годин.",
    errorTitle: "Помилка надсилання",
    positions: {
      warehouse_picker: "Складський працівник",
      forklift_operator: "Оператор навантажувача",
      logistics_driver: "Водій логістики",
      other: "Інше",
    },
    languageOptions: {
      pl: "Польська",
      de: "Німецька",
      en: "Англійська",
      uk: "Українська",
      id: "Індонезійська",
      es: "Іспанська",
      nl: "Нідерландська",
    },
    documentType: "Тип документа (необов'язково)",
    documentTypePlaceholder: "Оберіть тип документа...",
    documentTypes: {
      ukrainian_passport: "Паспорт України",
      eu_id: "Посвідчення ЄС",
      work_permit: "Дозвіл на роботу",
      none: "Інший / Відсутній",
    },
    cvUpload: "CV (PDF, макс. 10 МБ — необов'язково)",
    cvHint: "Завантажте CV у форматі PDF",
    referredBy: "Хто вас рекомендував? (необов'язково)",
    referredByPlaceholder: "Ім'я та прізвище особи, яка вас рекомендувала",
    errors: {
      firstNameRequired: "Ім'я є обов'язковим",
      lastNameRequired: "Прізвище є обов'язковим",
      phoneRequired: "Номер телефону є обов'язковим",
      phoneInvalid:
        "Введіть дійсний міжнародний номер у форматі E.164 (напр. +380 12 345 6789)",
      nationalityRequired: "Громадянство є обов'язковим",
      availabilityRequired: "Дата доступності є обов'язковою",
      positionRequired: "Бажана посада є обов'язковою",
      languagesRequired: "Оберіть принаймні одну мову",
      gdprRequired: "Згода на обробку даних є обов'язковою",
      submitFailed: "Надсилання не вдалося. Спробуйте знову.",
    },
  },
  id: {
    languageToggle: "Bahasa",
    title: "Formulir Pendaftaran",
    subtitle: "Isi formulir untuk bergabung dengan database kandidat kami.",
    firstName: "Nama Depan",
    firstNamePlaceholder: "Budi",
    lastName: "Nama Belakang",
    lastNamePlaceholder: "Santoso",
    phone: "Telepon",
    phonePlaceholder: "+62 812 3456 789",
    email: "Email (opsional)",
    emailPlaceholder: "budi@example.com",
    nationality: "Kewarganegaraan",
    nationalityPlaceholder: "Pilih negara...",
    availabilityFrom: "Tersedia mulai",
    preferredPosition: "Posisi yang diinginkan",
    preferredPositionPlaceholder: "Pilih posisi...",
    languages: "Kemampuan bahasa",
    locationPreference: "Preferensi lokasi (opsional)",
    locationPreferencePlaceholder: "mis. Warsawa, Słubice",
    gdprConsent:
      "Saya menyetujui pemrosesan data pribadi saya oleh Nexflow sp. z o.o. untuk tujuan rekrutmen, sesuai dengan GDPR.",
    privacyPolicyLabel: "Kebijakan Privasi",
    privacyPolicyText:
      "Nexflow sp. z o.o. memproses data pribadi Anda untuk keperluan rekrutmen berdasarkan Pasal 6(1)(b) GDPR. Data akan disimpan selama 12 bulan setelah pengajuan lamaran, kecuali Anda dipekerjakan — dalam hal ini data disimpan selama masa kerja. Anda berhak mengakses, memperbaiki, menghapus, dan memindahkan data Anda. Kontak: kontakt@nexflow.eu",
    submit: "Kirim lamaran",
    submitting: "Mengirim...",
    retry: "Coba lagi",
    successTitle: "Lamaran terkirim!",
    successMessage: "Terima kasih! Kami akan menghubungi Anda dalam 24 jam.",
    errorTitle: "Kesalahan pengiriman",
    positions: {
      warehouse_picker: "Pekerja gudang",
      forklift_operator: "Operator forklift",
      logistics_driver: "Pengemudi logistik",
      other: "Lainnya",
    },
    languageOptions: {
      pl: "Bahasa Polandia",
      de: "Bahasa Jerman",
      en: "Bahasa Inggris",
      uk: "Bahasa Ukraina",
      id: "Bahasa Indonesia",
      es: "Bahasa Spanyol",
      nl: "Bahasa Belanda",
    },
    documentType: "Jenis dokumen (opsional)",
    documentTypePlaceholder: "Pilih jenis dokumen...",
    documentTypes: {
      ukrainian_passport: "Paspor Ukraina",
      eu_id: "KTP Uni Eropa",
      work_permit: "Izin kerja",
      none: "Lainnya / Tidak ada",
    },
    cvUpload: "CV (PDF, maks. 10 MB — opsional)",
    cvHint: "Unggah CV dalam format PDF",
    referredBy: "Referred by (optional)",
    referredByPlaceholder: "Nama orang yang mereferensikan Anda",
    errors: {
      firstNameRequired: "Nama depan wajib diisi",
      lastNameRequired: "Nama belakang wajib diisi",
      phoneRequired: "Nomor telepon wajib diisi",
      phoneInvalid:
        "Masukkan nomor telepon internasional yang valid dalam format E.164 (mis. +62 812 3456 789)",
      nationalityRequired: "Kewarganegaraan wajib diisi",
      availabilityRequired: "Tanggal ketersediaan wajib diisi",
      positionRequired: "Posisi yang diinginkan wajib diisi",
      languagesRequired: "Pilih setidaknya satu bahasa",
      gdprRequired: "Persetujuan pemrosesan data wajib diberikan",
      submitFailed: "Pengiriman gagal. Silakan coba lagi.",
    },
  },
  nl: {
    languageToggle: "Taal",
    title: "Aanmeldformulier",
    subtitle: "Vul het formulier in om deel te nemen aan ons kandidatenbestand.",
    firstName: "Voornaam",
    firstNamePlaceholder: "Jan",
    lastName: "Achternaam",
    lastNamePlaceholder: "de Vries",
    phone: "Telefoon",
    phonePlaceholder: "+31 6 12345678",
    email: "E-mail (optioneel)",
    emailPlaceholder: "jan@voorbeeld.nl",
    nationality: "Nationaliteit",
    nationalityPlaceholder: "Selecteer land...",
    availabilityFrom: "Beschikbaar vanaf",
    preferredPosition: "Gewenste functie",
    preferredPositionPlaceholder: "Selecteer functie...",
    languages: "Taalkennis",
    locationPreference: "Voorkeurslocatie (optioneel)",
    locationPreferencePlaceholder: "bijv. Amsterdam, Rotterdam",
    gdprConsent:
      "Ik ga akkoord met de verwerking van mijn persoonsgegevens door Nexflow sp. z o.o. voor wervingsdoeleinden, in overeenstemming met de AVG.",
    privacyPolicyLabel: "Privacybeleid",
    privacyPolicyText:
      "Nexflow sp. z o.o. verwerkt uw persoonsgegevens voor de uitvoering van het wervingsproces op grond van art. 6(1)(b) AVG. Gegevens worden 12 maanden na indiening van de sollicitatie bewaard, tenzij u wordt aangenomen — in dat geval worden de gegevens bewaard voor de duur van het dienstverband. U heeft het recht op inzage, rectificatie, verwijdering en overdraagbaarheid van uw gegevens. Contact: kontakt@nexflow.eu",
    submit: "Sollicitatie verzenden",
    submitting: "Verzenden...",
    retry: "Opnieuw proberen",
    successTitle: "Sollicitatie verzonden!",
    successMessage: "Bedankt! We nemen binnen 24 uur contact met u op.",
    errorTitle: "Verzendfout",
    positions: {
      warehouse_picker: "Magazijnmedewerker",
      forklift_operator: "Heftruckchauffeur",
      logistics_driver: "Logistiek chauffeur",
      other: "Anders",
    },
    languageOptions: {
      pl: "Pools",
      de: "Duits",
      en: "Engels",
      uk: "Oekraïens",
      id: "Indonesisch",
      es: "Spaans",
      nl: "Nederlands",
    },
    documentType: "Documenttype (optioneel)",
    documentTypePlaceholder: "Selecteer documenttype...",
    documentTypes: {
      ukrainian_passport: "Oekraïens paspoort",
      eu_id: "EU-identiteitskaart",
      work_permit: "Werkvergunning",
      none: "Anders / Geen",
    },
    cvUpload: "CV (PDF, max. 10 MB — optioneel)",
    cvHint: "Upload uw CV in PDF-formaat",
    referredBy: "Referred by (optional)",
    referredByPlaceholder: "Naam van de persoon die u heeft doorverwezen",
    errors: {
      firstNameRequired: "Voornaam is verplicht",
      lastNameRequired: "Achternaam is verplicht",
      phoneRequired: "Telefoonnummer is verplicht",
      phoneInvalid:
        "Voer een geldig internationaal telefoonnummer in E.164-formaat in (bijv. +31 6 12345678)",
      nationalityRequired: "Nationaliteit is verplicht",
      availabilityRequired: "Beschikbaarheidsdatum is verplicht",
      positionRequired: "Gewenste functie is verplicht",
      languagesRequired: "Selecteer minimaal één taal",
      gdprRequired: "Toestemming voor gegevensverwerking is verplicht",
      submitFailed: "Verzending mislukt. Probeer het opnieuw.",
    },
  },
};

const POSITIONS: PreferredPosition[] = [
  "warehouse_picker",
  "forklift_operator",
  "logistics_driver",
  "other",
];

const LANGUAGE_CODES: LanguageCode[] = ["pl", "de", "en", "uk", "id", "es", "nl"];

const DOCUMENT_TYPES: DocumentType[] = ["ukrainian_passport", "eu_id", "work_permit", "none"];

const MAX_CV_SIZE = 10 * 1024 * 1024; // 10 MB

// Top nationality options shown first in the select, then a divider, then the rest
const TOP_NATIONALITIES = ["PL", "UA", "DE", "BY", "MD", "RO"] as const;
const OTHER_NATIONALITIES = [
  "AL", "AM", "AT", "AZ", "BA", "BE", "BG", "CZ", "DK", "EE",
  "ES", "FI", "FR", "GB", "GE", "GR", "HR", "HU", "IN", "IT",
  "KZ", "LT", "LU", "LV", "MK", "NL", "NO", "PK", "PT", "RS",
  "RU", "SE", "SI", "SK", "TR", "UZ", "VN", "XK",
].sort();

const COUNTRY_NAMES: Record<Locale, Record<string, string>> = {
  nl: {
    PL: "Polen", UA: "Oekraïne", DE: "Duitsland", BY: "Wit-Rusland", MD: "Moldavië", RO: "Roemenië",
    AL: "Albanië", AM: "Armenië", AT: "Oostenrijk", AZ: "Azerbeidzjan", BA: "Bosnië en Herzegovina",
    BE: "België", BG: "Bulgarije", CZ: "Tsjechië", DK: "Denemarken", EE: "Estland",
    ES: "Spanje", FI: "Finland", FR: "Frankrijk", GB: "Verenigd Koninkrijk", GE: "Georgië",
    GR: "Griekenland", HR: "Kroatië", HU: "Hongarije", IN: "India", IT: "Italië",
    KZ: "Kazachstan", LT: "Litouwen", LU: "Luxemburg", LV: "Letland", MK: "Noord-Macedonië",
    NL: "Nederland", NO: "Noorwegen", PK: "Pakistan", PT: "Portugal", RS: "Servië",
    RU: "Rusland", SE: "Zweden", SI: "Slovenië", SK: "Slowakije", TR: "Turkije",
    UZ: "Oezbekistan", VN: "Vietnam", XK: "Kosovo",
  },
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
  en: {
    PL: "Poland", UA: "Ukraine", DE: "Germany", BY: "Belarus", MD: "Moldova", RO: "Romania",
    AL: "Albania", AM: "Armenia", AT: "Austria", AZ: "Azerbaijan", BA: "Bosnia and Herzegovina",
    BE: "Belgium", BG: "Bulgaria", CZ: "Czech Republic", DK: "Denmark", EE: "Estonia",
    ES: "Spain", FI: "Finland", FR: "France", GB: "United Kingdom", GE: "Georgia",
    GR: "Greece", HR: "Croatia", HU: "Hungary", IN: "India", IT: "Italy",
    KZ: "Kazakhstan", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", MK: "North Macedonia",
    NL: "Netherlands", NO: "Norway", PK: "Pakistan", PT: "Portugal", RS: "Serbia",
    RU: "Russia", SE: "Sweden", SI: "Slovenia", SK: "Slovakia", TR: "Turkey",
    UZ: "Uzbekistan", VN: "Vietnam", XK: "Kosovo",
  },
  uk: {
    PL: "Польща", UA: "Україна", DE: "Німеччина", BY: "Білорусь", MD: "Молдова", RO: "Румунія",
    AL: "Албанія", AM: "Вірменія", AT: "Австрія", AZ: "Азербайджан", BA: "Боснія і Герцеговина",
    BE: "Бельгія", BG: "Болгарія", CZ: "Чехія", DK: "Данія", EE: "Естонія",
    ES: "Іспанія", FI: "Фінляндія", FR: "Франція", GB: "Велика Британія", GE: "Грузія",
    GR: "Греція", HR: "Хорватія", HU: "Угорщина", IN: "Індія", IT: "Італія",
    KZ: "Казахстан", LT: "Литва", LU: "Люксембург", LV: "Латвія", MK: "Північна Македонія",
    NL: "Нідерланди", NO: "Норвегія", PK: "Пакистан", PT: "Португалія", RS: "Сербія",
    RU: "Росія", SE: "Швеція", SI: "Словенія", SK: "Словаччина", TR: "Туреччина",
    UZ: "Узбекистан", VN: "В'єтнам", XK: "Косово",
  },
  id: {
    PL: "Polandia", UA: "Ukraina", DE: "Jerman", BY: "Belarus", MD: "Moldova", RO: "Rumania",
    AL: "Albania", AM: "Armenia", AT: "Austria", AZ: "Azerbaijan", BA: "Bosnia dan Herzegovina",
    BE: "Belgia", BG: "Bulgaria", CZ: "Republik Ceko", DK: "Denmark", EE: "Estonia",
    ES: "Spanyol", FI: "Finlandia", FR: "Prancis", GB: "Inggris Raya", GE: "Georgia",
    GR: "Yunani", HR: "Kroasia", HU: "Hungaria", IN: "India", IT: "Italia",
    KZ: "Kazakhstan", LT: "Lituania", LU: "Luksemburg", LV: "Latvia", MK: "Makedonia Utara",
    NL: "Belanda", NO: "Norwegia", PK: "Pakistan", PT: "Portugal", RS: "Serbia",
    RU: "Rusia", SE: "Swedia", SI: "Slovenia", SK: "Slovakia", TR: "Turki",
    UZ: "Uzbekistan", VN: "Vietnam", XK: "Kosovo",
  },
};

// E.164: international format — country code (1–3 digits) + subscriber number, 7–15 digits total
const E164_INTL = /^\+[1-9]\d{6,14}$/;

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
  referred_by: string;
  document_type: DocumentType | "";
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
      return E164_INTL.test(v) ? "" : t.phoneInvalid;
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
    referred_by: "",
    document_type: "",
    gdpr_consent: false,
  });

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState("");

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

  function handleCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (file.type !== "application/pdf") {
        setCvError("Prześlij plik PDF / Nur PDF-Dateien");
        setCvFile(null);
        return;
      }
      if (file.size > MAX_CV_SIZE) {
        setCvError("Plik jest za duży (max 10 MB) / Datei zu groß (max. 10 MB)");
        setCvFile(null);
        return;
      }
    }
    setCvError("");
    setCvFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;
    if (cvError) return;

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
      ...(form.referred_by.trim() && { referred_by: form.referred_by.trim() }),
      ...(form.document_type && { document_type: form.document_type as DocumentType }),
    };

    try {
      await submitCandidateIntake(payload, locale, cvFile ?? undefined);
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
          {(["pl", "de", "en", "uk", "id", "nl"] as Locale[]).map((loc) => (
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

            {/* Document type */}
            <div>
              <label className="mb-1 block text-sm font-medium">{t.documentType}</label>
              <select
                value={form.document_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, document_type: e.target.value as DocumentType | "" }))
                }
                className={selectClass}
              >
                <option value="">{t.documentTypePlaceholder}</option>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {t.documentTypes[dt]}
                  </option>
                ))}
              </select>
            </div>

            {/* CV upload */}
            <div>
              <label className="mb-1 block text-sm font-medium">{t.cvUpload}</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleCvChange}
                className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-400">{t.cvHint}</p>
              {cvFile && (
                <p className="mt-1 text-xs text-green-600">✓ {cvFile.name}</p>
              )}
              {cvError && (
                <p className="mt-1 text-xs text-destructive">{cvError}</p>
              )}
            </div>

            {/* Referred by */}
            <div>
              <label className="mb-1 block text-sm font-medium">{t.referredBy}</label>
              <Input
                value={form.referred_by}
                placeholder={t.referredByPlaceholder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, referred_by: e.target.value }))
                }
              />
            </div>

            {/* GDPR consent */}
            <div className="rounded-md border border-input p-4">
              {/* Expandable privacy policy */}
              <button
                type="button"
                aria-expanded={policyExpanded}
                onClick={() => setPolicyExpanded((v) => !v)}
                className="mb-3 flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                <span>{policyExpanded ? "▾" : "▸"}</span>
                {t.privacyPolicyLabel}
              </button>
              {policyExpanded && (
                <div className="mb-3 rounded bg-cloud-white p-3 text-xs leading-relaxed text-gray-600">
                  <p>{t.privacyPolicyText}</p>
                  <Link
                    href="/polityka-prywatnosci"
                    className="mt-2 inline-block text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    Pełna polityka prywatności →
                  </Link>
                </div>
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
