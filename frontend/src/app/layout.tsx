import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexflow Platform",
  description: "Automated recruitment and client acquisition platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
