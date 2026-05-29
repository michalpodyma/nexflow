import type { Metadata } from "next";
import Image from "next/image";

import { CandidateIntakeForm } from "@/components/forms/CandidateIntakeForm";

export const metadata: Metadata = {
  title: "Aplikuj — Praca w magazynie i logistyce | Nexflow",
  description:
    "Wyślij zgłoszenie i dołącz do bazy kandydatów Nexflow. Praca tymczasowa w magazynach i logistyce w Polsce i Niemczech.",
  alternates: {
    canonical: "https://nexflow.work/aplikuj",
    languages: {
      "x-default": "https://nexflow.work/aplikuj",
      pl: "https://nexflow.work/aplikuj",
      de: "https://nexflow.work/aplikuj",
    },
  },
};

const benefits = [
  {
    title: "Szybka rekrutacja",
    desc: "Pierwsze oferty w 48h od rejestracji. Aktywna pula 240+ zweryfikowanych pracowników.",
  },
  {
    title: "Pełna dokumentacja",
    desc: "Pomagamy z zezwoleniami, A1, ZUS — bez formalności z Twojej strony.",
  },
  {
    title: "Niemcy i Polska",
    desc: "Oferty po obu stronach granicy. Praca z zakwaterowaniem lub bez.",
  },
];

export default function AplikujPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-canvas text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-aplikuj.jpg"
            alt="Dołącz do Nexflow — praca w Polsce i Niemczech"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-canvas/65" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">Aplikuj</p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Dołącz do Nexflow — praca w Polsce i Niemczech
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-xl leading-relaxed">
            Rejestracja zajmuje 3 minuty. Weryfikujemy dokumenty, łączymy z pracodawcami.
          </p>
        </div>
      </section>

      {/* Benefit cards */}
      <section className="bg-cloud-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <h3 className="text-lg font-semibold text-ink-inverse mb-2">{benefit.title}</h3>
                <p className="text-slate text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <CandidateIntakeForm />
    </>
  );
}
