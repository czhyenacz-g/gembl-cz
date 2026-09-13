import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidEmail, normalizeEmail } from "../lib/auth/email.ts";

test("normalizeEmail: trim + lowercase, ať 'Foo@Bar.cz' a 'foo@bar.cz' jsou stejná identita", () => {
  assert.equal(normalizeEmail("  Foo@Bar.cz  "), "foo@bar.cz");
  assert.equal(normalizeEmail("foo@bar.cz"), normalizeEmail("FOO@BAR.CZ"));
});

test("isValidEmail: přijme rozumné tvary", () => {
  assert.equal(isValidEmail("foo@bar.cz"), true);
  assert.equal(isValidEmail("some.body+tag@example.com"), true);
});

test("isValidEmail: odmítne zjevně neplatné tvary", () => {
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("foo"), false);
  assert.equal(isValidEmail("foo@"), false);
  assert.equal(isValidEmail("@bar.cz"), false);
  assert.equal(isValidEmail("foo bar@baz.cz"), false);
});

test("isValidEmail: odmítne nepřiměřeně dlouhý vstup", () => {
  const long = `${"a".repeat(260)}@example.com`;
  assert.equal(isValidEmail(long), false);
});
