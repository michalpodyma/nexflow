import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

import { jobs, mapEmploymentType } from "@/data/jobs";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return jobs.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = jobs.find((j) => j.slug === slug);
  if (!job) return {};

  return {
    title: `${job.pl.title} — praca ${job.pl.location} | Nexflow`,
    description: job.pl.summary,
    alternates: {
      canonical: `https://nexflow.work/oferty/${job.slug}`,
    },
    openGraph: {
      title: `${job.pl.title} | Nexflow`,
      description: job.pl.summary,
      url: `https://nexflow.work/oferty/${job.slug}`,
      type: "website",
    },
  };
}

function buildJobLocation(countries: string[]) {
  return countries.map((country) => {
    if (country === "PL") {
      return {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Słubice",
          addressRegion: "Lubuskie",
          addressCountry: "PL",
        },
      };
    }
    return {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: country,
      },
    };
  });
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const job = jobs.find((j) => j.slug === slug);
  if (!job) notFound();

  const data = job.pl;

  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: data.title,
    description: `${data.summary} Wymagania: ${data.requirements.join(". ")}`,
    identifier: {
      "@type": "PropertyValue",
      name: "Nexflow",
      value: job.id,
    },
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: mapEmploymentType(job.employmentType),
    hiringOrganization: {
      "@type": "Organization",
      name: "Nexflow",
      sameAs: "https://nexflow.work",
      logo: "https://nexflow.work/nexflow-logo-email.svg",
    },
    jobLocation: buildJobLocation(job.countries),
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

  return (
    <>
      <Script
        id={`job-schema-${job.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
      />

      <main className="min-h-screen bg-[hsl(var(--cloud-white))]">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground pb-12 pt-10">
          <div className="max-w-3xl mx-auto px-4">
            <Link
              href="/oferty"
              className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-6 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Wszystkie oferty
            </Link>

            <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-primary-foreground/90 border border-white/20 mb-3">
              {data.tag}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{data.title}</h1>
            <p className="text-primary-foreground/75 text-base">{data.location}</p>

            <div className="flex flex-wrap gap-5 mt-6 text-sm text-primary-foreground/80">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {data.shiftType}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-primary-foreground">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                {data.payRange}
              </span>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
          {/* Description */}
          <section className="bg-white rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-primary mb-3">Opis stanowiska</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
          </section>

          {/* Requirements */}
          <section className="bg-white rounded-xl border border-border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-primary mb-4">Wymagania</h2>
            <ul className="space-y-3">
              {data.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </section>

          {/* Apply CTA */}
          <section className="bg-primary text-primary-foreground rounded-2xl p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Zainteresowany? Aplikuj teraz.</h2>
            <p className="text-primary-foreground/75 text-sm mb-6">
              Formularz zajmuje mniej niż 3 minuty. Oddzwonimy w ciągu 24h.
            </p>
            <Link href={`/kontakt?job=${job.slug}`}>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-base px-8"
              >
                Wyślij zgłoszenie →
              </Button>
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
