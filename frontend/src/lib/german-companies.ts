/**
 * German-owned company domain allowlist for Instantly AI campaign routing.
 *
 * Contacts at these domains must receive German-language outreach regardless
 * of their physical location. German multinationals often employ Polish staff
 * at Polish subsidiaries — the AI SDR must route them to German sequences.
 *
 * Source: EUR-2562 audit (KN, DHL, Arvato confirmed violations 2026-08-03).
 * Extend this list as new German-owned company domains are identified.
 */

export const GERMAN_COMPANY_DOMAINS = new Set([
  // Logistics / freight
  "kuehne-nagel.com",
  "dhl.com",
  "dhl.de",
  "dbschenker.com",
  "dachser.com",
  "dachser.de",
  "rhenus.com",
  "rhenus.de",
  "hellmann.net",
  "hellmann.de",
  "fiege.com",
  "fiege.de",
  "gls-group.eu",

  // Manufacturing / automotive
  "arvato.com",
  "arvato.de",
  "bertelsmann.com",
  "bertelsmann.de",
  "bosch.com",
  "bosch.de",
  "siemens.com",
  "siemens.de",
  "thyssenkrupp.com",
  "schaeffler.com",
  "schaeffler.de",
  "continental.com",
  "continental.de",
  "zf.com",
  "knorr-bremse.com",
  "mahle.com",

  // Automotive OEMs
  "volkswagen.com",
  "volkswagen.de",
  "vwgroup.com",
  "bmw.com",
  "bmw.de",
  "mercedes-benz.com",
  "daimler.com",
  "audi.com",
  "audi.de",
  "porsche.com",
  "porsche.de",

  // Retail / FMCG
  "lidl.com",
  "lidl.de",
  "schwarz-gruppe.com",
  "aldi.com",
  "aldi.de",
  "metro.de",
  "metro.com",
  "rewe-group.com",
  "rewe.de",
  "obi.com",
  "obi.de",

  // Chemicals / pharma
  "basf.com",
  "bayer.com",
  "bayer.de",
  "lanxess.com",
  "evonik.com",

  // Finance / insurance
  "allianz.com",
  "allianz.de",
  "muenchener-rueck.com",
  "munichre.com",
  "commerzbank.com",
  "commerzbank.de",
]);

/**
 * Returns true when the contact's email domain indicates a German-owned company.
 * Company may have Polish employees but HQ is German — outreach must be in German.
 */
export function isGermanCompanyDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return GERMAN_COMPANY_DOMAINS.has(domain);
}

/**
 * Returns the domain part of an email address, lower-cased.
 */
export function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

/**
 * Lightweight heuristic: detect whether text is likely NOT in German.
 * Used in the webhook handler (no LLM budget) to flag mismatches fast.
 *
 * Returns true when the body appears non-German for a German-company lead:
 * - Contains Polish diacritics (ą, ę, ó, ś, ź, ż, ć, ń, ł)
 * - OR has no German salutation / closing markers
 */
export function looksNonGermanForGermanLead(body: string): boolean {
  const hasPolishDiacritics = /[ąęóśźżćńłĄĘÓŚŹŻĆŃŁ]/.test(body);
  if (hasPolishDiacritics) return true;

  const hasGermanMarker =
    /\b(Sehr geehrte[rn]?|Mit freundlichen Grüßen|Freundliche Grüße|Hochachtungsvoll|Guten Tag|Hallo |Liebe[rs]? |vielen Dank|Bitte|Herzliche Grüße)\b/i.test(
      body,
    );
  return !hasGermanMarker;
}
