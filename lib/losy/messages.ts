import type { ScratchMatchType } from "./types.ts";

// Satirické hlášky po odkrytí losu — samostatný config (viz zadání "drž
// hlášky v lib/losy/messages.ts"), stejný vzor jako lib/casino/messages.ts
// a lib/skorapky/messages.ts. Dvě sady podle typu výsledku (pár vs. tři
// různé), ať hláška vždy sedí na to, co hráč skutečně vidí.
export const SCRATCH_PAIR_MESSAGES = [
  "Dvě ze tří. Klasika.",
  "Tak blízko, až to skoro bolí.",
  "Těsně vedle.",
  "Chyběl jediný symbol.",
  "Skoro jackpot. Bez jackpotu.",
  "Ještě jeden stejný a... nic.",
] as const;

export const SCRATCH_NONE_MESSAGES = [
  "Tentokrát to nebylo ani těsné.",
  "Aspoň je v tom pestrost.",
  "Tři symboly. Tři různé. Nádhera.",
  "Setřel jsi los. Los setřel tebe.",
] as const;

export function pickScratchMessage(matchType: ScratchMatchType, random: () => number = Math.random): string {
  const pool = matchType === "pair" ? SCRATCH_PAIR_MESSAGES : SCRATCH_NONE_MESSAGES;
  return pool[Math.floor(random() * pool.length)];
}
