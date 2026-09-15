import { test, describe } from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-only-secret-do-not-use-in-production";

const {
  WELCOME_PRIZE_AMOUNTS_G,
  WELCOME_PRIZE_LOGIN_MULTIPLIER,
  pickRandomPrizeAmount,
  createPendingPrizeCookieValue,
  verifyPendingPrizeCookieValue,
  resolveBaseAmountG,
} = await import("../lib/onboarding/welcome-prize.ts");

describe("pickRandomPrizeAmount", () => {
  test("vrací vždy hodnotu z povolené množiny 200-800 po 100", () => {
    for (let i = 0; i < 50; i++) {
      const amount = pickRandomPrizeAmount();
      assert.ok((WELCOME_PRIZE_AMOUNTS_G as readonly number[]).includes(amount), `${amount} není v povolené množině`);
    }
  });

  test("s injektovaným random je deterministický (testovatelnost, stejný vzor jako slot-engine.ts spin)", () => {
    assert.equal(pickRandomPrizeAmount(() => 0), 200);
    assert.equal(pickRandomPrizeAmount(() => 0.999), 800);
  });
});

describe("pending-prize cookie: round-trip a odolnost proti podvržení (stejné vlastnosti jako lib/auth/session.ts)", () => {
  test("round-trip encode/decode vrátí správnou částku", () => {
    const value = createPendingPrizeCookieValue(500);
    assert.equal(verifyPendingPrizeCookieValue(value), 500);
  });

  test("chybějící cookie je neplatná", () => {
    assert.equal(verifyPendingPrizeCookieValue(undefined), null);
    assert.equal(verifyPendingPrizeCookieValue(null), null);
    assert.equal(verifyPendingPrizeCookieValue(""), null);
  });

  test("poškozený/podvržený podpis je odmítnut", () => {
    const value = createPendingPrizeCookieValue(500);
    const [amount, exp] = value.split(".");
    assert.equal(verifyPendingPrizeCookieValue(`${amount}.${exp}.podvrzenypodpis`), null);
  });

  test("KLÍČOVÝ EXPLOIT TEST: pozměněná částka (např. 200 -> 8000) při zachování starého podpisu je odmítnuta", () => {
    const value = createPendingPrizeCookieValue(200);
    const [, , signature] = value.split(".");
    const forged = `8000.${Date.now() + 1_000_000}.${signature}`;
    assert.equal(verifyPendingPrizeCookieValue(forged), null);
  });

  test("i se SPRÁVNÝM podpisem je částka mimo WELCOME_PRIZE_AMOUNTS_G odmítnuta (defense-in-depth, ne jen spoléhání na podpis)", async () => {
    const { createHmac } = await import("node:crypto");
    // Ručně sestavená cookie se SPRÁVNÝM podpisem pro hodnotu 8000 — simuluje
    // hypotetický budoucí bug, který by dovolil podepsat libovolné číslo.
    const expiresAt = Date.now() + 1_000_000;
    const payload = `8000.${expiresAt}`;
    const signature = createHmac("sha256", process.env.SESSION_SECRET!).update(`wp1.${payload}`).digest("base64url");
    assert.equal(verifyPendingPrizeCookieValue(`${payload}.${signature}`), null);
  });

  test("expirovaná cookie je odmítnuta", async () => {
    const { createHmac } = await import("node:crypto");
    const expiredExp = Date.now() - 10_000;
    const payload = `500.${expiredExp}`;
    const signature = createHmac("sha256", process.env.SESSION_SECRET!).update(`wp1.${payload}`).digest("base64url");
    assert.equal(verifyPendingPrizeCookieValue(`${payload}.${signature}`), null);
  });

  test("neplatný tvar (jiný počet segmentů) je odmítnut", () => {
    assert.equal(verifyPendingPrizeCookieValue("jenjedensegment"), null);
    assert.equal(verifyPendingPrizeCookieValue("a.b.c.d"), null);
  });

  test("cookie podepsaná pro jinou doménu (lib/auth/session.ts) není zaměnitelná s pending-prize cookie, i se stejným SESSION_SECRET", async () => {
    const { createSessionCookieValue } = await import("../lib/auth/session.ts");
    const sessionCookieValue = createSessionCookieValue(42);
    assert.equal(verifyPendingPrizeCookieValue(sessionCookieValue), null);
  });
});

describe("resolveBaseAmountG", () => {
  test("s platnou pending částkou vrátí přesně tu částku, nevylosuje novou", () => {
    assert.equal(resolveBaseAmountG(300), 300);
  });

  test("bez pending částky (null) vylosuje náhradní hodnotu z povolené množiny", () => {
    const amount = resolveBaseAmountG(null);
    assert.ok((WELCOME_PRIZE_AMOUNTS_G as readonly number[]).includes(amount));
  });
});

describe("WELCOME_PRIZE_LOGIN_MULTIPLIER", () => {
  test("je 2 (zobrazená částka × 2 po přihlášení, viz zadání)", () => {
    assert.equal(WELCOME_PRIZE_LOGIN_MULTIPLIER, 2);
  });
});
