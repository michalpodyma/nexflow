import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://nexflow.work"),
  title: "Nexflow — Workforce in motion.",
  description:
    "Nexflow dostarcza sprawdzonych pracowników do firm logistycznych i magazynowych w Polsce i Niemczech — w 5 dni roboczych.",
  alternates: {
    canonical: "/",
    languages: {
      "x-default": "https://nexflow.work",
      pl: "https://nexflow.work",
      de: "https://nexflow.work",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
