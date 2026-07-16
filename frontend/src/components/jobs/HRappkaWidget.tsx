"use client";

import { useEffect } from "react";
import Script from "next/script";

const LOCALE_TO_HRAPPKA_LANG: Record<string, string> = {
  pl: "pl",
  en: "en",
  de: "de",
  nl: "nl",
  ru: "ru",
  uk: "uk",
};

const TITLE_MAP: Record<string, Record<string, string>> = {
  de: {
    // compound/suffix variants — must appear before bare keys (longest-key sort handles runtime order)
    "Operator wózka widłowego (Holandia)": "Gabelstaplerfahrer (Niederlande)",
    "Pracownik magazynowy / produkcji": "Lager-/Produktionsmitarbeiter",
    "Pracownik magazynowy (Holandia)": "Lagermitarbeiter (Niederlande)",
    "Pracownik szklarni (kwiaty / warzywa)": "Gewächshausarbeiter (Blumen / Gemüse)",
    // base keys
    "Magazynier": "Lagerarbeiter",
    "Operator wózka widłowego": "Gabelstaplerfahrer",
    "Pracownik magazynowy": "Lagermitarbeiter",
    "Pracownik produkcji": "Produktionsmitarbeiter",
    "Pracownik szklarni": "Gewächshausarbeiter",
  },
  en: {
    "Operator wózka widłowego (Holandia)": "Forklift Operator (Netherlands)",
    "Pracownik magazynowy / produkcji": "Warehouse / Production Worker",
    "Pracownik magazynowy (Holandia)": "Warehouse Associate (Netherlands)",
    "Pracownik szklarni (kwiaty / warzywa)": "Greenhouse Worker (Flowers / Vegetables)",
    "Magazynier": "Warehouse Worker",
    "Operator wózka widłowego": "Forklift Operator",
    "Pracownik magazynowy": "Warehouse Associate",
    "Pracownik produkcji": "Production Worker",
    "Pracownik szklarni": "Greenhouse Worker",
  },
  nl: {
    "Operator wózka widłowego (Holandia)": "Heftruckchauffeur (Nederland)",
    "Pracownik magazynowy / produkcji": "Magazijn-/Productiemedewerker",
    "Pracownik magazynowy (Holandia)": "Magazijnwerker (Nederland)",
    "Pracownik szklarni (kwiaty / warzywa)": "Kassenwerker (Bloemen / Groenten)",
    "Magazynier": "Magazijnmedewerker",
    "Operator wózka widłowego": "Heftruckchauffeur",
    "Pracownik magazynowy": "Magazijnwerker",
    "Pracownik produkcji": "Productiemedewerker",
    "Pracownik szklarni": "Kassenwerker",
  },
};

type Props = {
  locale: string;
};

const WIDGET_SRC = "https://app.hrappka.pl/first/frontend/widget/dist/widget.js";
const WIDGET_KEY = "011002087bfee55a92bbc86db07773f2";
const WIDGET_HOST = "https://app.hrappka.pl/";

export function HRappkaWidget({ locale }: Props) {
  const lang = LOCALE_TO_HRAPPKA_LANG[locale] ?? "pl";
  const titleMap = TITLE_MAP[lang] ?? null;

  useEffect(() => {
    if (!titleMap) return;
    const sortedKeys = Object.keys(titleMap).sort((a, b) => b.length - a.length);

    function replaceInNode(node: ChildNode) {
      if (node.nodeType === 3) {
        const text = node.textContent ?? "";
        for (const pl of sortedKeys) {
          if (text.includes(pl)) {
            node.textContent = text.replace(pl, titleMap![pl]);
            break;
          }
        }
      } else {
        node.childNodes.forEach(replaceInNode);
      }
    }

    const container = document.querySelector(".hrappka-widget-container");
    if (!container) return;

    replaceInNode(container);
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(replaceInNode);
      }
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [titleMap]);

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
