import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Next.js Route Handler (next/server, @vercel/postgres, stripe) — nejde
// přímo importovat/spustit pod node --test bez reálné DB a Stripe klíče,
// stejný přístup jako ostatní route testy v tomhle projektu
// (game-stats-route.test.ts, promotion-events-route.test.ts).
const source = readFileSync(fileURLToPath(new URL("../app/api/checkout/session/route.ts", import.meta.url)), "utf8");

describe("POST /api/checkout/session", () => {
  test("1) nepřihlášený uživatel nemůže vytvořit checkout (401 dřív, než se cokoli čte z body)", () => {
    const authCheckIndex = source.indexOf("if (!user)");
    const bodyReadIndex = source.indexOf("await request.json()");
    assert.match(source, /const user = await getCurrentUser\(\);/);
    assert.match(source, /if \(!user\) return NextResponse\.json\(\{ error: "unauthorized" \}, \{ status: 401 \}\);/);
    assert.ok(authCheckIndex !== -1 && bodyReadIndex !== -1 && authCheckIndex < bodyReadIndex, "auth se musí ověřit dřív než se čte tělo requestu");
  });

  test("2) neexistující packageId je odmítnut (400), dřív než se volá Stripe", () => {
    const packageCheckIndex = source.indexOf("if (!creditPackage)");
    const stripeCallIndex = source.indexOf("getStripe().checkout.sessions.create");
    assert.match(source, /const creditPackage = getCreditPackage\(packageId\);/);
    assert.match(source, /if \(!creditPackage\) return NextResponse\.json\(\{ error: "unknown_package" \}, \{ status: 400 \}\);/);
    assert.ok(packageCheckIndex !== -1 && stripeCallIndex !== -1 && packageCheckIndex < stripeCallIndex);
  });

  test("3) částka pro Stripe se vždy počítá z konfigurace balíčku (priceCzk * 100), nikdy z těla requestu", () => {
    assert.match(source, /unit_amount: creditPackage\.priceCzk \* 100/);
    // Jediné, co se z body čte, je packageId — žádné price/credits pole.
    const bodyDestructure = /const \{ packageId \} = \(body \?\? \{\}\) as Record<string, unknown>;/;
    assert.match(source, bodyDestructure);
    assert.doesNotMatch(source, /body\.(price|amount|credits|priceCzk)/i);
  });

  test("metadata obsahuje userId (primární vazba), packageId i amountG pro pozdější ověření webhookem", () => {
    assert.match(source, /userId: String\(user\.id\)/);
    assert.match(source, /packageId: creditPackage\.id/);
    assert.match(source, /amountG: String\(creditPackage\.credits\)/);
  });

  test("customer_email se bere ze serverové session, nikdy z klienta", () => {
    assert.match(source, /customer_email: user\.email/);
    assert.doesNotMatch(source, /customer_email:\s*(body|packageId)/);
  });

  test("currency je czk, mode je payment, success/cancel URL jsou odvozené z getSiteUrl() (ne hardcoded doména)", () => {
    assert.match(source, /currency: "czk"/);
    assert.match(source, /mode: "payment"/);
    assert.match(source, /success_url: `\$\{siteUrl\}\/casino\?payment=success`/);
    assert.match(source, /cancel_url: `\$\{siteUrl\}\/casino\?payment=cancelled`/);
    assert.doesNotMatch(source, /localhost|gembl\.cz\//);
  });
});
