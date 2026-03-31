import type { Metadata } from "next";
import Script from "next/script";

import { JobsBoard } from "@/components/jobs/JobsBoard";
import { jobs } from "@/data/jobs";

export const metadata: Metadata = {
  title: "Oferty pracy w magazynach i logistyce | Nexflow",
  description:
    "Aktualne oferty pracy tymczasowej w magazynach i logistyce. Słubice, Frankfurt (Oder) i okolice. Praca od zaraz — aplikuj online.",
  alternates: {
    canonical: "https://nexflow.work/oferty",
    languages: {
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

const jobPostingSchemas = jobs.map((job) => ({
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: job.pl.title,
  description: job.pl.summary,
  identifier: {
    "@type": "PropertyValue",
    name: "Nexflow",
    value: job.id,
  },
  datePosted: job.datePosted,
  validThrough: job.validThrough,
  employmentType: job.employmentType,
  hiringOrganization: {
    "@type": "Organization",
    name: "Eurojob-West Sp. z o.o.",
    sameAs: "https://nexflow.work",
    logo: "https://nexflow.work/logo.png",
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Słubice",
      addressRegion: "Lubuskie",
      addressCountry: "PL",
    },
  },
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "PLN",
    value: {
      "@type": "QuantitativeValue",
      unitText: "HOUR",
    },
  },
  directApply: true,
  jobLocationType: "TELECOMMUTE",
  applicantLocationRequirements: {
    "@type": "Country",
    name: "Poland",
  },
}));

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
      <JobsBoard jobs={jobs} />
    </>
  );
}
