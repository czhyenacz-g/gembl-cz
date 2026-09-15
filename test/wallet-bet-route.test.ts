import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// @vercel/postgres/next/headers potřebují reálné prostředí — stejný
// přístup jako test/claim-welcome-prize-route.test.ts (statická kontrola
// přesného tvaru zdrojového kódu, žádný DB test harness v tomhle starteru).
const source = readFileSync(fileURLToPath(new URL("../app/api/wallet/bet/route.ts", import.meta.url)), "utf8");

describe("POST /api/wallet/bet", () => {
  test("nepřihlášený dostane 401, dřív než se cokoli čte z těla requestu", () => {
    const authIndex = source.indexOf("if (!user)");
    const bodyIndex = source.indexOf("await request.json()");
    assert.match(source, /if \(!user\) return NextResponse\.json\(\{ error: "unauthorized" \}, \{ status: 401 \}\);/);
    assert.ok(authIndex !== -1 && bodyIndex !== -1 && authIndex < bodyIndex, "auth se musí ověřit dřív, než se čte tělo requestu");
  });

  test("`game` je whitelistovaný na serveru (GAME_LABELS), ne libovolný klientem podvržený string", () => {
    assert.match(source, /const GAME_LABELS: Record<string, string> = \{/);
    assert.match(source, /!\(game in GAME_LABELS\)/);
    assert.match(source, /"skorapky": "Skořápky"|skorapky: "Skořápky"/);
  });

  test("registr obsahuje i /losy (game: 'losy'), sdílí stejný mechanismus jako skořápky", () => {
    assert.match(source, /"losy": "Online losy"|losy: "Online losy"/);
  });

  test("sázka jde přes isValidBet (stejná validace jako /automaty), ne vlastní paralelní rozsah", () => {
    assert.match(source, /import \{ isValidBet \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/wallet\/bet"/);
    assert.match(source, /if \(!isValidBet\(bet\)\) return NextResponse\.json\(\{ error: "invalid_bet" \}, \{ status: 400 \}\);/);
  });

  test("odečet jde přes spendCredits (stejný ledger jako /automaty spin), ne přes vlastní UPDATE", () => {
    assert.match(
      source,
      /import \{ InsufficientCreditsError, spendCredits \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/wallet\/ledger"/
    );
    assert.match(source, /spendCredits\(user\.id, bet, `\$\{GAME_LABELS\[game\]\} \(sázka \$\{bet\} G\)`\)/);
  });

  test("nedostatek kreditů vrací 402 insufficient_credits s aktuálním zůstatkem, ne 500", () => {
    assert.match(
      source,
      /if \(error instanceof InsufficientCreditsError\) \{\s*return NextResponse\.json\(\{ error: "insufficient_credits", balance: user\.credits \}, \{ status: 402 \}\);/
    );
  });

  test("úspěšná odpověď obsahuje jen balance — žádné pole payout/výhra se v JSON odpovědi nikdy nevrací", () => {
    assert.match(source, /return NextResponse\.json\(\{ balance \}\);/);
    const jsonResponses = source.match(/NextResponse\.json\(\{[^}]*\}/g) ?? [];
    assert.ok(jsonResponses.length > 0);
    for (const response of jsonResponses) assert.doesNotMatch(response, /payout/i);
  });
});
