import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

const BASE_URL = 'https://nexflow.work';

const LOCALE_TO_OG: Record<string, string> = {
  pl: 'pl_PL',
  en: 'en_US',
  de: 'de_DE',
  nl: 'nl_NL',
  ru: 'ru_RU',
  uk: 'uk_UA',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const headersList = await headers();
  const rawPathname = headersList.get('x-pathname') ?? `/${locale}`;

  // Strip the locale segment to get the locale-agnostic path (e.g. '/de/jobs' → '/jobs')
  const localeSegment = `/${locale}`;
  const localePath =
    rawPathname === localeSegment
      ? ''
      : rawPathname.startsWith(`${localeSegment}/`)
      ? rawPathname.slice(localeSegment.length)
      : '';

  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map(loc => [loc, `${BASE_URL}/${loc}${localePath}`])
  );
  languages['x-default'] = `${BASE_URL}/pl${localePath}`;

  return {
    alternates: { languages },
    openGraph: {
      locale: LOCALE_TO_OG[locale] ?? locale,
      alternateLocale: routing.locales
        .filter(l => l !== locale)
        .map(l => LOCALE_TO_OG[l] ?? l),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
