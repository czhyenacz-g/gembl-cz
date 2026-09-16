import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const magicLinkSource = readFileSync(fileURLToPath(new URL("../app/api/auth/magic-link/route.ts", import.meta.url)), "utf8");
const verifySource = readFileSync(fileURLToPath(new URL("../app/api/auth/verify/route.ts", import.meta.url)), "utf8");
const spinSource = readFileSync(fileURLToPath(new URL("../app/api/wallet/spin/route.ts", import.meta.url)), "utf8");

describe("POST /api/auth/magic-link", () => {
  test("rate limit i neplatný tvar e-mailu vrací stejnou generickou odpověď (nic neprozrazuje o existenci účtu)", () => {
    // Jediná odbočka je TECHNICKÉ selhání odeslání (502) — ta se týká
    // providera/DB, ne existence účtu, protože odeslání se zkouší vždy.
    assert.match(
      magicLinkSource,
      /if \(limited \|\| !isValidEmail\(email\)\) \{\s*return NextResponse\.json\(\{ ok: true, message: GENERIC_MESSAGE \}\);\s*\}/
    );
    const genericReturns = magicLinkSource.match(/return NextResponse\.json\(\{ ok: true, message: GENERIC_MESSAGE \}\);/g) ?? [];
    assert.ok(genericReturns.length >= 1);
  });

  test("technické selhání odeslání se loguje A vrací 502 (žádný tichý falešný úspěch)", () => {
    assert.match(
      magicLinkSource,
      /console\.error\("POST \/api\/auth\/magic-link selhalo:", error instanceof Error \? error\.message : error\);/
    );
    assert.match(magicLinkSource, /return NextResponse\.json\(\{ ok: false, error: "send_failed" \}, \{ status: 502 \}\);/);
    // Uživateli se nikdy nevrací technický detail ani e-mail/host — jen kód.
    assert.doesNotMatch(magicLinkSource, /error: error instanceof Error/);
    assert.doesNotMatch(magicLinkSource, /error\.message \}/);
  });

  test("úspěšné předání Resendu se loguje včetně message ID (dohledatelné, že e-mail opravdu odešel)", () => {
    assert.match(magicLinkSource, /const \{ id \} = await sendMagicLinkEmail\(\{ to: email, loginUrl, welcomePrizeG: baseWelcomePrizeG \}\);/);
    assert.match(magicLinkSource, /console\.log\(`POST \/api\/auth\/magic-link: e-mail předán Resendu \(id \$\{id\}\)\.`\);/);
  });

  test("je persistentně (DB, ne in-memory) rate-limitovaný per email (5/15min) i per IP (20/15min)", () => {
    assert.match(magicLinkSource, /import \{ isRateLimitedPersistent \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/auth\/rate-limit-db"/);
    assert.match(magicLinkSource, /const EMAIL_LIMIT = 5;/);
    assert.match(magicLinkSource, /const IP_LIMIT = 20;/);
    assert.match(magicLinkSource, /const WINDOW_MINUTES = 15;/);
    assert.match(magicLinkSource, /isRateLimitedPersistent\("magic_link:email", email, EMAIL_LIMIT, WINDOW_MINUTES\)/);
    assert.match(magicLinkSource, /isRateLimitedPersistent\("magic_link:ip", ip, IP_LIMIT, WINDOW_MINUTES\)/);
  });

  test("výpadek DB rate-limiteru selže bezpečně na 'not limited' (fail-open), nerozbije přihlášení", () => {
    const rateLimitBlock = magicLinkSource.slice(magicLinkSource.indexOf("let limited = false;"), magicLinkSource.indexOf("if (limited ||"));
    assert.match(rateLimitBlock, /catch \(error\) \{\s*console\.error\(/);
    assert.doesNotMatch(rateLimitBlock, /throw/);
  });

  test("callbackUrl prochází sanitizeCallbackUrl (obrana proti open-redirectu) předtím, než se použije v odkazu", () => {
    assert.match(magicLinkSource, /sanitizeCallbackUrl\(typeof callbackUrl === "string" \? callbackUrl : null\)/);
  });

  test("email se normalizuje (normalizeEmail) dřív, než se použije pro token/rate-limit/odeslání", () => {
    const normalizeIndex = magicLinkSource.indexOf("normalizeEmail(rawEmail)");
    const createTokenIndex = magicLinkSource.indexOf("createMagicLinkToken(email, baseWelcomePrizeG)");
    assert.ok(normalizeIndex !== -1 && createTokenIndex !== -1 && normalizeIndex < createTokenIndex);
  });

  test("welcome-prize základní částka se čte VÝHRADNĚ z podepsané cookie requestu (verifyPendingPrizeCookieValue), nikdy z těla", () => {
    assert.match(
      magicLinkSource,
      /import \{ PENDING_PRIZE_COOKIE_NAME, resolveBaseAmountG, verifyPendingPrizeCookieValue \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/onboarding\/welcome-prize"/
    );
    assert.match(
      magicLinkSource,
      /const pendingPrizeFromCookie = verifyPendingPrizeCookieValue\(cookieStore\.get\(PENDING_PRIZE_COOKIE_NAME\)\?\.value\);/
    );
    assert.doesNotMatch(magicLinkSource, /pendingPrizeG\s*[:=]\s*(typeof )?body/i);
  });

  test("stejná resolvnutá částka (baseWelcomePrizeG) jde na token I do e-mailu — text mailu se nesmí rozejít s tím, co se pak připíše", () => {
    assert.match(magicLinkSource, /const baseWelcomePrizeG = resolveBaseAmountG\(pendingPrizeFromCookie\);/);
    assert.match(magicLinkSource, /createMagicLinkToken\(email, baseWelcomePrizeG\)/);
    assert.match(magicLinkSource, /sendMagicLinkEmail\(\{ to: email, loginUrl, welcomePrizeG: baseWelcomePrizeG \}\)/);
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

  test("uživatel se založí/dohledá a welcome bonus se udělí v JEDNÉ atomické operaci (findOrCreateUserAndGrantWelcomeBonus), ne ručním připočtením credits", () => {
    assert.match(verifySource, /const \{ userId \} = await findOrCreateUserAndGrantWelcomeBonus\(consumed\.email, welcomeBonusG\);/);
    assert.doesNotMatch(verifySource, /credits\s*\+=|credits:\s*\d+/);
    // Žádný samostatný INSERT/UPSERT uživatele mimo ledger.ts — atomicita by se jinak rozpadla na dva kroky.
    assert.doesNotMatch(verifySource, /INSERT INTO users/);
  });

  test("welcome bonus = základní pending-prize částka (asociovaná s tokenem při vyžádání) × WELCOME_PRIZE_LOGIN_MULTIPLIER, ne pevná konstanta", () => {
    assert.match(
      verifySource,
      /const welcomeBonusG = resolveBaseAmountG\(consumed\.pendingPrizeG\) \* WELCOME_PRIZE_LOGIN_MULTIPLIER;/
    );
    assert.doesNotMatch(verifySource, /const WELCOME_BONUS_G = \d+;/);
  });

  test("pending-prize cookie se po úspěšném přihlášení smaže (výhra je vyzvednutá, další zobrazování stejného čísla nedává smysl)", () => {
    assert.match(verifySource, /response\.cookies\.delete\(PENDING_PRIZE_COOKIE_NAME\);/);
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

  test("auth se ověřuje dřív, než se vůbec čte tělo requestu se sázkou", () => {
    const authCheckIndex = spinSource.indexOf("if (!user)");
    const bodyReadIndex = spinSource.indexOf("await request.json()");
    assert.ok(authCheckIndex !== -1 && bodyReadIndex !== -1 && authCheckIndex < bodyReadIndex);
  });

  test("sázka se ověřuje přes isValidBet (sdílená validace, viz lib/wallet/bet.ts) dřív, než se cokoli odečte", () => {
    const validateIndex = spinSource.indexOf("if (!isValidBet(bet))");
    const spendIndex = spinSource.indexOf("spendCredits(user.id, bet,");
    assert.match(spinSource, /import \{ isValidBet \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/wallet\/bet"/);
    assert.match(spinSource, /if \(!isValidBet\(bet\)\) return NextResponse\.json\(\{ error: "invalid_bet" \}, \{ status: 400 \}\);/);
    assert.match(spinSource, /spendCredits\(user\.id, bet,/);
    assert.ok(validateIndex !== -1 && spendIndex !== -1 && validateIndex < spendIndex, "sázka se musí validovat dřív, než se použije pro odečet");
  });

  test("nedostatek kreditů vrací 402, ne pád/500", () => {
    assert.match(spinSource, /error instanceof InsufficientCreditsError/);
    assert.match(spinSource, /status: 402/);
  });
});
