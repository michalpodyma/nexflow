"use client";

import Script from "next/script";

const LOCALE_TO_HRAPPKA_LANG: Record<string, string> = {
  pl: "pl",
  en: "en",
  de: "de",
  nl: "nl",
  ru: "ru",
  uk: "uk",
};

type Props = {
  locale: string;
};

const WIDGET_SRC = "https://app.hrappka.pl/first/frontend/widget/dist/widget.js";
const WIDGET_KEY = "011002087bfee55a92bbc86db07773f2";
const WIDGET_HOST = "https://app.hrappka.pl/";

export function HRappkaWidget({ locale }: Props) {
  const lang = LOCALE_TO_HRAPPKA_LANG[locale] ?? "pl";

  return (
    <>
      <Script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        strategy="beforeInteractive"
      />
      <Script
        key={`hrappka-widget-${lang}`}
        src={WIDGET_SRC}
        strategy="afterInteractive"
        data-l={lang}
        data-k={WIDGET_KEY}
        data-host={WIDGET_HOST}
        data-hide-language-select=""
      />
      <div
        className="hrappka-widget-container"
        data-k={WIDGET_KEY}
        data-host={WIDGET_HOST}
        style={{ minHeight: "100px" }}
      />
    </>
  );
}
