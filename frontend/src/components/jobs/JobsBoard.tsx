"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Banknote,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

import type { JobListing } from "@/data/jobs";
import { Button } from "@/components/ui/button";

type Locale = "pl" | "de";

const ui: Record<Locale, {
  langToggle: string;
  heroTitle: string;
  heroSubtitle: string;
  openPositions: string;
  applyBtn: string;
  requirements: string;
  showLess: string;
  ctaBanner: string;
  ctaBannerSub: string;
  ctaBtn: string;
}> = {
  pl: {
    langToggle: "DE",
    heroTitle: "Oferty pracy",
    heroSubtitle:
      "Aktualne miejsca pracy w magazynach i logistyce w regionie Słubice – Frankfurt (Oder). Praca tymczasowa i stała.",
    openPositions: "Otwarte rekrutacje",
    applyBtn: "Aplikuj",
    requirements: "Wymagania",
    showLess: "Zwiń",
    ctaBanner: "Gotowy do pracy? Wyślij zgłoszenie już teraz.",
    ctaBannerSub:
      "Formularz zajmuje mniej niż 3 minuty. Skontaktujemy się w ciągu 24h.",
    ctaBtn: "Wypełnij formularz →",
  },
  de: {
    langToggle: "PL",
    heroTitle: "Stellenangebote",
    heroSubtitle:
      "Aktuelle Jobs in Lagerhaltung und Logistik in der Region Słubice – Frankfurt (Oder). Zeitarbeit und Festanstellung.",
    openPositions: "Offene Stellen",
    applyBtn: "Bewerben",
    requirements: "Anforderungen",
    showLess: "Weniger",
    ctaBanner: "Bereit zu arbeiten? Jetzt bewerben.",
    ctaBannerSub:
      "Das Formular dauert weniger als 3 Minuten. Wir melden uns innerhalb von 24 Stunden.",
    ctaBtn: "Zum Formular →",
  },
};

function JobCard({
  job,
  locale,
  t,
}: {
  job: JobListing;
  locale: Locale;
  t: (typeof ui)[Locale];
}) {
  const [expanded, setExpanded] = useState(false);
  const data = job[locale];

  return (
    <article className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 bg-accent" />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wide text-accent bg-accent/10 px-2 py-0.5 rounded mb-2">
              {data.tag}
            </span>
            <h2 className="text-lg font-semibold text-primary leading-snug">
              {data.title}
            </h2>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-accent" />
            {data.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 text-accent" />
            {data.shiftType}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Banknote className="w-3.5 h-3.5 shrink-0 text-accent" />
            {data.payRange}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {data.summary}
        </p>

        {/* Expandable requirements */}
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-accent transition-colors"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                {t.showLess} <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                {t.requirements} <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1">
              {data.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto pt-2">
          <Link href="/intake" className="w-full">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2">
              {t.applyBtn}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}

export function JobsBoard({ jobs }: { jobs: JobListing[] }) {
  const [locale, setLocale] = useState<Locale>("pl");
  const t = ui[locale];

  return (
    <div className="min-h-screen bg-[hsl(var(--cloud-white))]">
      {/* Nav bar */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight hover:opacity-90 transition-opacity"
          >
            Nexflow
          </Link>
          <button
            onClick={() => setLocale((l) => (l === "pl" ? "de" : "pl"))}
            className="text-sm font-semibold px-3 py-1 rounded border border-primary-foreground/30 hover:border-primary-foreground/70 transition-colors"
            aria-label={`Switch language to ${t.langToggle}`}
          >
            {t.langToggle}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground pb-12 pt-10">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t.heroTitle}</h1>
          <p className="text-primary-foreground/80 max-w-xl text-sm sm:text-base leading-relaxed">
            {t.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Listings */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          {t.openPositions} ({jobs.length})
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} locale={locale} t={t} />
          ))}
        </div>

        {/* CTA banner */}
        <div className="mt-12 rounded-2xl bg-primary text-primary-foreground p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">{t.ctaBanner}</h3>
          <p className="text-primary-foreground/75 mb-6 text-sm">{t.ctaBannerSub}</p>
          <Link href="/intake">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8"
            >
              {t.ctaBtn}
            </Button>
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-8 border-t border-border">
        © {new Date().getFullYear()} Eurojob-West Sp. z o.o. · Słubice, Poland
      </footer>
    </div>
  );
}
