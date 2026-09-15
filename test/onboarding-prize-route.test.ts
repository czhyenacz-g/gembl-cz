import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../app/api/onboarding/prize/route.ts", import.meta.url)), "utf8");

describe("GET /api/onboarding/prize", () => {
  test("existující platná cookie se jen PŘEČTE (existing ?? pickRandomPrizeAmount), nikdy se nepřelosuje při refreshi", () => {
    assert.match(source, /const amountG = existing \?\? pickRandomPrizeAmount\(\);/);
  });

  test("nová cookie se nastaví jen když žádná platná neexistovala (existing === null) — jinak by se refreshem molo obcházet 30denní TTL", () => {
    assert.match(source, /if \(existing === null\) \{/);
    const setBlock = source.slice(source.indexOf("if (existing === null)"), source.indexOf("return response;"));
    assert.match(setBlock, /response\.cookies\.set\(PENDING_PRIZE_COOKIE_NAME, createPendingPrizeCookieValue\(amountG\)/);
  });

  test("cookie je httpOnly, secure v produkci a sameSite lax — stejné jako session cookie (lib/auth/session.ts)", () => {
    assert.match(source, /httpOnly: true/);
    assert.match(source, /secure: process\.env\.NODE_ENV === "production"/);
    assert.match(source, /sameSite: "lax"/);
  });

  test("nevyžaduje auth session — funguje i pro anonymního návštěvníka", () => {
    assert.doesNotMatch(source, /getCurrentUser/);
  });
});
