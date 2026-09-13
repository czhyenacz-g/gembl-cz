import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../app/api/stripe/webhook/route.ts", import.meta.url)), "utf8");

describe("POST /api/stripe/webhook", () => {
  test("4) chybný/chybějící podpis je odmítnut (400) dřív, než se cokoli zpracuje", () => {
    const constructIndex = source.indexOf("getStripe().webhooks.constructEvent");
    const topupIndex = source.indexOf("applyStripeTopup(");
    assert.match(source, /const signature = request\.headers\.get\("stripe-signature"\);/);
    assert.match(source, /if \(!signature \|\| !webhookSecret\) \{\s*return NextResponse\.json\(\{ error: "missing_signature" \}, \{ status: 400 \}\);/);
    assert.match(source, /catch \(error\) \{\s*console\.error\("Stripe webhook: neplatný podpis:"/);
    assert.match(source, /return NextResponse\.json\(\{ error: "invalid_signature" \}, \{ status: 400 \}\);/);
    assert.ok(constructIndex !== -1 && topupIndex !== -1 && constructIndex < topupIndex, "podpis se musí ověřit dřív než se G připíšou");
  });

  test("čte raw text tělo (request.text()), ne request.json() — nutné pro ověření podpisu", () => {
    assert.match(source, /const rawBody = await request\.text\(\);/);
    assert.doesNotMatch(source, /await request\.json\(\)/);
  });

  test("zpracuje se jen checkout.session.completed s payment_status 'paid'", () => {
    assert.match(source, /if \(event\.type !== "checkout\.session\.completed"\)/);
    assert.match(source, /if \(session\.payment_status !== "paid"\)/);
  });

  test("packageId z metadat se vždy znovu ověří proti serverové konfiguraci (getCreditPackage), nikdy se neveří ceně/G z metadat", () => {
    assert.match(source, /const creditPackage = getCreditPackage\(packageId\);/);
    assert.match(source, /if \(!creditPackage\) \{/);
  });

  test("7) zaplacená částka i currency musí přesně odpovídat konfiguraci balíčku, jinak se webhook odmítne (400)", () => {
    assert.match(source, /if \(session\.currency !== "czk"\) \{/);
    assert.match(source, /const expectedAmount = creditPackage\.priceCzk \* 100;/);
    assert.match(source, /if \(session\.amount_total !== expectedAmount\) \{/);
    assert.match(source, /status: 400/);
  });

  test("amountG z metadat musí souhlasit s configem balíčku (obrana proti podvrženým metadatům)", () => {
    assert.match(source, /if \(creditPackage\.credits !== metadataAmountG\) \{/);
  });

  test("6) idempotence připsání G se řeší v ledgeru (applyStripeTopup), webhook mu předává stripeCheckoutSessionId", () => {
    assert.match(source, /stripeCheckoutSessionId: session\.id/);
  });

  test("userId musí být kladné celé číslo, jinak 400 (obrana proti chybějícím/neplatným metadatům)", () => {
    assert.match(source, /if \(!Number\.isInteger\(userId\) \|\| userId <= 0 \|\| typeof packageId !== "string"\) \{/);
  });
});
