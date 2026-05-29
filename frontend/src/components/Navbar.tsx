"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import FlowMark from "./FlowMark";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: `/${locale}/oferty`, label: t("jobs") },
    { href: `/${locale}/uslugi`, label: t("services") },
    { href: `/${locale}/o-nas`, label: t("about") },
    { href: `/${locale}/kontakt`, label: t("contact") },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-surface-1 border-b border-hairline"
          : "bg-transparent"
      }`}
    >
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
                className={`text-body-sm font-medium transition-colors duration-200 ${
                  pathname === link.href
                    ? "text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/aplikuj`}
              className="inline-flex items-center justify-center h-11 px-5 rounded-sm bg-accent text-ink-inverse font-semibold text-body-sm transition-colors duration-200 hover:bg-accent-hover min-w-[44px]"
            >
              {t("apply")}
            </Link>
            <LanguageSwitcher />
          </div>

          {/* Mobile: lang switcher always visible + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              className="text-ink p-2"
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
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-hairline mt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-3 text-body-sm font-medium transition-colors duration-200 ${
                  pathname === link.href
                    ? "text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/aplikuj`}
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex items-center justify-center h-11 w-full rounded-sm bg-accent text-ink-inverse font-semibold text-body-sm"
            >
              {t("apply")}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
