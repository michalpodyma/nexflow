import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Nexflow",
  description:
    "Datenschutzerklärung der Nexflow Sp. z o.o. — Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO.",
  alternates: {
    canonical: "https://nexflow.work/de/datenschutz",
    languages: {
      de: "https://nexflow.work/de/datenschutz",
      pl: "https://nexflow.work/pl/polityka-prywatnosci",
    },
  },
};

export default function DatenschutzPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-canvas text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Rechtliche Dokumente
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Datenschutzerklärung
          </h1>
          <p className="mt-4 text-white/60 text-sm">Letzte Aktualisierung: 1. April 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-surface-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none space-y-10">

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">1. Verantwortlicher</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Verantwortlicher im Sinne der DSGVO ist{" "}
                <strong>Nexflow Sp. z o.o.</strong> mit Sitz in Słubice, Polen (NIP/USt-IdNr.: PL5981632310, KRS: 0000496516),
                nachfolgend &bdquo;Nexflow&rdquo; oder &bdquo;Verantwortlicher&rdquo; genannt.
              </p>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Kontakt in Datenschutzangelegenheiten:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>{" "}
                oder schriftlich an die Gesellschaftsadresse.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">2. Zwecke und Rechtsgrundlagen der Verarbeitung</h2>
              <PolicyTable
                rows={[
                  { zweck: "Bewerberauswahl und Personalvermittlung", grundlage: "Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung; Art. 6 Abs. 1 lit. a DSGVO — Einwilligung" },
                  { zweck: "Bearbeitung von Kontaktanfragen über das Formular", grundlage: "Art. 6 Abs. 1 lit. b DSGVO — vorvertragliche Maßnahmen" },
                  { zweck: "Abwicklung und Abrechnung von Arbeitseinsätzen", grundlage: "Art. 6 Abs. 1 lit. b und lit. c DSGVO — Vertragserfüllung und rechtliche Verpflichtungen" },
                  { zweck: "Direktmarketing und Analyse", grundlage: "Art. 6 Abs. 1 lit. f DSGVO — berechtigte Interessen" },
                  { zweck: "Erfüllung von Compliance-Pflichten (DSGVO, AÜG, AUeG)", grundlage: "Art. 6 Abs. 1 lit. c DSGVO — rechtliche Verpflichtung" },
                ]}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">3. Kategorien verarbeiteter Daten</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-1">
                <li>Identifikationsdaten: Vor- und Nachname, Personalausweis-/Passnummer</li>
                <li>Kontaktdaten: E-Mail-Adresse, Telefonnummer, Anschrift</li>
                <li>Berufliche Daten: Berufserfahrung, Qualifikationen, Wunschposition, Lebenslauf</li>
                <li>Beschäftigungsdaten: Verträge, Vergütung, Arbeitszeiten</li>
                <li>Dokumentendaten: Aufenthalts- und Arbeitserlaubnisse, A1-Bescheinigung</li>
                <li>Technische Daten: IP-Adresse, Anmeldedaten am Mitarbeiterportal</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">4. Speicherdauer</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-2">
                <li><strong>Bewerber:</strong> 12 Monate ab Eingang der Bewerbung, sofern keine längere Einwilligung erteilt wurde.</li>
                <li><strong>Beschäftigte:</strong> Während der gesamten Beschäftigungsdauer und für die gesetzlich vorgeschriebenen Aufbewahrungsfristen (i. d. R. 10 Jahre).</li>
                <li><strong>Kontaktanfragen:</strong> Bis zur abschließenden Bearbeitung und für 12 Monate nach dem letzten Kontakt.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">5. Empfänger der Daten</h2>
              <p className="text-graphite text-sm leading-relaxed">Ihre Daten können an folgende Kategorien von Empfängern weitergegeben werden:</p>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed mt-2 space-y-1">
                <li>Entleihunternehmen (Nexflow-Kunden) — soweit für die Auftragserfüllung erforderlich</li>
                <li>IT- und Cloud-Dienstleister (AWS eu-central-1, Vercel) — auf Grundlage von Auftragsverarbeitungsverträgen</li>
                <li>Steuerberater und Rechtsanwälte — im Rahmen von Abrechnungs- und Compliance-Pflichten</li>
                <li>Behörden (ZUS/DRV, Finanzamt, Staatliche Arbeitsaufsicht) — aufgrund gesetzlicher Verpflichtungen</li>
                <li>Kommunikationsdienstleister (SendGrid, Twilio) — ausschließlich zu Kontaktzwecken</li>
              </ul>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Nexflow verkauft keine personenbezogenen Daten an Dritte. Jede Übermittlung in Drittländer außerhalb des EWR erfolgt auf der Grundlage geeigneter Garantien (Standardvertragsklauseln der Europäischen Kommission).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">6. Ihre Rechte</h2>
              <p className="text-graphite text-sm leading-relaxed mb-3">Gemäß DSGVO stehen Ihnen folgende Rechte zu:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Auskunftsrecht", desc: "Sie können eine Kopie der Daten anfordern, die wir über Sie gespeichert haben." },
                  { title: "Berichtigungsrecht", desc: "Sie können die Berichtigung unrichtiger oder die Vervollständigung unvollständiger Daten verlangen." },
                  { title: "Recht auf Löschung", desc: "Sie können die Löschung Ihrer Daten verlangen (\"Recht auf Vergessenwerden\")." },
                  { title: "Recht auf Datenübertragbarkeit", desc: "Sie können Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format erhalten." },
                  { title: "Recht auf Einschränkung der Verarbeitung", desc: "Sie können in bestimmten Fällen die Einschränkung der Verarbeitung verlangen." },
                  { title: "Widerspruchsrecht", desc: "Sie können der Verarbeitung widersprechen, die auf berechtigten Interessen beruht." },
                  { title: "Widerruf der Einwilligung", desc: "Beruht die Verarbeitung auf Ihrer Einwilligung, können Sie diese jederzeit widerrufen." },
                  { title: "Beschwerderecht", desc: "Sie haben das Recht, eine Beschwerde beim Präsidenten des polnischen Datenschutzamts (UODO) oder der deutschen Datenschutzbehörde einzureichen." },
                ].map((r) => (
                  <div key={r.title} className="p-3 bg-white rounded-xl border border-gray-100">
                    <p className="text-xs font-semibold text-ink-inverse mb-1">{r.title}</p>
                    <p className="text-xs text-slate leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-graphite text-sm leading-relaxed mt-4">
                Um Ihre Rechte geltend zu machen, wenden Sie sich bitte an:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>.
                Wir antworten innerhalb von 30 Tagen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">7. Cookies und Analyse</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Die Website nexflow.work kann technisch notwendige Cookies verwenden. Tracking-Cookies von Drittanbietern werden ohne Ihre vorherige Einwilligung nicht gesetzt.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink-inverse mb-3">8. Änderungen dieser Datenschutzerklärung</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Nexflow behält sich das Recht vor, diese Datenschutzerklärung zu aktualisieren. Über wesentliche Änderungen informieren wir durch Aktualisierung des Datums am Anfang dieses Dokuments.
              </p>
            </div>

            <div className="rounded-2xl bg-canvas text-white p-6 mt-4">
              <h2 className="text-lg font-bold mb-2">Kontakt in Datenschutzfragen</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Nexflow Sp. z o.o.<br />
                Słubice, Polen<br />
                E-Mail:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>
                <br />
                Tel.:{" "}
                <a href="tel:+48224878828" className="text-nexflow-cyan hover:underline">+48 224 878 828</a>
              </p>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

function PolicyTable({ rows }: { rows: { zweck: string; grundlage: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-canvas text-white">
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider w-2/5">Verarbeitungszweck</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Rechtsgrundlage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-4 py-3 text-graphite align-top">{row.zweck}</td>
              <td className="px-4 py-3 text-slate align-top">{row.grundlage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
