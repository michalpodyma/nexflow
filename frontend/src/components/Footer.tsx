import Link from "next/link";
import FlowMark from "./FlowMark";

const serviceLinks = [
  { href: "/uslugi#tymczasowi", label: "Pracownicy tymczasowi" },
  { href: "/uslugi#rekrutacja", label: "Rekrutacja stała" },
  { href: "/uslugi#headhunting", label: "Headhunting" },
  { href: "/uslugi#doradztwo", label: "Doradztwo HR" },
];

const companyLinks = [
  { href: "/oferty", label: "Oferty pracy" },
  { href: "/o-nas", label: "O nas" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/kontakt#pracodawcy", label: "Dla pracodawców" },
  { href: "/kontakt#pracownicy", label: "Dla pracowników" },
];

export default function Footer() {
  return (
    <footer className="bg-nexflow-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <FlowMark variant="full" colorScheme="reversed" height={32} />
            <p className="mt-4 text-white/70 text-sm leading-relaxed max-w-xs">
              Agencja pracy specjalizująca się w sektorze warehouse i logistyki
              w Polsce i Niemczech. Pracownicy gotowi do pracy w 5 dni roboczych.
            </p>
            <p className="mt-4 text-nexflow-cyan text-sm font-semibold italic">
              Workforce in motion.
            </p>
            <div className="mt-6 space-y-1 text-sm text-white/70">
              <p>
                <a href="tel:+48224878828" className="hover:text-nexflow-cyan transition-colors">
                  +48 224 878 828
                </a>{" "}
                (biuro)
              </p>
              <p>
                <a href="mailto:info@nexflow.work" className="hover:text-nexflow-cyan transition-colors">
                  info@nexflow.work
                </a>
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">
              Usługi
            </h3>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 hover:text-nexflow-cyan transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">
              Firma
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 hover:text-nexflow-cyan transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="text-xs text-white/40 space-y-1">
              <p>Nexflow Sp. z o.o. | NIP: PL5981632310 | KRS: 0000496516 | REGON: 081188992</p>
              <p>Działamy na podstawie certyfikatu KRAZ nr 10916. Słubice, Polska (granica DE-PL).</p>
            </div>
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Nexflow Sp. z o.o. Wszelkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
