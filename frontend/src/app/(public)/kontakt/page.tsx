import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Skontaktuj się z Nexflow. Umów rozmowę, zapytaj o pracowników lub aplikuj o pracę. Oddzwonimy tego samego dnia.",
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-nexflow-navy text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-nexflow-cyan text-sm font-semibold uppercase tracking-wider mb-3">
            Kontakt
          </p>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl leading-tight">
            Oddzwonimy jeszcze dzisiaj.
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed">
            Powiedz nam, czego potrzebujesz — pracowników do magazynu,
            rekrutacji na stałe, albo chcesz sam do nas dołączyć. Wrócimy do
            Ciebie szybko i konkretnie.
          </p>
        </div>
      </section>

      {/* Contact content */}
      <section className="py-16 bg-cloud-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact details */}
            <div className="lg:col-span-2">
              {/* For employers */}
              <div id="pracodawcy" className="mb-10">
                <h2 className="text-xl font-bold text-nexflow-navy mb-4">Dla pracodawców</h2>
                <p className="text-slate text-sm leading-relaxed mb-6">
                  Szukasz pracowników do magazynu, logistyki lub transportu?
                  Skontaktuj się bezpośrednio — wrócimy do Ciebie z propozycją
                  jeszcze tego samego dnia.
                </p>

                <div className="space-y-4">
                  <ContactCard
                    name="Michał Podyma"
                    role="Prezes Zarządu"
                    email="mp@nexflow.work"
                  />
                  <ContactCard
                    name="Anatolii Tychonenko"
                    role="Wiceprezes Zarządu"
                    email="at@nexflow.work"
                  />
                  <ContactCard
                    name="Świetłana Owsiejczuk"
                    role="Manager"
                    email="so@nexflow.work"
                  />
                </div>

                <div className="mt-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">
                    Centralny numer biura
                  </p>
                  <div className="text-sm text-graphite space-y-1">
                    <p>
                      <a href="tel:+48224878828" className="hover:text-nexflow-cyan transition-colors font-medium">
                        +48 224 878 828
                      </a>{" "}
                      <span className="text-slate">(PL/DE)</span>
                    </p>
                    <p className="text-slate mt-2">
                      <a href="mailto:info@nexflow.work" className="hover:text-nexflow-cyan transition-colors">
                        info@nexflow.work
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* For workers */}
              <div id="pracownicy">
                <h2 className="text-xl font-bold text-nexflow-navy mb-4">Dla pracowników</h2>
                <p className="text-slate text-sm leading-relaxed mb-4">
                  Szukasz pracy w magazynie lub logistyce w Polsce albo
                  Niemczech? Wypełnij formularz lub zadzwoń — wrócimy do Ciebie
                  w ciągu 24 godzin.
                </p>
                <div className="mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">
                    Zadzwoń do nas
                  </p>
                  <a
                    href="tel:+48224878828"
                    className="text-nexflow-navy font-semibold hover:text-nexflow-cyan transition-colors text-sm"
                  >
                    +48 224 878 828
                  </a>
                  <p className="text-xs text-slate mt-1">Pon–Pt, 8:00–17:00</p>
                </div>
                <div className="p-4 bg-nexflow-navy rounded-xl text-white">
                  <p className="text-sm font-semibold mb-2">Pracujemy w językach:</p>
                  <div className="flex flex-wrap gap-2">
                    {["🇵🇱 Polski", "🇩🇪 Deutsch", "🇬🇧 English", "🇺🇦 Українська"].map((lang) => (
                      <span key={lang} className="text-xs bg-white/10 px-2 py-1 rounded-full">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Legal info */}
              <div className="mt-10 pt-8 border-t border-gray-200">
                <p className="text-xs text-slate">
                  Nexflow Sp. z o.o.<br />
                  NIP: PL5981632310 | KRS: 0000496516<br />
                  REGON: 081188992<br />
                  Certyfikat KRAZ nr 10916<br />
                  Słubice, Polska (granica DE-PL)
                </p>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-nexflow-navy mb-2">Napisz do nas</h2>
                <p className="text-slate text-sm mb-6">
                  Odpiszemy lub oddzwonimy jeszcze tego samego dnia roboczego.
                </p>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactCard({
  name,
  role,
  email,
}: {
  name: string;
  role: string;
  email: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-nexflow-navy flex items-center justify-center text-nexflow-cyan shrink-0 text-sm font-bold">
        {name.split(" ").map((n) => n[0]).join("")}
      </div>
      <div>
        <p className="font-semibold text-nexflow-navy text-sm">{name}</p>
        <p className="text-slate text-xs mb-2">{role}</p>
        <div className="text-xs space-y-0.5">
          <p>
            <a href={`mailto:${email}`} className="text-nexflow-navy hover:underline">
              {email}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
