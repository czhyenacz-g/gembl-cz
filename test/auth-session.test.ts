import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-only-secret-do-not-use-in-production";

const { createSessionCookieValue, verifySessionCookieValue } = await import("../lib/auth/session.ts");

test("session: round-trip encode/decode vrátí správné userId", () => {
  const value = createSessionCookieValue(42);
  assert.equal(verifySessionCookieValue(value), 42);
});

test("session: chybějící cookie je neplatná", () => {
  assert.equal(verifySessionCookieValue(undefined), null);
  assert.equal(verifySessionCookieValue(null), null);
  assert.equal(verifySessionCookieValue(""), null);
});

test("session: poškozený/podvržený podpis je odmítnut", () => {
  const value = createSessionCookieValue(42);
  const [userId, exp] = value.split(".");
  const tampered = `${userId}.${exp}.podvrzenypodpis`;
  assert.equal(verifySessionCookieValue(tampered), null);
});

test("session: pozměněný payload (jiné userId) při zachování starého podpisu je odmítnut", () => {
  const value = createSessionCookieValue(42);
  const [, , signature] = value.split(".");
  const forged = `999.${Date.now() + 1_000_000}.${signature}`;
  assert.equal(verifySessionCookieValue(forged), null);
});

test("session: expirovaná session je odmítnuta", async () => {
  const { createHmac } = await import("node:crypto");
  const expiredExp = Date.now() - 10_000;
  const payload = `42.${expiredExp}`;
  const signature = createHmac("sha256", process.env.SESSION_SECRET!).update(payload).digest("base64url");
  assert.equal(verifySessionCookieValue(`${payload}.${signature}`), null);
});

test("session: neplatný tvar (jiný počet segmentů) je odmítnut", () => {
  assert.equal(verifySessionCookieValue("jenjedensegment"), null);
  assert.equal(verifySessionCookieValue("a.b.c.d"), null);
});
