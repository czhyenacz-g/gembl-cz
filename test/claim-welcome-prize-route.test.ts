import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// @vercel/postgres/next/headers potřebují reálné prostředí — stejný
// přístup jako test/checkout-session-route.test.ts a test/auth-routes.test.ts
// (statická kontrola přesného tvaru zdrojového kódu).
const source = readFileSync(fileURLToPath(new URL("../app/api/wallet/claim-welcome-prize/route.ts", import.meta.url)), "utf8");

describe("POST /api/wallet/claim-welcome-prize", () => {
  test("nepřihlášený dostane 401, dřív než se cokoli čte/počítá", () => {
    const authIndex = source.indexOf("if (!user)");
    const cookieIndex = source.indexOf("const pendingPrizeG = verifyPendingPrizeCookieValue");
    assert.match(source, /if \(!user\) return NextResponse\.json\(\{ error: "unauthorized" \}, \{ status: 401 \}\);/);
    assert.ok(authIndex !== -1 && cookieIndex !== -1 && authIndex < cookieIndex, "auth se musí ověřit dřív, než se čte pending-prize cookie");
  });

  test("základní částka se čte VÝHRADNĚ z podepsané cookie (verifyPendingPrizeCookieValue), nikdy z těla requestu — route ani nečte request.json()", () => {
    assert.match(source, /const pendingPrizeG = verifyPendingPrizeCookieValue\(cookieStore\.get\(PENDING_PRIZE_COOKIE_NAME\)\?\.value\);/);
    assert.doesNotMatch(source, /request\.json\(\)/);
    assert.doesNotMatch(source, /export async function POST\(request/); // handler nepřijímá request objekt vůbec
  });

  test("skutečné připsání jde přes findOrCreateUserAndGrantWelcomeBonus s částkou × WELCOME_PRIZE_LOGIN_MULTIPLIER — stejný ledger guard jako magic-link login, ne vlastní paralelní logika", () => {
    assert.match(source, /const amountG = resolveBaseAmountG\(pendingPrizeG\) \* WELCOME_PRIZE_LOGIN_MULTIPLIER;/);
    assert.match(source, /findOrCreateUserAndGrantWelcomeBonus\(user\.email, amountG\)/);
  });

  test("odpověď vrací granted (idempotence viditelná volajícímu) a balance, ne jen 'ok'", () => {
    assert.match(source, /NextResponse\.json\(\{ granted, balance \}\)/);
  });

  test("pending-prize cookie se po pokusu o vyzvednutí smaže", () => {
    assert.match(source, /response\.cookies\.delete\(PENDING_PRIZE_COOKIE_NAME\);/);
  });
});
