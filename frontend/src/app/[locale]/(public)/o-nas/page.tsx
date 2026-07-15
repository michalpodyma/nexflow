import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { AnimatedCounter } from "@/components/AnimatedCounter";

type Props = { params: Promise<{ locale: string }> };

function InitialsAvatar({ initials }: { initials: string }) {
  return (
    <div className="w-16 h-16 rounded-full bg-nexflow-navy border-4 border-nexflow-cyan flex items-center justify-center mx-auto mb-4">
      <span className="text-nexflow-cyan font-bold text-xl tracking-wider">{initials}</span>
    </div>
  );
}

const VALUE_ICONS = [
  <svg key="speed" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
  <svg key="compliance" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>,
  <svg key="diversity" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
  <svg key="partnership" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>,
];

const MILESTONE_YEARS = ["2013", "2015", "2018", "2022", "2026"] as const;

const STATS = [
  { value: "2013", labelKey: "stats_founded_label", subKey: "stats_founded_sub" },
  { value: "240+", labelKey: "stats_workers_label", subKey: "stats_workers_sub" },
  { value: "21+", labelKey: "stats_nat_label", subKey: "stats_nat_sub" },
  { value: "KRAZ", labelKey: "stats_kraz_label", subKey: "stats_kraz_sub" },
] as const;

const TEAM = [
  { name: "Michał Podyma", roleKey: "role_prezes", email: "mp@nexflow.work", initials: "MP" },
  { name: "Anatolii Tychonenko", roleKey: "role_wiceprezes", email: "at@nexflow.work", initials: "AT" },
  { name: "Swietłana Owsiejczuk", roleKey: "role_manager", email: "so@nexflow.work", initials: "SO" },
  { name: "Olha Yablonska", roleKey: "role_kaoManager", email: "oy@nexflow.work", initials: "OY" },
  { name: "Hanna Serheeva", roleKey: "role_recruiter", email: "as@nexflow.work", initials: "HS" },
  { name: "Olena Omelchenko", roleKey: "role_hr", email: "ao@nexflow.work", initials: "OO" },
  { name: "Hanna Rybakova", roleKey: "role_recruiter", email: "ar@nexflow.work", initials: "HR" },
  { name: "Svetlana Shmyhol", roleKey: "role_coordinator", email: "ss@nexflow.work", initials: "SS" },
] as const;

const VALUE_KEYS = ["v1", "v2", "v3", "v4"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: `https://nexflow.work/${locale}/o-nas`,
      languages: {
        "x-default": "https://nexflow.work/pl/o-nas",
        pl: "https://nexflow.work/pl/o-nas",
        en: "https://nexflow.work/en/o-nas",
        de: "https://nexflow.work/de/o-nas",
        nl: "https://nexflow.work/nl/o-nas",
        ru: "https://nexflow.work/ru/o-nas",
        uk: "https://nexflow.work/uk/o-nas",
      },
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });

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

      {/* Story */}
      <section className="py-20 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn direction="left">
              <div>
                <h2 className="section-heading">
                  {t("story_heading")}
                </h2>
                <div className="mt-6 space-y-4 text-graphite leading-relaxed">
                  <p>{t("story_p1")}</p>
                  <p>{t("story_p2")}</p>
                  <p>{t("story_p3")}</p>
                </div>
              </div>
            </FadeIn>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              {STATS.map((stat, i) => (
                <FadeIn key={stat.labelKey} direction="right" delay={i * 100}>
                  <div className="bg-nexflow-navy rounded-xl p-6 text-center">
                    <p className="text-3xl font-bold text-nexflow-cyan">
                      <AnimatedCounter value={stat.value} />
                    </p>
                    <p className="text-white text-sm font-semibold mt-2">
                      {t(stat.labelKey)}
                    </p>
                    <p className="text-white/50 text-xs mt-1">{t(stat.subKey)}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="section-heading">{t("history_heading")}</h2>
              <p className="section-subheading mx-auto">
                {t("history_subheading")}
              </p>
            </div>
          </FadeIn>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2 hidden md:block" />

            <div className="space-y-10">
              {MILESTONE_YEARS.map((year, index) => (
                <FadeIn
                  key={year}
                  direction={index % 2 === 0 ? "left" : "right"}
                  delay={100}
                >
                  <div
                    className={`relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 ${
                      index % 2 === 0 ? "md:text-right" : ""
                    }`}
                  >
                    {index % 2 === 0 ? (
                      <>
                        <div className="md:pr-12">
                          <span className="inline-block bg-nexflow-navy text-nexflow-cyan text-sm font-bold px-3 py-1 rounded-full mb-3">
                            {year}
                          </span>
                          <h3 className="text-xl font-semibold text-nexflow-navy">
                            {t(`m${year}_title`)}
                          </h3>
                          <p className="text-slate text-sm leading-relaxed mt-2">
                            {t(`m${year}_desc`)}
                          </p>
                        </div>
                        <div className="hidden md:block" />
                      </>
                    ) : (
                      <>
                        <div className="hidden md:block" />
                        <div className="md:pl-12">
                          <span className="inline-block bg-nexflow-navy text-nexflow-cyan text-sm font-bold px-3 py-1 rounded-full mb-3">
                            {year}
                          </span>
                          <h3 className="text-xl font-semibold text-nexflow-navy">
                            {t(`m${year}_title`)}
                          </h3>
                          <p className="text-slate text-sm leading-relaxed mt-2">
                            {t(`m${year}_desc`)}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="hidden md:block absolute left-1/2 top-3 w-4 h-4 rounded-full bg-nexflow-cyan border-4 border-white shadow-sm -translate-x-1/2" />
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="section-heading">{t("values_heading")}</h2>
              <p className="section-subheading mx-auto">
                {t("values_subheading")}
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUE_KEYS.map((key, i) => (
              <FadeIn key={key} delay={i * 80}>
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex gap-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                  <div className="w-14 h-14 rounded-xl bg-nexflow-navy flex items-center justify-center text-nexflow-cyan shrink-0">
                    {VALUE_ICONS[i]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-nexflow-navy mb-2">
                      {t(`${key}_title`)}
                    </h3>
                    <p className="text-slate text-sm leading-relaxed">
                      {t(`${key}_desc`)}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-nexflow-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">{t("team_heading")}</h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TEAM.map((person, i) => (
              <FadeIn key={person.name} delay={i * 60}>
                <div className="bg-white/10 rounded-xl p-6 border border-white/10 text-center hover:bg-white/15 hover:-translate-y-1 transition-all duration-300 h-full">
                  <InitialsAvatar initials={person.initials} />
                  <h3 className="font-semibold text-white text-base">{person.name}</h3>
                  <p className="text-nexflow-cyan text-xs mt-1">{t(person.roleKey)}</p>
                  <div className="mt-4 space-y-1 text-xs text-white/60">
                    <p>
                      <a href={`mailto:${person.email}`} className="hover:text-nexflow-cyan transition-colors">
                        {person.email}
                      </a>
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-cloud-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="section-heading">{t("cta_heading")}</h2>
            <p className="section-subheading mx-auto">{t("cta_desc")}</p>
            <div className="mt-8">
              <Link href={`/${locale}/kontakt`} className="btn-primary text-base">
                {t("cta_btn")}
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
