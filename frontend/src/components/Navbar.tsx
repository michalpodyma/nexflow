"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import FlowMark from "./FlowMark";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: `/${locale}/oferty`, label: t("jobs") },
    { href: `/${locale}/uslugi`, label: t("services") },
    { href: `/${locale}/o-nas`, label: t("about") },
    { href: `/${locale}/kontakt`, label: t("contact") },
  ];

  return (
    <header className="bg-nexflow-navy sticky top-0 z-50 shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center" aria-label="Nexflow">
            <FlowMark variant="full" colorScheme="reversed" height={32} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  pathname === link.href
                    ? "text-nexflow-cyan"
                    : "text-white hover:text-nexflow-cyan"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/aplikuj`}
              className="bg-nexflow-cyan text-nexflow-navy font-semibold text-sm px-5 py-2 rounded-lg hover:bg-opacity-90 transition-all duration-200"
            >
              {t("apply")}
            </Link>
            <LanguageSwitcher />
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t("openMenu")}
            aria-expanded={mobileOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-white/10 mt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-sm font-medium transition-colors duration-200 ${
                  pathname === link.href
                    ? "text-nexflow-cyan"
                    : "text-white hover:text-nexflow-cyan"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/aplikuj`}
              onClick={() => setMobileOpen(false)}
              className="mt-3 block w-full text-center bg-nexflow-cyan text-nexflow-navy font-semibold text-sm px-5 py-2 rounded-lg"
            >
              {t("apply")}
            </Link>
            <div className="mt-4 pt-3 border-t border-white/10">
              <LanguageSwitcher />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
