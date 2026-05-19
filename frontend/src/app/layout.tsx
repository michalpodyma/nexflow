import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getLocale } from "next-intl/server";

import "./globals.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID?.trim();

const inter = Inter({ subsets: ["latin", "latin-ext"] });

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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nexflow",
  legalName: "Nexflow Sp. z o.o.",
  url: "https://nexflow.work",
  logo: "https://nexflow.work/logo.png",
  taxID: "PL5383532310",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Słubice",
    addressCountry: "PL",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+48-22-487-88-28",
      contactType: "customer service",
      availableLanguage: ["pl", "en", "de", "nl", "uk", "ru"],
    },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={inter.className}>
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
