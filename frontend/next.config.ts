import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
