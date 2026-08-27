import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Next.js Route Handler (next/server) — next/server nejde přímo
// importovat pod node --test (ERR_MODULE_NOT_FOUND), zdrojová kontrola
// jako framework-vázané testy jinde. Zápis samotný je testovaný přímo
// v global-stats.test.ts.
const source = readFileSync(fileURLToPath(new URL("../app/api/game-stats/route.ts", import.meta.url)), "utf8");

describe("POST /api/game-stats", () => {
  test("validuje game (neprázdný string, rozumná délka)", () => {
    assert.match(source, /game\.length === 0 \|\| game\.length > MAX_GAME_LENGTH/);
  });

  test("čísla se ořežou přes toNonNegInt (žádné záporné/necelé/nekonečné hodnoty do UCA)", () => {
    assert.match(source, /function toNonNegInt\(value: unknown\): number \{/);
    assert.match(source, /spins: toNonNegInt\(spins\)/);
    assert.match(source, /wagered: toNonNegInt\(wagered\)/);
    assert.match(source, /won: toNonNegInt\(won\)/);
    assert.match(source, /resets: toNonNegInt\(resets\)/);
  });

  test("neplatný JSON / chybějící tělo vrátí 400, ne pád", () => {
    assert.match(source, /catch \{\s*return NextResponse\.json\(\{ ok: false \}, \{ status: 400 \}\);/);
  });

  test("nikdy neimportuje UCA client/token přímo — jen reportGameStatsDelta (server-only) zprostředkovaně", () => {
    assert.doesNotMatch(source, /UCA_API_TOKEN/);
    assert.doesNotMatch(source, /uca\/client/);
  });

  test("úspěšný zápis vrací ok:true", () => {
    assert.match(source, /await reportGameStatsDelta\(\{/);
    assert.match(source, /return NextResponse\.json\(\{ ok: true \}\);/);
  });
});
