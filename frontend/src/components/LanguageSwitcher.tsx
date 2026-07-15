"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

const LOCALE_META: Record<Locale, { flag: string; label: string; name: string }> = {
  pl: { flag: "🇵🇱", label: "PL", name: "Polski" },
  en: { flag: "🇬🇧", label: "EN", name: "English" },
  de: { flag: "🇩🇪", label: "DE", name: "Deutsch" },
  nl: { flag: "🇳🇱", label: "NL", name: "Nederlands" },
  ru: { flag: "🇷🇺", label: "RU", name: "Русский" },
  uk: { flag: "🇺🇦", label: "UK", name: "Українська" },
};

function parseLocale(pathname: string): Locale {
  const segment = pathname.split("/")[1] as Locale;
  return routing.locales.includes(segment) ? segment : routing.defaultLocale;
}

function buildLocalePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  const hasPrefix = routing.locales.includes(segments[1] as Locale);
  if (hasPrefix) {
    segments[1] = locale;
  } else {
    segments.splice(1, 0, locale);
  }
  return segments.join("/") || "/";
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Navbar");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentLocale = parseLocale(pathname);
  const locales = routing.locales;
  const meta = LOCALE_META[currentLocale];

  const switchLocale = useCallback(
    (locale: Locale) => {
      router.replace(buildLocalePath(pathname, locale));
      setOpen(false);
      triggerRef.current?.focus();
    },
    [pathname, router]
  );

  useEffect(() => {
    if (!open) return;
    const currentIdx = locales.indexOf(currentLocale);
    optionRefs.current[currentIdx >= 0 ? currentIdx : 0]?.focus();
  }, [open, currentLocale, locales]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    const focused = document.activeElement;
    const idx = optionRefs.current.findIndex((r) => r === focused);

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = (idx + 1) % locales.length;
        optionRefs.current[next]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = (idx - 1 + locales.length) % locales.length;
        optionRefs.current[prev]?.focus();
        break;
      }
      case "Escape":
      case "Tab":
        setOpen(false);
        if (e.key === "Escape") triggerRef.current?.focus();
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("language")}: ${meta.name}`}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className="flex items-center gap-1 text-sm font-medium text-white hover:text-nexflow-cyan transition-colors duration-200 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-nexflow-cyan"
      >
        <span aria-hidden="true">{meta.flag}</span>
        <span>{meta.label}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("language")}
          onKeyDown={handleListKeyDown}
          className="absolute right-0 mt-1 w-36 bg-nexflow-navy border border-white/20 rounded-lg shadow-xl overflow-hidden z-50"
        >
          {locales.map((locale, idx) => {
            const m = LOCALE_META[locale];
            const selected = locale === currentLocale;
            return (
              <li key={locale} role="presentation">
                <button
                  ref={(el) => {
                    optionRefs.current[idx] = el;
                  }}
                  role="option"
                  aria-selected={selected}
                  type="button"
                  onClick={() => switchLocale(locale)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-150 focus:outline-none focus:bg-white/10 ${
                    selected
                      ? "text-nexflow-cyan font-semibold bg-white/5"
                      : "text-white hover:text-nexflow-cyan hover:bg-white/5"
                  }`}
                >
                  <span aria-hidden="true">{m.flag}</span>
                  <span className="font-medium">{m.label}</span>
                  <span className="text-xs text-white/50 ml-auto">{m.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
