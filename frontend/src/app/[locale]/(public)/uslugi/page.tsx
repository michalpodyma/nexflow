import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Users, UserCheck, Target, ClipboardList } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: `https://nexflow.work/${locale}/uslugi`,
      languages: {
        "x-default": "https://nexflow.work/pl/uslugi",
        pl: "https://nexflow.work/pl/uslugi",
        en: "https://nexflow.work/en/uslugi",
        de: "https://nexflow.work/de/uslugi",
        nl: "https://nexflow.work/nl/uslugi",
        ru: "https://nexflow.work/ru/uslugi",
        uk: "https://nexflow.work/uk/uslugi",
      },
    },
  };
}

const serviceIcons = [Users, UserCheck, Target, ClipboardList];

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Services" });

  const services = [
    {
      id: "tymczasowi",
      photo: "/images/uslugi-tymczasowi.jpg",
      number: t("s1_number"),
      title: t("s1_title"),
      subtitle: t("s1_subtitle"),
      description: t("s1_desc"),
      details: [t("s1_d1"), t("s1_d2"), t("s1_d3"), t("s1_d4")],
      features: [
        { title: t("s1_f1_title"), desc: t("s1_f1_desc") },
        { title: t("s1_f2_title"), desc: t("s1_f2_desc") },
        { title: t("s1_f3_title"), desc: t("s1_f3_desc") },
        { title: t("s1_f4_title"), desc: t("s1_f4_desc") },
      ],
    },
    {
      id: "rekrutacja",
      photo: "/images/uslugi-rekrutacja.jpg",
      number: t("s2_number"),
      title: t("s2_title"),
      subtitle: t("s2_subtitle"),
      description: t("s2_desc"),
      details: [t("s2_d1"), t("s2_d2"), t("s2_d3"), t("s2_d4")],
      features: [
        { title: t("s2_f1_title"), desc: t("s2_f1_desc") },
        { title: t("s2_f2_title"), desc: t("s2_f2_desc") },
        { title: t("s2_f3_title"), desc: t("s2_f3_desc") },
        { title: t("s2_f4_title"), desc: t("s2_f4_desc") },
      ],
    },
    {
      id: "headhunting",
      photo: "/images/uslugi-headhunting.jpg",
      number: t("s3_number"),
      title: t("s3_title"),
      subtitle: t("s3_subtitle"),
      description: t("s3_desc"),
      details: [t("s3_d1"), t("s3_d2"), t("s3_d3"), t("s3_d4")],
      features: [
        { title: t("s3_f1_title"), desc: t("s3_f1_desc") },
        { title: t("s3_f2_title"), desc: t("s3_f2_desc") },
        { title: t("s3_f3_title"), desc: t("s3_f3_desc") },
        { title: t("s3_f4_title"), desc: t("s3_f4_desc") },
      ],
    },
    {
      id: "doradztwo",
      photo: "/images/uslugi-hr.jpg",
      number: t("s4_number"),
      title: t("s4_title"),
      subtitle: t("s4_subtitle"),
      description: t("s4_desc"),
      details: [t("s4_d1"), t("s4_d2"), t("s4_d3"), t("s4_d4")],
      features: [
        { title: t("s4_f1_title"), desc: t("s4_f1_desc") },
        { title: t("s4_f2_title"), desc: t("s4_f2_desc") },
        { title: t("s4_f3_title"), desc: t("s4_f3_desc") },
        { title: t("s4_f4_title"), desc: t("s4_f4_desc") },
      ],
    },
  ];

  const complianceItems = t("compliance_items").split("|");

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

      {/* Services detail */}
      <section className="py-8 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {services.map((service, index) => {
            const ServiceIcon = serviceIcons[index];
            return (
              <div
                key={service.id}
                id={service.id}
                className={`py-16 ${index < services.length - 1 ? "border-b border-gray-200" : ""}`}
              >
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                  <FadeIn direction={index % 2 === 0 ? "left" : "right"}>
                    <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                      <div className="w-14 h-14 bg-nexflow-cyan/10 rounded-2xl flex items-center justify-center mb-4">
                        <ServiceIcon className="w-7 h-7 text-nexflow-cyan" strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-5xl font-bold text-nexflow-cyan/20 select-none leading-none">
                          {service.number}
                        </span>
                        <div>
                          <p className="text-nexflow-navy text-xs font-semibold uppercase tracking-wider">
                            {service.subtitle}
                          </p>
                          <h2 className="text-2xl md:text-3xl font-bold text-nexflow-navy">{service.title}</h2>
                        </div>
                      </div>
                      <p className="text-graphite leading-relaxed mb-6">{service.description}</p>
                      <h3 className="font-semibold text-nexflow-navy mb-3">{t("typical_profiles")}</h3>
                      <ul className="space-y-2 mb-8">
                        {service.details.map((detail) => (
                          <li key={detail} className="flex items-start gap-2 text-sm text-graphite">
                            <svg className="w-4 h-4 text-nexflow-cyan mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {detail}
                          </li>
                        ))}
                      </ul>
                      <Link href={`/${locale}/kontakt`} className="btn-primary">
                        {t("ask_cta")}
                      </Link>
                    </div>
                  </FadeIn>

                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${index % 2 === 1 ? "lg:order-1" : ""}`}>
                    <div className="sm:col-span-2">
                      <Image
                        src={service.photo}
                        alt={service.title}
                        width={600}
                        height={400}
                        className="rounded-xl object-cover w-full shadow-md"
                      />
                    </div>
                    {service.features.map((feature, fi) => (
                      <FadeIn key={feature.title} direction={index % 2 === 0 ? "right" : "left"} delay={fi * 80}>
                        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 h-full">
                          <div className="w-8 h-8 rounded-lg bg-nexflow-navy/10 flex items-center justify-center mb-3">
                            <svg className="w-4 h-4 text-nexflow-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-nexflow-navy text-sm mb-1">{feature.title}</h4>
                          <p className="text-slate text-xs leading-relaxed">{feature.desc}</p>
                        </div>
                      </FadeIn>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Compliance section */}
      <section className="py-20 bg-nexflow-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn direction="left">
              <div>
                <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
                  {t("compliance_tag")}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold">{t("compliance_heading")}</h2>
                <p className="mt-4 text-white/70 leading-relaxed">{t("compliance_desc")}</p>
              </div>
            </FadeIn>
            <div className="grid grid-cols-2 gap-4">
              {complianceItems.map((item, i) => (
                <FadeIn key={item} direction="right" delay={i * 80}>
                  <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors duration-300">
                    <div className="w-8 h-8 rounded-full bg-nexflow-cyan flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-nexflow-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-cloud-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="section-heading">{t("cta_heading")}</h2>
            <p className="section-subheading mx-auto">{t("cta_desc")}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/${locale}/kontakt`} className="btn-primary">{t("cta_book")}</Link>
              <a href="tel:+48224878828" className="btn-outline">{t("cta_call")}</a>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
