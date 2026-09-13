import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const magicLinkSource = readFileSync(fileURLToPath(new URL("../app/api/auth/magic-link/route.ts", import.meta.url)), "utf8");
const verifySource = readFileSync(fileURLToPath(new URL("../app/api/auth/verify/route.ts", import.meta.url)), "utf8");
const spinSource = readFileSync(fileURLToPath(new URL("../app/api/wallet/spin/route.ts", import.meta.url)), "utf8");

describe("POST /api/auth/magic-link", () => {
  test("odpověď je vždy stejná bez ohledu na to, jestli email existuje/je platný/rate-limitovaný", () => {
    const genericReturns = magicLinkSource.match(/return NextResponse\.json\(\{ ok: true, message: GENERIC_MESSAGE \}\);/g) ?? [];
    assert.ok(genericReturns.length >= 1);
    assert.doesNotMatch(magicLinkSource, /return NextResponse\.json\(\{ ok: true, message: GENERIC_MESSAGE \}\);[\s\S]*return NextResponse\.json\(\{ ok: false/);
  });

  test("je rate-limitovaný per IP i per email (isRateLimited)", () => {
    assert.match(magicLinkSource, /isRateLimited\(`magic-link:ip:\$\{ip\}`\)/);
    assert.match(magicLinkSource, /isRateLimited\(`magic-link:email:\$\{email\}`\)/);
  });

  test("callbackUrl prochází sanitizeCallbackUrl (obrana proti open-redirectu) předtím, než se použije v odkazu", () => {
    assert.match(magicLinkSource, /sanitizeCallbackUrl\(typeof callbackUrl === "string" \? callbackUrl : null\)/);
  });

  test("email se normalizuje (normalizeEmail) dřív, než se použije pro token/rate-limit/odeslání", () => {
    const normalizeIndex = magicLinkSource.indexOf("normalizeEmail(rawEmail)");
    const createTokenIndex = magicLinkSource.indexOf("createMagicLinkToken(email)");
    assert.ok(normalizeIndex !== -1 && createTokenIndex !== -1 && normalizeIndex < createTokenIndex);
  });
});

describe("GET /api/auth/verify", () => {
  test("chybějící/neplatný/expirovaný/už použitý token vede na chybový redirect, ne na vytvoření session", () => {
    assert.match(verifySource, /if \(!token\) return NextResponse\.redirect\(`\$\{siteUrl\}\/casino\?login=invalid`\);/);
    assert.match(verifySource, /if \(!consumed\) return NextResponse\.redirect\(`\$\{siteUrl\}\/casino\?login=invalid`\);/);
  });

  test("token se spotřebovává přes consumeMagicLinkToken (atomický UPDATE ... used_at IS NULL), ne jen kontrolou v aplikaci", () => {
    assert.match(verifySource, /consumeMagicLinkToken\(token\)/);
  });

  test("welcome bonus se uděluje přes grantWelcomeBonusOnce (idempotentní), ne ručním připočtením credits", () => {
    assert.match(verifySource, /await grantWelcomeBonusOnce\(userId, WELCOME_BONUS_G\);/);
    assert.doesNotMatch(verifySource, /credits\s*\+=|credits:\s*\d+/);
  });

  test("welcome bonus je přesně 1000 G", () => {
    assert.match(verifySource, /const WELCOME_BONUS_G = 1000;/);
  });

  test("callbackUrl je sanitizovaný před použitím v redirectu (obrana proti open-redirectu)", () => {
    assert.match(verifySource, /const callbackUrl = sanitizeCallbackUrl\(url\.searchParams\.get\("callbackUrl"\)\);/);
  });

  test("session cookie je httpOnly, secure v produkci a sameSite lax", () => {
    assert.match(verifySource, /httpOnly: true/);
    assert.match(verifySource, /secure: process\.env\.NODE_ENV === "production"/);
    assert.match(verifySource, /sameSite: "lax"/);
  });
});

describe("POST /api/wallet/spin", () => {
  test("nepřihlášený nemůže spinovat (401)", () => {
    assert.match(spinSource, /if \(!user\) return NextResponse\.json\(\{ error: "unauthorized" \}, \{ status: 401 \}\);/);
  });

  test("cena spinu je server-side konstanta (SPIN_COST), request tělo se nečte", () => {
    assert.match(spinSource, /spendCredits\(user\.id, SPIN_COST,/);
    assert.doesNotMatch(spinSource, /request\.json\(\)/);
  });

  test("nedostatek kreditů vrací 402, ne pád/500", () => {
    assert.match(spinSource, /error instanceof InsufficientCreditsError/);
    assert.match(spinSource, /status: 402/);
  });
});
