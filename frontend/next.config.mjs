import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      // Legacy flat PL paths → locale-prefixed canonical URLs (301 for SEO)
      { source: "/", destination: "/pl/", permanent: true },
      { source: "/aplikuj", destination: "/pl/aplikuj", permanent: true },
      { source: "/oferty", destination: "/pl/oferty", permanent: true },
      { source: "/uslugi", destination: "/pl/uslugi", permanent: true },
      { source: "/kontakt", destination: "/pl/kontakt", permanent: true },
      { source: "/o-nas", destination: "/pl/o-nas", permanent: true },
      { source: "/blog", destination: "/pl/blog", permanent: true },
      { source: "/praca/magazyn", destination: "/pl/praca/magazyn", permanent: true },
      // Legacy flat DE paths → locale-prefixed canonical URLs (301 for SEO)
      { source: "/datenschutz", destination: "/de/datenschutz", permanent: true },
      { source: "/jobs", destination: "/de/jobs", permanent: true },
      // Pre-i18n legacy aliases
      { source: "/en/jobs", destination: "/de/jobs", permanent: true },
      { source: "/praca", destination: "/pl/oferty", permanent: true },
      { source: "/intake", destination: "/pl/aplikuj", permanent: true },
      { source: "/polec", destination: "/pl/aplikuj?ref=1", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
