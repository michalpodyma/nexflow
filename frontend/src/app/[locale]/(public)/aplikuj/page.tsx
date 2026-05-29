import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { CandidateIntakeForm } from "@/components/forms/CandidateIntakeForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ApplyPage" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: `https://nexflow.work/${locale}/aplikuj`,
      languages: {
        "x-default": "https://nexflow.work/pl/aplikuj",
        pl: "https://nexflow.work/pl/aplikuj",
        en: "https://nexflow.work/en/aplikuj",
        de: "https://nexflow.work/de/aplikuj",
        nl: "https://nexflow.work/nl/aplikuj",
        ru: "https://nexflow.work/ru/aplikuj",
        uk: "https://nexflow.work/uk/aplikuj",
      },
    },
  };
}

export default async function ApplyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ApplyPage" });

  const benefits = [
    { title: t("b1_title"), desc: t("b1_desc") },
    { title: t("b2_title"), desc: t("b2_desc") },
    { title: t("b3_title"), desc: t("b3_desc") },
  ];

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
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            {t("hero_tag")}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            {t("hero_heading")}
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-xl leading-relaxed">
            {t("hero_desc")}
          </p>
        </div>
      </section>

      {/* Benefit cards */}
      <section className="bg-surface-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-xl p-6 border border-gray-100 hover:-translate-y-1 transition-all duration-300"
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
