import type { SlotSymbol, SpinResult } from "./types.ts";

// Klasické automatové symboly — čistě vizuální, na výsledek (vždy 0 G)
// nemají žádný vliv. `SYMBOL_DISPLAY` odděluje interní klíč od toho, co
// se skutečně vykresluje (7/BAR jsou text, ne emoji).
export const SLOT_SYMBOLS: readonly SlotSymbol[] = ["cherry", "lemon", "seven", "diamond", "bar"];

export const SYMBOL_DISPLAY: Record<SlotSymbol, string> = {
  cherry: "🍒",
  lemon: "🍋",
  seven: "7",
  diamond: "💎",
  bar: "BAR",
};

function pickSymbol(random: () => number): SlotSymbol {
  const index = Math.floor(random() * SLOT_SYMBOLS.length);
  return SLOT_SYMBOLS[index];
}

/**
 * Jeden roztočení automatu — každý válec nezávisle náhodný symbol
 * (uniformní rozdělení), `isTripleMatch` je jen vizuální informace pro
 * "JACKPOT!" moment. `payout` je VŽDY 0 bez ohledu na to, co padne —
 * to je jediné pravidlo, které tahle hra má (viz zadání). `random` je
 * injectable (default `Math.random`), ať jde deterministicky testovat.
 */
export function spin(random: () => number = Math.random): SpinResult {
  const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [pickSymbol(random), pickSymbol(random), pickSymbol(random)];
  const isTripleMatch = reels[0] === reels[1] && reels[1] === reels[2];

  return { reels, isTripleMatch, payout: 0 };
}
