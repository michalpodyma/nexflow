"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getWorkerLocale, isWorkerAuthenticated, setWorkerLocale, type WorkerLocale } from "@/lib/worker-auth";
import { workerLogout } from "@/lib/worker-api";

const NAV_LABELS: Record<WorkerLocale, Record<string, string>> = {
  pl: {
    dashboard: "Pulpit",
    payslips: "Wypłaty",
    schedule: "Grafik",
    documents: "Dokumenty",
    profile: "Profil",
    logout: "Wyloguj",
  },
  uk: {
    dashboard: "Головна",
    payslips: "Виплати",
    schedule: "Графік",
    documents: "Документи",
    profile: "Профіль",
    logout: "Вийти",
  },
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useState<WorkerLocale>("pl");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLocale(getWorkerLocale());
  }, []);

  // Redirect to login if not authenticated (except on /worker/login itself)
  useEffect(() => {
    if (!pathname.startsWith("/worker/login") && !isWorkerAuthenticated()) {
      router.replace("/worker/login");
    }
  }, [pathname, router]);

  const t = NAV_LABELS[locale];

  const navItems = [
    { href: "/worker/dashboard", label: t.dashboard, icon: "🏠" },
    { href: "/worker/payslips", label: t.payslips, icon: "💰" },
    { href: "/worker/schedule", label: t.schedule, icon: "📅" },
    { href: "/worker/documents", label: t.documents, icon: "📄" },
    { href: "/worker/profile", label: t.profile, icon: "👤" },
  ];

  async function handleLogout() {
    await workerLogout();
    router.push("/worker/login");
  }

  function toggleLocale() {
    const next: WorkerLocale = locale === "pl" ? "uk" : "pl";
    setWorkerLocale(next);
    setLocale(next);
  }

  // Login page: no nav wrapper
  if (pathname.startsWith("/worker/login")) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow">
        <span className="font-bold text-lg tracking-tight">Nexflow</span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLocale}
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded px-2 py-1 transition-colors"
            aria-label="Toggle language"
          >
            {locale === "pl" ? "🇺🇦 UA" : "🇵🇱 PL"}
          </button>
          <button
            className="text-sm"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Slide-down mobile menu */}
      {menuOpen && (
        <div className="bg-blue-800 text-white px-4 py-2 space-y-1 shadow-md">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                pathname.startsWith(item.href) ? "bg-blue-600" : "hover:bg-blue-700"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm font-medium text-red-300 hover:bg-blue-700 transition-colors"
          >
            <span>🚪</span>
            {t.logout}
          </button>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav bar */}
      <nav className="bg-white border-t border-gray-200 flex fixed bottom-0 left-0 right-0 z-10">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? "text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="text-lg leading-none mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom nav spacer */}
      <div className="h-16" />
    </div>
  );
}
