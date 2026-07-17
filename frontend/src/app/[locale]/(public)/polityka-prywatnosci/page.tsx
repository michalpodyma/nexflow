import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  switch (locale) {
    case "en":
      return {
        title: "Privacy Policy | Nexflow",
        description:
          "Nexflow Sp. z o.o. privacy policy — information on personal data processing under GDPR.",
        alternates: {
          canonical: "https://nexflow.work/en/polityka-prywatnosci",
          languages: {
            "x-default": "https://nexflow.work/pl/polityka-prywatnosci",
            pl: "https://nexflow.work/pl/polityka-prywatnosci",
            en: "https://nexflow.work/en/polityka-prywatnosci",
            de: "https://nexflow.work/de/datenschutz",
            nl: "https://nexflow.work/nl/polityka-prywatnosci",
            ru: "https://nexflow.work/ru/polityka-prywatnosci",
            uk: "https://nexflow.work/uk/polityka-prywatnosci",
          },
        },
      };
    case "nl":
      return {
        title: "Privacybeleid | Nexflow",
        description:
          "Privacybeleid van Nexflow Sp. z o.o. — informatie over de verwerking van persoonsgegevens conform AVG/GDPR.",
        alternates: {
          canonical: "https://nexflow.work/nl/polityka-prywatnosci",
          languages: {
            "x-default": "https://nexflow.work/pl/polityka-prywatnosci",
            pl: "https://nexflow.work/pl/polityka-prywatnosci",
            en: "https://nexflow.work/en/polityka-prywatnosci",
            de: "https://nexflow.work/de/datenschutz",
            nl: "https://nexflow.work/nl/polityka-prywatnosci",
            ru: "https://nexflow.work/ru/polityka-prywatnosci",
            uk: "https://nexflow.work/uk/polityka-prywatnosci",
          },
        },
      };
    case "ru":
      return {
        title: "Политика конфиденциальности | Nexflow",
        description:
          "Политика конфиденциальности Nexflow Sp. z o.o. — информация об обработке персональных данных согласно GDPR.",
        alternates: {
          canonical: "https://nexflow.work/ru/polityka-prywatnosci",
          languages: {
            "x-default": "https://nexflow.work/pl/polityka-prywatnosci",
            pl: "https://nexflow.work/pl/polityka-prywatnosci",
            en: "https://nexflow.work/en/polityka-prywatnosci",
            de: "https://nexflow.work/de/datenschutz",
            nl: "https://nexflow.work/nl/polityka-prywatnosci",
            ru: "https://nexflow.work/ru/polityka-prywatnosci",
            uk: "https://nexflow.work/uk/polityka-prywatnosci",
          },
        },
      };
    case "uk":
      return {
        title: "Політика конфіденційності | Nexflow",
        description:
          "Політика конфіденційності Nexflow Sp. z o.o. — інформація про обробку персональних даних відповідно до GDPR.",
        alternates: {
          canonical: "https://nexflow.work/uk/polityka-prywatnosci",
          languages: {
            "x-default": "https://nexflow.work/pl/polityka-prywatnosci",
            pl: "https://nexflow.work/pl/polityka-prywatnosci",
            en: "https://nexflow.work/en/polityka-prywatnosci",
            de: "https://nexflow.work/de/datenschutz",
            nl: "https://nexflow.work/nl/polityka-prywatnosci",
            ru: "https://nexflow.work/ru/polityka-prywatnosci",
            uk: "https://nexflow.work/uk/polityka-prywatnosci",
          },
        },
      };
    default:
      return {
        title: "Polityka prywatności | Nexflow",
        description:
          "Polityka prywatności Nexflow Sp. z o.o. — informacje o przetwarzaniu danych osobowych zgodnie z RODO.",
        alternates: {
          canonical: "https://nexflow.work/pl/polityka-prywatnosci",
          languages: {
            "x-default": "https://nexflow.work/pl/polityka-prywatnosci",
            pl: "https://nexflow.work/pl/polityka-prywatnosci",
            en: "https://nexflow.work/en/polityka-prywatnosci",
            de: "https://nexflow.work/de/datenschutz",
            nl: "https://nexflow.work/nl/polityka-prywatnosci",
            ru: "https://nexflow.work/ru/polityka-prywatnosci",
            uk: "https://nexflow.work/uk/polityka-prywatnosci",
          },
        },
      };
  }
}

export default async function PolitykaPrywatnosciPage({ params }: Props) {
  const { locale } = await params;

  if (locale === "de") {
    redirect(`/de/datenschutz`);
  }

  if (locale === "en") return <PrivacyPageEN />;
  if (locale === "nl") return <PrivacyPageNL />;
  if (locale === "ru") return <PrivacyPageRU />;
  if (locale === "uk") return <PrivacyPageUK />;
  return <PrivacyPagePL />;
}

