"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LOCALE_META: Record<Locale, { flag: string; label: string; name: string; ariaLabel: string }> = {
  pl: { flag: "🇵🇱", label: "PL", name: "Polski",     ariaLabel: "Wybierz język" },
  en: { flag: "🇬🇧", label: "EN", name: "English",    ariaLabel: "Select language" },
  de: { flag: "🇩🇪", label: "DE", name: "Deutsch",    ariaLabel: "Sprache auswählen" },
  nl: { flag: "🇳🇱", label: "NL", name: "Nederlands", ariaLabel: "Taal kiezen" },
  ru: { flag: "🇷🇺", label: "RU", name: "Русский",    ariaLabel: "Выбрать язык" },
  uk: { flag: "🇺🇦", label: "UK", name: "Українська", ariaLabel: "Обрати мову" },
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
        aria-label={meta.ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className="flex items-center gap-1 text-body-sm font-medium text-ink-muted hover:text-ink transition-colors duration-200 px-2 py-1 rounded-xs focus:outline-none focus:ring-2 focus:ring-accent"
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
          aria-label={meta.ariaLabel}
          onKeyDown={handleListKeyDown}
          className="absolute right-0 mt-1 w-40 bg-surface-2 border border-hairline rounded-sm shadow-xl overflow-hidden z-50"
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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-body-sm transition-colors duration-150 focus:outline-none focus:bg-surface-3 ${
                    selected
                      ? "text-accent font-semibold bg-surface-3"
                      : "text-ink-muted hover:text-ink hover:bg-surface-3"
                  }`}
                >
                  <span aria-hidden="true">{m.flag}</span>
                  <span className="font-medium">{m.label}</span>
                  <span className="text-xs text-ink-tertiary ml-auto">{m.name}</span>
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="ml-1 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
