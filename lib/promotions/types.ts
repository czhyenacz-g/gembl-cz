// Obecný tvar promo bloku (banner/seller apod.) — ověřený koncept z
// HowToFish.cz, přenesený sem BEZ jakéhokoliv HowToFish-specifického
// obsahu. Konkrétní `placement` hodnoty jsou úmyslně jen "banner"|"seller"
// (nejjednodušší dva případy, které se osvědčily) — přidej další, jen
// pokud je projekt opravdu potřebuje.
export type PromotionPlacement = "banner" | "seller";

export type Promotion = {
  id: string;
  placement: PromotionPlacement;
  /** "/x" (přesná cesta), "/x/*" (podstrom), nebo "*" (cokoliv) — viz match-route.ts. */
  pagePattern: string;
  title: string;
  bodyHtml?: string;
  ctaLabel?: string;
  href?: string;
  imageUrl?: string;
  weight: number;
};
