/**
 * WhatsApp/SMS candidate screening — state machine, questions, scoring.
 *
 * Conversation flow (5 questions):
 *   Q1 availability  →  Q2 medical clearance  →  Q3 start date
 *   →  Q4 UDT cert (forklift only)  →  Q5 Polish level  →  score + notify
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = "picker" | "forklift" | "truck";
export type Locale = "pl" | "de";

export type ScreeningStep =
  | "awaiting_availability"
  | "awaiting_medical"
  | "awaiting_start_date"
  | "awaiting_udt"       // forklift only; non-forklift skips this step
  | "awaiting_polish"
  | "done";

export interface ScreeningAnswers {
  availability?: string;
  medical?: string;
  startDate?: string;
  udt?: string;
  polishLevel?: string;
}

export interface ScreeningState {
  step: ScreeningStep;
  role: Role;
  name: string;
  locale: Locale;
  answers: ScreeningAnswers;
  startedAt: number; // unix ms
}

// ─── Questions / messages ─────────────────────────────────────────────────────

const COPY = {
  pl: {
    intro: (name: string) =>
      `Cześć ${name}! 👋 Dziękujemy za aplikację do Nexflow.\n\nZadamy Ci 5 krótkich pytań, aby dopasować Cię do odpowiedniej oferty. Odpowiadaj krótko — wszystko idzie do rekrutera.`,
    awaiting_availability:
      "1/5 ⏳ Jak długo możesz pracować w Polsce?\n(np. *3 miesiące*, *6 miesięcy*, *rok lub dłużej*)",
    awaiting_medical:
      "2/5 🩺 Czy posiadasz aktualne badania lekarskie?\n(odpisz *tak* lub *nie*)",
    awaiting_start_date:
      "3/5 📅 Kiedy możesz zacząć pracę?\n(np. *od poniedziałku*, *za tydzień*, *za 2 tygodnie*)",
    awaiting_udt:
      "4/5 🚜 Czy posiadasz uprawnienia UDT na wózki widłowe?\n(odpisz *tak* lub *nie*)",
    awaiting_polish:
      "5/5 🗣️ Jak oceniasz swoją znajomość języka polskiego w skali 1–5?\n(1 = brak, 5 = biegły)",
    pass: (name: string) =>
      `Dziękujemy, ${name}! 🎉 Twoje odpowiedzi wyglądają obiecująco.\nNasz rekruter skontaktuje się z Tobą wkrótce.`,
    fail: (name: string) =>
      `Dziękujemy, ${name}! 🙏 Aktualnie nie mamy idealnie pasującej oferty.\nZachowamy Twój profil i wrócimy do Ciebie, gdy pojawi się odpowiednia praca.`,
  },
  de: {
    intro: (name: string) =>
      `Hallo ${name}! 👋 Vielen Dank für Ihre Bewerbung bei Nexflow.\n\nWir stellen Ihnen 5 kurze Fragen, um Sie dem richtigen Angebot zuzuordnen. Antworten Sie kurz — alles wird an unseren Recruiter weitergeleitet.`,
    awaiting_availability:
      "1/5 ⏳ Wie lange können Sie in Polen arbeiten?\n(z.B. *3 Monate*, *6 Monate*, *ein Jahr oder länger*)",
    awaiting_medical:
      "2/5 🩺 Haben Sie eine aktuelle arbeitsmedizinische Untersuchung?\n(antworten Sie mit *ja* oder *nein*)",
    awaiting_start_date:
      "3/5 📅 Wann können Sie anfangen?\n(z.B. *ab Montag*, *in einer Woche*, *in 2 Wochen*)",
    awaiting_udt:
      "4/5 🚜 Haben Sie einen Gabelstaplerführerschein (UDT-Zertifikat)?\n(antworten Sie mit *ja* oder *nein*)",
    awaiting_polish:
      "5/5 🗣️ Wie schätzen Sie Ihre Polnischkenntnisse auf einer Skala von 1–5 ein?\n(1 = keine, 5 = fließend)",
    pass: (name: string) =>
      `Danke, ${name}! 🎉 Ihre Antworten sehen vielversprechend aus.\nUnser Recruiter wird sich bald bei Ihnen melden.`,
    fail: (name: string) =>
      `Danke, ${name}! 🙏 Derzeit haben wir kein perfekt passendes Angebot.\nWir behalten Ihr Profil und melden uns, wenn eine passende Stelle verfügbar ist.`,
  },
} as const;

// ─── Public helpers ───────────────────────────────────────────────────────────

export function getIntroAndFirstQuestion(locale: Locale, name: string): string {
  const c = COPY[locale];
  return `${c.intro(name)}\n\n${c.awaiting_availability}`;
}

export function getQuestion(step: ScreeningStep, locale: Locale): string {
  if (step === "done") return "";
  return COPY[locale][step] as string;
}

export function getResultMessage(result: "pass" | "fail", locale: Locale, name: string): string {
  return COPY[locale][result](name);
}

export function getNextStep(current: ScreeningStep, role: Role): ScreeningStep {
  switch (current) {
    case "awaiting_availability": return "awaiting_medical";
    case "awaiting_medical":      return "awaiting_start_date";
    case "awaiting_start_date":   return role === "forklift" ? "awaiting_udt" : "awaiting_polish";
    case "awaiting_udt":          return "awaiting_polish";
    case "awaiting_polish":       return "done";
    default:                      return "done";
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function scoreScreening(state: ScreeningState): "pass" | "fail" {
  const { answers, role } = state;
  if (!availabilityPasses(answers.availability ?? "")) return "fail";
  if (!booleanPasses(answers.medical ?? ""))           return "fail";
  if (!startDatePasses(answers.startDate ?? ""))       return "fail";
  if (role === "forklift" && !booleanPasses(answers.udt ?? "")) return "fail";
  // polishLevel is informational — recorded but not a hard gate
  return "pass";
}

function availabilityPasses(answer: string): boolean {
  const s = answer.toLowerCase();
  if (/rok\b|lat[ae]\b|jahr|year/.test(s)) return true; // 1+ year → always pass
  // Months
  const mMonth = s.match(/(\d+)\s*(miesiąc|miesięcy|miesiące|monat|month)/);
  if (mMonth) return parseInt(mMonth[1]) >= 3;
  // Weeks (12+ weeks ≈ 3 months)
  if (/tydzień|tygodnie|tygodni|woche|week/.test(s)) {
    const mWeek = s.match(/(\d+)/);
    return !!mWeek && parseInt(mWeek[1]) >= 12;
  }
  // Bare number → assume months
  const mBare = s.match(/^(\d+)$/);
  if (mBare) return parseInt(mBare[1]) >= 3;
  return true; // ambiguous → give benefit of doubt; recruiter sees raw answer
}

function booleanPasses(answer: string): boolean {
  return /^(tak|yes|ja|t\b|y\b|j\b)/i.test(answer.trim());
}

function startDatePasses(answer: string): boolean {
  const s = answer.toLowerCase();
  // Explicit months → too far
  if (/miesiąc|miesięcy|miesiące|monat|month/.test(s)) return false;
  // Weeks > 2 → fail
  const mWeek = s.match(/(\d+)\s*(tydzień|tygodnie|tygodni|woche|week)/);
  if (mWeek && parseInt(mWeek[1]) > 2) return false;
  return true; // otherwise assume can start within 2 weeks
}

// ─── Summary card (for recruiter notification) ────────────────────────────────

export function buildSummaryCard(state: ScreeningState, result: "pass" | "fail"): string {
  const { name, role, locale, answers } = state;
  const emoji = result === "pass" ? "✅" : "❌";
  const lines = [
    `${emoji} *Screening: ${result.toUpperCase()}*`,
    `👤 ${name} | ${role} | ${locale.toUpperCase()}`,
    `─────────────────────`,
    `1. Dostępność: ${answers.availability ?? "—"}`,
    `2. Badania:    ${answers.medical ?? "—"}`,
    `3. Start:      ${answers.startDate ?? "—"}`,
  ];
  if (role === "forklift") {
    lines.push(`4. UDT:        ${answers.udt ?? "—"}`);
  }
  lines.push(`5. Polski:     ${answers.polishLevel ?? "—"}`);
  return lines.join("\n");
}

// ─── Redis key ────────────────────────────────────────────────────────────────

export function screeningKey(phone: string): string {
  // Normalise phone to digits only for consistent key
  return `screening:${phone.replace(/\D/g, "")}`;
}
