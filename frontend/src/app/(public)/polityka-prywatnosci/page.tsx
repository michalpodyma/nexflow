import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatności | Nexflow",
  description:
    "Polityka prywatności Nexflow Sp. z o.o. — informacje o przetwarzaniu danych osobowych zgodnie z RODO.",
};

export default function PolitykaPrywatnosciPage() {
  return (
    <>
      {/* Hero */}
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

      {/* Content */}
      <section className="py-16 bg-cloud-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-slate max-w-none space-y-10">

            {/* 1 */}
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
                <a
                  href="mailto:privacy@nexflow.work"
                  className="text-nexflow-cyan hover:underline"
                >
                  privacy@nexflow.work
                </a>{" "}
                lub pisemnie na adres siedziby Spółki.
              </p>
            </div>

            {/* 2 */}
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                2. Cele i podstawy prawne przetwarzania danych
              </h2>
              <div className="space-y-4">
                <PolicyTable
                  rows={[
                    {
                      cel: "Rekrutacja kandydatów",
                      podstawa:
                        "Art. 6 ust. 1 lit. b RODO — niezbędność do zawarcia umowy; art. 6 ust. 1 lit. a RODO — zgoda kandydata",
                    },
                    {
                      cel: "Obsługa zapytań przez formularz kontaktowy",
                      podstawa:
                        "Art. 6 ust. 1 lit. b RODO — niezbędność do wykonania umowy lub podjęcia działań przed zawarciem umowy",
                    },
                    {
                      cel: "Realizacja i rozliczanie zleceń pracowniczych",
                      podstawa:
                        "Art. 6 ust. 1 lit. b oraz lit. c RODO — wykonanie umowy i obowiązki prawne (prawo pracy, ZUS, podatki)",
                    },
                    {
                      cel: "Marketing bezpośredni i analityka",
                      podstawa:
                        "Art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes Administratora",
                    },
                    {
                      cel: "Spełnienie obowiązków zgodności (RODO, AUeG, polska ustawa o zatrudnianiu pracowników tymczasowych)",
                      podstawa:
                        "Art. 6 ust. 1 lit. c RODO — obowiązek prawny",
                    },
                  ]}
                />
              </div>
            </div>

            {/* 3 */}
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

            {/* 4 */}
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                4. Okres przechowywania danych
              </h2>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed space-y-2">
                <li>
                  <strong>Kandydaci (rekrutacja):</strong> 12 miesięcy od złożenia zgłoszenia,
                  chyba że wyrazisz zgodę na dłuższe przechowywanie lub zostaniesz
                  zatrudniony/a.
                </li>
                <li>
                  <strong>Pracownicy (aktywne zatrudnienie):</strong> przez cały czas trwania stosunku pracy,
                  a po jego zakończeniu — przez okresy wymagane przepisami prawa (co do zasady
                  10 lat od zakończenia roku, w którym stosunek pracy ustał, zgodnie z prawem podatkowym i ubezpieczeniowym).
                </li>
                <li>
                  <strong>Zapytania kontaktowe:</strong> do czasu rozpatrzenia zapytania oraz przez 12 miesięcy
                  od ostatniego kontaktu w celach dowodowych.
                </li>
              </ul>
            </div>

            {/* 5 */}
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                5. Odbiorcy danych
              </h2>
              <p className="text-graphite text-sm leading-relaxed">
                Twoje dane mogą być przekazywane następującym kategoriom odbiorców:
              </p>
              <ul className="list-disc list-inside text-sm text-graphite leading-relaxed mt-2 space-y-1">
                <li>Pracodawcy użytkownicy (klienci Nexflow) — w zakresie niezbędnym do realizacji zlecenia</li>
                <li>Dostawcy usług IT i chmurowych (AWS eu-central-1, Vercel) — na mocy stosownych umów powierzenia przetwarzania danych</li>
                <li>Biuro rachunkowe i doradcy prawni — w zakresie obowiązków rozliczeniowych i compliance</li>
                <li>Organy administracji publicznej (ZUS, US, PIP) — na podstawie przepisów prawa</li>
                <li>Dostawcy usług komunikacyjnych (SendGrid, Twilio) — wyłącznie do celów kontaktowych</li>
              </ul>
              <p className="text-graphite text-sm leading-relaxed mt-3">
                Nexflow nie sprzedaje danych osobowych podmiotom trzecim. Wszelkie przekazania danych poza
                obszar EOG odbywają się z zastosowaniem odpowiednich zabezpieczeń (standardowe klauzule
                umowne Komisji Europejskiej).
              </p>
            </div>

            {/* 6 */}
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                6. Twoje prawa
              </h2>
              <p className="text-graphite text-sm leading-relaxed mb-3">
                Na podstawie RODO przysługują Ci następujące prawa:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: "Prawo dostępu",
                    desc: "Możesz zażądać kopii danych, które przechowujemy na Twój temat.",
                  },
                  {
                    title: "Prawo do sprostowania",
                    desc: "Możesz żądać poprawienia nieprawidłowych lub uzupełnienia niekompletnych danych.",
                  },
                  {
                    title: "Prawo do usunięcia",
                    desc: "Możesz żądać usunięcia swoich danych (\"prawo do bycia zapomnianym\"), o ile nie istnieje inna podstawa prawna ich przetwarzania.",
                  },
                  {
                    title: "Prawo do przenoszenia",
                    desc: "Możesz otrzymać swoje dane w ustrukturyzowanym, powszechnie używanym formacie.",
                  },
                  {
                    title: "Prawo do ograniczenia przetwarzania",
                    desc: "Możesz żądać ograniczenia przetwarzania Twoich danych w określonych okolicznościach.",
                  },
                  {
                    title: "Prawo sprzeciwu",
                    desc: "Możesz sprzeciwić się przetwarzaniu opartemu na prawnie uzasadnionym interesie Administratora.",
                  },
                  {
                    title: "Cofnięcie zgody",
                    desc: "Jeśli przetwarzanie opiera się na Twojej zgodzie, możesz ją cofnąć w dowolnym momencie bez wpływu na zgodność z prawem wcześniejszego przetwarzania.",
                  },
                  {
                    title: "Skarga do organu nadzorczego",
                    desc: "Masz prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).",
                  },
                ].map((r) => (
                  <div
                    key={r.title}
                    className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-nexflow-navy mb-1">{r.title}</p>
                    <p className="text-xs text-slate leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-graphite text-sm leading-relaxed mt-4">
                Aby skorzystać z przysługujących Ci praw, skontaktuj się z nami pod adresem:{" "}
                <a
                  href="mailto:privacy@nexflow.work"
                  className="text-nexflow-cyan hover:underline"
                >
                  privacy@nexflow.work
                </a>
                . Odpowiemy w ciągu 30 dni.
              </p>
            </div>

            {/* 7 */}
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                7. Pliki cookies i analityka
              </h2>
              <p className="text-graphite text-sm leading-relaxed">
                Serwis nexflow.work może używać plików cookies niezbędnych technicznie do
                jego działania. Nie stosujemy śledzących plików cookies stron trzecich bez
                Twojej uprzedniej zgody. Więcej informacji znajdziesz w ustawieniach
                przeglądarki.
              </p>
            </div>

            {/* 8 */}
            <div>
              <h2 className="text-xl font-bold text-nexflow-navy mb-3">
                8. Zmiany polityki prywatności
              </h2>
              <p className="text-graphite text-sm leading-relaxed">
                Nexflow zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce
                prywatności. O wszelkich istotnych zmianach poinformujemy poprzez aktualizację
                daty na górze niniejszego dokumentu. Korzystanie z naszych usług po
                opublikowaniu zmian oznacza ich akceptację.
              </p>
            </div>

            {/* Contact */}
            <div className="rounded-2xl bg-nexflow-navy text-white p-6 mt-4">
              <h2 className="text-lg font-bold mb-2">Kontakt w sprawie danych osobowych</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Nexflow Sp. z o.o.<br />
                Słubice, Polska<br />
                E-mail:{" "}
                <a href="mailto:privacy@nexflow.work" className="text-nexflow-cyan hover:underline">
                  privacy@nexflow.work
                </a>
                <br />
                Tel.:{" "}
                <a href="tel:+48224878828" className="text-nexflow-cyan hover:underline">
                  +48 224 878 828
                </a>
              </p>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}

function PolicyTable({
  rows,
}: {
  rows: { cel: string; podstawa: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-nexflow-navy text-white">
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider w-2/5">
              Cel przetwarzania
            </th>
            <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider">
              Podstawa prawna
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-3 text-graphite align-top">{row.cel}</td>
              <td className="px-4 py-3 text-slate align-top">{row.podstawa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
