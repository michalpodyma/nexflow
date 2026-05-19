import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Clock, FileCheck, User, Globe, Warehouse, Truck, Factory, Leaf, ShoppingCart, ArrowLeftRight } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ForClients" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: `https://nexflow.work/${locale}/dla-klientow`,
      languages: {
        "x-default": "https://nexflow.work/pl/dla-klientow",
        pl: "https://nexflow.work/pl/dla-klientow",
        en: "https://nexflow.work/en/dla-klientow",
        de: "https://nexflow.work/de/dla-klientow",
        nl: "https://nexflow.work/nl/dla-klientow",
      },
    },
  };
}

const benefitIcons = [Clock, FileCheck, User, Globe];

const sectorIcons = [
  Warehouse,
  Truck,
  Factory,
  Leaf,
  ShoppingCart,
  ArrowLeftRight,
];

export default async function ForClientsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ForClients" });

  const benefits = [
    { icon: Clock, title: t("b1_title"), desc: t("b1_desc") },
    { icon: FileCheck, title: t("b2_title"), desc: t("b2_desc") },
    { icon: User, title: t("b3_title"), desc: t("b3_desc") },
    { icon: Globe, title: t("b4_title"), desc: t("b4_desc") },
  ];

  const steps = [
    { label: t("h1_label"), title: t("h1_title"), desc: t("h1_desc") },
    { label: t("h2_label"), title: t("h2_title"), desc: t("h2_desc") },
    { label: t("h3_label"), title: t("h3_title"), desc: t("h3_desc") },
    { label: t("h4_label"), title: t("h4_title"), desc: t("h4_desc") },
  ];

  const sectors = [
    { icon: Warehouse, label: t("sector_warehouse") },
    { icon: Truck, label: t("sector_transport") },
    { icon: Factory, label: t("sector_production") },
    { icon: Leaf, label: t("sector_greenhouse") },
    { icon: ShoppingCart, label: t("sector_ecommerce") },
    { icon: ArrowLeftRight, label: t("sector_crossborder") },
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
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link href={`/${locale}/kontakt`} className="btn-primary">
              {t("cta_book")}
            </Link>
            <a href="tel:+48224878828" className="btn-outline-white">
              {t("cta_call")}
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="section-heading">{t("benefits_heading")}</h2>
              <p className="section-subheading mx-auto">{t("benefits_subheading")}</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <FadeIn key={benefit.title} direction="up" delay={i * 80}>
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                    <div className="w-12 h-12 bg-nexflow-cyan/10 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-nexflow-cyan" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-bold text-nexflow-navy mb-2">{benefit.title}</h3>
                    <p className="text-slate text-sm leading-relaxed">{benefit.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-nexflow-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold">{t("how_heading")}</h2>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <FadeIn key={step.title} direction="up" delay={i * 80}>
                <div className="relative bg-white/10 rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors duration-300 h-full">
                  <span className="text-5xl font-bold text-nexflow-cyan/20 select-none leading-none">
                    0{i + 1}
                  </span>
                  <p className="text-nexflow-cyan text-xs font-semibold uppercase tracking-wider mt-2 mb-1">
                    {step.label}
                  </p>
                  <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section className="py-20 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="section-heading">{t("sectors_heading")}</h2>
              <p className="section-subheading mx-auto">{t("sectors_subheading")}</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sectors.map((sector, i) => {
              const Icon = sector.icon;
              return (
                <FadeIn key={sector.label} direction="up" delay={i * 60}>
                  <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div className="w-10 h-10 bg-nexflow-navy/5 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-nexflow-cyan" strokeWidth={1.5} />
                    </div>
                    <span className="text-sm font-medium text-nexflow-navy">{sector.label}</span>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-nexflow-navy text-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">{t("cta_heading")}</h2>
            <p className="mt-4 text-white/70 leading-relaxed">{t("cta_desc")}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/${locale}/kontakt`} className="btn-primary">{t("cta_book")}</Link>
              <a href="tel:+48224878828" className="btn-outline-white">{t("cta_call")}</a>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
