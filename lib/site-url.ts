// Bázová URL pro odkazy, které se MUSÍ lišit mezi local/preview/produkcí
// (magic-link e-maily, Stripe success/cancel redirect) — na rozdíl od
// `SITE_URL` v app/config/site.ts, což je pevně gembl.cz jen pro SEO
// metadata (metadataBase/OG), ne pro generování skutečných odkazů.
//
// Preview deploymenty (jeden na branch/PR) nemají a nemůžou mít jednu
// pevnou NEXT_PUBLIC_SITE_URL hodnotu — každý běží na jiné, předem
// neznámé *.vercel.app URL. Proto se pro ně NEXT_PUBLIC_SITE_URL vůbec
// nenastavuje a použije se `VERCEL_URL`, systémovou proměnnou, kterou
// Vercel sám vyplní na KAŽDÉM deploymentu (Production i Preview) —
// funguje i lokálně (getSiteUrl se volá jen server-side, viz API routes),
// kde ani jedna nebude nastavená a spadneme na localhost.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
