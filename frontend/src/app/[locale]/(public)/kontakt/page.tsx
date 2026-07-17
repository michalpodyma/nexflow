import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

      {/* Our offices */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-1">
            {t("offices_heading")}
          </p>
          <p className="text-slate text-sm mb-8">{t("offices_subheading")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            <OfficeCard
              badge={t("hq_badge")}
              name="Nexflow Sp. z o.o."
              street="ul. Wojska Polskiego 170"
              city="69-100 Słubice, Polska"
              context={t("hq_context")}
              hours={t("hours")}
              mapsHref="https://maps.google.com/?q=ul.+Wojska+Polskiego+170,+69-100+S%C5%82ubice,+Polska"
              mapsLabel={t("maps_link")}
              isHQ
            />
            <OfficeCard
              badge={t("branch_badge")}
              name="Nexflow Sp. z o.o."
              street="ul. Kobierzycka 3/10"
              city="52-315 Wrocław, Polska"
              hours={t("hours")}
              mapsHref="https://maps.google.com/?q=ul.+Kobierzycka+3%2F10,+52-315+Wroc%C5%82aw,+Polska"
              mapsLabel={t("maps_link")}
            />
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

function OfficeCard({
  badge, name, street, city, context, hours, mapsHref, mapsLabel, isHQ,
}: {
  badge: string; name: string; street: string; city: string;
  context?: string; hours: string; mapsHref: string; mapsLabel: string; isHQ?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm bg-white ${isHQ ? "border-nexflow-cyan" : "border-gray-100"}`}>
      <div className="flex items-start justify-between mb-4">
        <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
          isHQ ? "bg-nexflow-cyan/10 text-nexflow-cyan-dark" : "bg-gray-100 text-slate"
        }`}>
          {badge}
        </span>
      </div>
      <p className="font-semibold text-nexflow-navy text-base mb-1">{name}</p>
      <p className="text-graphite text-sm">{street}</p>
      <p className="text-graphite text-sm">{city}</p>
      {context && <p className="text-slate text-xs mt-1 italic">{context}</p>}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-slate">{hours}</p>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-nexflow-cyan hover:text-nexflow-cyan-dark font-medium transition-colors"
        >
          {mapsLabel}
        </a>
      </div>
    </div>
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
