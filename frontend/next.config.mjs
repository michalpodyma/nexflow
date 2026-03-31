/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
