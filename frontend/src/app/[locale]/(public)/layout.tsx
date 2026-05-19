import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export default async function PublicLocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <>
      <Navbar />
      {children}
      <Footer locale={locale} />
    </>
  );
}
