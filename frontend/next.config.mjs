import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
      // datenschutz and jobs are DE-only pages; bare paths redirect to /de/
      {
        source: "/datenschutz",
        destination: "/de/datenschutz",
        permanent: true,
      },
      {
        source: "/jobs",
        destination: "/de/jobs",
        permanent: true,
      },
      {
        source: "/en/jobs",
        destination: "/oferty",
        permanent: true,
      },
      {
        source: "/praca",
        destination: "/oferty",
        permanent: true,
      },
      {
        source: "/intake",
        destination: "/aplikuj",
        permanent: true,
      },
      {
        source: "/polec",
        destination: "/aplikuj?ref=1",
        permanent: true,
      },
      // English privacy canonical URLs (EUR-2288)
      {
        source: "/en/privacy",
        destination: "/en/polityka-prywatnosci",
        permanent: false,
      },
      {
        source: "/privacy",
        destination: "/en/polityka-prywatnosci",
        permanent: false,
      },
      // Legacy PL flat paths → /pl/{slug} (EUR-884)
      {
        source: "/o-nas",
        destination: "/pl/o-nas",
        permanent: true,
      },
      {
        source: "/oferty",
        destination: "/pl/oferty",
        permanent: true,
      },
      {
        source: "/aplikuj",
        destination: "/pl/aplikuj",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
