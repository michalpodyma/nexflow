export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  lang: "pl" | "de";
  content: string;
}

export const posts: BlogPost[] = [
  {
    slug: "jak-znalezc-prace-w-niemczech-2025",
    title: "Jak znaleźć pracę w Niemczech w 2025 roku",
    description:
      "Kompletny przewodnik dla Polaków szukających zatrudnienia za Odrą — formalności, prawa pracownicze i praktyczne wskazówki.",
    date: "2025-09-15",
    lang: "pl",
    content: `
<p>Praca w Niemczech wciąż przyciąga tysiące Polaków — wyższe zarobki, stabilne umowy i rozwinięta infrastruktura socjalna sprawiają, że jest to jeden z najpopularniejszych kierunków emigracji zarobkowej. Jednak przed wyjazdem warto dobrze się przygotować.</p>

<h2>Formalności przed wyjazdem</h2>
<p>Obywatele Polski jako członkowie UE nie potrzebują pozwolenia na pracę w Niemczech. Wystarczy ważny dowód osobisty lub paszport. Warto jednak wcześniej zadbać o:</p>
<ul>
  <li>Europejską Kartę Ubezpieczenia Zdrowotnego (EKUZ) wystawioną przez NFZ</li>
  <li>Zaświadczenie A1 potwierdzające podleganie polskiemu systemowi ubezpieczeń (jeśli delegacja trwa do 24 miesięcy)</li>
  <li>Tłumaczenia przysięgłe kluczowych dokumentów, jeśli pracodawca ich wymaga</li>
</ul>

<h2>Minimalne wynagrodzenie i prawa pracownicze</h2>
<p>Od 2025 roku minimalna stawka godzinowa w Niemczech wynosi 12,82 EUR brutto (Mindestlohn). Pracownicy delegowani z Polski mają prawo do tych samych warunków zatrudnienia co pracownicy niemieccy — zasada ta wynika z dyrektywy o delegowaniu pracowników (AÜG).</p>

<h2>Jak pomaga Nexflow?</h2>
<p>Nexflow zajmuje się kompleksową obsługą pracowników delegowanych — od zebrania dokumentów, przez rejestrację w ZUS i wystawienie zaświadczenia A1, aż po kontakt z pracodawcą po drugiej stronie Odry. Skontaktuj się z nami, jeśli szukasz pracy w Niemczech lub potrzebujesz wsparcia formalnego.</p>
    `.trim(),
  },
  {
    slug: "arbeitnehmerrechte-fuer-polnische-leiharbeiter",
    title: "Arbeitnehmerrechte für polnische Leiharbeiter in Deutschland",
    description:
      "Ein Überblick über die wichtigsten Rechte polnischer Zeitarbeitnehmer beim Einsatz in deutschen Unternehmen — AÜG, Mindestlohn und A1-Bescheinigung.",
    date: "2025-10-22",
    lang: "de",
    content: `
<p>Polnische Arbeitnehmer, die über Nexflow in Deutschland eingesetzt werden, genießen denselben gesetzlichen Schutz wie deutsche Kollegen. Das Arbeitnehmerüberlassungsgesetz (AÜG) sowie die EU-Entsenderichtlinie regeln die Mindestbedingungen.</p>

<h2>Mindestlohn und Gleichbehandlung</h2>
<p>Seit dem 1. Januar 2025 gilt in Deutschland ein gesetzlicher Mindestlohn von 12,82 EUR brutto pro Stunde. Leiharbeitnehmer haben nach neun Monaten ununterbrochener Überlassung Anspruch auf Equal Pay — also dasselbe Entgelt wie Stammarbeitnehmer im Entleihbetrieb.</p>

<h2>A1-Bescheinigung und Sozialversicherung</h2>
<p>Bei Entsendungen bis zu 24 Monaten verbleibt die Sozialversicherungspflicht in Polen. Nexflow beantragt für jeden Arbeitnehmer rechtzeitig die A1-Bescheinigung beim ZUS und stellt sicher, dass alle Dokumente vor Arbeitsbeginn vorliegen.</p>

<h2>18-Monats-Limit bei der Arbeitnehmerüberlassung</h2>
<p>Das AÜG begrenzt die Überlassungsdauer auf maximal 18 Monate beim selben Entleiher. Nexflow verfolgt diese Fristen systematisch und informiert Kunden und Arbeitnehmer rechtzeitig über bevorstehende Ablaufdaten.</p>

<h2>Kontakt</h2>
<p>Haben Sie Fragen zu Ihren Rechten oder zur Planung eines Einsatzes? Sprechen Sie uns gerne an — unser Team steht Ihnen sowohl auf Polnisch als auch auf Deutsch zur Verfügung.</p>
    `.trim(),
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}
