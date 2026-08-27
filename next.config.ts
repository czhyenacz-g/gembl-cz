import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Promotion bannery servíruje Universal Content API (/media/{id}) —
    // žádný jiný externí hostname pro next/image nechceme.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "content-api.darbujan.com",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
