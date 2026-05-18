import { getRequestConfig } from 'next-intl/server';

export const locales = ['pl', 'en', 'de', 'nl', 'ru', 'uk'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pl';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = (await requestLocale) as Locale;
  if (!locales.includes(locale)) {
    locale = defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