/* ── Polish ──────────────────────────────────────────────────────────────── */

function PrivacyPagePL() {
  return (
    <>
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Dokumenty prawne
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Polityka prywatności
          </h1>
          <p className="mt-4 text-white/60 text-sm">
            Ostatnia aktualizacja: 1 kwietnia 2026 r.
          </p>
        </div>
      </section>

      <section className="py-16 bg-cloud-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none space-y-10">
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                1. Administrator danych osobowych
              </h2>
              <p className="text-graphite text-sm leading-relaxed">
                Administratorem Twoich danych osobowych jest{" "}
                <strong>Nexflow Sp. z o.o.</strong> z siedzibą w Słubicach,
                Polska (NIP: PL5981632310, KRS: 0000496516, REGON: 081188992),
                dalej zwana &bdquo;Nexflow&rdquo; lub &bdquo;Administratorem&rdquo;.
              </p>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Kontakt w sprawach ochrony danych osobowych:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">
                  privacy@nexflow.work
                </a>{" "}
                lub pisemnie na adres siedziby Spółki.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                2. Cele i podstawy prawne przetwarzania danych
              </h2>
              <PolicyTablePL
                rows={[
                  { cel: "Rekrutacja kandydatów", podstawa: "Art. 6 ust. 1 lit. b RODO — niezbędność do zawarcia umowy; art. 6 ust. 1 lit. a RODO — zgoda kandydata" },
                  { cel: "Obsługa zapytań przez formularz kontaktowy", podstawa: "Art. 6 ust. 1 lit. b RODO — niezbędność do wykonania umowy lub podjęcia działań przed zawarciem umowy" },
                  { cel: "Realizacja i rozliczanie zleceń pracowniczych", podstawa: "Art. 6 ust. 1 lit. b oraz lit. c RODO — wykonanie umowy i obowiązki prawne (prawo pracy, ZUS, podatki)" },
                  { cel: "Marketing bezpośredni i analityka", podstawa: "Art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes Administratora" },
                  { cel: "Spełnienie obowiązków zgodności (RODO, AUeG, polska ustawa o zatrudnianiu pracowników tymczasowych)", podstawa: "Art. 6 ust. 1 lit. c RODO — obowiązek prawny" },
                ]}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                3. Kategorie przetwarzanych danych
              </h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-1">
                <li>Dane identyfikacyjne: imię, nazwisko, PESEL (jeśli wymagany przepisami)</li>
                <li>Dane kontaktowe: adres e-mail, numer telefonu, adres korespondencyjny</li>
                <li>Dane zawodowe: doświadczenie, kwalifikacje, preferowane stanowisko, CV</li>
                <li>Dane dotyczące zatrudnienia: umowy, stawki wynagrodzenia, czas pracy</li>
                <li>Dane dokumentów: typ i numer dokumentu tożsamości, zezwolenie na pracę, certyfikat A1 (dla delegowanych do DE)</li>
                <li>Dane techniczne: adres IP, dane logowania do portalu pracowniczego</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                4. Okres przechowywania danych
              </h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-2">
                <li><strong>Kandydaci (rekrutacja):</strong> 12 miesięcy od złożenia zgłoszenia, chyba że wyrazisz zgodę na dłuższe przechowywanie lub zostaniesz zatrudniony/a.</li>
                <li><strong>Pracownicy (aktywne zatrudnienie):</strong> przez cały czas trwania stosunku pracy, a po jego zakończeniu — przez okresy wymagane przepisami prawa (co do zasady 10 lat).</li>
                <li><strong>Zapytania kontaktowe:</strong> do czasu rozpatrzenia zapytania oraz przez 12 miesięcy od ostatniego kontaktu.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">5. Odbiorcy danych</h2>
              <p className="text-graphite text-sm leading-relaxed">Twoje dane mogą być przekazywane następującym kategoriom odbiorców:</p>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed mt-2 space-y-1">
                <li>Pracodawcy użytkownicy (klienci Nexflow) — w zakresie niezbędnym do realizacji zlecenia</li>
                <li>Dostawcy usług IT i chmurowych (AWS eu-central-1, Vercel) — na mocy stosownych umów powierzenia przetwarzania danych</li>
                <li>Biuro rachunkowe i doradcy prawni — w zakresie obowiązków rozliczeniowych i compliance</li>
                <li>Organy administracji publicznej (ZUS, US, PIP) — na podstawie przepisów prawa</li>
                <li>Dostawcy usług komunikacyjnych (SendGrid, Twilio) — wyłącznie do celów kontaktowych</li>
              </ul>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Nexflow nie sprzedaje danych osobowych podmiotom trzecim. Wszelkie przekazania danych poza obszar EOG odbywają się z zastosowaniem odpowiednich zabezpieczeń (standardowe klauzule umowne Komisji Europejskiej).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">6. Twoje prawa</h2>
              <p className="text-graphite text-sm leading-relaxed mb-3">Na podstawie RODO przysługują Ci następujące prawa:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Prawo dostępu", desc: "Możesz zażądać kopii danych, które przechowujemy na Twój temat." },
                  { title: "Prawo do sprostowania", desc: "Możesz żądać poprawienia nieprawidłowych lub uzupełnienia niekompletnych danych." },
                  { title: "Prawo do usunięcia", desc: "Możesz żądać usunięcia swoich danych (\"prawo do bycia zapomnianym\")." },
                  { title: "Prawo do przenoszenia", desc: "Możesz otrzymać swoje dane w ustrukturyzowanym, powszechnie używanym formacie." },
                  { title: "Prawo do ograniczenia przetwarzania", desc: "Możesz żądać ograniczenia przetwarzania Twoich danych w określonych okolicznościach." },
                  { title: "Prawo sprzeciwu", desc: "Możesz sprzeciwić się przetwarzaniu opartemu na prawnie uzasadnionym interesie Administratora." },
                  { title: "Cofnięcie zgody", desc: "Jeśli przetwarzanie opiera się na Twojej zgodzie, możesz ją cofnąć w dowolnym momencie." },
                  { title: "Skarga do organu nadzorczego", desc: "Masz prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa)." },
                ].map((r) => (
                  <div key={r.title} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-nexflow-navy mb-1">{r.title}</p>
                    <p className="text-xs text-slate leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-graphite text-sm leading-relaxed mt-4">
                Aby skorzystać z przysługujących Ci praw, skontaktuj się z nami pod adresem:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>.
                Odpowiemy w ciągu 30 dni.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">7. Pliki cookies i analityka</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Serwis nexflow.work może używać plików cookies niezbędnych technicznie do jego działania. Nie stosujemy śledzących plików cookies stron trzecich bez Twojej uprzedniej zgody.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">8. Zmiany polityki prywatności</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Nexflow zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce prywatności. O wszelkich istotnych zmianach poinformujemy poprzez aktualizację daty na górze niniejszego dokumentu.
              </p>
            </div>

            <div className="rounded-2xl bg-nexflow-navy text-white p-6 mt-4">
              <h2 className="text-lg font-bold mb-2">Kontakt w sprawie danych osobowych</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Nexflow Sp. z o.o.<br />
                Słubice, Polska<br />
                E-mail:{" "}
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

/* ── English ─────────────────────────────────────────────────────────────── */

function PrivacyPageEN() {
  return (
    <>
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Legal documents
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 text-white/60 text-sm">Last updated: 1 April 2026</p>
        </div>
      </section>

      <section className="py-16 bg-cloud-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none space-y-10">
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">1. Data Controller</h2>
              <p className="text-graphite text-sm leading-relaxed">
                The controller of your personal data is{" "}
                <strong>Nexflow Sp. z o.o.</strong> with its registered office in Słubice, Poland
                (NIP: PL5981632310, KRS: 0000496516, REGON: 081188992),
                hereinafter referred to as &ldquo;Nexflow&rdquo; or the &ldquo;Controller&rdquo;.
              </p>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Contact for data protection matters:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>{" "}
                or in writing to the Company&apos;s registered address.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">2. Purposes and Legal Bases for Processing</h2>
              <GenericPolicyTable
                col1="Purpose"
                col2="Legal basis"
                rows={[
                  { a: "Candidate recruitment", b: "Art. 6(1)(b) GDPR — necessity for contract; Art. 6(1)(a) GDPR — candidate consent" },
                  { a: "Handling contact form enquiries", b: "Art. 6(1)(b) GDPR — pre-contractual measures" },
                  { a: "Execution and billing of staffing assignments", b: "Art. 6(1)(b) and (c) GDPR — contract performance and legal obligations" },
                  { a: "Direct marketing and analytics", b: "Art. 6(1)(f) GDPR — legitimate interests of the Controller" },
                  { a: "Compliance obligations (GDPR, AUeG, Polish temporary employment act)", b: "Art. 6(1)(c) GDPR — legal obligation" },
                ]}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">3. Categories of Data Processed</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-1">
                <li>Identity data: first name, last name, national ID number (where required by law)</li>
                <li>Contact data: e-mail address, phone number, correspondence address</li>
                <li>Professional data: experience, qualifications, preferred position, CV</li>
                <li>Employment data: contracts, pay rates, working hours</li>
                <li>Document data: identity document type and number, work permit, A1 certificate (for workers posted to DE)</li>
                <li>Technical data: IP address, worker portal login credentials</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">4. Retention Periods</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-2">
                <li><strong>Candidates (recruitment):</strong> 12 months from the date of application, unless you consent to longer retention or are hired.</li>
                <li><strong>Employees (active employment):</strong> throughout the employment relationship and thereafter for the periods required by law (generally 10 years).</li>
                <li><strong>Contact enquiries:</strong> until the enquiry is resolved and for 12 months after the last contact.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">5. Recipients of Data</h2>
              <p className="text-graphite text-sm leading-relaxed">Your data may be shared with the following categories of recipients:</p>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed mt-2 space-y-1">
                <li>User employers (Nexflow clients) — to the extent necessary for assignment fulfilment</li>
                <li>IT and cloud service providers (AWS eu-central-1, Vercel) — under data processing agreements</li>
                <li>Accounting firm and legal advisers — for billing and compliance purposes</li>
                <li>Public authorities (ZUS, tax office, labour inspectorate) — as required by law</li>
                <li>Communication service providers (SendGrid, Twilio) — for contact purposes only</li>
              </ul>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Nexflow does not sell personal data to third parties. Any transfers outside the EEA are made with appropriate safeguards (EU Standard Contractual Clauses).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">6. Your Rights</h2>
              <p className="text-graphite text-sm leading-relaxed mb-3">Under the GDPR you have the following rights:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Right of access", desc: "You may request a copy of the data we hold about you." },
                  { title: "Right to rectification", desc: "You may request correction of inaccurate or completion of incomplete data." },
                  { title: "Right to erasure", desc: "You may request deletion of your data (\"right to be forgotten\") where no other legal basis applies." },
                  { title: "Right to data portability", desc: "You may receive your data in a structured, commonly used and machine-readable format." },
                  { title: "Right to restriction of processing", desc: "You may request restriction of processing in certain circumstances." },
                  { title: "Right to object", desc: "You may object to processing based on the Controller&apos;s legitimate interests." },
                  { title: "Withdrawal of consent", desc: "Where processing is based on your consent, you may withdraw it at any time without affecting prior lawful processing." },
                  { title: "Right to lodge a complaint", desc: "You have the right to lodge a complaint with the President of the Polish Data Protection Office (UODO), ul. Stawki 2, 00-193 Warsaw." },
                ].map((r) => (
                  <div key={r.title} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-nexflow-navy mb-1">{r.title}</p>
                    <p className="text-xs text-slate leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-graphite text-sm leading-relaxed mt-4">
                To exercise your rights, contact us at:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>.
                We will respond within 30 days.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">7. Cookies and Analytics</h2>
              <p className="text-graphite text-sm leading-relaxed">
                The nexflow.work website may use technically necessary cookies. We do not use third-party tracking cookies without your prior consent.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">8. Changes to This Policy</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Nexflow reserves the right to update this Privacy Policy. We will notify you of any material changes by updating the date at the top of this document.
              </p>
            </div>

            <div className="rounded-2xl bg-nexflow-navy text-white p-6 mt-4">
              <h2 className="text-lg font-bold mb-2">Data Protection Contact</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Nexflow Sp. z o.o.<br />
                Słubice, Poland<br />
                E-mail:{" "}
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

/* ── Dutch ───────────────────────────────────────────────────────────────── */

function PrivacyPageNL() {
  return (
    <>
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Juridische documenten
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Privacybeleid
          </h1>
          <p className="mt-4 text-white/60 text-sm">Laatste update: 1 april 2026</p>
        </div>
      </section>

      <section className="py-16 bg-cloud-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none space-y-10">
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">1. Verwerkingsverantwoordelijke</h2>
              <p className="text-graphite text-sm leading-relaxed">
                De verwerkingsverantwoordelijke voor uw persoonsgegevens is{" "}
                <strong>Nexflow Sp. z o.o.</strong>, gevestigd in Słubice, Polen
                (NIP: PL5981632310, KRS: 0000496516, REGON: 081188992),
                hierna aangeduid als &ldquo;Nexflow&rdquo; of de &ldquo;Verwerkingsverantwoordelijke&rdquo;.
              </p>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Contact voor privacyzaken:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>{" "}
                of schriftelijk naar het geregistreerde adres van de onderneming.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">2. Doeleinden en rechtsgrondslagen</h2>
              <GenericPolicyTable
                col1="Doel"
                col2="Rechtsgrondslag"
                rows={[
                  { a: "Werving van kandidaten", b: "Art. 6 lid 1 sub b AVG — noodzakelijk voor de overeenkomst; art. 6 lid 1 sub a AVG — toestemming" },
                  { a: "Afhandeling van contactformulieren", b: "Art. 6 lid 1 sub b AVG — precontractuele maatregelen" },
                  { a: "Uitvoering en afrekening van opdrachten", b: "Art. 6 lid 1 sub b en c AVG — uitvoering overeenkomst en wettelijke verplichtingen" },
                  { a: "Direct marketing en analyse", b: "Art. 6 lid 1 sub f AVG — gerechtvaardigde belangen van de Verwerkingsverantwoordelijke" },
                  { a: "Nalevingsverplichtingen (AVG, AUeG, Poolse wet uitzendarbeid)", b: "Art. 6 lid 1 sub c AVG — wettelijke verplichting" },
                ]}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">3. Categorieën verwerkte gegevens</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-1">
                <li>Identificatiegegevens: voor- en achternaam, BSN/PESEL (indien wettelijk vereist)</li>
                <li>Contactgegevens: e-mailadres, telefoonnummer, correspondentieadres</li>
                <li>Professionele gegevens: ervaring, kwalificaties, gewenste functie, cv</li>
                <li>Arbeidsgegevens: contracten, loonschalen, arbeidstijden</li>
                <li>Documentgegevens: type en nummer identiteitsdocument, werkvergunning, A1-verklaring (voor gedetacheerden naar DE)</li>
                <li>Technische gegevens: IP-adres, inloggegevens werknemersportaal</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">4. Bewaartermijnen</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-2">
                <li><strong>Kandidaten (werving):</strong> 12 maanden na de sollicitatie, tenzij u toestemming geeft voor langer bewaren of in dienst treedt.</li>
                <li><strong>Werknemers (actief dienstverband):</strong> gedurende het dienstverband en daarna voor de wettelijk vereiste termijnen (doorgaans 10 jaar).</li>
                <li><strong>Contactverzoeken:</strong> tot afhandeling en 12 maanden na het laatste contact.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">5. Ontvangers van gegevens</h2>
              <p className="text-graphite text-sm leading-relaxed">Uw gegevens kunnen worden gedeeld met de volgende categorieën ontvangers:</p>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed mt-2 space-y-1">
                <li>Inlenende bedrijven (Nexflow-klanten) — voor zover noodzakelijk voor de uitvoering van de opdracht</li>
                <li>IT- en cloudleveranciers (AWS eu-central-1, Vercel) — op basis van verwerkersovereenkomsten</li>
                <li>Accountantskantoor en juridisch adviseurs — voor boekhoudkundige en nalevingsdoeleinden</li>
                <li>Overheidsinstanties (ZUS, Belastingdienst, Arbeidsinspectie) — op grond van wettelijke verplichtingen</li>
                <li>Communicatiediensten (SendGrid, Twilio) — uitsluitend voor contactdoeleinden</li>
              </ul>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Nexflow verkoopt geen persoonsgegevens aan derden. Overdrachten buiten de EER worden beschermd door passende waarborgen (EU Standard Contractual Clauses).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">6. Uw rechten</h2>
              <p className="text-graphite text-sm leading-relaxed mb-3">Op grond van de AVG heeft u de volgende rechten:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Recht op inzage", desc: "U kunt een kopie opvragen van de gegevens die wij over u bewaren." },
                  { title: "Recht op rectificatie", desc: "U kunt correctie van onjuiste of aanvulling van onvolledige gegevens verzoeken." },
                  { title: "Recht op verwijdering", desc: "U kunt verwijdering van uw gegevens verzoeken (\"recht op vergetelheid\")." },
                  { title: "Recht op dataportabiliteit", desc: "U kunt uw gegevens ontvangen in een gestructureerd, gangbaar en machine-leesbaar formaat." },
                  { title: "Recht op beperking van verwerking", desc: "U kunt in bepaalde omstandigheden beperking van de verwerking verzoeken." },
                  { title: "Recht van bezwaar", desc: "U kunt bezwaar maken tegen verwerking op basis van gerechtvaardigde belangen." },
                  { title: "Intrekking toestemming", desc: "Indien de verwerking op uw toestemming berust, kunt u deze te allen tijde intrekken." },
                  { title: "Recht om klacht in te dienen", desc: "U heeft het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens of de Poolse UODO." },
                ].map((r) => (
                  <div key={r.title} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-nexflow-navy mb-1">{r.title}</p>
                    <p className="text-xs text-slate leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-graphite text-sm leading-relaxed mt-4">
                Neem voor het uitoefenen van uw rechten contact op via:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>.
                Wij reageren binnen 30 dagen.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">7. Cookies en analytics</h2>
              <p className="text-graphite text-sm leading-relaxed">
                De website nexflow.work kan technisch noodzakelijke cookies gebruiken. Tracking-cookies van derden worden niet geplaatst zonder uw voorafgaande toestemming.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">8. Wijzigingen in dit beleid</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Nexflow behoudt zich het recht voor dit privacybeleid bij te werken. Wij informeren u over materiële wijzigingen door de datum bovenaan dit document te actualiseren.
              </p>
            </div>

            <div className="rounded-2xl bg-nexflow-navy text-white p-6 mt-4">
              <h2 className="text-lg font-bold mb-2">Contact privacyzaken</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Nexflow Sp. z o.o.<br />
                Słubice, Polen<br />
                E-mail:{" "}
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

/* ── Russian ─────────────────────────────────────────────────────────────── */

function PrivacyPageRU() {
  return (
    <>
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Юридические документы
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Политика конфиденциальности
          </h1>
          <p className="mt-4 text-white/60 text-sm">Последнее обновление: 1 апреля 2026 г.</p>
        </div>
      </section>

      <section className="py-16 bg-cloud-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none space-y-10">
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">1. Оператор персональных данных</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Оператором ваших персональных данных является{" "}
                <strong>Nexflow Sp. z o.o.</strong> с юридическим адресом в г. Слубице, Польша
                (NIP: PL5981632310, KRS: 0000496516, REGON: 081188992),
                далее именуемый «Nexflow» или «Оператор».
              </p>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Контакт по вопросам защиты данных:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>{" "}
                или по юридическому адресу Общества.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">2. Цели и правовые основания обработки данных</h2>
              <GenericPolicyTable
                col1="Цель"
                col2="Правовое основание"
                rows={[
                  { a: "Подбор кандидатов", b: "Ст. 6(1)(b) GDPR — необходимость для заключения договора; ст. 6(1)(a) GDPR — согласие кандидата" },
                  { a: "Обработка запросов через контактную форму", b: "Ст. 6(1)(b) GDPR — преддоговорные меры" },
                  { a: "Выполнение и расчёт командировочных заказов", b: "Ст. 6(1)(b) и (c) GDPR — исполнение договора и правовые обязательства" },
                  { a: "Прямой маркетинг и аналитика", b: "Ст. 6(1)(f) GDPR — законные интересы Оператора" },
                  { a: "Соблюдение требований законодательства (GDPR, AUeG, польский закон о временной занятости)", b: "Ст. 6(1)(c) GDPR — правовое обязательство" },
                ]}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">3. Категории обрабатываемых данных</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-1">
                <li>Идентификационные данные: имя, фамилия, номер удостоверения личности (при необходимости)</li>
                <li>Контактные данные: адрес электронной почты, номер телефона, почтовый адрес</li>
                <li>Профессиональные данные: опыт работы, квалификация, желаемая должность, резюме</li>
                <li>Данные о трудоустройстве: договоры, ставки вознаграждения, рабочее время</li>
                <li>Данные документов: тип и номер документа, удостоверяющего личность, разрешение на работу, сертификат A1 (для командированных в Германию)</li>
                <li>Технические данные: IP-адрес, данные входа на портал для сотрудников</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">4. Сроки хранения данных</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-2">
                <li><strong>Кандидаты (набор персонала):</strong> 12 месяцев с даты подачи заявки, если вы не дадите согласие на более длительное хранение или не будете трудоустроены.</li>
                <li><strong>Работники (активная занятость):</strong> на протяжении всего периода трудовых отношений, а после их прекращения — в течение сроков, установленных законодательством (как правило, 10 лет).</li>
                <li><strong>Контактные запросы:</strong> до рассмотрения запроса и в течение 12 месяцев после последнего контакта.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">5. Получатели данных</h2>
              <p className="text-graphite text-sm leading-relaxed">Ваши данные могут передаваться следующим категориям получателей:</p>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed mt-2 space-y-1">
                <li>Работодатели-пользователи (клиенты Nexflow) — в объёме, необходимом для выполнения заказа</li>
                <li>Поставщики IT- и облачных услуг (AWS eu-central-1, Vercel) — на основании договоров обработки данных</li>
                <li>Бухгалтерская фирма и юридические советники — в рамках расчётных и комплаенс-обязательств</li>
                <li>Государственные органы (ZUS, налоговая инспекция, трудовая инспекция) — в силу требований законодательства</li>
                <li>Поставщики коммуникационных услуг (SendGrid, Twilio) — исключительно в контактных целях</li>
              </ul>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Nexflow не продаёт персональные данные третьим лицам. Любая передача данных за пределы ЕЭЗ осуществляется с применением надлежащих гарантий (стандартные договорные положения Европейской комиссии).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">6. Ваши права</h2>
              <p className="text-graphite text-sm leading-relaxed mb-3">В соответствии с GDPR вам принадлежат следующие права:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Право на доступ", desc: "Вы можете запросить копию данных, которые мы храним о вас." },
                  { title: "Право на исправление", desc: "Вы можете потребовать исправления неточных или дополнения неполных данных." },
                  { title: "Право на удаление", desc: "Вы можете потребовать удаления ваших данных («право быть забытым»)." },
                  { title: "Право на переносимость данных", desc: "Вы можете получить ваши данные в структурированном, общепринятом формате." },
                  { title: "Право на ограничение обработки", desc: "Вы можете потребовать ограничения обработки ваших данных в определённых случаях." },
                  { title: "Право на возражение", desc: "Вы можете возразить против обработки, основанной на законных интересах Оператора." },
                  { title: "Отзыв согласия", desc: "Если обработка основана на вашем согласии, вы можете отозвать его в любое время." },
                  { title: "Право на жалобу", desc: "Вы вправе подать жалобу в Президенту Управления по защите персональных данных Польши (UODO), ул. Stawki 2, 00-193 Варшава." },
                ].map((r) => (
                  <div key={r.title} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-nexflow-navy mb-1">{r.title}</p>
                    <p className="text-xs text-slate leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-graphite text-sm leading-relaxed mt-4">
                Для осуществления своих прав свяжитесь с нами по адресу:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>.
                Мы ответим в течение 30 дней.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">7. Файлы cookie и аналитика</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Сайт nexflow.work может использовать технически необходимые файлы cookie. Мы не используем сторонние отслеживающие файлы cookie без вашего предварительного согласия.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">8. Изменения в политике конфиденциальности</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Nexflow оставляет за собой право вносить изменения в настоящую Политику. Об существенных изменениях мы уведомим путём обновления даты в начале документа.
              </p>
            </div>

            <div className="rounded-2xl bg-nexflow-navy text-white p-6 mt-4">
              <h2 className="text-lg font-bold mb-2">Контакт по вопросам защиты данных</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Nexflow Sp. z o.o.<br />
                Слубице, Польша<br />
                E-mail:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>
                <br />
                Тел.:{" "}
                <a href="tel:+48224878828" className="text-nexflow-cyan hover:underline">+48 224 878 828</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Ukrainian ───────────────────────────────────────────────────────────── */

function PrivacyPageUK() {
  return (
    <>
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Юридичні документи
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Політика конфіденційності
          </h1>
          <p className="mt-4 text-white/60 text-sm">Останнє оновлення: 1 квітня 2026 р.</p>
        </div>
      </section>

      <section className="py-16 bg-cloud-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none space-y-10">
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">1. Оператор персональних даних</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Оператором ваших персональних даних є{" "}
                <strong>Nexflow Sp. z o.o.</strong> із юридичною адресою в м. Слубіце, Польща
                (NIP: PL5981632310, KRS: 0000496516, REGON: 081188992),
                далі іменований «Nexflow» або «Оператор».
              </p>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Контакт з питань захисту даних:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>{" "}
                або письмово за юридичною адресою Товариства.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">2. Цілі та правові підстави обробки даних</h2>
              <GenericPolicyTable
                col1="Мета"
                col2="Правова підстава"
                rows={[
                  { a: "Добір кандидатів", b: "Ст. 6(1)(b) GDPR — необхідність для укладення договору; ст. 6(1)(a) GDPR — згода кандидата" },
                  { a: "Обробка запитів через контактну форму", b: "Ст. 6(1)(b) GDPR — переддоговірні заходи" },
                  { a: "Виконання та розрахунок командировочних замовлень", b: "Ст. 6(1)(b) та (c) GDPR — виконання договору та правові зобов'язання" },
                  { a: "Прямий маркетинг та аналітика", b: "Ст. 6(1)(f) GDPR — законні інтереси Оператора" },
                  { a: "Дотримання вимог законодавства (GDPR, AUeG, польський закон про тимчасову зайнятість)", b: "Ст. 6(1)(c) GDPR — правове зобов'язання" },
                ]}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">3. Категорії оброблюваних даних</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-1">
                <li>Ідентифікаційні дані: ім'я, прізвище, номер посвідчення особи (за необхідності)</li>
                <li>Контактні дані: адреса електронної пошти, номер телефону, поштова адреса</li>
                <li>Професійні дані: досвід роботи, кваліфікація, бажана посада, резюме</li>
                <li>Дані про зайнятість: договори, ставки винагороди, робочий час</li>
                <li>Дані документів: тип і номер документа, дозвіл на роботу, сертифікат A1 (для відряджених до Німеччини)</li>
                <li>Технічні дані: IP-адреса, дані входу на портал для співробітників</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">4. Строки зберігання даних</h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-2">
                <li><strong>Кандидати (добір персоналу):</strong> 12 місяців з дати подання заявки, якщо ви не надали згоду на триваліше зберігання або не були прийняті на роботу.</li>
                <li><strong>Працівники (активна зайнятість):</strong> протягом усього трудових відносин, а після їх припинення — протягом строків, встановлених законодавством (як правило, 10 років).</li>
                <li><strong>Контактні запити:</strong> до розгляду запиту та протягом 12 місяців після останнього контакту.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">5. Одержувачі даних</h2>
              <p className="text-graphite text-sm leading-relaxed">Ваші дані можуть передаватися таким категоріям одержувачів:</p>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed mt-2 space-y-1">
                <li>Роботодавці-користувачі (клієнти Nexflow) — в обсязі, необхідному для виконання замовлення</li>
                <li>Постачальники IT- та хмарних послуг (AWS eu-central-1, Vercel) — на підставі договорів обробки даних</li>
                <li>Бухгалтерська фірма та юридичні радники — у рамках розрахункових та комплаєнс-зобов'язань</li>
                <li>Державні органи (ZUS, податкова інспекція, інспекція праці) — на підставі вимог законодавства</li>
                <li>Постачальники комунікаційних послуг (SendGrid, Twilio) — виключно з метою зв'язку</li>
              </ul>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Nexflow не продає персональні дані третім особам. Будь-яка передача даних за межі ЄЕЗ здійснюється із застосуванням належних гарантій (стандартні договірні положення Європейської комісії).
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">6. Ваші права</h2>
              <p className="text-graphite text-sm leading-relaxed mb-3">Відповідно до GDPR вам належать такі права:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Право на доступ", desc: "Ви можете запросити копію даних, які ми зберігаємо про вас." },
                  { title: "Право на виправлення", desc: "Ви можете вимагати виправлення неточних або доповнення неповних даних." },
                  { title: "Право на видалення", desc: "Ви можете вимагати видалення ваших даних («право бути забутим»)." },
                  { title: "Право на портативність даних", desc: "Ви можете отримати свої дані у структурованому, загальноприйнятому форматі." },
                  { title: "Право на обмеження обробки", desc: "Ви можете вимагати обмеження обробки ваших даних у певних випадках." },
                  { title: "Право на заперечення", desc: "Ви можете заперечити проти обробки, що ґрунтується на законних інтересах Оператора." },
                  { title: "Відкликання згоди", desc: "Якщо обробка ґрунтується на вашій згоді, ви можете відкликати її в будь-який час." },
                  { title: "Право на скаргу", desc: "Ви маєте право подати скаргу до Президента Управління захисту персональних даних Польщі (UODO), вул. Stawki 2, 00-193 Варшава." },
                ].map((r) => (
                  <div key={r.title} className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-semibold text-nexflow-navy mb-1">{r.title}</p>
                    <p className="text-xs text-slate leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-graphite text-sm leading-relaxed mt-4">
                Для реалізації своїх прав зверніться до нас за адресою:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>.
                Ми відповімо протягом 30 днів.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">7. Файли cookie та аналітика</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Сайт nexflow.work може використовувати технічно необхідні файли cookie. Ми не використовуємо сторонні відстежувальні файли cookie без вашої попередньої згоди.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">8. Зміни в політиці конфіденційності</h2>
              <p className="text-graphite text-sm leading-relaxed">
                Nexflow залишає за собою право вносити зміни до цієї Політики. Про суттєві зміни ми повідомимо шляхом оновлення дати на початку документа.
              </p>
            </div>

            <div className="rounded-2xl bg-nexflow-navy text-white p-6 mt-4">
              <h2 className="text-lg font-bold mb-2">Контакт з питань захисту даних</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Nexflow Sp. z o.o.<br />
                Слубіце, Польща<br />
                E-mail:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">privacy@nexflow.work</a>
                <br />
                Тел.:{" "}
                <a href="tel:+48224878828" className="text-nexflow-cyan hover:underline">+48 224 878 828</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── Shared table components ─────────────────────────────────────────────── */

function PolicyTablePL({ rows }: { rows: { cel: string; podstawa: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-nexflow-navy text-white">
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider w-2/5">Cel przetwarzania</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">Podstawa prawna</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-4 py-3 text-graphite align-top">{row.cel}</td>
              <td className="px-4 py-3 text-slate align-top">{row.podstawa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GenericPolicyTable({
  col1,
  col2,
  rows,
}: {
  col1: string;
  col2: string;
  rows: { a: string; b: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-nexflow-navy text-white">
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider w-2/5">{col1}</th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">{col2}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-4 py-3 text-graphite align-top">{row.a}</td>
              <td className="px-4 py-3 text-slate align-top">{row.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
