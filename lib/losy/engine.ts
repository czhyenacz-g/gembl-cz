import type { ScratchMatchType, ScratchResult, ScratchSymbol } from "./types.ts";

// Čistá herní logika stíracích losů — žádné React/DOM/canvas, ať jde
// přímo deterministicky testovat (stejný vzor jako lib/casino/slot-engine.ts
// a lib/skorapky/engine.ts: `random` injectable, default `Math.random`).

export const SCRATCH_SYMBOLS: readonly ScratchSymbol[] = ["cherry", "seven", "bell", "star", "clover", "diamond"];

export const SYMBOL_DISPLAY: Record<ScratchSymbol, string> = {
  cherry: "🍒",
  seven: "7",
  bell: "🔔",
  star: "⭐",
  clover: "🍀",
  diamond: "💎",
};

// Poměr "2 stejné + 1 jiný" vs. "3 různé" (viz zadání "cca 75-85 % pár,
// 15-25 % tři různé") — 0.8 leží pohodlně uprostřed zadaného rozsahu.
const PAIR_PROBABILITY = 0.8;

function pickSymbol(random: () => number): ScratchSymbol {
  return SCRATCH_SYMBOLS[Math.floor(random() * SCRATCH_SYMBOLS.length)];
}

/** Symbol RŮZNÝ od `exclude` — filtr nad celou množinou (ne rejection-sampling smyčka), ať je výsledek garantovaně jiný i s konstantním injektovaným random (žádné riziko nekonečné smyčky ve testech). */
function pickDifferentSymbol(exclude: ScratchSymbol, random: () => number): ScratchSymbol {
  const pool = SCRATCH_SYMBOLS.filter((symbol) => symbol !== exclude);
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Vygeneruje NEVÝHERNÍ kombinaci (viz zadání "výhra v GEMBLu není
 * možná") — buď "2 stejné + 1 jiný" (PAIR_PROBABILITY), nebo "3 různé".
 * NIKDY 3 stejné: konstrukcí (oba větve explicitně vylučují trojici
 * stejných symbolů), ne jen pravděpodobnostně — viz `isWinningCombination`
 * a test/losy-engine.test.ts, který to ověřuje přes tisíce iterací.
 */
export function generateScratchResult(random: () => number = Math.random): ScratchResult {
  if (random() < PAIR_PROBABILITY) {
    const pairSymbol = pickSymbol(random);
    const oddSymbol = pickDifferentSymbol(pairSymbol, random);
    const oddPosition = Math.floor(random() * 3);

    const symbols: ScratchSymbol[] = [pairSymbol, pairSymbol, pairSymbol];
    symbols[oddPosition] = oddSymbol;

    return { symbols: symbols as [ScratchSymbol, ScratchSymbol, ScratchSymbol], matchType: "pair" };
  }

  // "3 různé" — postupně vybírá z ubývající množiny (bez opakování),
  // stejný filtr-based princip jako výš, žádná rejection-sampling smyčka.
  const pool = [...SCRATCH_SYMBOLS];
  const symbols: ScratchSymbol[] = [];
  for (let i = 0; i < 3; i++) {
    const index = Math.floor(random() * pool.length);
    symbols.push(pool[index]);
    pool.splice(index, 1);
  }

  return { symbols: symbols as [ScratchSymbol, ScratchSymbol, ScratchSymbol], matchType: "none" as ScratchMatchType };
}

/** `true`, jen kdyby náhodou padly 3 stejné — v GEMBLu se nikdy nesmí stát (viz generateScratchResult), ale invariant se ověřuje samostatně, ne jen spoléháním na to, jak byl výsledek sestavený. */
export function isWinningCombination(result: ScratchResult): boolean {
  const [a, b, c] = result.symbols;
  return a === b && b === c;
}
