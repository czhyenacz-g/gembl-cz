// Obecný tvar promo bloku (banner/seller/zónové placementy) — ověřený
// koncept z HowToFish.cz, přenesený sem BEZ jakéhokoliv HowToFish-
// specifického obsahu. `placement` hodnoty odpovídají 1:1 UCA
// `App\Enums\PromotionPlacement` enumu (Filament admin dropdown) —
// nevymýšlej tu novou hodnotu, kterou by admin neměl kde vybrat.
export type PromotionPlacement =
  | "banner"
  | "seller"
  | "homepage_top"
  | "homepage_middle"
  | "game_top"
  | "game_bottom"
  | "sidebar"
  | "mobile_inline";

export type Promotion = {
  id: string;
  placement: PromotionPlacement;
  /** "/x" (přesná cesta), "/x/*" (podstrom), nebo "*" (cokoliv) — viz match-route.ts. Gembl.cz nechává vždy "*" (cílí přes placement, ne route). */
  pagePattern: string;
  title: string;
  bodyHtml?: string;
  ctaLabel?: string;
  href?: string;
  imageUrl?: string;
  weight: number;
  /** Volitelný identifikátor affiliate partnera/kampaně — jen pro reporting, nemá vliv na výběr/zobrazení. */
  affiliateKey?: string;
  /** ISO 8601 — mimo tohle okno se promotion chová jako neaktivní (viz get-promotions.ts). */
  validFrom?: string;
  validUntil?: string;
};
