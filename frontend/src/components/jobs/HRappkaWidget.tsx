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

const TITLE_MAP: Record<string, Record<string, string>> = {
  de: {
    "Magazynier": "Lagerarbeiter",
    "Operator wózka widłowego": "Gabelstaplerfahrer",
    "Pracownik magazynowy": "Lagermitarbeiter",
    "Pracownik produkcji": "Produktionsmitarbeiter",
    "Pracownik szklarni": "Gewächshausarbeiter",
  },
  en: {
    "Magazynier": "Warehouse Worker",
    "Operator wózka widłowego": "Forklift Operator",
    "Pracownik magazynowy": "Warehouse Associate",
    "Pracownik produkcji": "Production Worker",
    "Pracownik szklarni": "Greenhouse Worker",
  },
  nl: {
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
      {titleMap && (
        <Script
          id={`hrappka-title-patch-${lang}`}
          strategy="afterInteractive"
        >{`
          (function() {
            var map = ${JSON.stringify(titleMap)};
            if (!Object.keys(map).length) return;

            function replaceInNode(node) {
              if (node.nodeType === 3) {
                var trimmed = node.textContent.trim();
                if (map[trimmed]) {
                  node.textContent = node.textContent.replace(trimmed, map[trimmed]);
                }
              } else {
                for (var i = 0; i < node.childNodes.length; i++) {
                  replaceInNode(node.childNodes[i]);
                }
              }
            }

            function init() {
              var container = document.querySelector('.hrappka-widget-container');
              if (!container) return;

              replaceInNode(container);

              var observer = new MutationObserver(function(mutations) {
                for (var i = 0; i < mutations.length; i++) {
                  var added = mutations[i].addedNodes;
                  for (var j = 0; j < added.length; j++) {
                    replaceInNode(added[j]);
                  }
                }
              });
              observer.observe(container, { childList: true, subtree: true });
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', init);
            } else {
              init();
            }
          })();
        `}</Script>
      )}
      <div
        className="hrappka-widget-container"
        data-k={WIDGET_KEY}
        data-host={WIDGET_HOST}
        style={{ minHeight: "100px" }}
      />
    </>
  );
}
