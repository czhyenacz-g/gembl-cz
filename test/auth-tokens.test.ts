import { test } from "node:test";
import assert from "node:assert/strict";
import { generateToken, hashToken } from "../lib/auth/tokens.ts";

test("generateToken: vrací dostatečně dlouhý, náhodný token", () => {
  const a = generateToken();
  const b = generateToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});

test("hashToken: deterministický pro stejný vstup", () => {
  const token = generateToken();
  assert.equal(hashToken(token), hashToken(token));
});

test("hashToken: různé tokeny dají různé hashe a hash nikdy neobsahuje token samotný", () => {
  const a = generateToken();
  const b = generateToken();
  assert.notEqual(hashToken(a), hashToken(b));
  assert.doesNotMatch(hashToken(a), new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
