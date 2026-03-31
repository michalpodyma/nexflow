import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest mb-4 text-nexflow-cyan">
          Agencja pracy tymczasowej
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6 text-nexflow-navy">
          Znajdź pracę w magazynie<br />lub logistyce
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
          Łączymy pracowników z najlepszymi pracodawcami w Polsce i Niemczech.
          Szybka rekrutacja, legalne zatrudnienie, pełne wsparcie.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/intake" className="btn-primary text-base">
            Wyślij zgłoszenie
          </Link>
          <Link href="/oferty" className="btn-outline text-base">
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
        <h2 className="text-2xl font-bold mb-4 text-nexflow-navy">Gotowy do pracy?</h2>
        <p className="text-gray-500 mb-6">Wypełnij krótki formularz — nasz rekruter odezwie się do Ciebie.</p>
        <Link href="/intake" className="btn-primary text-base">
          Aplikuj bezpłatnie →
        </Link>
      </section>

      <Footer />
    </div>
  );
}
