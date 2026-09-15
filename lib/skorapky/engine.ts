import type { CupIndex, ShuffleStep } from "./types.ts";

// Čistá herní logika Skořápek — žádné React/DOM, ať jde přímo
// deterministicky testovat (stejný vzor jako lib/casino/slot-engine.ts:
// `random` injectable, default `Math.random`).

const ALL_CUPS: readonly CupIndex[] = [0, 1, 2];

/** Náhodná pozice pro viditelnou kuličku v `idle` stavu. */
export function pickRandomCup(random: () => number = Math.random): CupIndex {
  return ALL_CUPS[Math.floor(random() * ALL_CUPS.length)];
}

/**
 * Kam se po hráčově volbě "schová" kulička pro reveal — vždy jedna ze
 * DVOU pozic, které hráč NEVYBRAL (nikdy `selectedCup`, viz zadání
 * "hráč vždy prohraje" + "nikdy neumisťuj kuličku pod hráčem vybraný
 * kelímek"), 50/50 mezi nimi. Konstrukcí (filtr `!== selectedCup` nad
 * přesně 3 pozicemi) je tenhle invariant vynucený typem výsledku, ne jen
 * dodrženou konvencí volajícího.
 */
export function pickRevealCup(selectedCup: CupIndex, random: () => number = Math.random): CupIndex {
  const others = ALL_CUPS.filter((cup) => cup !== selectedCup);
  return others[Math.floor(random() * others.length)];
}

const SHUFFLE_PATTERNS: readonly (readonly CupIndex[])[] = [[0], [1], [2], [0, 1], [1, 2], [0, 2]];

/**
 * Náhodná sekvence zvýrazňovacích kroků pro `shuffling` fázi (viz zadání
 * "L, R, M, L+M, R, M, L" jako příklad) — kelímky se fyzicky nepřehazují,
 * jen se postupně rozsvěcí/zhasíná jejich obrys. `stepCount` řídí
 * volající (viz ShellGame.tsx — celková délka shufflingu ~2-4 s).
 */
export function generateShuffleSequence(stepCount: number, random: () => number = Math.random): ShuffleStep[] {
  const sequence: ShuffleStep[] = [];
  for (let i = 0; i < stepCount; i++) {
    sequence.push({ cups: SHUFFLE_PATTERNS[Math.floor(random() * SHUFFLE_PATTERNS.length)] });
  }
  return sequence;
}
