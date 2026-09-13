import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe/client";
import { applyStripeTopup } from "../../../../lib/wallet/ledger";
import { getCreditPackage } from "../../../../lib/wallet/packages";

// `request.text()` čte raw tělo requestu (App Router body nijak
// automaticky neparsuje, dokud nezavoláš .json()/.text() sám) — přesně to,
// co Stripe signature ověření potřebuje.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook: neplatný podpis:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ ok: true });
  }

  const userId = Number(session.metadata?.userId);
  const packageId = session.metadata?.packageId;
  const metadataAmountG = Number(session.metadata?.amountG);

  if (!Number.isInteger(userId) || userId <= 0 || typeof packageId !== "string") {
    console.error("Stripe webhook: chybějící/neplatná metadata, session", session.id);
    return NextResponse.json({ error: "invalid_metadata" }, { status: 400 });
  }

  // Nikdy nevěř ceně/počtu G ze session/metadat samotných — packageId se
  // vždy znovu ověří proti serverové konfiguraci (viz zadání).
  const creditPackage = getCreditPackage(packageId);
  if (!creditPackage) {
    console.error("Stripe webhook: neznámý packageId", packageId, "session", session.id);
    return NextResponse.json({ error: "unknown_package" }, { status: 400 });
  }

  if (creditPackage.credits !== metadataAmountG) {
    console.error("Stripe webhook: amountG neodpovídá konfiguraci balíčku, session", session.id);
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  if (session.currency !== "czk") {
    console.error("Stripe webhook: neočekávaná měna", session.currency, "session", session.id);
    return NextResponse.json({ error: "currency_mismatch" }, { status: 400 });
  }

  const expectedAmount = creditPackage.priceCzk * 100;
  if (session.amount_total !== expectedAmount) {
    console.error("Stripe webhook: zaplacená částka neodpovídá ceně balíčku, session", session.id);
    return NextResponse.json({ error: "price_mismatch" }, { status: 400 });
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  try {
    await applyStripeTopup({
      userId,
      amountG: creditPackage.credits,
      priceCzk: creditPackage.priceCzk,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      description: `Nákup balíčku ${creditPackage.id}`,
    });
  } catch (error) {
    console.error("Stripe webhook: applyStripeTopup selhalo, session", session.id, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
