import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeCallbackUrl } from "../lib/auth/safe-redirect.ts";

test("sanitizeCallbackUrl: relativní cesta projde beze změny", () => {
  assert.equal(sanitizeCallbackUrl("/automaty"), "/automaty");
  assert.equal(sanitizeCallbackUrl("/casino?payment=success"), "/casino?payment=success");
});

test("sanitizeCallbackUrl: prázdná/chybějící hodnota spadne na fallback", () => {
  assert.equal(sanitizeCallbackUrl(null), "/casino");
  assert.equal(sanitizeCallbackUrl(undefined), "/casino");
  assert.equal(sanitizeCallbackUrl(""), "/casino");
  assert.equal(sanitizeCallbackUrl(null, "/jina-vychozi"), "/jina-vychozi");
});

test("sanitizeCallbackUrl: odmítne open-redirect na cizí doménu", () => {
  assert.equal(sanitizeCallbackUrl("https://evil.example.com"), "/casino");
  assert.equal(sanitizeCallbackUrl("//evil.example.com"), "/casino");
  assert.equal(sanitizeCallbackUrl("/\\evil.example.com"), "/casino");
  assert.equal(sanitizeCallbackUrl("javascript://alert(1)"), "/casino");
});

test("sanitizeCallbackUrl: odmítne cestu, co nezačíná lomítkem", () => {
  assert.equal(sanitizeCallbackUrl("automaty"), "/casino");
});
