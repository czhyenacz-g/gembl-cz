import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidBet, maxAffordableBet } from "../lib/wallet/bet.ts";

test("isValidBet: přijme platné sázky v rozsahu 10-100 po 10", () => {
  for (const bet of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    assert.equal(isValidBet(bet), true, `${bet} G by mělo být platné`);
  }
});

test("isValidBet: odmítne sázku menší než 10 G", () => {
  assert.equal(isValidBet(0), false);
  assert.equal(isValidBet(5), false);
  assert.equal(isValidBet(9), false);
});

test("isValidBet: odmítne sázku větší než 100 G", () => {
  assert.equal(isValidBet(101), false);
  assert.equal(isValidBet(1000), false);
});

test("isValidBet: odmítne sázku, co není násobek 10", () => {
  assert.equal(isValidBet(15), false);
  assert.equal(isValidBet(23), false);
  assert.equal(isValidBet(99), false);
});

test("isValidBet: odmítne neceločíselné/nenumerické hodnoty (obrana proti podvrženému tělu requestu)", () => {
  assert.equal(isValidBet(10.5), false);
  assert.equal(isValidBet("10"), false);
  assert.equal(isValidBet(null), false);
  assert.equal(isValidBet(undefined), false);
  assert.equal(isValidBet(NaN), false);
  assert.equal(isValidBet(Infinity), false);
});

test("maxAffordableBet: zaokrouhlí zůstatek dolů na násobek 10, max 100", () => {
  assert.equal(maxAffordableBet(1000), 100);
  assert.equal(maxAffordableBet(100), 100);
  assert.equal(maxAffordableBet(35), 30);
  assert.equal(maxAffordableBet(29), 20);
  assert.equal(maxAffordableBet(9), 0);
  assert.equal(maxAffordableBet(0), 0);
});
