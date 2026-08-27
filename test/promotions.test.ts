import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { matchSpecificity } from "../lib/promotions/match-route.ts";
import { pickPromotion } from "../lib/promotions/pick-promotion.ts";

describe("matchSpecificity", () => {
  test("exact match", () => {
    assert.equal(matchSpecificity("/foo", "/foo"), "exact");
  });

  test("wildcard match (subtree)", () => {
    assert.equal(matchSpecificity("/foo/*", "/foo/bar"), "wildcard");
    assert.equal(matchSpecificity("/foo/*", "/foo"), "wildcard");
  });

  test("global match", () => {
    assert.equal(matchSpecificity("*", "/anything"), "global");
  });

  test("no match", () => {
    assert.equal(matchSpecificity("/foo", "/bar"), null);
    assert.equal(matchSpecificity("/foo/*", "/other"), null);
  });
});

describe("pickPromotion", () => {
  test("empty candidate list returns null", () => {
    assert.equal(pickPromotion([], "/foo"), null);
  });

  test("no matching candidates returns null", () => {
    const candidates = [{ pagePattern: "/bar", weight: 1 }];
    assert.equal(pickPromotion(candidates, "/foo"), null);
  });

  test("exact beats wildcard beats global", () => {
    const exact = { pagePattern: "/foo", weight: 1, id: "exact" };
    const wildcard = { pagePattern: "/foo/*", weight: 1, id: "wildcard" };
    const global = { pagePattern: "*", weight: 1, id: "global" };

    assert.equal(pickPromotion([wildcard, global], "/foo")?.id, "wildcard");
    assert.equal(pickPromotion([exact, wildcard, global], "/foo")?.id, "exact");
    assert.equal(pickPromotion([global], "/foo")?.id, "global");
  });

  test("weighted picker always returns a candidate from the winning group", () => {
    const a = { pagePattern: "/foo", weight: 1, id: "a" };
    const b = { pagePattern: "/foo", weight: 99, id: "b" };

    for (let i = 0; i < 20; i++) {
      const picked = pickPromotion([a, b], "/foo");
      assert.ok(picked && ["a", "b"].includes(picked.id));
    }
  });

  test("promotion s href === aktuální pathname se nikdy nevybere (banner na stránku, kde se právě zobrazuje, nedává smysl)", () => {
    const selfLinking = { pagePattern: "*", weight: 1000, id: "self", href: "/automaty" };
    const other = { pagePattern: "*", weight: 1, id: "other", href: "https://example.com/product" };

    for (let i = 0; i < 20; i++) {
      assert.equal(pickPromotion([selfLinking, other], "/automaty")?.id, "other");
    }
  });

  test("href jinam než aktuální pathname zůstává eligible", () => {
    const candidate = { pagePattern: "*", weight: 1, id: "a", href: "/automaty" };
    assert.equal(pickPromotion([candidate], "/")?.id, "a");
  });

  test("promotion bez href se self-referencing filtrem nikdy nevyřadí", () => {
    const candidate = { pagePattern: "*", weight: 1, id: "a" };
    assert.equal(pickPromotion([candidate], "/automaty")?.id, "a");
  });
});
