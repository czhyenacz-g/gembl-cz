import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spin, SLOT_SYMBOLS, SYMBOL_DISPLAY } from "../lib/casino/slot-engine.ts";

describe("spin", () => {
  test("payout je VŽDY 0, bez ohledu na to, co padne — klíčový princip hry", () => {
    for (let i = 0; i < 500; i++) {
      const result = spin();
      assert.equal(result.payout, 0);
    }
  });

  test("reely obsahují jen platné symboly", () => {
    for (let i = 0; i < 200; i++) {
      const result = spin();
      for (const symbol of result.reels) {
        assert.ok(SLOT_SYMBOLS.includes(symbol), `neplatný symbol: ${symbol}`);
      }
    }
  });

  test("s injektovaným random vrátícím vždy 0 padnou tři stejné symboly (isTripleMatch true)", () => {
    const result = spin(() => 0);
    assert.equal(result.reels[0], result.reels[1]);
    assert.equal(result.reels[1], result.reels[2]);
    assert.equal(result.isTripleMatch, true);
    assert.equal(result.payout, 0);
  });

  test("isTripleMatch je false, když se symboly liší", () => {
    let call = 0;
    const sequence = [0, 0.5, 0.9];
    const result = spin(() => sequence[call++]);
    assert.equal(result.isTripleMatch, false);
    assert.equal(result.payout, 0);
  });

  test("triple match nastane s rozumnou frekvencí (ani nikdy, ani pořád) při skutečném Math.random", () => {
    let matches = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      if (spin().isTripleMatch) matches++;
    }
    const rate = matches / N;
    // 5 symbolů -> teoreticky přesně 1/25 = 4 %. Široká tolerance, ať test není flaky.
    assert.ok(rate > 0.01 && rate < 0.1, `triple match rate = ${rate}, čekáno cca 0.04`);
  });

  test("SYMBOL_DISPLAY má záznam pro každý symbol v SLOT_SYMBOLS", () => {
    for (const symbol of SLOT_SYMBOLS) {
      assert.equal(typeof SYMBOL_DISPLAY[symbol], "string");
      assert.ok(SYMBOL_DISPLAY[symbol].length > 0);
    }
  });
});
