/** @type {import('next').NextConfig} */
const nextConfig = {
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
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
