import "server-only";
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/** Líné vytvoření klienta (ne na top-level modulu) — chybějící env proměnná nesmí rozbít build, jen běhový request selže kontrolovaně. */
export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY není nastavený.");

  stripeInstance = new Stripe(secretKey);
  return stripeInstance;
}
