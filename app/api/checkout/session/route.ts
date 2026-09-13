import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";
import { getSiteUrl } from "../../../../lib/site-url";
import { getStripe } from "../../../../lib/stripe/client";
import { getCreditPackage } from "../../../../lib/wallet/packages";

// Frontend posílá jen `packageId` — cenu, počet G a Stripe amount si server
// vždy dohledá v CREDIT_PACKAGES (lib/wallet/packages.ts), nikdy nevěří
// hodnotám z requestu (viz zadání "Nepřebírej důvěryhodně cenu ani G z klienta").
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { packageId } = (body ?? {}) as Record<string, unknown>;
  if (typeof packageId !== "string") return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const creditPackage = getCreditPackage(packageId);
  if (!creditPackage) return NextResponse.json({ error: "unknown_package" }, { status: 400 });

  const siteUrl = getSiteUrl();

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "czk",
            unit_amount: creditPackage.priceCzk * 100,
            product_data: {
              name: creditPackage.label,
              description: "Digital in-game credits for use in GEMBL.cz.",
            },
          },
        },
      ],
      success_url: `${siteUrl}/casino?payment=success`,
      cancel_url: `${siteUrl}/casino?payment=cancelled`,
      // Primární vazba platby na účet je user_id (ne email, viz zadání) —
      // webhook navíc znovu ověří, že packageId odpovídá konfiguraci.
      metadata: {
        userId: String(user.id),
        packageId: creditPackage.id,
        amountG: String(creditPackage.credits),
      },
    });

    if (!session.url) throw new Error("Stripe nevrátil session.url");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("POST /api/checkout/session selhalo:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "stripe_error" }, { status: 502 });
  }
}
