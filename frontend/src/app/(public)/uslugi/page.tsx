import type { Metadata } from "next";
import Link from "next/link";
import { Users, UserCheck, Target, ClipboardList } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Usługi rekrutacyjne dla logistyki | Nexflow",
  description:
    "Pracownicy tymczasowi, rekrutacja stała, headhunting i doradztwo HR dla firm logistycznych i magazynowych w Polsce i Niemczech.",
  alternates: {
    canonical: "https://nexflow.work/uslugi",
    languages: {
      "x-default": "https://nexflow.work/uslugi",
      pl: "https://nexflow.work/uslugi",
      de: "https://nexflow.work/uslugi",
    },
  },
};

const serviceIcons = [Users, UserCheck, Target, ClipboardList];

const services = [
  {
    id: "tymczasowi",
    number: "01",
    title: "Pracownicy tymczasowi",
    subtitle: "Elastyczne zatrudnienie na każdą skalę",
    description: `Elastyczne zatrudnienie na każdą skalę — od kilku do ponad tysiąca pracowników.
    Dostarczamy sprawdzony personel magazynowy i logistyczny z pełną dokumentacją, bez formalności po Twojej stronie.`,
    details: [
      "Magazynierzy, operatorzy wózków widłowych, pracownicy kompletacji",
      "Kierowcy kategorii C, C+E — transport krajowy i międzynarodowy",
      "Pracownicy produkcji, montażu liniowego i szklarni",
      "Brygadziści i koordynatorzy zmian",
    ],
    features: [
      { title: "Szybkie rozmieszczenie", desc: "Pierwsi pracownicy gotowi w 5 dni roboczych od briefu" },
      { title: "Pełna dokumentacja", desc: "Pozwolenia na pracę, A1, ZUS — wszystko po naszej stronie" },
      { title: "Elastyczna skala", desc: "Od 10 do 1 000+ pracowników, ta sama umowa" },
      { title: "Dedykowany opiekun", desc: "Jeden kontakt, bezpośredni numer — nie infolinia" },
    ],
  },
  {
    id: "rekrutacja",
    number: "02",
    title: "Rekrutacja stała",
    subtitle: "Kandydaci gotowi do zatrudnienia bezpośredniego",
    description: `Szukasz pracownika na stałe? Przeprowadzamy selekcję, weryfikujemy kompetencje
    i dostarczamy gotowych kandydatów do zatrudnienia bezpośredniego. Ty tylko wybierasz.`,
    details: [
      "Specjaliści logistyczni i supply chain",
      "Kierownicy magazynów i supervisorzy",
      "Specjaliści ds. spedycji i transportu",
      "Analitycy i planiści łańcucha dostaw",
    ],
    features: [
      { title: "Preselekcja CV", desc: "Weryfikujemy kompetencje i referencje przed prezentacją" },
      { title: "Wywiady behawioralne", desc: "Oceniamy dopasowanie kulturowe i motywację kandydata" },
      { title: "Gwarancja zastępstwa", desc: "Jeśli kandydat odejdzie w ciągu 3 miesięcy — szukamy bezpłatnie" },
      { title: "Bilateralne CV", desc: "Kandydaci gotowi do pracy w Polsce i Niemczech" },
    ],
  },
  {
    id: "headhunting",
    number: "03",
    title: "Headhunting",
    subtitle: "Stanowiska specjalistyczne i menedżerskie",
    description: `Dla stanowisk specjalistycznych i menedżerskich — dyskretne poszukiwania,
    precyzyjne dopasowanie profilu, pełna poufność przez cały proces.`,
    details: [
      "Dyrektorzy operacyjni i logistyki (COO, Logistics Director)",
      "Country Managerowie i Region Managerowie",
      "Specjaliści ds. automatyzacji i WMS",
      "Eksperci ds. compliance pracy transgranicznej DE-PL",
    ],
    features: [
      { title: "Direct search", desc: "Sięgamy do kandydatów pasywnych — nie tylko do tych aktywnie szukających" },
      { title: "Pełna dyskrecja", desc: "Marka klienta ujawniana dopiero po obustronnym zainteresowaniu" },
      { title: "Precyzyjna selekcja", desc: "Prezentujemy maksymalnie 3–5 kandydatów, każdy starannie dopasowany" },
      { title: "Onboarding support", desc: "Towarzyszymy przez pierwsze 90 dni zatrudnienia" },
    ],
  },
  {
    id: "doradztwo",
    number: "04",
    title: "Doradztwo HR",
    subtitle: "Compliance, onboarding i dokumentacja pracownicza",
    description: `Compliance, onboarding, dokumentacja pracownicza — wspieramy firmy działające
    na rynku DE-PL, które chcą działać legalnie, sprawnie i bez ryzyka.`,
    details: [
      "Audyt compliance dokumentacji pracowników tymczasowych",
      "Projektowanie procesów onboardingu dla środowisk wielojęzycznych",
      "Szkolenia dla HR z prawa pracy w Polsce i Niemczech",
      "Wsparcie przy wdrożeniu polityki A1 i ZUS dla pracowników transgranicnych",
    ],
    features: [
      { title: "Audyt dokumentacji", desc: "Sprawdzamy aktualność zezwoleń, certyfikatów A1, rejestracji ZUS" },
      { title: "Onboarding design", desc: "Tworzymy procesy dla pracowników PL, DE, UA, ID i innych" },
      { title: "Szkolenia compliance", desc: "Warsztaty dla zespołów HR z regulacji bilateralnych PL-DE" },
      { title: "Monitoring regulacyjny", desc: "Informujemy o zmianach w przepisach wpływających na Twój biznes" },
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Usługi
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Jeden partner. Cztery usługi. Każda skala.
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed">
            Kompleksowa obsługa kadrowa dla firm logistycznych, magazynowych i szklarniowych
            działających w Polsce, Niemczech, Holandii i Belgii — od pracownika tymczasowego po dyrektora operacyjnego.
          </p>
        </div>
      </section>

      {/* Services detail */}
      <section className="py-8 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {services.map((service, index) => {
            const ServiceIcon = serviceIcons[index];
            return (
            <div
              key={service.id}
              id={service.id}
              className={`py-16 ${index < services.length - 1 ? "border-b border-gray-200" : ""}`}
            >
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                {/* Content */}
                <FadeIn direction={index % 2 === 0 ? "left" : "right"}>
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="w-14 h-14 bg-nexflow-cyan/10 rounded-2xl flex items-center justify-center mb-4">
                    <ServiceIcon className="w-7 h-7 text-nexflow-cyan" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-5xl font-bold text-nexflow-cyan/20 select-none leading-none">
                      {service.number}
                    </span>
                    <div>
                      <p className="text-nexflow-navy text-xs font-semibold uppercase tracking-wider">
                        {service.subtitle}
                      </p>
                      <h2 className="text-2xl md:text-3xl font-bold text-nexflow-navy">{service.title}</h2>
                    </div>
                  </div>

                  <p className="text-graphite leading-relaxed mb-6">{service.description}</p>

                  <h3 className="font-semibold text-nexflow-navy mb-3">Typowe profile:</h3>
                  <ul className="space-y-2 mb-8">
                    {service.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm text-graphite">
                        <svg className="w-4 h-4 text-nexflow-cyan mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {detail}
                      </li>
                    ))}
                  </ul>

                  <Link href="/kontakt" className="btn-primary">
                    Zapytaj o tę usługę →
                  </Link>
                </div>
                </FadeIn>

                {/* Features grid */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                  {service.features.map((feature, fi) => (
                    <FadeIn key={feature.title} direction={index % 2 === 0 ? "right" : "left"} delay={fi * 80}>
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                      <div className="w-8 h-8 rounded-lg bg-nexflow-navy/10 flex items-center justify-center mb-3">
                        <svg className="w-4 h-4 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-nexflow-navy text-sm mb-1">{feature.title}</h4>
                      <p className="text-slate text-xs leading-relaxed">{feature.desc}</p>
                    </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
            </div>
          )})}
        </div>
      </section>

      {/* Compliance section */}
      <section className="py-20 bg-nexflow-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn direction="left">
            <div>
              <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
                Compliance
              </p>
              <h2 className="text-3xl md:text-4xl font-bold">
                Obsługujemy każdy dokument — żebyś Ty nie musiał
              </h2>
              <p className="mt-4 text-white/70 leading-relaxed">
                ZUS, A1, zezwolenia na pracę, RODO — wszystko pod kontrolą. Nexflow posiada
                certyfikat KRAZ nr 10916 i jest zarejestrowany w Polsce, Niemczech, Holandii i Belgii.
              </p>
            </div>
            </FadeIn>

            <div className="grid grid-cols-2 gap-4">
              {["Zezwolenia na pracę", "Certyfikaty A1", "Rejestracja ZUS / SV", "Zgodność z RODO"].map((item, i) => (
                <FadeIn key={item} direction="right" delay={i * 80}>
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors duration-300">
                  <div className="w-8 h-8 rounded-full bg-nexflow-cyan flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-nexflow-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-cloud-white">
        <FadeIn>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="section-heading">Gotowy na pierwszych pracowników w 5 dni?</h2>
          <p className="section-subheading mx-auto">
            Skontaktuj się z nami i powiedz, czego potrzebujesz. Wrócimy do Ciebie jeszcze tego
            samego dnia.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kontakt" className="btn-primary">Umów rozmowę →</Link>
            <a href="tel:+48882501520" className="btn-outline">Zadzwoń teraz</a>
          </div>
        </div>
        </FadeIn>
      </section>
    </>
  );
}
