// Jediné místo, kde se definují nabízené balíčky G ke koupi (viz zadání
// "Balíčky udělej konfigurovatelné na jednom místě v aplikaci"). Kurz je
// pevně 1 Kč = 1 G — `priceCzk` a `credits` jsou proto vždy stejné číslo,
// ale drží se jako dvě oddělená pole, ať je vazba na Stripe částku a na
// UI popisek explicitní, ne odvozená implicitně z jednoho čísla.
//
// `id` je jediné, co smí poslat klient (viz app/api/checkout/session/route.ts)
// — cenu a počet G si server vždy dohledá tady, nikdy nevěří hodnotám z
// requestu.
export type CreditPackage = {
  id: string;
  credits: number;
  priceCzk: number;
  /** Neutrální název produktu v Stripe Checkoutu (žádná gambling terminologie). */
  label: string;
};

export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  { id: "credits_100", credits: 100, priceCzk: 100, label: "100 Game Credits" },
  { id: "credits_250", credits: 250, priceCzk: 250, label: "250 Game Credits" },
  { id: "credits_500", credits: 500, priceCzk: 500, label: "500 Game Credits" },
  { id: "credits_1000", credits: 1000, priceCzk: 1000, label: "1000 Game Credits" },
];

export function getCreditPackage(id: string): CreditPackage | null {
  return CREDIT_PACKAGES.find((p) => p.id === id) ?? null;
}
