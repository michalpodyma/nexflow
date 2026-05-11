"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import type { JobCategory, JobListing } from "@/data/jobs";
import { Button } from "@/components/ui/button";

// ─── Category metadata ────────────────────────────────────────────────────────

type CategoryMeta = { label: string; icon: React.ReactNode; colorClass: string };

const CATEGORY_META: Record<JobCategory, CategoryMeta> = {
  forklift: {
    label: "Operator wózka",
    colorClass: "text-amber-600 bg-amber-50 border-amber-200",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  picker: {
    label: "Kompletacja",
    colorClass: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  driver: {
    label: "Kierowca",
    colorClass: "text-cyan-600 bg-cyan-50 border-cyan-200",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414A1 1 0 0121 11.414V16a1 1 0 01-1 1h-1" />
      </svg>
    ),
  },
  manager: {
    label: "Zarządzanie",
    colorClass: "text-blue-700 bg-blue-50 border-blue-200",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  logistics: {
    label: "Logistyka",
    colorClass: "text-violet-600 bg-violet-50 border-violet-200",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  hr: {
    label: "HR / Dokumentacja",
    colorClass: "text-pink-600 bg-pink-50 border-pink-200",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
};

// ─── Favorites hook ───────────────────────────────────────────────────────────

function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nexflow-favs");
      if (stored) setFavs(new Set(JSON.parse(stored) as string[]));
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggle = useCallback((id: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("nexflow-favs", JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { favs, toggle };
}

// ─── Locale UI strings ────────────────────────────────────────────────────────

type Locale = "pl" | "de" | "nl";

const LOCALE_LABELS = {
  pl: {
    heroTitle: "Oferty pracy",
    heroSubtitle: "Aktualne miejsca pracy w magazynach i logistyce. Polska, Holandia, Belgia. Praca tymczasowa i stała.",
    pill1: "Praca tymczasowa i stała",
    pill2: "PL / NL / BE",
    pill3: "Szybka rekrutacja",
    filterAll: "Wszystkie",
    filterPL: "Polska",
    filterNL: "Holandia",
    filterBE: "Belgia",
    shiftAll: "Każda zmiana",
    shiftDay: "Dzienna",
    shiftNight: "Nocna",
    shiftRotating: "Rotacyjna",
    salaryAll: "Każde wynagrodzenie",
    salaryEntry: "Podstawowe",
    salaryMid: "Średnie",
    salaryHigh: "Wysokie",
    searchPlaceholder: "Szukaj oferty…",
    clearFilters: "Wyczyść filtry",
    noResults: "Brak ofert spełniających kryteria",
    noResultsSub: "Spróbuj zmienić filtry lub wyszukaj inną frazę.",
    openPositions: "Otwarte rekrutacje",
    applyBtn: "Aplikuj bezpłatnie",
    requirements: "Wymagania",
    showLess: "Zwiń",
    favCount: "ulubionych",
    langToggle: "DE",
  },
  de: {
    heroTitle: "Stellenangebote",
    heroSubtitle: "Aktuelle Jobs in Lagerhaltung und Logistik. Polen, Niederlande, Belgien. Zeitarbeit und Festanstellung.",
    pill1: "Zeitarbeit und Festanstellung",
    pill2: "PL / NL / BE",
    pill3: "Schnelle Vermittlung",
    filterAll: "Alle",
    filterPL: "Polen",
    filterNL: "Niederlande",
    filterBE: "Belgien",
    shiftAll: "Jede Schicht",
    shiftDay: "Tagschicht",
    shiftNight: "Nachtschicht",
    shiftRotating: "Wechselschicht",
    salaryAll: "Jedes Gehalt",
    salaryEntry: "Einstieg",
    salaryMid: "Mittel",
    salaryHigh: "Hoch",
    searchPlaceholder: "Stelle suchen…",
    clearFilters: "Filter zurücksetzen",
    noResults: "Keine Stellen gefunden",
    noResultsSub: "Versuchen Sie andere Filter.",
    openPositions: "Offene Stellen",
    applyBtn: "Bewerben",
    requirements: "Anforderungen",
    showLess: "Weniger",
    favCount: "gespeichert",
    langToggle: "NL",
  },
  nl: {
    heroTitle: "Vacatures",
    heroSubtitle: "Actuele banen in magazijn en logistiek. Polen, Nederland, België. Tijdelijk en vast werk.",
    pill1: "Tijdelijk en vast werk",
    pill2: "PL / NL / BE",
    pill3: "Snelle plaatsing",
    filterAll: "Alle",
    filterPL: "Polen",
    filterNL: "Nederland",
    filterBE: "België",
    shiftAll: "Elke dienst",
    shiftDay: "Dagdienst",
    shiftNight: "Nachtdienst",
    shiftRotating: "Wisselend",
    salaryAll: "Elk salaris",
    salaryEntry: "Startersloon",
    salaryMid: "Gemiddeld",
    salaryHigh: "Hoog",
    searchPlaceholder: "Vacature zoeken…",
    clearFilters: "Filters wissen",
    noResults: "Geen vacatures gevonden",
    noResultsSub: "Probeer andere filters.",
    openPositions: "Openstaande vacatures",
    applyBtn: "Solliciteer",
    requirements: "Vereisten",
    showLess: "Minder",
    favCount: "opgeslagen",
    langToggle: "PL",
  },
} as const;

const LOCALE_CYCLE: Record<Locale, Locale> = { pl: "de", de: "nl", nl: "pl" };

// ─── Favorite button ──────────────────────────────────────────────────────────

function FavoriteButton({ isFaved, onToggle }: { isFaved: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={isFaved ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      className={`p-1.5 rounded-full transition-all duration-200 ${
        isFaved
          ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
          : "text-muted-foreground hover:text-rose-400 hover:bg-rose-50"
      }`}
    >
      <svg className="w-4 h-4" fill={isFaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  locale,
  t,
  index,
  isFaved,
  onFav,
}: {
  job: JobListing;
  locale: Locale;
  t: typeof LOCALE_LABELS[Locale];
  index: number;
  isFaved: boolean;
  onFav: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const data = job[locale];
  const meta = CATEGORY_META[job.category];

  return (
    <FadeIn delay={index * 60}>
      <article className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 hover:border-nexflow-cyan/40 transition-all duration-300 group">
        <div className="h-1 bg-accent" />
        <div className="p-5 flex flex-col flex-1 gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border mb-2 ${meta.colorClass}`}>
                {meta.icon}
                {meta.label}
              </span>
              <h2 className="text-base font-semibold text-primary leading-snug group-hover:text-nexflow-cyan-dark transition-colors">
                {data.title}
              </h2>
              <p className="text-[15px] text-muted-foreground mt-0.5">{data.location}</p>
            </div>
            <FavoriteButton isFaved={isFaved} onToggle={onFav} />
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[15px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {data.shiftType}
            </span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <svg className="w-3.5 h-3.5 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              {data.payRange}
            </span>
          </div>

          {/* Summary */}
          <p className="text-[15px] text-muted-foreground leading-relaxed">{data.summary}</p>

          {/* Requirements */}
          <div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[15px] font-medium text-primary hover:text-accent transition-colors"
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  {t.showLess}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  {t.requirements}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1">
                {data.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] text-muted-foreground">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* CTA */}
          <div className="mt-auto pt-2">
            <Link href="/aplikuj" className="w-full">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2">
                {t.applyBtn}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </FadeIn>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function JobsBoardSkeleton() {
  return (
    <div className="min-h-screen bg-[hsl(var(--cloud-white))]">
      <header className="bg-primary h-14" />
      <section className="bg-primary h-48" />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-gray-200 h-28 mb-8 animate-pulse" />
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-48 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Main board content ───────────────────────────────────────────────────────

function JobsBoardContent({ jobs }: { jobs: JobListing[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [locale, setLocale] = useState<Locale>("pl");
  const { favs, toggle: toggleFav } = useFavorites();
  const t = LOCALE_LABELS[locale];

  const q = params.get("q") ?? "";
  const geo = params.get("geo") ?? "all";
  const shift = (params.get("shift") ?? "all") as "all" | "day" | "night" | "rotating";
  const salary = (params.get("salary") ?? "all") as "all" | "entry" | "mid" | "high";

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value === "all" || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      const qs = next.toString();
      router.push(qs ? `/oferty?${qs}` : "/oferty", { scroll: false });
    },
    [params, router]
  );

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (geo !== "all" && !job.countries.includes(geo)) return false;
      if (shift !== "all" && job.shiftKind !== shift) return false;
      if (salary !== "all" && job.salaryTier !== salary) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const data = job[locale];
        const haystack = `${data.title} ${data.summary} ${data.tag}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [jobs, geo, shift, salary, q, locale]);

  const hasActiveFilters = q || geo !== "all" || shift !== "all" || salary !== "all";

  const geoTabs: { label: string; value: string }[] = [
    { label: t.filterAll, value: "all" },
    { label: t.filterPL, value: "PL" },
    { label: t.filterNL, value: "NL" },
    { label: t.filterBE, value: "BE" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--cloud-white))]">
      {/* Nav bar */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-90 transition-opacity">
            Nexflow
          </Link>
          <div className="flex items-center gap-2">
            {favs.size > 0 && (
              <span className="text-sm text-primary-foreground/70">
                ♥ {favs.size}
                <span className="hidden sm:inline"> {t.favCount}</span>
              </span>
            )}
            <button
              onClick={() => setLocale((l) => LOCALE_CYCLE[l])}
              className="text-sm font-semibold px-2.5 py-1 rounded border border-primary-foreground/30 hover:border-primary-foreground/70 transition-colors min-w-[2.5rem] text-center"
              aria-label={`Switch language to ${t.langToggle}`}
            >
              {t.langToggle}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground pb-12 pt-10">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t.heroTitle}</h1>
          <p className="text-primary-foreground/80 max-w-xl text-sm sm:text-base leading-relaxed mb-6">
            {t.heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {[t.pill1, t.pill2, t.pill3].map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/80 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-3 py-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Listings */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Filter bar */}
        <FadeIn>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-8 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Geo tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                {geoTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setParam("geo", tab.value)}
                    aria-pressed={geo === tab.value}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      geo === tab.value
                        ? "bg-white text-primary shadow-sm"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                {/* Shift filter */}
                <select
                  value={shift}
                  onChange={(e) => setParam("shift", e.target.value)}
                  aria-label="Filtruj według zmiany"
                  className="text-sm text-foreground bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
                >
                  <option value="all">{t.shiftAll}</option>
                  <option value="day">{t.shiftDay}</option>
                  <option value="night">{t.shiftNight}</option>
                  <option value="rotating">{t.shiftRotating}</option>
                </select>

                {/* Salary filter */}
                <select
                  value={salary}
                  onChange={(e) => setParam("salary", e.target.value)}
                  aria-label="Filtruj według wynagrodzenia"
                  className="text-sm text-foreground bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
                >
                  <option value="all">{t.salaryAll}</option>
                  <option value="entry">{t.salaryEntry}</option>
                  <option value="mid">{t.salaryMid}</option>
                  <option value="high">{t.salaryHigh}</option>
                </select>
              </div>
            </div>

            {/* Keyword search + clear */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setParam("q", e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-muted-foreground/60"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => router.push("/oferty", { scroll: false })}
                  className="shrink-0 text-xs text-muted-foreground hover:text-primary underline underline-offset-2 whitespace-nowrap transition-colors"
                >
                  {t.clearFilters}
                </button>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Results count */}
        <FadeIn>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            {t.openPositions} ({filtered.length})
          </h2>
        </FadeIn>

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <FadeIn>
            <div className="text-center py-16 text-muted-foreground">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium mb-1">{t.noResults}</p>
              <p className="text-sm">{t.noResultsSub}</p>
            </div>
          </FadeIn>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filtered.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                locale={locale}
                t={t}
                index={i}
                isFaved={favs.has(job.id)}
                onFav={() => toggleFav(job.id)}
              />
            ))}
          </div>
        )}

        {/* CTA banner */}
        {filtered.length > 0 && (
          <div className="mt-12 rounded-2xl bg-primary text-primary-foreground p-8 text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">
              Gotowy do pracy? Wyślij zgłoszenie już teraz.
            </h3>
            <p className="text-primary-foreground/75 mb-6 text-sm">
              Formularz zajmuje mniej niż 3 minuty. Skontaktujemy się w ciągu 24h.
            </p>
            <Link href="/aplikuj" className="block sm:inline-block">
              <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8">
                Aplikuj bezpłatnie →
              </Button>
            </Link>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-muted-foreground py-8 border-t border-border">
        © {new Date().getFullYear()} Eurojob-West Sp. z o.o. · Słubice, Poland
      </footer>
    </div>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export function JobsBoard({ jobs }: { jobs: JobListing[] }) {
  return (
    <Suspense fallback={<JobsBoardSkeleton />}>
      <JobsBoardContent jobs={jobs} />
    </Suspense>
  );
}
