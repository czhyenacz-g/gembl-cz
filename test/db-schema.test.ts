import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const schema = readFileSync(fileURLToPath(new URL("../db/schema.sql", import.meta.url)), "utf8");

describe("db/schema.sql", () => {
  test("credit_transactions: partial UNIQUE index dovolí max jeden WELCOME_BONUS řádek na uživatele", () => {
    assert.match(
      schema,
      /CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_one_welcome_bonus_per_user\s*\n\s*ON credit_transactions \(user_id\)\s*\n\s*WHERE type = 'WELCOME_BONUS';/
    );
  });

  test("credit_transactions: partial UNIQUE index pro idempotenci Stripe webhooku stále existuje", () => {
    assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_stripe_session_key/);
  });

  test("rate_limit_hits: tabulka pro persistentní rate limiting existuje s indexem na (scope, key, created_at)", () => {
    assert.match(schema, /CREATE TABLE IF NOT EXISTS rate_limit_hits \(/);
    assert.match(schema, /scope TEXT NOT NULL,/);
    assert.match(schema, /key TEXT NOT NULL,/);
    assert.match(schema, /CREATE INDEX IF NOT EXISTS rate_limit_hits_scope_key_created_idx ON rate_limit_hits \(scope, key, created_at\);/);
  });

  test("magic_link_tokens: token_hash je UNIQUE, token samotný se nikde neukládá jako sloupec", () => {
    assert.match(schema, /token_hash TEXT NOT NULL UNIQUE,/);
    assert.doesNotMatch(schema, /\btoken TEXT/);
  });

  test("magic_link_tokens: pending_prize_g existuje v CREATE TABLE i jako idempotentní ALTER TABLE ADD COLUMN IF NOT EXISTS (pro DB založené před touto featurou)", () => {
    assert.match(schema, /pending_prize_g INTEGER,\n\s*created_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)\n\);/);
    assert.match(schema, /ALTER TABLE magic_link_tokens ADD COLUMN IF NOT EXISTS pending_prize_g INTEGER;/);
  });
});
