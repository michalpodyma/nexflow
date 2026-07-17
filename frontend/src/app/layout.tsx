import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getLocale } from "next-intl/server";

import "./globals.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID?.trim();

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nexflow.work"),
  title: "Nexflow — Workforce in motion.",
  description:
    "Nexflow dostarcza sprawdzonych pracowników do firm logistycznych i magazynowych w Polsce i Niemczech — w 5 dni roboczych.",
  alternates: {
    canonical: "/",
    languages: {
      "x-default": "https://nexflow.work",
      pl: "https://nexflow.work/pl",
      en: "https://nexflow.work/en",
      de: "https://nexflow.work/de",
      nl: "https://nexflow.work/nl",
      ru: "https://nexflow.work/ru",
      uk: "https://nexflow.work/uk",
    },
  },
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Nexflow Sp. z o.o.",
  "alternateName": "Eurojob-West",
  "url": "https://nexflow.work",
  "telephone": "+48224878828",
  "email": "info@nexflow.work",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ul. Wojska Polskiego 170",
    "addressLocality": "Słubice",
    "postalCode": "69-100",
    "addressCountry": "PL",
    "description": "Siedziba główna / Registered seat"
  },
  "location": [
    {
      "@type": "Place",
      "name": "Nexflow Słubice (Siedziba główna / HQ)",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "ul. Wojska Polskiego 170",
        "addressLocality": "Słubice",
        "postalCode": "69-100",
        "addressCountry": "PL"
      }
    },
    {
      "@type": "Place",
      "name": "Nexflow Wrocław",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "ul. Kobierzycka 3/10",
        "addressLocality": "Wrocław",
        "postalCode": "52-315",
        "addressCountry": "PL"
      }
    }
  ]
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale().catch(() => 'pl');
  return (
    <html lang={locale}>
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {children}
        <Analytics />
        <SpeedInsights />
        {GTM_ID && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        )}
      </body>
    </html>
  );
}
