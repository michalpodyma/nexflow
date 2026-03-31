/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // Required for unstable_after() — run code after response is sent (Next.js 14.1+)
    after: true,
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
    ];
  },
};

export default nextConfig;
