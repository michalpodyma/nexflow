import { getLocale } from "next-intl/server";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function NotFound() {
  let locale = "pl";
  try {
    locale = await getLocale();
  } catch {
    // fall back to Polish if locale context is unavailable
  }

  return (
    <div className="min-h-screen bg-nexflow-navy flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <p className="text-nexflow-cyan text-8xl font-extrabold leading-none mb-4">
          404
        </p>
        <h1 className="text-white text-2xl font-semibold mb-6">
          Ta strona nie istnieje
        </h1>
        <Link
          href={`/${locale}`}
          className="bg-nexflow-cyan text-nexflow-navy font-bold px-6 py-3 rounded hover:opacity-90 transition-opacity"
        >
          Wróć na stronę główną
        </Link>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
