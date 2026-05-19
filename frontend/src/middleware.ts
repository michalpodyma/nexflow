import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

// Country → locale mapping for Vercel geo fallback.
// Applied only when Accept-Language is ambiguous (en-* or empty) and the user
// has not set an explicit NEXT_LOCALE cookie preference.
const COUNTRY_LOCALE: Record<string, string> = {
  PL: 'pl',
  DE: 'de', AT: 'de', CH: 'de',
  NL: 'nl', BE: 'nl',
  RU: 'ru', BY: 'ru', KZ: 'ru',
  UA: 'uk',
};

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!request.cookies.has('NEXT_LOCALE')) {
    const acceptLang = request.headers.get('accept-language') ?? '';
    const primaryLang = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase() ?? '';

    // When Accept-Language resolves to generic English or is absent, check geo.
    if (primaryLang === 'en' || !primaryLang) {
      const country = request.headers.get('x-vercel-ip-country') ?? '';
      const geoLocale = COUNTRY_LOCALE[country.toUpperCase()];

      if (geoLocale) {
        const cookieHeader = [request.headers.get('cookie'), `NEXT_LOCALE=${geoLocale}`]
          .filter(Boolean)
          .join('; ');

        const modifiedHeaders = new Headers(request.headers);
        modifiedHeaders.set('cookie', cookieHeader);
        modifiedHeaders.set('x-pathname', pathname);

        const modifiedRequest = new NextRequest(request.url, {
          headers: modifiedHeaders,
          method: request.method,
        });

        return handleI18nRouting(modifiedRequest);
      }
    }
  }

  // Forward x-pathname so generateMetadata in [locale]/layout.tsx can build
  // accurate per-page hreflang alternates without relying on middleware rewrite internals.
  const headersWithPathname = new Headers(request.headers);
  headersWithPathname.set('x-pathname', pathname);
  return handleI18nRouting(new NextRequest(request.url, {
    headers: headersWithPathname,
    method: request.method,
  }));
}

export const config = {
  // Apply locale routing to the homepage + migrated public pages only.
  // Non-migrated public pages (blog, o-nas, oferty, aplikuj, etc.) and
  // admin routes (dashboard, worker, login) keep working at bare paths.
  // datenschutz and jobs use explicit next.config.mjs redirects → /de/...
  // o-nas, oferty, aplikuj removed — now live under [locale]/ (EUR-884)
  matcher: '/((?!api|trpc|_next|_vercel|dashboard|worker|login|blog|intake|polityka-prywatnosci|praca|case-studies|datenschutz|jobs|.*\\..*).*)',
};
