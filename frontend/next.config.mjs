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
    ];
  },
};

export default withNextIntl(nextConfig);
