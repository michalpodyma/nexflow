// Locale homepage scaffold — full content migration is a follow-up task.
// This page satisfies the routing requirement: GET /{locale}/ returns 200.
export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Nexflow</h1>
      <p>Locale: {locale}</p>
    </main>
  );
}
