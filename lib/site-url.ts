// Bázová URL pro odkazy, které se MUSÍ lišit mezi local/preview/produkcí
// (magic-link e-maily, Stripe success/cancel redirect) — na rozdíl od
// `SITE_URL` v app/config/site.ts, což je pevně gembl.cz jen pro SEO
// metadata (metadataBase/OG), ne pro generování skutečných odkazů.
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
