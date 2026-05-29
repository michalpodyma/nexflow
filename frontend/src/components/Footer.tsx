import { getTranslations } from "next-intl/server";
import Link from "next/link";
import FlowMark from "./FlowMark";
import { KrazBadge } from "./ui/badges";

type Props = { locale?: string };

export default async function Footer({ locale }: Props) {
  if (!locale) {
    return <FooterFallback />;
  }

  const t = await getTranslations({ locale, namespace: "Footer" });
  const year = new Date().getFullYear();

  const serviceLinks = [
    { href: `/${locale}/uslugi#tymczasowi`, label: t("links.temp_workers") },
    { href: `/${locale}/uslugi#rekrutacja`, label: t("links.permanent") },
    { href: `/${locale}/uslugi#headhunting`, label: t("links.headhunting") },
    { href: `/${locale}/uslugi#doradztwo`, label: t("links.advisory") },
  ];

  const companyLinks = [
    { href: `/${locale}/oferty`, label: t("links.job_offers") },
    { href: `/${locale}/o-nas`, label: t("links.about") },
    { href: `/${locale}/kontakt`, label: t("links.contact") },
    { href: `/${locale}/kontakt#pracodawcy`, label: t("links.for_employers") },
    { href: `/${locale}/kontakt#pracownicy`, label: t("links.for_workers") },
  ];

  return (
    <footer className="bg-surface-1 border-t border-hairline text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-2">
            <FlowMark variant="full" colorScheme="reversed" height={32} />
            <p className="mt-4 text-body-sm text-ink-muted leading-relaxed max-w-xs">
              {t("description")}
            </p>
            <p className="mt-3 text-body-sm text-accent font-semibold italic">
              {t("tagline")}
            </p>
            <div className="mt-5 space-y-1 text-body-sm text-ink-subtle">
              <p>
                <a href="tel:+48224878828" className="hover:text-accent transition-colors">
                  +48 224 878 828
                </a>{" "}
                ({t("phone_label")})
              </p>
              <p>
                <a href="mailto:info@nexflow.work" className="hover:text-accent transition-colors">
                  info@nexflow.work
                </a>
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-eyebrow font-semibold uppercase tracking-widest text-ink-tertiary mb-4">
              {t("services_heading")}
            </h3>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-body-sm text-ink-subtle hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company — right-aligned address block */}
          <div className="md:text-right">
            <h3 className="text-eyebrow font-semibold uppercase tracking-widest text-ink-tertiary mb-4">
              {t("company_heading")}
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-body-sm text-ink-subtle hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Badges + legal row */}
        <div className="mt-10 pt-6 border-t border-hairline">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <KrazBadge locale={locale} />
              <span className="inline-flex items-center gap-1.5 bg-surface-1 border border-hairline rounded-pill px-3 py-1 text-eyebrow font-semibold tracking-widest text-ink-muted uppercase">
                GDPR
              </span>
            </div>
            <div className="text-xs text-ink-tertiary space-y-0.5 md:text-right">
              <p>{t("legal")}</p>
              <p>{t("legal2")}</p>
              <p className="mt-1">{t("copyright", { year })}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterFallback() {
  return (
    <footer className="bg-surface-1 border-t border-hairline text-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="pt-6 border-t border-hairline">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-xs text-ink-tertiary space-y-0.5">
              <p>Nexflow Sp. z o.o. | NIP: PL5981632310 | KRS: 0000496516 | REGON: 081188992</p>
              <p>Działamy na podstawie certyfikatu KRAZ nr 10916. Słubice, Polska (granica DE-PL).</p>
            </div>
            <p className="text-xs text-ink-tertiary">
              © {new Date().getFullYear()} Nexflow Sp. z o.o. Wszelkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
