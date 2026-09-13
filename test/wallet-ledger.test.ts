import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// lib/wallet/ledger.ts používá @vercel/postgres, které potřebuje reálné
// DATABASE_URL — bez skutečné DB tenhle test spouštět nejde (stejný
// přístup jako howtofish-cz/test/db-upsert.test.ts). Klíčové bezpečnostní
// vlastnosti (idempotence, negativní balance, atomicita) jsou ale
// ověřitelné staticky přes přesný tvar SQL.
const source = readFileSync(fileURLToPath(new URL("../lib/wallet/ledger.ts", import.meta.url)), "utf8");

describe("findOrCreateUserAndGrantWelcomeBonus", () => {
  const fn = source.slice(
    source.indexOf("export async function findOrCreateUserAndGrantWelcomeBonus"),
    source.indexOf("export async function applyStripeTopup")
  );

  test("založení/dohledání uživatele (upsert) a udělení bonusu jsou ve STEJNÉ transakci (jedno BEGIN/COMMIT obaluje obojí)", () => {
    const beginIndex = fn.indexOf('await client.query("BEGIN");');
    const upsertIndex = fn.indexOf("INSERT INTO users (email)");
    const bonusUpdateIndex = fn.indexOf("welcome_bonus_granted_at IS NULL");
    const commitIndex = fn.indexOf('await client.query("COMMIT");');
    assert.ok(
      beginIndex !== -1 && beginIndex < upsertIndex && upsertIndex < bonusUpdateIndex && bonusUpdateIndex < commitIndex,
      "pořadí musí být BEGIN -> upsert uživatele -> podmíněný bonus -> COMMIT, žádný mezikrok mimo transakci"
    );
  });

  test("idempotence je vynucená v samotném UPDATE (welcome_bonus_granted_at IS NULL), ne jen na aplikační úrovni", () => {
    assert.match(fn, /WHERE id = \$2 AND welcome_bonus_granted_at IS NULL/);
  });

  test("při 0 řádcích (bonus už byl daný) se NEVLOŽÍ druhý ledger záznam, ale upsert uživatele se přesto commitne", () => {
    const noGrantBranch = fn.slice(fn.indexOf("} else {"), fn.indexOf("await client.query(\"COMMIT\");"));
    assert.doesNotMatch(noGrantBranch, /INSERT INTO credit_transactions/);
    assert.match(fn, /granted = true;/);
  });

  test("defense-in-depth: unique_violation (partial index credit_transactions_one_welcome_bonus_per_user) se odchytí a vrátí granted:false místo pádu", () => {
    assert.match(fn, /if \(isUniqueViolation\(error\)\) \{/);
    assert.match(fn, /granted: false, balance: row\?\.credits \?\? 0/);
  });
});

describe("applyStripeTopup", () => {
  test("idempotence stojí na UNIQUE indexu (stripe_checkout_session_id) + odchycení unique_violation (23505)", () => {
    assert.match(source, /code === "23505"/);
    assert.match(source, /isUniqueViolation\(error\)/);
  });

  test("při duplicitě se transakce vrátí zpět (ROLLBACK) předtím, než se vrátí alreadyProcessed: true — žádné druhé připsání", () => {
    const fn = source.slice(source.indexOf("export async function applyStripeTopup"), source.indexOf("export async function spendCredits"));
    assert.match(fn, /await client\.query\("ROLLBACK"\);\s*if \(isUniqueViolation\(error\)\) \{/);
  });

  test("balance_after v ledgeru je stejná hodnota, co se zapsala do users.credits (jeden zdroj pravdy, ne dva výpočty)", () => {
    const fn = source.slice(source.indexOf("export async function applyStripeTopup"), source.indexOf("export async function spendCredits"));
    assert.match(fn, /const balance = updated\.rows\[0\]\.credits;/);
    assert.match(fn, /params\.balance|balance,/);
  });
});

describe("spendCredits", () => {
  test("balance nikdy nejde pod nulu — kontrola dostatku kreditů je součástí stejného atomického UPDATE", () => {
    assert.match(source, /WHERE id = \$2 AND credits >= \$1/);
  });

  test("nedostatek kreditů vede k ROLLBACK + InsufficientCreditsError, ne k částečnému zápisu", () => {
    const fn = source.slice(source.indexOf("export async function spendCredits"));
    assert.match(fn, /if \(updated\.rows\.length === 0\) \{\s*await client\.query\("ROLLBACK"\);\s*throw new InsufficientCreditsError\(\);/);
  });
});

describe("obecná atomicita", () => {
  test("každá exportovaná funkce dělá BEGIN/COMMIT s ROLLBACK v catch větvi a client.release() ve finally", () => {
    const exported = ["findOrCreateUserAndGrantWelcomeBonus", "applyStripeTopup", "spendCredits"];
    for (const name of exported) {
      const start = source.indexOf(`export async function ${name}`);
      const nextExportIndex = source.indexOf("export async function", start + 1);
      const body = nextExportIndex === -1 ? source.slice(start) : source.slice(start, nextExportIndex);
      assert.match(body, /await client\.query\("BEGIN"\);/, `${name} musí začínat BEGIN`);
      assert.match(body, /await client\.query\("COMMIT"\);/, `${name} musí končit COMMIT na úspěšné cestě`);
      assert.match(body, /await client\.query\("ROLLBACK"\);/, `${name} musí mít ROLLBACK v catch větvi`);
      assert.match(body, /client\.release\(\);/, `${name} musí uvolnit klienta ve finally`);
    }
  });
});
