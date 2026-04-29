interface JobLocale {
  title: string;
  location: string;
  shiftType: string;
  payRange: string;
  summary: string;
  requirements: string[];
  tag: string;
}

export type JobCategory = "forklift" | "picker" | "driver" | "manager" | "logistics" | "hr";
export type ShiftKind = "day" | "night" | "rotating";
export type SalaryTier = "entry" | "mid" | "high";

export interface JobListing {
  id: string;
  slug: string;
  countries: string[];
  category: JobCategory;
  shiftKind: ShiftKind;
  salaryTier: SalaryTier;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  salaryUnit: "HOUR" | "MONTH";
  pl: JobLocale;
  de: JobLocale;
  nl: JobLocale;
  datePosted: string;
  validThrough: string;
  employmentType: string;
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  TEMPORARY: "TEMPORARY",
  CONTRACTOR: "CONTRACTOR",
  CONTRACT: "CONTRACTOR",
};

export function mapEmploymentType(type: string): string {
  return EMPLOYMENT_TYPE_MAP[type.toUpperCase()] ?? "TEMPORARY";
}

export const jobs: JobListing[] = [
  {
    id: "wh-picker-slubice",
    slug: "pracownik-magazynowy-slubice",
    countries: ["PL"],
    category: "picker",
    shiftKind: "rotating",
    salaryTier: "entry",
    salaryMin: 32,
    salaryMax: 38,
    salaryCurrency: "PLN",
    salaryUnit: "HOUR",
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
    nl: {
      title: "Magazijnmedewerker / Order Picker",
      location: "Słubice / Frankfurt (Oder)",
      shiftType: "Dag- en nachtdienst",
      payRange: "32–38 PLN/u",
      summary:
        "Orders picken, scanners bedienen in een modern cross-border magazijn aan de Duits-Poolse grens.",
      requirements: [
        "Bereidheid tot ploegendienst",
        "Basiskennis Pools of Duits",
        "Lichamelijke fitheid",
        "Geen bezwaar tegen werken in koude omgeving",
      ],
      tag: "Magazijn",
    },
    datePosted: "2026-03-01",
    validThrough: "2026-06-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "forklift-op",
    slug: "operator-wozka-widlowego",
    countries: ["PL"],
    category: "forklift",
    shiftKind: "day",
    salaryTier: "mid",
    salaryMin: 35,
    salaryMax: 42,
    salaryCurrency: "PLN",
    salaryUnit: "HOUR",
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
    nl: {
      title: "Heftruckchauffeur",
      location: "Słubice",
      shiftType: "Dagdienst",
      payRange: "35–42 PLN/u",
      summary:
        "Bedienen van hef- en palletwagens, laden en lossen, werken in een dynamisch logistiek centrum.",
      requirements: [
        "Geldig heftruckcertificaat (UDT) vereist",
        "Min. 1 jaar werkervaring in vergelijkbare functie",
        "Kennis van veiligheidsvoorschriften",
        "Basiskennis Pools",
      ],
      tag: "Logistiek",
    },
    datePosted: "2026-03-01",
    validThrough: "2026-06-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "production-worker",
    slug: "pracownik-produkcji",
    countries: ["PL"],
    category: "picker",
    shiftKind: "rotating",
    salaryTier: "entry",
    salaryMin: 31,
    salaryMax: 37,
    salaryCurrency: "PLN",
    salaryUnit: "HOUR",
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
    nl: {
      title: "Productiemedewerker",
      location: "Słubice / omgeving",
      shiftType: "Dag- en nachtdienst",
      payRange: "31–37 PLN/u",
      summary:
        "Montage van onderdelen, kwaliteitscontrole en productielijnwerk in een Europees bedrijf.",
      requirements: [
        "Productie-ervaring is een pré",
        "Vermogen om in een snel tempo te werken",
        "Oog voor detail en kwaliteit",
        "Bereidheid tot ploegendienst",
      ],
      tag: "Productie",
    },
    datePosted: "2026-03-15",
    validThrough: "2026-06-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "logistics-driver",
    slug: "kierowca-logistyczny",
    countries: ["PL"],
    category: "driver",
    shiftKind: "day",
    salaryTier: "mid",
    salaryMin: 33,
    salaryMax: 40,
    salaryCurrency: "PLN",
    salaryUnit: "HOUR",
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
    nl: {
      title: "Logistiek chauffeur (rijbewijs B)",
      location: "Słubice / Frankfurt (Oder) / regio",
      shiftType: "Dagdienst",
      payRange: "33–40 PLN/u",
      summary:
        "Lokale en regionale bezorgingen, klantondersteuning, werken met modern wagenpark tot 3,5t.",
      requirements: [
        "Rijbewijs B (minimaal 2 jaar)",
        "Goede plaatskennis of GPS-gebruik",
        "Verantwoordelijkheidsgevoel en stiptheid",
        "Basiskennis Pools of Duits",
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
    countries: ["NL"],
    category: "picker",
    shiftKind: "day",
    salaryTier: "mid",
    salaryMin: 14,
    salaryMax: 17,
    salaryCurrency: "EUR",
    salaryUnit: "HOUR",
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
    nl: {
      title: "Kasmedewerker (bloemen / groenten)",
      location: "Nederland (Westland / Aalsmeer / regio)",
      shiftType: "Dagdienst",
      payRange: "14–17 EUR/u",
      summary:
        "Werken in Nederlandse kassen met snijbloemen en groenten. Planten, verzorgen, oogsten — seizoenswerk en vast. Huisvesting nabij de werkplek.",
      requirements: [
        "Geen ervaring vereist — inwerking ter plaatse",
        "Bereidheid tot lichamelijk werk in kasomgeving",
        "Basiskennis Pools of Engels",
        "Rijbewijs B is een pré",
      ],
      tag: "Kas",
    },
    datePosted: "2026-03-31",
    validThrough: "2026-09-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "warehouse-nl-be",
    slug: "pracownik-magazynowy-holandia-belgia",
    countries: ["NL", "BE"],
    category: "picker",
    shiftKind: "rotating",
    salaryTier: "entry",
    salaryMin: 14,
    salaryMax: 16,
    salaryCurrency: "EUR",
    salaryUnit: "HOUR",
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
    nl: {
      title: "Magazijn- / Productiemedewerker",
      location: "Nederland / België",
      shiftType: "Dag- en nachtdienst",
      payRange: "14–16 EUR/u",
      summary:
        "Werken in distributiecentra en productiebedrijven in Nederland en België. Orders picken, lijnenwerk, modern materieel. Huisvesting en transport inbegrepen.",
      requirements: [
        "Bereidheid tot ploegendienst",
        "Lichamelijke fitheid",
        "Basiskennis Pools of Engels",
        "Bereidheid om in het buitenland te werken",
      ],
      tag: "Magazijn / Productie",
    },
    datePosted: "2026-03-31",
    validThrough: "2026-09-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "warehouse-picker-nl",
    slug: "magazijnmedewerker-nederland",
    countries: ["NL"],
    category: "picker",
    shiftKind: "rotating",
    salaryTier: "entry",
    salaryMin: 14,
    salaryMax: 17,
    salaryCurrency: "EUR",
    salaryUnit: "HOUR",
    pl: {
      title: "Pracownik magazynowy (Holandia)",
      location: "Holandia (Rotterdam / Amsterdam / region)",
      shiftType: "Zmiana dzienna i nocna",
      payRange: "14–17 EUR/h",
      summary:
        "Praca w nowoczesnych centrach dystrybucyjnych w Holandii. Kompletacja zamówień, obsługa skanerów, załadunek i rozładunek. Zakwaterowanie i transport zapewniony.",
      requirements: [
        "Gotowość do pracy zmianowej",
        "Sprawność fizyczna",
        "Podstawowa znajomość języka polskiego lub angielskiego",
        "Gotowość do pracy za granicą",
      ],
      tag: "Magazyn",
    },
    de: {
      title: "Lagermitarbeiter (Niederlande)",
      location: "Niederlande (Rotterdam / Amsterdam / Region)",
      shiftType: "Früh- und Nachtschicht",
      payRange: "14–17 EUR/Std.",
      summary:
        "Arbeit in modernen Verteilzentren in den Niederlanden. Kommissionierung, Scannerarbeit, Be- und Entladung. Unterkunft und Transport inklusive.",
      requirements: [
        "Bereitschaft zur Schichtarbeit",
        "Körperliche Belastbarkeit",
        "Grundkenntnisse in Polnisch oder Englisch",
        "Bereitschaft zur Arbeit im Ausland",
      ],
      tag: "Lager",
    },
    nl: {
      title: "Magazijnmedewerker (Nederland)",
      location: "Nederland (Rotterdam / Amsterdam / regio)",
      shiftType: "Dag- en nachtdienst",
      payRange: "14–17 EUR/u",
      summary:
        "Werken in moderne distributiecentra in Nederland. Orders picken, scanners bedienen, laden en lossen. Huisvesting en transport inbegrepen.",
      requirements: [
        "Bereidheid tot ploegendienst",
        "Lichamelijke fitheid",
        "Basiskennis Pools of Engels",
        "Bereidheid om in Nederland te werken",
      ],
      tag: "Magazijn",
    },
    datePosted: "2026-04-01",
    validThrough: "2026-09-30",
    employmentType: "TEMPORARY",
  },
  {
    id: "forklift-op-nl",
    slug: "heftruckchauffeur-nederland",
    countries: ["NL"],
    category: "forklift",
    shiftKind: "day",
    salaryTier: "high",
    salaryMin: 15,
    salaryMax: 18,
    salaryCurrency: "EUR",
    salaryUnit: "HOUR",
    pl: {
      title: "Operator wózka widłowego (Holandia)",
      location: "Holandia (Venlo / Eindhoven / region)",
      shiftType: "Zmiana dzienna",
      payRange: "15–18 EUR/h",
      summary:
        "Praca jako operator wózka widłowego w holenderskich centrach logistycznych. Załadunek, rozładunek, składowanie. Wymagane uprawnienia UDT lub równoważne. Zakwaterowanie zapewnione.",
      requirements: [
        "Ważne uprawnienia na wózek widłowy (UDT lub równoważne)",
        "Min. 1 rok doświadczenia",
        "Gotowość do pracy za granicą",
        "Podstawowa znajomość języka polskiego lub angielskiego",
      ],
      tag: "Logistyka",
    },
    de: {
      title: "Gabelstaplerfahrer (Niederlande)",
      location: "Niederlande (Venlo / Eindhoven / Region)",
      shiftType: "Frühschicht",
      payRange: "15–18 EUR/Std.",
      summary:
        "Arbeit als Gabelstaplerfahrer in niederländischen Logistikzentren. Be- und Entladung, Einlagerung. Gültiger Staplerschein erforderlich. Unterkunft inklusive.",
      requirements: [
        "Gültiger Staplerschein (UDT oder gleichwertig)",
        "Mind. 1 Jahr Erfahrung",
        "Bereitschaft zur Arbeit im Ausland",
        "Grundkenntnisse in Polnisch oder Englisch",
      ],
      tag: "Logistik",
    },
    nl: {
      title: "Heftruckchauffeur (Nederland)",
      location: "Nederland (Venlo / Eindhoven / regio)",
      shiftType: "Dagdienst",
      payRange: "15–18 EUR/u",
      summary:
        "Werken als heftruckchauffeur in Nederlandse logistieke centra. Laden, lossen en opslaan. Geldig heftruckcertificaat vereist. Huisvesting inbegrepen.",
      requirements: [
        "Geldig heftruckcertificaat (UDT of gelijkwaardig)",
        "Min. 1 jaar ervaring",
        "Bereidheid om in Nederland te werken",
        "Basiskennis Pools of Engels",
      ],
      tag: "Logistiek",
    },
    datePosted: "2026-04-01",
    validThrough: "2026-09-30",
    employmentType: "TEMPORARY",
  },
];
