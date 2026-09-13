import { test } from "node:test";
import assert from "node:assert/strict";
import { CREDIT_PACKAGES, getCreditPackage } from "../lib/wallet/packages.ts";

test("CREDIT_PACKAGES: kurz je vždy 1 Kč = 1 G", () => {
  for (const pkg of CREDIT_PACKAGES) {
    assert.equal(pkg.credits, pkg.priceCzk, `${pkg.id}: credits a priceCzk by měly být stejné číslo`);
  }
});

test("CREDIT_PACKAGES: obsahuje přesně nabízené balíčky ze zadání", () => {
  const ids = CREDIT_PACKAGES.map((p) => p.id).sort();
  assert.deepEqual(ids, ["credits_100", "credits_1000", "credits_250", "credits_500"]);
});

test("getCreditPackage: známé id vrátí správnou cenu/počet G", () => {
  const pkg = getCreditPackage("credits_250");
  assert.ok(pkg);
  assert.equal(pkg.credits, 250);
  assert.equal(pkg.priceCzk, 250);
});

test("getCreditPackage: neexistující/klientem podvržené id je odmítnuto (null)", () => {
  assert.equal(getCreditPackage("credits_999999"), null);
  assert.equal(getCreditPackage(""), null);
  assert.equal(getCreditPackage("credits_100; DROP TABLE users;"), null);
});
