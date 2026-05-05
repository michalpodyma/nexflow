import type { Metadata } from "next";
import AdsLeadForm from "@/components/AdsLeadForm";

export const metadata: Metadata = {
  title: "Jobs in Deutschland — Lager & Logistik | Nexflow",
  description:
    "Zeitarbeit in Lagern und Logistikzentren deutschlandweit. Kommissionierer, Staplerfahrer, Lageristen gesucht. Jetzt bewerben — Rückruf innerhalb 24h.",
  alternates: {
    canonical: "https://nexflow.work/jobs",
    languages: {
      de: "https://nexflow.work/jobs",
    },
  },
  robots: { index: true, follow: true },
};

const ROLES = [
  {
    icon: "📦",
    title: "Kommissionierer",
    desc: "Zusammenstellen von Aufträgen nach Pickliste in Versandzentren. Schichtarbeit, keine Deutschkenntnisse nötig.",
    badge: "ab 14,82 €/Std.",
  },
  {
    icon: "🚛",
    title: "Lagerhelfer / Be- und Entladen",
    desc: "Be- und Entladen von LKW und Containern, Palettieren und Wareneingangsprüfung. Keine Qualifikation erforderlich.",
    badge: "ab 14,82 €/Std.",
  },
  {
    icon: "🏗️",
    title: "Staplerfahrer",
    desc: "Bedienung von Frontstapler oder Schubmaststapler in Produktions- und Logistikbetrieben. Staplerschein erforderlich.",
    badge: "ab 16,00 €/Std.",
  },
];

const PERKS = [
  "Unterkunft und Fahrt inklusive",
  "Legale Beschäftigung — Arbeitsvertrag",
  "Sozialversicherung (PL + DE)",
  "Auszahlung alle 2 Wochen",
  "Hilfe bei A1-Bescheinigung",
  "KRAZ-zertifizierte Agentur Nr. 10916",
];

export default function JobsPage() {
  return (
    <>
      {/* Hero with inline form */}
      <section className="bg-nexflow-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Copy */}
            <div>
              <span className="inline-block bg-nexflow-cyan/20 text-nexflow-cyan text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-5">
                Deutschland · Lager &amp; Logistik
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                Jobs in Deutschland —{" "}
                <span className="text-nexflow-cyan">Lager &amp; Logistik</span>
              </h1>
              <p className="text-white/75 text-lg leading-relaxed mb-8">
                Zeitarbeit in Lagern und Logistikzentren deutschlandweit.
                Legale Beschäftigung, Unterkunft inklusive, Rückruf innerhalb 24h.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-7">
                {[
                  { n: "240+", label: "Mitarbeiter" },
                  { n: "7 J.", label: "Erfahrung" },
                  { n: "24h", label: "Antwortzeit" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-extrabold text-nexflow-cyan">{s.n}</div>
                    <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <ul className="space-y-2">
                {PERKS.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-white/80">
                    <span className="text-nexflow-cyan" aria-hidden="true">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl p-7 shadow-2xl">
              <p className="text-nexflow-cyan text-xs font-semibold uppercase tracking-wider mb-1">
                Kostenlose Vermittlung
              </p>
              <h2 className="text-xl font-bold text-nexflow-navy mb-1">
                Nummer hinterlassen — wir rufen zurück
              </h2>
              <p className="text-slate text-sm mb-5">
                Recruiter meldet sich innerhalb von 24h.
              </p>
              <AdsLeadForm locale="de" source="jobs" />
            </div>
          </div>
        </div>
      </section>

      {/* Current positions */}
      <section className="py-16 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-nexflow-navy text-center mb-2">
            Aktuelle Stellen
          </h2>
          <p className="text-slate text-center text-sm mb-10">
            Gesetzlicher Mindestlohn ab 14,82 €/Std. Genaue Vergütung je nach Betrieb und Schicht.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ROLES.map((role) => (
              <div
                key={role.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3" aria-hidden="true">{role.icon}</div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-nexflow-navy text-base">{role.title}</h3>
                  <span className="text-xs font-semibold bg-nexflow-cyan/10 text-nexflow-navy px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                    {role.badge}
                  </span>
                </div>
                <p className="text-slate text-sm leading-relaxed">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-nexflow-navy py-14">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bereit für Ihren Job in Deutschland?
          </h2>
          <p className="text-white/70 text-sm mb-8">
            Formular oben ausfüllen oder direkt anrufen. Recruiter antwortet innerhalb 24h.
          </p>
          <a
            href="tel:+48224878828"
            className="inline-flex items-center gap-2 bg-nexflow-cyan text-nexflow-navy font-bold px-8 py-3.5 rounded-xl text-base hover:bg-opacity-90 transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            +48 224 878 828
          </a>
          <p className="text-white/40 text-xs mt-3">Mo–Fr, 8:00–17:00 Uhr · Polnisch &amp; Englisch</p>
        </div>
      </section>
    </>
  );
}
