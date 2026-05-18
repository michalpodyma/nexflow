import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FlowMark from "@/components/FlowMark";
import { FadeIn } from "@/components/FadeIn";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ShieldCheck, FileCheck, Building2 } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });
  return {
    title: "Nexflow — Workforce in motion.",
    description: t("hero.description"),
    alternates: {
      canonical: `https://nexflow.work/${locale}`,
      languages: {
        "x-default": "https://nexflow.work/pl",
        pl: "https://nexflow.work/pl",
        en: "https://nexflow.work/en",
        de: "https://nexflow.work/de",
        nl: "https://nexflow.work/nl",
      },
    },
  };
}

export default async function LocalePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });

  const services = [
    { id: "tymczasowi", title: t("services.tymczasowi_title"), description: t("services.tymczasowi_desc") },
    { id: "rekrutacja", title: t("services.rekrutacja_title"), description: t("services.rekrutacja_desc") },
    { id: "headhunting", title: t("services.headhunting_title"), description: t("services.headhunting_desc") },
    { id: "doradztwo", title: t("services.doradztwo_title"), description: t("services.doradztwo_desc") },
  ];

  const serviceIcons = [
    <svg key="s1" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>,
    <svg key="s2" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>,
    <svg key="s3" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>,
    <svg key="s4" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>,
  ];

  const stats = [
    { value: t("stats.founded_value"), label: t("stats.founded_label"), sublabel: t("stats.founded_sub") },
    { value: t("stats.workers_value"), label: t("stats.workers_label"), sublabel: t("stats.workers_sub") },
    { value: t("stats.nationalities_value"), label: t("stats.nationalities_label"), sublabel: t("stats.nationalities_sub") },
    { value: t("stats.kraz_value"), label: t("stats.kraz_label"), sublabel: t("stats.kraz_sub") },
  ];

  const statIcons = [
    <svg key="st1" className="w-6 h-6 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>,
    <svg key="st2" className="w-6 h-6 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>,
    <svg key="st3" className="w-6 h-6 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>,
    <svg key="st4" className="w-6 h-6 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>,
  ];

  const whyPoints = [
    { title: t("why.speed_title"), description: t("why.speed_desc") },
    { title: t("why.compliance_title"), description: t("why.compliance_desc") },
    { title: t("why.scale_title"), description: t("why.scale_desc") },
    { title: t("why.partnership_title"), description: t("why.partnership_desc") },
  ];

  const whyIcons = [
    <svg key="w1" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>,
    <svg key="w2" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>,
    <svg key="w3" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>,
    <svg key="w4" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>,
  ];

  const steps = [
    { label: t("howItWorks.day1_label"), title: t("howItWorks.day1_title"), desc: t("howItWorks.day1_desc") },
    { label: t("howItWorks.day23_label"), title: t("howItWorks.day23_title"), desc: t("howItWorks.day23_desc") },
    { label: t("howItWorks.day4_label"), title: t("howItWorks.day4_title"), desc: t("howItWorks.day4_desc") },
    { label: t("howItWorks.day5_label"), title: t("howItWorks.day5_title"), desc: t("howItWorks.day5_desc") },
    { label: t("howItWorks.ongoing_label"), title: t("howItWorks.ongoing_title"), desc: t("howItWorks.ongoing_desc") },
  ];

  const testimonials = [
    { quote: t("testimonials.t1_quote"), name: t("testimonials.t1_name"), role: t("testimonials.t1_role"), location: t("testimonials.t1_location"), initials: "AK" },
    { quote: t("testimonials.t2_quote"), name: t("testimonials.t2_name"), role: t("testimonials.t2_role"), location: t("testimonials.t2_location"), initials: "KO" },
    { quote: t("testimonials.t3_quote"), name: t("testimonials.t3_name"), role: t("testimonials.t3_role"), location: t("testimonials.t3_location"), initials: "OV" },
  ];

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="text-white min-h-[85vh] flex items-center relative overflow-hidden">
          <Image
            src="/images/hero-home.jpg"
            alt="Nexflow warehouse workers"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-nexflow-navy/65" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
            <div className="mb-8">
              <FlowMark variant="symbol" colorScheme="reversed" height={56} />
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight max-w-3xl">
              {t("hero.line1")}{" "}
              <span className="text-nexflow-cyan">{t("hero.line2")}</span>{" "}
              {t("hero.accent")}
            </h1>
            <p className="mt-6 text-xl md:text-2xl text-white/80 leading-relaxed max-w-2xl">
              {t("hero.description")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href={`/${locale}/kontakt`} className="btn-primary text-center text-base">
                {t("hero.ctaBook")}
              </Link>
              <Link href={`/${locale}/aplikuj`} className="btn-outline-white text-center text-base">
                {t("hero.ctaApply")}
              </Link>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, i) => (
                <FadeIn key={stat.label} delay={i * 100}>
                  <div className="flex justify-center mb-2">{statIcons[i]}</div>
                  <p className="text-4xl md:text-5xl font-bold text-nexflow-navy">
                    <AnimatedCounter value={stat.value} />
                  </p>
                  <p className="mt-2 text-sm font-medium text-nexflow-navy/80">{stat.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{stat.sublabel}</p>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <div className="bg-gray-50 border-y border-gray-200 py-4">
          <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-nexflow-cyan flex-shrink-0" strokeWidth={1.5} />
              <span>{t("trust.kraz")}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-nexflow-cyan flex-shrink-0" strokeWidth={1.5} />
              <span>{t("trust.compliance")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-nexflow-cyan flex-shrink-0" strokeWidth={1.5} />
              <span>{t("trust.krs")}</span>
            </div>
          </div>
        </div>

        {/* Services */}
        <section className="py-16 sm:py-24 bg-cloud-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="section-heading">{t("services.heading")}</h2>
                <p className="section-subheading mx-auto">{t("services.subheading")}</p>
              </div>
            </FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, i) => (
                <FadeIn key={service.id} delay={i * 80}>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 hover:border-nexflow-cyan/30 transition-all duration-300 group h-full">
                    <div className="w-14 h-14 rounded-xl bg-nexflow-navy flex items-center justify-center text-nexflow-cyan mb-5 group-hover:bg-nexflow-cyan group-hover:text-nexflow-navy transition-all duration-300">
                      {serviceIcons[i]}
                    </div>
                    <h3 className="text-lg font-semibold text-nexflow-navy mb-3">{service.title}</h3>
                    <p className="text-slate text-sm leading-relaxed">{service.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <FadeIn delay={200}>
              <div className="text-center mt-10">
                <Link href={`/${locale}/uslugi`} className="btn-outline text-sm">
                  {t("services.learnMore")}
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Why Nexflow */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <FadeIn direction="left">
                <div>
                  <h2 className="section-heading">{t("why.heading")}</h2>
                  <p className="section-subheading">{t("why.subheading")}</p>
                  <div className="mt-10">
                    <Link href={`/${locale}/kontakt`} className="btn-primary">
                      {t("why.cta")}
                    </Link>
                  </div>
                </div>
              </FadeIn>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {whyPoints.map((point, i) => (
                  <FadeIn key={point.title} direction="right" delay={i * 100}>
                    <div className="bg-cloud-white rounded-xl p-5 border border-gray-100 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 h-full">
                      <div className="w-10 h-10 rounded-lg bg-nexflow-navy flex items-center justify-center text-nexflow-cyan mb-4">
                        {whyIcons[i]}
                      </div>
                      <h3 className="font-semibold text-nexflow-navy mb-2">{point.title}</h3>
                      <p className="text-slate text-sm leading-relaxed">{point.description}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-nexflow-navy text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold">
                  {t("howItWorks.heading")}{" "}
                  <span className="text-nexflow-cyan">{t("howItWorks.heading_accent")}</span>
                </h2>
              </div>
            </FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
              {steps.map((step, i) => (
                <FadeIn key={i} delay={i * 100}>
                  <div className="relative h-full">
                    <div className="bg-white/10 rounded-xl p-5 h-full border border-white/10 hover:border-nexflow-cyan/50 hover:bg-white/15 transition-all duration-300">
                      <p className="text-nexflow-cyan text-xs font-semibold uppercase tracking-wider mb-2">{step.label}</p>
                      <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                    {i < 4 && (
                      <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                        <svg className="w-6 h-6 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <FadeIn>
              <h2 className="text-2xl font-bold text-nexflow-navy text-center mb-10">
                {t("testimonials.heading")}
              </h2>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((item, i) => (
                <FadeIn key={item.name} delay={i * 100}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
                    <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">&ldquo;{item.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-nexflow-navy flex items-center justify-center flex-shrink-0">
                        <span className="text-nexflow-cyan text-xs font-bold">{item.initials}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.role} · {item.location}</div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Client logo bar */}
        <section className="py-10 px-6 border-t border-gray-100 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
              {t("trustedBy")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-70">
              {[
                { src: "/logos/shein.png", alt: "SHEIN", w: 207, h: 48 },
                { src: "/logos/wendre.png", alt: "Wendre", w: 180, h: 48 },
                { src: "/logos/hofman-slubice.png", alt: "Hofman Słubice", w: 137, h: 48 },
                { src: "/logos/foliarex.png", alt: "Foliarex", w: 160, h: 48 },
                { src: "/logos/fraba.png", alt: "FRABA", w: 155, h: 48 },
              ].map((logo) => (
                <div key={logo.alt} className="w-36 h-14 flex items-center justify-center">
                  <Image src={logo.src} alt={logo.alt} width={logo.w} height={logo.h} className="max-h-full max-w-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-24 bg-cloud-white">
          <FadeIn>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="section-heading">{t("cta.heading")}</h2>
              <p className="section-subheading mx-auto mt-4">{t("cta.description")}</p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={`/${locale}/kontakt`} className="btn-primary text-base">
                  {t("cta.book")}
                </Link>
                <Link href={`/${locale}/uslugi`} className="btn-outline text-base">
                  {t("cta.services")}
                </Link>
              </div>
              <p className="mt-6 text-sm text-slate">
                {t("cta.phone_label")}{" "}
                <a href="tel:+48224878828" className="text-nexflow-navy font-semibold hover:text-nexflow-cyan-dark transition-colors">
                  +48 224 878 828
                </a>
              </p>
            </div>
          </FadeIn>
        </section>
      </main>
      <Footer />
    </>
  );
}
