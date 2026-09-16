import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zrušené stránky: místo 404 na původních URL zůstává trvalý redirect,
  // aby staré odkazy (i případný zápis v indexu vyhledávačů) neskončily
  // mrtvé (viz zadání "staré odkazy přesměrovávej na casino").
  // - /o-projektu → /jak-to-funguje: obsah se tam sloučil jako další sekce,
  //   takže míříme na sloučenou stránku (odkazuje sem i "Více info"
  //   z /casino sidebaru).
  // - /hry → /casino: přehled her se ruší bez náhrady, rozcestník všech her
  //   je menu v kasinu.
  async redirects() {
    return [
      { source: "/o-projektu", destination: "/jak-to-funguje", permanent: true },
      { source: "/hry", destination: "/casino", permanent: true },
    ];
  },
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
