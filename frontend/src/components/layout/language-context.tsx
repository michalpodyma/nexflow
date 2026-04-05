"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Language = "pl" | "en";

const LANG_KEY = "nexflow-language";

type Labels = Record<string, string>;

const translations: Record<Language, Labels> = {
  en: {
    // Sidebar nav
    "nav.dashboard": "Dashboard Home",
    "nav.group.recruitment": "Recruitment",
    "nav.job-orders": "Job Orders",
    "nav.candidates": "Candidates",
    "nav.workers": "Workers",
    "nav.accommodations": "Accommodations",
    "nav.transport": "Transport",
    "nav.placement-calendar": "Placement Calendar",
    "nav.compliance": "Compliance",
    "nav.documents": "Documents",
    "nav.hours-import": "Hours Import",
    "nav.invoices": "Invoices",
    "nav.aga-export": "AGA Export",
    "nav.group.b2b": "B2B Pipeline",
    "nav.pipeline": "Deals Pipeline",
    "nav.clients": "Clients",
    "nav.prospects": "Prospects",
    "nav.analytics": "Analytics",
    "nav.settings": "Settings",
    // Settings page
    "settings.title": "Settings",
    "settings.language.heading": "Language",
    "settings.language.description": "Choose the interface language.",
    "settings.language.pl": "Polish (Polski)",
    "settings.language.en": "English",
    "settings.defaultSection.heading": "Default Section",
    "settings.defaultSection.description": "The section displayed first after login.",
    "settings.defaultSection.recruitment": "Recruitment",
    "settings.defaultSection.b2b": "B2B Pipeline",
    "settings.notifications.heading": "Notifications",
    "settings.notifications.description": "Configure which alerts you receive.",
    "settings.notifications.compliance": "Compliance alerts (document expiry warnings)",
    "settings.notifications.assignments": "Worker assignment changes",
    "settings.notifications.prospects": "New prospect / deal activity",
    "settings.save": "Save preferences",
    "settings.saved": "Preferences saved.",
  },
  pl: {
    // Sidebar nav
    "nav.dashboard": "Strona główna",
    "nav.group.recruitment": "Rekrutacja",
    "nav.job-orders": "Zlecenia pracy",
    "nav.candidates": "Kandydaci",
    "nav.workers": "Pracownicy",
    "nav.accommodations": "Zakwaterowanie",
    "nav.transport": "Transport",
    "nav.placement-calendar": "Kalendarz zleceń",
    "nav.compliance": "Zgodność",
    "nav.documents": "Dokumenty",
    "nav.hours-import": "Import godzin",
    "nav.invoices": "Faktury",
    "nav.aga-export": "Eksport AGA",
    "nav.group.b2b": "Pipeline B2B",
    "nav.pipeline": "Pipeline ofert",
    "nav.clients": "Klienci",
    "nav.prospects": "Prospekty",
    "nav.analytics": "Analityka",
    "nav.settings": "Ustawienia",
    // Settings page
    "settings.title": "Ustawienia",
    "settings.language.heading": "Język",
    "settings.language.description": "Wybierz język interfejsu.",
    "settings.language.pl": "Polski",
    "settings.language.en": "Angielski (English)",
    "settings.defaultSection.heading": "Domyślna sekcja",
    "settings.defaultSection.description": "Sekcja wyświetlana jako pierwsza po zalogowaniu.",
    "settings.defaultSection.recruitment": "Rekrutacja",
    "settings.defaultSection.b2b": "Pipeline B2B",
    "settings.notifications.heading": "Powiadomienia",
    "settings.notifications.description": "Skonfiguruj, które alerty chcesz otrzymywać.",
    "settings.notifications.compliance": "Alerty zgodności (ostrzeżenia o wygasaniu dokumentów)",
    "settings.notifications.assignments": "Zmiany przypisań pracowników",
    "settings.notifications.prospects": "Aktywność prospektów / ofert",
    "settings.save": "Zapisz preferencje",
    "settings.saved": "Preferencje zapisane.",
  },
};

interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "pl",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("pl");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "pl") {
      setLangState(stored);
    }
  }, []);

  function setLang(l: Language) {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }

  function t(key: string): string {
    return translations[lang][key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
