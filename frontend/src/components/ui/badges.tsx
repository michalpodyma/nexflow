import * as React from "react";
import { cn } from "@/lib/utils";

/* ── KRAZ badge ───────────────────────────────────────────────────────── */
interface KrazBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  locale?: string;
}

export function KrazBadge({ locale, className, ...props }: KrazBadgeProps) {
  const label =
    locale === "de"
      ? "KRAZ-zertifiziert"
      : locale === "en"
        ? "KRAZ certified"
        : locale === "nl"
          ? "KRAZ-gecertificeerd"
          : locale === "ru"
            ? "Сертификат КРАЗ"
            : locale === "uk"
              ? "Сертифікат КРАЗ"
              : "Certyfikat KRAZ"; /* pl default */

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 bg-surface-1 border border-hairline rounded-pill px-3 py-1 text-eyebrow font-semibold tracking-widest text-success uppercase",
        className,
      )}
      {...props}
    >
      {label}
    </span>
  );
}

/* ── Language badge ───────────────────────────────────────────────────── */
const LOCALE_META: Record<string, { flag: string; label: string }> = {
  pl: { flag: "🇵🇱", label: "PL" },
  en: { flag: "🇬🇧", label: "EN" },
  de: { flag: "🇩🇪", label: "DE" },
  nl: { flag: "🇳🇱", label: "NL" },
  ru: { flag: "🇷🇺", label: "RU" },
  uk: { flag: "🇺🇦", label: "UK" },
};

interface LangBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  locale: string;
}

export function LangBadge({ locale, className, ...props }: LangBadgeProps) {
  const meta = LOCALE_META[locale] ?? { flag: "", label: locale.toUpperCase() };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-surface-1 border border-hairline rounded-pill px-2 py-0.5 text-eyebrow font-medium text-ink-muted",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{meta.flag}</span>
      <span>{meta.label}</span>
    </span>
  );
}
