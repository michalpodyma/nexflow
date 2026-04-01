export interface JobListing {
  id: string;
  slug: string;
  pl: {
    title: string;
    location: string;
    shiftType: string;
    payRange: string;
    summary: string;
    requirements: string[];
    tag: string;
  };
  de: {
    title: string;
    location: string;
    shiftType: string;
    payRange: string;
    summary: string;
    requirements: string[];
    tag: string;
  };
  datePosted: string;
  validThrough: string;
  employmentType: string;
}

export const jobs: JobListing[] = [
  {
    id: "wh-picker-slubice",
    slug: "pracownik-magazynowy-slubice",
    pl: {
      title: "Pracownik magazynowy",
      location: "Słubice / Frankfurt (Oder)",
      shiftType: "Zmiana dzienna i nocna",
      payRange: "32–38 PLN/h",
      summary:
        "Kompletowanie zamówień, obsługa skanerów, praca w nowoczesnym magazynie cross-border przy granicy polsko-niemieckiej.",
      requirements: [
        "Gotowość do pracy zmianowej",
        "Podstawowa znajomość języka polskiego lub niemieckiego",
        "Sprawność fizyczna",
        "Brak przeciwwskazań do pracy w środowisku chłodniczym",
      ],
      tag: "Magazyn",
    },
    de: {
      title: "Lagermitarbeiter / Kommissionierer",
      location: "Słubice / Frankfurt (Oder)",
      shiftType: "Früh- und Spätschicht",
      payRange: "32–38 PLN/Std.",
      summary:
        "Kommissionierung von Bestellungen, Scannerarbeit in einem modernen Cross-Border-Lager an der deutsch-polnischen Grenze.",
      requirements: [
        "Bereitschaft zur Schichtarbeit",
        "Grundkenntnisse in Polnisch oder Deutsch",
        "Körperliche Belastbarkeit",
        "Keine Einschränkungen für Kühlumgebung",
      ],
      tag: "Lager",
    },
    datePosted: "2026-03-01",
    validThrough: "2026-06-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "forklift-op",
    slug: "operator-wozka-widlowego",
    pl: {
      title: "Operator wózka widłowego",
      location: "Słubice",
      shiftType: "Zmiana dzienna",
      payRange: "35–42 PLN/h",
      summary:
        "Obsługa wózków widłowych czołowych i paletowych, załadunek i rozładunek towaru, praca w dynamicznym centrum logistycznym.",
      requirements: [
        "Uprawnienia UDT na wózek widłowy (wymagane)",
        "Min. 1 rok doświadczenia na podobnym stanowisku",
        "Znajomość procedur BHP",
        "Komunikatywna znajomość języka polskiego",
      ],
      tag: "Logistyka",
    },
    de: {
      title: "Gabelstaplerfahrer",
      location: "Słubice",
      shiftType: "Frühschicht",
      payRange: "35–42 PLN/Std.",
      summary:
        "Bedienung von Gabelstapler und Ameise, Be- und Entladung, Arbeit in einem dynamischen Logistikzentrum.",
      requirements: [
        "Gültiger Staplerschein (UDT) erforderlich",
        "Mind. 1 Jahr Berufserfahrung",
        "Kenntnisse der Arbeitssicherheitsvorschriften",
        "Grundkenntnisse in Polnisch",
      ],
      tag: "Logistik",
    },
    datePosted: "2026-03-01",
    validThrough: "2026-06-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "production-worker",
    slug: "pracownik-produkcji",
    pl: {
      title: "Pracownik produkcji",
      location: "Słubice / okolice",
      shiftType: "Zmiana dzienna i nocna",
      payRange: "31–37 PLN/h",
      summary:
        "Montaż podzespołów, kontrola jakości, obsługa linii produkcyjnej w zakładzie działającym na rynku europejskim.",
      requirements: [
        "Mile widziane doświadczenie w produkcji",
        "Zdolność do pracy w szybkim tempie",
        "Dbałość o szczegóły i jakość",
        "Gotowość do pracy zmianowej",
      ],
      tag: "Produkcja",
    },
    de: {
      title: "Produktionsmitarbeiter",
      location: "Słubice / Umgebung",
      shiftType: "Früh- und Nachtschicht",
      payRange: "31–37 PLN/Std.",
      summary:
        "Montage von Bauteilen, Qualitätskontrolle und Arbeit an der Produktionslinie in einem europaweit tätigen Betrieb.",
      requirements: [
        "Erfahrung in der Produktion von Vorteil",
        "Fähigkeit in einem schnellen Umfeld zu arbeiten",
        "Sorgfalt und Qualitätsbewusstsein",
        "Bereitschaft zur Schichtarbeit",
      ],
      tag: "Produktion",
    },
    datePosted: "2026-03-15",
    validThrough: "2026-06-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "logistics-driver",
    slug: "kierowca-logistyczny",
    pl: {
      title: "Kierowca logistyczny (kat. B)",
      location: "Słubice / Frankfurt (Oder) / region",
      shiftType: "Zmiana dzienna",
      payRange: "33–40 PLN/h",
      summary:
        "Dostawy lokalne i regionalne, obsługa klientów końcowych, praca z nowoczesną flotą pojazdów dostawczych do 3,5t.",
      requirements: [
        "Prawo jazdy kat. B (minimum 2 lata)",
        "Dobra znajomość regionu lub nawigacji GPS",
        "Odpowiedzialność i punktualność",
        "Podstawowa znajomość języka polskiego lub niemieckiego",
      ],
      tag: "Transport",
    },
    de: {
      title: "Fahrer Logistik (Führerschein Kl. B)",
      location: "Słubice / Frankfurt (Oder) / Region",
      shiftType: "Frühschicht",
      payRange: "33–40 PLN/Std.",
      summary:
        "Lokale und regionale Lieferungen, Kundenbetreuung, Arbeit mit modernen Lieferfahrzeugen bis 3,5t.",
      requirements: [
        "Führerschein Klasse B (min. 2 Jahre)",
        "Gute Ortskenntnisse oder GPS-Nutzung",
        "Verantwortungsbewusstsein und Pünktlichkeit",
        "Grundkenntnisse in Polnisch oder Deutsch",
      ],
      tag: "Transport",
    },
    datePosted: "2026-03-20",
    validThrough: "2026-06-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "greenhouse-worker-nl",
    slug: "pracownik-szklarni-holandia",
    pl: {
      title: "Pracownik szklarni (kwiaty / warzywa)",
      location: "Holandia (Westland / Aalsmeer / region)",
      shiftType: "Zmiana dzienna",
      payRange: "14–17 EUR/h",
      summary:
        "Praca w holenderskich szklarniach przy uprawie kwiatów ciętych i warzyw. Sadzenie, pielęgnacja, zbiory — praca sezonowa i stała. Zakwaterowanie w pobliżu miejsca pracy.",
      requirements: [
        "Brak wymaganego doświadczenia — wdrożenie na miejscu",
        "Gotowość do pracy fizycznej w środowisku szklarniowym",
        "Podstawowa znajomość języka polskiego lub angielskiego",
        "Prawo jazdy kat. B mile widziane",
      ],
      tag: "Szklarnia",
    },
    de: {
      title: "Gewächshausmitarbeiter (Blumen / Gemüse)",
      location: "Niederlande (Westland / Aalsmeer / Region)",
      shiftType: "Frühschicht",
      payRange: "14–17 EUR/Std.",
      summary:
        "Arbeit in niederländischen Gewächshäusern mit Schnittblumen und Gemüse. Pflanzen, Pflege, Ernte — Saison- und Festarbeit. Unterkunft in der Nähe des Arbeitsplatzes.",
      requirements: [
        "Keine Erfahrung erforderlich — Einarbeitung vor Ort",
        "Bereitschaft zur körperlichen Arbeit im Gewächshaus",
        "Grundkenntnisse in Polnisch oder Englisch",
        "Führerschein Klasse B von Vorteil",
      ],
      tag: "Gewächshaus",
    },
    datePosted: "2026-03-31",
    validThrough: "2026-09-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "warehouse-nl-be",
    slug: "pracownik-magazynowy-holandia-belgia",
    pl: {
      title: "Pracownik magazynowy / produkcji",
      location: "Holandia / Belgia",
      shiftType: "Zmiana dzienna i nocna",
      payRange: "14–16 EUR/h",
      summary:
        "Praca w centrach dystrybucyjnych i zakładach produkcyjnych w Holandii i Belgii. Kompletacja zamówień, obsługa linii, praca z nowoczesnym sprzętem. Zakwaterowanie i transport zapewniony.",
      requirements: [
        "Gotowość do pracy zmianowej",
        "Sprawność fizyczna",
        "Podstawowa znajomość języka polskiego lub angielskiego",
        "Gotowość do wyjazdu (praca za granicą)",
      ],
      tag: "Magazyn / Produkcja",
    },
    de: {
      title: "Lager- / Produktionsmitarbeiter",
      location: "Niederlande / Belgien",
      shiftType: "Früh- und Nachtschicht",
      payRange: "14–16 EUR/Std.",
      summary:
        "Arbeit in Verteilzentren und Produktionsbetrieben in den Niederlanden und Belgien. Kommissionierung, Linienarbeit, modernes Equipment. Unterkunft und Transport inklusive.",
      requirements: [
        "Bereitschaft zur Schichtarbeit",
        "Körperliche Belastbarkeit",
        "Grundkenntnisse in Polnisch oder Englisch",
        "Bereitschaft zur Arbeit im Ausland",
      ],
      tag: "Lager / Produktion",
    },
    datePosted: "2026-03-31",
    validThrough: "2026-09-30",
    employmentType: "TEMPORARY",
  },
];
