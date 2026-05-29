import type { Metadata } from "next";
import Script from "next/script";
import Image from "next/image";

import { JobsBoard } from "@/components/jobs/JobsBoard";
import { jobs, mapEmploymentType } from "@/data/jobs";

export const metadata: Metadata = {
  title: "Oferty pracy w magazynach i logistyce | Nexflow",
  description:
    "Aktualne oferty pracy tymczasowej w magazynach i logistyce. Słubice, Frankfurt (Oder) i okolice. Praca od zaraz — aplikuj online.",
  alternates: {
    canonical: "https://nexflow.work/oferty",
    languages: {
      "x-default": "https://nexflow.work/oferty",
      pl: "https://nexflow.work/oferty",
      de: "https://nexflow.work/oferty",
    },
  },
  openGraph: {
    title: "Oferty pracy | Nexflow",
    description:
      "Praca tymczasowa w magazynach i logistyce. Słubice i region polsko-niemiecki.",
    url: "https://nexflow.work/oferty",
    type: "website",
  },
};

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
    url: `https://nexflow.work/oferty/${job.slug}`,
  };
});

export default function OffertyPage() {
  return (
    <>
      <Script
        id="job-postings-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jobPostingSchemas),
        }}
      />
      <section className="bg-canvas text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/hero-oferty.jpg" alt="Oferty pracy w logistyce — Nexflow" fill priority className="object-cover object-center" sizes="100vw" />
          <div className="absolute inset-0 bg-canvas/65" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">Oferty pracy</p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">Znajdź pracę w logistyce i magazynach</h1>
          <p className="mt-4 text-lg text-white/70 max-w-xl leading-relaxed">Aktualne oferty dla operatorów wózków, kierowców i pracowników kompletacji — w Polsce i Niemczech.</p>
        </div>
      </section>
      <JobsBoard jobs={jobs} />
    </>
  );
}
