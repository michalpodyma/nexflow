import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

// Locale constants are inlined here (not imported from src/i18n.ts) so this
// module stays Edge-Runtime-safe. Keep in sync with src/i18n.ts.
const locales = ['pl', 'en', 'de', 'nl', 'ru', 'uk'] as const;
const defaultLocale = 'pl';

// Maps Vercel geo country codes to locales used as Accept-Language fallback
// when the browser sends no usable language preference.
const COUNTRY_LOCALE: Record<string, string> = {
  PL: 'pl',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  NL: 'nl',
  BE: 'nl',
  UA: 'uk',
  RU: 'ru',
  GB: 'en',
  US: 'en',
  CA: 'en',
  AU: 'en',
};

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});

export default function middleware(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country');
  const acceptLang = request.headers.get('accept-language') ?? '';

  const hasLocaleMatch = locales.some((l) =>
    acceptLang.toLowerCase().includes(l.toLowerCase())
  );

  if (!hasLocaleMatch && country) {
    const geoLocale = COUNTRY_LOCALE[country.toUpperCase()];
    if (geoLocale) {
      const headers = new Headers(request.headers);
      headers.set('accept-language', geoLocale);
      return intlMiddleware(
        new NextRequest(request.url, { method: request.method, headers })
      );
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
