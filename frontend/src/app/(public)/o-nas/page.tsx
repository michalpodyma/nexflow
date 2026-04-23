import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { AnimatedCounter } from "@/components/AnimatedCounter";

function InitialsAvatar({ initials }: { initials: string }) {
  return (
    <div className="w-16 h-16 rounded-full bg-nexflow-navy border-4 border-nexflow-cyan flex items-center justify-center mx-auto mb-4">
      <span className="text-nexflow-cyan font-bold text-xl tracking-wider">{initials}</span>
    </div>
  );
}

export const metadata: Metadata = {
  title: "O nas",
  description:
    "Nexflow — dawniej Eurojob-West. Od 2013 roku łączymy pracowników z firmami logistycznymi po obu stronach granicy polsko-niemieckiej.",
};

const values = [
  {
    title: "Szybkość bez kompromisów",
    description:
      "5 dni roboczych to nie hasło marketingowe — to nasz standard operacyjny. Osiągamy go dzięki aktywnej, stale odświeżanej puli zweryfikowanych pracowników.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Compliance jako fundament",
    description:
      "Operujemy na styku dwóch systemów prawnych. Każdy pracownik ma komplet dokumentów przed pierwszą zmianą — zezwolenia, A1, ZUS. Bez wyjątków.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Różnorodność jako siła",
    description:
      "240+ aktywnych pracowników z 21+ krajów. Polska, Ukraina, Indonezja, Nigeria, Ghana, Kolumbia, Filipiny — każda osoba zweryfikowana, gotowa do pracy.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Partnerstwo, nie transakcja",
    description:
      "Jeden opiekun, jeden numer. Nie obsługujemy zgłoszeń przez formularz — rozmawiamy bezpośrednio z klientami i pracownikami, bo tak buduje się zaufanie.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
];

const milestones = [
  {
    year: "2013",
    title: "Eurojob-West — pierwsze kroki",
    description:
      "Zaczynamy jako Eurojob-West — mała agencja na granicy polsko-niemieckiej, specjalizująca się w łączeniu polskich pracowników z firmami magazynowymi w Niemczech.",
  },
  {
    year: "2015",
    title: "Ekspansja na rynek polski",
    description:
      "Otwieramy pełną działalność po stronie polskiej. Zaczynamy obsługiwać polskie firmy logistyczne — zarówno dostarczając im pracowników, jak i rekrutując dla nich stałych pracowników.",
  },
  {
    year: "2018",
    title: "Ponad 100 aktywnych pracowników",
    description:
      "Przekraczamy próg 100 jednocześnie aktywnych pracowników tymczasowych. Uruchamiamy wewnętrzny system śledzenia dokumentacji compliance.",
  },
  {
    year: "2022",
    title: "Dywersyfikacja puli pracowników",
    description:
      "Rozszerzamy rekrutację na nowe rynki — Indonezja, Nigeria, Ghana, Kolumbia, Filipiny. Dziś zarządzamy pracownikami z ponad 21 krajów.",
  },
  {
    year: "2026",
    title: "Nexflow — Workforce in motion.",
    description:
      "Rebrand. Eurojob-West staje się Nexflow — z nową marką, platformą cyfrową w budowie i ambitnym planem skalowania operacji w całym korytarzu DE-PL.",
  },
];

const statsData = [
  { value: "2013", label: "rok założenia", sublabel: "jako Eurojob-West" },
  { value: "240+", label: "aktywnych pracowników", sublabel: "gotowych do pracy" },
  { value: "21+", label: "narodowości", sublabel: "w naszej puli" },
  { value: "KRAZ", label: "certyfikat nr 10916", sublabel: "licencja agencji pracy" },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            O nas
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Eurojob-West już nie istnieje. Jest Nexflow.
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed">
            Od 2013 roku łączyliśmy pracowników z firmami logistycznymi po obu
            stronach granicy polsko-niemieckiej. Zrobiliśmy to tysiące razy —
            z zaangażowaniem, terminowo, legalnie.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <h2 className="section-heading">
                  Korytarz DE-PL — to jest nasze podwórko
                </h2>
                <div className="mt-6 space-y-4 text-graphite leading-relaxed">
                  <p>
                    Nexflow (dawniej Eurojob-West) to agencja pracy
                    specjalizująca się w sektorze warehouse i logistyki w Polsce
                    i Niemczech. Jesteśmy zakorzenieni na granicy — fizycznie
                    i operacyjnie.
                  </p>
                  <p>
                    Nie działamy na wszystkich rynkach i nie obsługujemy każdej
                    branży. Skupiamy się na tym, co znamy najlepiej: magazyny,
                    logistyka, transport — po obu stronach granicy Odry.
                  </p>
                  <p>
                    Ta koncentracja przekłada się na realną przewagę: najszybszy
                    czas rozmieszczenia w branży, głęboką znajomość lokalnych
                    regulacji pracy, i aktywną pulę ponad 240 zweryfikowanych
                    pracowników gotowych do pracy już dziś.
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              {statsData.map((stat, i) => (
                <FadeIn key={stat.label} direction="right" delay={i * 100}>
                  <div className="bg-nexflow-navy rounded-xl p-6 text-center">
                    <p className="text-3xl font-bold text-nexflow-cyan">
                      <AnimatedCounter value={stat.value} />
                    </p>
                    <p className="text-white text-sm font-semibold mt-2">
                      {stat.label}
                    </p>
                    <p className="text-white/50 text-xs mt-1">{stat.sublabel}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="section-heading">Nasza historia</h2>
              <p className="section-subheading mx-auto">
                Ponad 10 lat na styku dwóch gospodarek.
              </p>
            </div>
          </FadeIn>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2 hidden md:block" />

            <div className="space-y-10">
              {milestones.map((milestone, index) => (
                <FadeIn
                  key={milestone.year}
                  direction={index % 2 === 0 ? "left" : "right"}
                  delay={100}
                >
                  <div
                    className={`relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 ${
                      index % 2 === 0 ? "md:text-right" : ""
                    }`}
                  >
                    {index % 2 === 0 ? (
                      <>
                        <div className="md:pr-12">
                          <span className="inline-block bg-nexflow-navy text-nexflow-cyan text-sm font-bold px-3 py-1 rounded-full mb-3">
                            {milestone.year}
                          </span>
                          <h3 className="text-xl font-semibold text-nexflow-navy">
                            {milestone.title}
                          </h3>
                          <p className="text-slate text-sm leading-relaxed mt-2">
                            {milestone.description}
                          </p>
                        </div>
                        <div className="hidden md:block" />
                      </>
                    ) : (
                      <>
                        <div className="hidden md:block" />
                        <div className="md:pl-12">
                          <span className="inline-block bg-nexflow-navy text-nexflow-cyan text-sm font-bold px-3 py-1 rounded-full mb-3">
                            {milestone.year}
                          </span>
                          <h3 className="text-xl font-semibold text-nexflow-navy">
                            {milestone.title}
                          </h3>
                          <p className="text-slate text-sm leading-relaxed mt-2">
                            {milestone.description}
                          </p>
                        </div>
                      </>
                    )}

                    {/* Center dot */}
                    <div className="hidden md:block absolute left-1/2 top-3 w-4 h-4 rounded-full bg-nexflow-cyan border-4 border-white shadow-sm -translate-x-1/2" />
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="section-heading">Nasze wartości</h2>
              <p className="section-subheading mx-auto">
                To, w co wierzymy jako firma, przekłada się na każde nasze
                działanie — od pierwszego telefonu po ostatni dokument.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value, i) => (
              <FadeIn key={value.title} delay={i * 80}>
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex gap-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                  <div className="w-14 h-14 rounded-xl bg-nexflow-navy flex items-center justify-center text-nexflow-cyan shrink-0">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-nexflow-navy mb-2">
                      {value.title}
                    </h3>
                    <p className="text-slate text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-nexflow-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Twój zespół Nexflow</h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Michał Podyma", role: "Prezes Zarządu", email: "mp@nexflow.work", initials: "MP" },
              { name: "Anatolii Tychonenko", role: "Wiceprezes Zarządu", email: "at@nexflow.work", initials: "AT" },
              { name: "Swietłana Owsiejczuk", role: "Manager", email: "so@nexflow.work", initials: "SO" },
              { name: "Olha Yablonska", role: "Koordynator i Rekruter EN/UA", email: "oy@nexflow.work", initials: "OY" },
              { name: "Hanna Serheeva", role: "Rekruter i Koordynator UA", email: "as@nexflow.work", initials: "HS" },
              { name: "Olena Omelchenko", role: "Specjalista ds. Kadr i Płac", email: "ao@nexflow.work", initials: "OO" },
              { name: "Hanna Rybakova", role: "Rekruter i Koordynator UA", email: "ar@nexflow.work", initials: "HR" },
            ].map((person, i) => (
              <FadeIn key={person.name} delay={i * 60}>
                <div className="bg-white/10 rounded-xl p-6 border border-white/10 text-center hover:bg-white/15 hover:-translate-y-1 transition-all duration-300 h-full">
                  <InitialsAvatar initials={person.initials} />
                  <h3 className="font-semibold text-white text-base">{person.name}</h3>
                  <p className="text-nexflow-cyan text-xs mt-1">{person.role}</p>
                  <div className="mt-4 space-y-1 text-xs text-white/60">
                    <p>
                      <a href={`mailto:${person.email}`} className="hover:text-nexflow-cyan transition-colors">
                        {person.email}
                      </a>
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-cloud-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="section-heading">Poznaj nas w akcji</h2>
            <p className="section-subheading mx-auto">
              Opowiedz nam o swoim wyzwaniu kadrowym. Wrócimy do Ciebie jeszcze
              tego samego dnia z konkretną propozycją.
            </p>
            <div className="mt-8">
              <Link href="/kontakt" className="btn-primary text-base">
                Skontaktuj się z nami →
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
