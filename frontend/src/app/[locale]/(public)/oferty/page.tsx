import type { Metadata } from "next";
import Script from "next/script";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { HRappkaWidget } from "@/components/jobs/HRappkaWidget";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "JobsPage" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: `https://nexflow.work/${locale}/oferty`,
      languages: {
        "x-default": "https://nexflow.work/pl/oferty",
        pl: "https://nexflow.work/pl/oferty",
        en: "https://nexflow.work/en/oferty",
        de: "https://nexflow.work/de/oferty",
        nl: "https://nexflow.work/nl/oferty",
        ru: "https://nexflow.work/ru/oferty",
        uk: "https://nexflow.work/uk/oferty",
      },
    },
    openGraph: {
      title: t("meta_title"),
      description: t("meta_desc"),
      url: `https://nexflow.work/${locale}/oferty`,
      type: "website",
    },
  };
}

// Static EmployerAggregateOffer schema — individual JobPosting schemas are
// rendered dynamically by the HRappka widget on the client.
const hiringOrgSchema = {
  "@context": "https://schema.org",
  "@type": "EmploymentAgency",
  name: "Nexflow",
  url: "https://nexflow.work",
  logo: "https://nexflow.work/nexflow-logo-email.svg",
  description:
    "Agencja pracy tymczasowej specjalizująca się w rekrutacji do logistyki i magazynów w Polsce i Niemczech.",
};

export default async function JobsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "JobsPage" });

  return (
    <>
      <Script
        id="hiring-org-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hiringOrgSchema) }}
      />
      <section className="bg-nexflow-navy text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-oferty.jpg"
            alt="Oferty pracy w logistyce — Nexflow"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-nexflow-navy/65" />
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
      <section className="py-12 bg-gray-50 min-h-[500px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HRappkaWidget locale={locale} />
        </div>
      </section>
    </>
  );
}
