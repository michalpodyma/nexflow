import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FlowMark from "@/components/FlowMark";
import { FadeIn } from "@/components/FadeIn";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export const metadata: Metadata = {
  title: "Nexflow — Workforce in motion.",
  description:
    "Nexflow dostarcza sprawdzonych pracowników do firm logistycznych i magazynowych w Polsce i Niemczech — w 5 dni roboczych.",
};

const services = [
  {
    id: "tymczasowi",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Pracownicy tymczasowi",
    description:
      "Elastyczne zatrudnienie na każdą skalę — od kilku do ponad tysiąca pracowników. Dostarczamy sprawdzony personel magazynowy i logistyczny z pełną dokumentacją.",
  },
  {
    id: "rekrutacja",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Rekrutacja stała",
    description:
      "Szukasz pracownika na stałe? Przeprowadzamy selekcję, weryfikujemy kompetencje i dostarczamy gotowych kandydatów do zatrudnienia bezpośredniego.",
  },
  {
    id: "headhunting",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: "Headhunting",
    description:
      "Dla stanowisk specjalistycznych i menedżerskich — dyskretne poszukiwania, precyzyjne dopasowanie profilu, pełna poufność przez cały proces.",
  },
  {
    id: "doradztwo",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Doradztwo HR",
    description:
      "Compliance, onboarding, dokumentacja pracownicza — wspieramy firmy działające na rynku DE-PL, które chcą działać legalnie, sprawnie i bez ryzyka.",
  },
];

const stats = [
  { value: "240+", label: "aktywnych pracowników" },
  { value: "21+", label: "narodowości" },
  { value: "5 dni", label: "czas rozmieszczenia" },
  { value: "10+", label: "lat doświadczenia" },
];

