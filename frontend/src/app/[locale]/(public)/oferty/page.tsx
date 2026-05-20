import type { Metadata } from "next";
import Script from "next/script";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { JobsBoard } from "@/components/jobs/JobsBoard";
import { jobs, mapEmploymentType } from "@/data/jobs";

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

const jobPostingSchemas = jobs.map((job) => {
  const locations = job.countries.map((country) =>
    country === "PL"
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.plCity ?? "Słubice",
            addressRegion: job.plRegion ?? "Lubuskie",
            addressCountry: "PL",
          },
        }
      : {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressCountry: country },
        }
  );

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.pl.title,
    description: job.pl.summary,
    identifier: { "@type": "PropertyValue", name: "Nexflow", value: job.id },
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: mapEmploymentType(job.employmentType),
    hiringOrganization: {
      "@type": "Organization",
      name: "Nexflow",
      sameAs: "https://nexflow.work",
      logo: "https://nexflow.work/nexflow-logo-email.svg",
    },
    jobLocation: locations.length === 1 ? locations[0] : locations,
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: job.salaryCurrency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin,
        maxValue: job.salaryMax,
        unitText: job.salaryUnit,
      },
    },
    directApply: true,
    url: `https://nexflow.work/pl/oferty/${job.slug}`,
  };
});

export default async function JobsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "JobsPage" });

  return (
    <>
      <Script
        id="job-postings-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jobPostingSchemas),
        }}
      />
      <section className="bg-nexflow-navy text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/hero-oferty.jpg" alt="Oferty pracy w logistyce — Nexflow" fill priority className="object-cover object-center" sizes="100vw" />
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
      <JobsBoard jobs={jobs} />
    </>
  );
}
