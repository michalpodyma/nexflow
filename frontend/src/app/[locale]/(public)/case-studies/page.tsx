import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CaseStudies" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: `https://nexflow.work/${locale}/case-studies`,
      languages: {
        "x-default": "https://nexflow.work/pl/case-studies",
        pl: "https://nexflow.work/pl/case-studies",
        en: "https://nexflow.work/en/case-studies",
        de: "https://nexflow.work/de/case-studies",
        nl: "https://nexflow.work/nl/case-studies",
      },
    },
  };
}

export default async function CaseStudiesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CaseStudies" });

  const caseStudies = [
    {
      tag: t("cs1_tag"),
      title: t("cs1_title"),
      client: t("cs1_client"),
      result: t("cs1_result"),
    },
    {
      tag: t("cs2_tag"),
      title: t("cs2_title"),
      client: t("cs2_client"),
      result: t("cs2_result"),
    },
    {
      tag: t("cs3_tag"),
      title: t("cs3_title"),
      client: t("cs3_client"),
      result: t("cs3_result"),
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            {t("hero_tag")}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            {t("hero_heading")}
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed">
            {t("hero_desc")}
          </p>
        </div>
      </section>

      {/* Case studies list */}
      <section className="py-20 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {caseStudies.map((cs, i) => (
              <FadeIn key={cs.title} direction="up" delay={i * 80}>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col">
                  <span className="inline-block text-xs font-semibold text-nexflow-cyan uppercase tracking-wider mb-3">
                    {cs.tag}
                  </span>
                  <h2 className="text-lg font-bold text-nexflow-navy mb-2 leading-snug">
                    {cs.title}
                  </h2>
                  <p className="text-slate text-xs mb-4">{cs.client}</p>
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-graphite uppercase tracking-wider mb-1">
                      {t("result_label")}
                    </p>
                    <p className="text-sm text-graphite leading-relaxed">{cs.result}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <p className="mt-10 text-center text-slate text-sm">{t("coming_soon")}</p>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-nexflow-navy text-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">{t("cta_heading")}</h2>
            <p className="mt-4 text-white/70 leading-relaxed">{t("cta_desc")}</p>
            <div className="mt-8">
              <Link href={`/${locale}/kontakt`} className="btn-primary">
                {t("cta_book")}
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
