import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateScratchResult, isWinningCombination, SCRATCH_SYMBOLS, SYMBOL_DISPLAY } from "../lib/losy/engine.ts";

describe("generateScratchResult — klíčový princip hry: výhra v GEMBLu není možná", () => {
  test("NIKDY nevygeneruje výherní kombinaci (3 stejné) — ověřeno přes velké množství iterací, ne jen spoléháním na konstrukci", () => {
    for (let i = 0; i < 20_000; i++) {
      const result = generateScratchResult();
      assert.equal(isWinningCombination(result), false, `výherní kombinace: ${result.symbols.join(",")}`);
    }
  });

  test("výsledek vždy obsahuje jen platné symboly", () => {
    for (let i = 0; i < 500; i++) {
      const result = generateScratchResult();
      for (const symbol of result.symbols) assert.ok(SCRATCH_SYMBOLS.includes(symbol), `neplatný symbol: ${symbol}`);
    }
  });

  test("matchType 'pair' znamená přesně 2 stejné + 1 jiný (ne 3 stejné, ne 3 různé)", () => {
    let sawPair = false;
    for (let i = 0; i < 2000; i++) {
      const result = generateScratchResult();
      if (result.matchType !== "pair") continue;
      sawPair = true;
      const [a, b, c] = result.symbols;
      const counts = new Map<string, number>();
      for (const s of [a, b, c]) counts.set(s, (counts.get(s) ?? 0) + 1);
      assert.deepEqual([...counts.values()].sort(), [1, 2], `matchType pair, ale rozložení symbolů je ${[...counts.values()]}`);
    }
    assert.ok(sawPair, "za 2000 losů se neobjevil žádný 'pair' výsledek — podezřele nízká pravděpodobnost");
  });

  test("matchType 'none' znamená 3 různé symboly", () => {
    let sawNone = false;
    for (let i = 0; i < 2000; i++) {
      const result = generateScratchResult();
      if (result.matchType !== "none") continue;
      sawNone = true;
      const [a, b, c] = result.symbols;
      assert.equal(new Set([a, b, c]).size, 3);
    }
    assert.ok(sawNone, "za 2000 losů se neobjevil žádný 'none' výsledek — podezřele nízká pravděpodobnost");
  });

  test("poměr pair/none odpovídá zadanému rozsahu (cca 75-85 % pair) při skutečném Math.random", () => {
    let pairCount = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      if (generateScratchResult().matchType === "pair") pairCount++;
    }
    const rate = pairCount / N;
    // Široká tolerance kolem zadaného rozsahu 0.75-0.85, ať test není flaky.
    assert.ok(rate > 0.7 && rate < 0.9, `pair rate = ${rate}, čekáno cca 0.75-0.85`);
  });

  test("s injektovaným random je deterministický (stejný vzor jako slot-engine.ts spin)", () => {
    // wantsPair (< 0.8) -> true; pairSymbol index 0; oddSymbol (z poolu bez pairSymbol) index 0; oddPosition index 0.
    const result = generateScratchResult(() => 0);
    assert.equal(result.matchType, "pair");
    assert.equal(isWinningCombination(result), false);
  });

  test("SYMBOL_DISPLAY má záznam pro každý symbol v SCRATCH_SYMBOLS", () => {
    for (const symbol of SCRATCH_SYMBOLS) {
      assert.equal(typeof SYMBOL_DISPLAY[symbol], "string");
      assert.ok(SYMBOL_DISPLAY[symbol].length > 0);
    }
  });
});

describe("isWinningCombination", () => {
  test("true jen pro 3 stejné symboly", () => {
    assert.equal(isWinningCombination({ symbols: ["cherry", "cherry", "cherry"], matchType: "pair" }), true);
  });

  test("false pro 2 stejné + 1 jiný", () => {
    assert.equal(isWinningCombination({ symbols: ["cherry", "cherry", "seven"], matchType: "pair" }), false);
  });

  test("false pro 3 různé", () => {
    assert.equal(isWinningCombination({ symbols: ["cherry", "seven", "bell"], matchType: "none" }), false);
  });
});