const whyPoints = [
  {
    title: "Szybkość",
    description:
      "Największa pula zweryfikowanych pracowników w korytarzu DE-PL. Bez zimnej rekrutacji, bez opóźnień.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Compliance",
    description:
      "Dedykowany zespół compliance. Zero tolerancji dla braków dokumentacyjnych. Bilateralne pokrycie prawne PL/DE.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Skala",
    description:
      "Od 10 do 1 000+ pracowników — ta sama umowa, ten sam opiekun. Żadnych ponownych przetargów gdy rośniesz.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    title: "Partnerstwo",
    description:
      "Jeden dedykowany opiekun, bezpośredni numer komórkowy. Nie call center — prawdziwy kontakt z agencją.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-nexflow-navy via-[#0a2a5e] to-[#0F2040] text-white min-h-[85vh] flex items-center relative overflow-hidden">
          {/* Animated background blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-10 right-10 w-96 h-96 rounded-full bg-nexflow-cyan blur-3xl"
              style={{
                opacity: 0.07,
                animation: "blobFloat 12s ease-in-out infinite, gradientPulse 8s ease-in-out infinite",
              }}
            />
            <div
              className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-nexflow-cyan blur-3xl"
              style={{
                opacity: 0.05,
                animation: "blobFloat 16s ease-in-out infinite reverse, gradientPulse 10s ease-in-out infinite",
                animationDelay: "2s",
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="max-w-3xl">
              <div className="mb-8">
                <FlowMark variant="symbol" colorScheme="reversed" height={56} />
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Twój magazyn.{" "}
                <span className="text-nexflow-cyan">Twoje tempo.</span>{" "}
                Nasi ludzie.
              </h1>
              <p className="mt-6 text-xl md:text-2xl text-white/80 leading-relaxed max-w-2xl">
                Nexflow dostarcza sprawdzonych pracowników do firm logistycznych
                i magazynowych w Polsce i Niemczech —{" "}
                <strong className="text-white">w 5 dni roboczych.</strong>
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link href="/kontakt" className="btn-primary text-center text-base">
                  Umów rozmowę →
                </Link>
                <Link
                  href="/kontakt#pracownicy"
                  className="btn-outline-white text-center text-base"
                >
                  Szukam pracy
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, i) => (
                <FadeIn key={stat.label} delay={i * 100}>
                  <p className="text-4xl md:text-5xl font-bold text-nexflow-navy">
                    <AnimatedCounter value={stat.value} />
                  </p>
                  <p className="mt-2 text-sm text-slate">{stat.label}</p>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="py-24 bg-cloud-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="section-heading">Co robimy</h2>
                <p className="section-subheading mx-auto">
                  Jeden partner kadrowy. Cztery usługi. Każda skala.
                </p>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, i) => (
                <FadeIn key={service.id} delay={i * 80}>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 hover:border-nexflow-cyan/30 transition-all duration-300 group h-full">
                    <div className="w-14 h-14 rounded-xl bg-nexflow-navy flex items-center justify-center text-nexflow-cyan mb-5 group-hover:bg-nexflow-cyan group-hover:text-nexflow-navy transition-all duration-300">
                      {service.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-nexflow-navy mb-3">
                      {service.title}
                    </h3>
                    <p className="text-slate text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={200}>
              <div className="text-center mt-10">
                <Link href="/uslugi" className="btn-outline text-sm">
                  Dowiedz się więcej o usługach →
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Why Nexflow */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <FadeIn direction="left">
                <div>
                  <h2 className="section-heading">
                    Dlaczego klienci wybierają Nexflow i nie wracają do innych
                  </h2>
                  <p className="section-subheading">
                    Cztery powody, dla których firmy logistyczne i magazynowe z
                    Polski i Niemiec polegają na nas.
                  </p>
                  <div className="mt-10">
                    <Link href="/kontakt" className="btn-primary">
                      Umów bezpłatną rozmowę
                    </Link>
                  </div>
                </div>
              </FadeIn>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {whyPoints.map((point, i) => (
                  <FadeIn key={point.title} direction="right" delay={i * 100}>
                    <div className="bg-cloud-white rounded-xl p-5 border border-gray-100 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 h-full">
                      <div className="w-10 h-10 rounded-lg bg-nexflow-navy flex items-center justify-center text-nexflow-cyan mb-4">
                        {point.icon}
                      </div>
                      <h3 className="font-semibold text-nexflow-navy mb-2">
                        {point.title}
                      </h3>
                      <p className="text-slate text-sm leading-relaxed">
                        {point.description}
                      </p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-nexflow-navy text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Nowy klient do pierwszego rozmieszczenia w{" "}
                  <span className="text-nexflow-cyan">5 dni roboczych</span>
                </h2>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
              {[
                { day: "Dzień 1", title: "Brief", desc: "Rozmowa i brief kadrowy — rola, wolumen, lokalizacja, termin" },
                { day: "Dzień 2–3", title: "Dopasowanie", desc: "Selekcja kandydatów z pre-zweryfikowanej puli aktywnej" },
                { day: "Dzień 4", title: "Profile", desc: "Dostarczamy profile kandydatów do zatwierdzenia przez klienta" },
                { day: "Dzień 5", title: "Potwierdzenie", desc: "Rozmieszczenie potwierdzone, umowy i dokumenty gotowe" },
                { day: "Ongoing", title: "Wsparcie", desc: "Dedykowany opiekun, cotygodniowe raporty kadrowe" },
              ].map((step, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="relative h-full">
                    <div className="bg-white/10 rounded-xl p-5 h-full border border-white/10 hover:border-nexflow-cyan/50 hover:bg-white/15 transition-all duration-300">
                      <p className="text-nexflow-cyan text-xs font-semibold uppercase tracking-wider mb-2">
                        {step.day}
                      </p>
                      <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                    {i < 4 && (
                      <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                        <svg className="w-6 h-6 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-24 bg-cloud-white">
          <FadeIn>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="section-heading">
                Skompletuj zespół szybciej, niż myślisz
              </h2>
              <p className="section-subheading mx-auto mt-4">
                Od pierwszego kontaktu do gotowego pracownika — w 5 dni roboczych.
                Obsługujemy całą dokumentację, Ty skupiasz się na prowadzeniu
                operacji.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/kontakt" className="btn-primary text-base">
                  Umów rozmowę →
                </Link>
                <Link href="/uslugi" className="btn-outline text-base">
                  Zobacz nasze usługi
                </Link>
              </div>
              <p className="mt-6 text-sm text-slate">
                Lub zadzwoń bezpośrednio:{" "}
                <a
                  href="tel:+48224878828"
                  className="text-nexflow-navy font-semibold hover:text-nexflow-cyan-dark transition-colors"
                >
                  +48 224 878 828
                </a>
              </p>
            </div>
          </FadeIn>
        </section>
      </main>
      <Footer />
    </>
  );
}
