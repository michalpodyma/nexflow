import Link from "next/link";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-xl font-bold" style={{ color: "#003049" }}>Nexflow</span>
        <div className="flex items-center gap-4">
          <Link href="/oferty" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Oferty pracy
          </Link>
          <Link
            href="/intake"
            className="text-sm px-4 py-2 rounded-md text-white font-medium transition-colors"
            style={{ backgroundColor: "#003049" }}
          >
            Aplikuj teraz
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#0090e0" }}>
          Agencja pracy tymczasowej
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6" style={{ color: "#003049" }}>
          Znajdź pracę w magazynie<br />lub logistyce
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
          Łączymy pracowników z najlepszymi pracodawcami w Polsce i Niemczech.
          Szybka rekrutacja, legalne zatrudnienie, pełne wsparcie.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center px-8 py-3 rounded-md text-white font-semibold text-base transition-colors hover:opacity-90"
            style={{ backgroundColor: "#003049" }}
          >
            Wyślij zgłoszenie
          </Link>
          <Link
            href="/oferty"
            className="inline-flex items-center justify-center px-8 py-3 rounded-md font-semibold text-base border transition-colors hover:bg-gray-50"
            style={{ color: "#003049", borderColor: "#003049" }}
          >
            Zobacz oferty pracy
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-8 text-center">
          {[
            { icon: "⚡", title: "Szybka rekrutacja", desc: "Odpowiadamy w ciągu 48 godzin od przesłania zgłoszenia." },
            { icon: "📋", title: "Legalne zatrudnienie", desc: "Umowy, ubezpieczenie, pełna zgodność z polskim i niemieckim prawem pracy." },
            { icon: "🌍", title: "Polska i Niemcy", desc: "Oferty w magazynach i firmach logistycznych po obu stronach granicy." },
          ].map((f) => (
            <div key={f.title}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-2xl font-bold mb-4" style={{ color: "#003049" }}>
          Gotowy do pracy?
        </h2>
        <p className="text-gray-500 mb-6">Wypełnij krótki formularz — nasz rekruter odezwie się do Ciebie.</p>
        <Link
          href="/intake"
          className="inline-flex items-center justify-center px-8 py-3 rounded-md text-white font-semibold transition-colors hover:opacity-90"
          style={{ backgroundColor: "#0090e0" }}
        >
          Aplikuj bezpłatnie →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center text-xs text-gray-400">
        <p>Nexflow sp. z o.o. · Słubice, Polska · <a href="mailto:kontakt@nexflow.eu" className="hover:underline">kontakt@nexflow.eu</a></p>
        <p className="mt-1">
          <Link href="/dashboard" className="hover:underline">Rekruterzy — zaloguj się</Link>
        </p>
      </footer>
    </div>
  );
}
