import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// lib/auth/rate-limit-db.ts používá @vercel/postgres, které potřebuje
// reálné DATABASE_URL — bez skutečné DB tenhle test spouštět nejde, stejný
// přístup jako lib/wallet/ledger.ts (viz wallet-ledger.test.ts).
const source = readFileSync(fileURLToPath(new URL("../lib/auth/rate-limit-db.ts", import.meta.url)), "utf8");

describe("isRateLimitedPersistent", () => {
  test("kontrola počtu hitů a zápis nového hitu jsou JEDEN atomický SQL příkaz (CTE + podmíněný INSERT), ne dva oddělené kroky", () => {
    assert.match(source, /WITH recent AS \(/);
    assert.match(source, /INSERT INTO rate_limit_hits \(scope, key\)/);
    assert.match(source, /WHERE recent\.cnt < \$\{limit\}/);
    // Žádné oddělené SELECT+if+INSERT přes dva `await sql` volání.
    const sqlCalls = source.match(/await sql`/g) ?? [];
    assert.equal(sqlCalls.length, 1, "kontrola i zápis musí být v jednom `sql` volání");
  });

  test("limitováno je, právě když INSERT nic nevrátil (počet hitů v okně už dosáhl limitu)", () => {
    assert.match(source, /return result\.rows\.length === 0;/);
  });

  test("časové okno se počítá přes make_interval (parametrizovaně), ne konkatenací stringu do SQL", () => {
    assert.match(source, /now\(\) - make_interval\(mins => \$\{windowMinutes\}\)/);
  });
});
