import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Script from "next/script";
import ContactForm from "@/components/ContactForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: `https://nexflow.work/${locale}/kontakt`,
      languages: {
        "x-default": "https://nexflow.work/pl/kontakt",
        pl: "https://nexflow.work/pl/kontakt",
        en: "https://nexflow.work/en/kontakt",
        de: "https://nexflow.work/de/kontakt",
        nl: "https://nexflow.work/nl/kontakt",
        ru: "https://nexflow.work/ru/kontakt",
        uk: "https://nexflow.work/uk/kontakt",
      },
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nexflow Sp. z o.o.",
    "url": "https://nexflow.work",
    "telephone": "+48224878828",
    "email": "info@nexflow.work",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ul. Wojska Polskiego 170",
      "postalCode": "69-100",
      "addressLocality": "Słubice",
      "addressCountry": "PL",
    },
    "location": [
      {
        "@type": "Place",
        "name": "Nexflow — Siedziba główna (Słubice)",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "ul. Wojska Polskiego 170",
          "postalCode": "69-100",
          "addressLocality": "Słubice",
          "addressCountry": "PL",
        },
      },
      {
        "@type": "Place",
        "name": "Nexflow — Biuro Wrocław",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "ul. Kobierzycka 3/10",
          "postalCode": "52-315",
          "addressLocality": "Wrocław",
          "addressCountry": "PL",
        },
      },
    ],
  };

  return (
    <>
      <Script
        id="org-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

      {/* Office cards */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-6">
            {t("offices_heading")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* HQ card */}
            <div className="bg-nexflow-navy text-white rounded-2xl p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-wider bg-nexflow-cyan text-nexflow-navy px-2 py-1 rounded mb-3">
                    {t("office_hq_label")}
                  </span>
                  <h2 className="text-xl font-bold">Słubice</h2>
                  <p className="text-white/60 text-sm">{t("office_hq_note")}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-lg">
                  📍
                </div>
              </div>
              <address className="not-italic text-sm text-white/80 leading-relaxed mb-5 flex-1">
                ul. Wojska Polskiego 170<br />
                69-100 Słubice
              </address>
              <a
                href="https://maps.google.com/?q=ul.+Wojska+Polskiego+170,+69-100+S%C5%82ubice"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-nexflow-cyan text-sm font-semibold hover:underline"
              >
                {t("office_hq_maps")}
              </a>
            </div>

            {/* Wrocław card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block text-xs font-bold uppercase tracking-wider bg-nexflow-navy/10 text-nexflow-navy px-2 py-1 rounded mb-3">
                    {t("office_wroclaw_label")}
                  </span>
                  <h2 className="text-xl font-bold text-nexflow-navy">Wrocław</h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-nexflow-navy/10 flex items-center justify-center shrink-0 text-lg">
                  📍
                </div>
              </div>
              <address className="not-italic text-sm text-graphite leading-relaxed mb-5 flex-1">
                ul. Kobierzycka 3/10<br />
                52-315 Wrocław
              </address>
              <a
                href="https://maps.google.com/?q=ul.+Kobierzycka+3%2F10,+52-315+Wroc%C5%82aw"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-nexflow-navy text-sm font-semibold hover:underline hover:text-nexflow-cyan-dark transition-colors"
              >
                {t("office_wroclaw_maps")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact content */}
      <section className="py-16 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact details */}
            <div className="lg:col-span-2">
              {/* For employers */}
              <div id="pracodawcy" className="mb-10">
                <h2 className="text-xl font-bold text-nexflow-navy mb-4">{t("employers_heading")}</h2>
                <p className="text-slate text-sm leading-relaxed mb-6">{t("employers_desc")}</p>

                <div className="space-y-4">
                  <ContactCard name="Michał Podyma" role={t("roles.prezes")} email="mp@nexflow.work" />
                  <ContactCard name="Anatolii Tychonenko" role={t("roles.wiceprezes")} email="at@nexflow.work" />
                  <ContactCard name="Swietłana Owsiejczuk" role={t("roles.manager")} email="so@nexflow.work" />
                </div>

                <div className="mt-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">
                    {t("office_number")}
                  </p>
                  <div className="text-sm text-graphite space-y-1">
                    <p>
                      <a href="tel:+48224878828" className="hover:text-nexflow-cyan-dark transition-colors font-medium">
                        +48 224 878 828
                      </a>{" "}
                      <span className="text-slate">(PL/DE)</span>
                    </p>
                    <p className="text-slate mt-2">
                      <a href="mailto:info@nexflow.work" className="hover:text-nexflow-cyan-dark transition-colors">
                        info@nexflow.work
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* For workers */}
              <div id="pracownicy">
                <h2 className="text-xl font-bold text-nexflow-navy mb-4">{t("workers_heading")}</h2>
                <p className="text-slate text-sm leading-relaxed mb-4">{t("workers_desc")}</p>
                <div className="mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">
                    {t("call_us")}
                  </p>
                  <a href="tel:+48224878828" className="text-nexflow-navy font-semibold hover:text-nexflow-cyan-dark transition-colors text-sm">
                    +48 224 878 828
                  </a>
                  <p className="text-xs text-slate mt-1">{t("hours")}</p>
                </div>
                <div className="p-4 bg-nexflow-navy rounded-xl text-white">
                  <p className="text-sm font-semibold mb-2">{t("languages_label")}</p>
                  <div className="flex flex-wrap gap-2">
                    {["🇵🇱 Polski", "🇩🇪 Deutsch", "🇬🇧 English", "🇺🇦 Українська"].map((lang) => (
                      <span key={lang} className="text-xs bg-white/10 px-2 py-1 rounded-full">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legal info */}
              <div className="mt-10 pt-8 border-t border-gray-200">
                <p className="text-xs text-slate">
                  Nexflow Sp. z o.o.<br />
                  NIP: PL5981632310 | KRS: 0000496516<br />
                  REGON: 081188992<br />
                  {t("legal_kraz")}<br />
                  {t("legal_location")}
                </p>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-nexflow-navy mb-2">{t("form_heading")}</h2>
                <p className="text-slate text-sm mb-6">{t("form_desc")}</p>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactCard({ name, role, email }: { name: string; role: string; email: string }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-nexflow-navy flex items-center justify-center text-nexflow-cyan shrink-0 text-sm font-bold">
        {name.split(" ").map((n) => n[0]).join("")}
      </div>
      <div>
        <p className="font-semibold text-nexflow-navy text-sm">{name}</p>
        <p className="text-slate text-xs mb-2">{role}</p>
        <p className="text-xs">
          <a href={`mailto:${email}`} className="text-nexflow-navy hover:underline">{email}</a>
        </p>
      </div>
    </div>
  );
}
