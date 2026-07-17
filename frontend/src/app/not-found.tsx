import FlowMark from "@/components/FlowMark";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-nexflow-navy flex flex-col items-center justify-center text-center px-4">
      <FlowMark variant="full" colorScheme="reversed" height={40} />
      <p className="text-white text-4xl font-bold mt-8 mb-2">404</p>
      <p className="text-white/60 text-base mb-8">
        Page not found · Strona nie znaleziona · Seite nicht gefunden
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {[
          { href: "/pl", label: "Polski" },
          { href: "/en", label: "English" },
          { href: "/de", label: "Deutsch" },
          { href: "/nl", label: "Nederlands" },
          { href: "/ru", label: "Русский" },
          { href: "/uk", label: "Українська" },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="text-nexflow-cyan underline text-sm hover:opacity-80 transition-opacity"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
