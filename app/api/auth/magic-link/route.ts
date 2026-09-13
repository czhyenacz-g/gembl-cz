import { NextResponse } from "next/server";
import { isRateLimited } from "../../../../lib/analytics/rate-limit";
import { isValidEmail, normalizeEmail } from "../../../../lib/auth/email";
import { createMagicLinkToken } from "../../../../lib/auth/magic-link";
import { sanitizeCallbackUrl } from "../../../../lib/auth/safe-redirect";
import { sendMagicLinkEmail } from "../../../../lib/auth/send-magic-link-email";
import { getSiteUrl } from "../../../../lib/site-url";

// Odpověď je VŽDY stejná bez ohledu na to, jestli email existuje, má
// platný tvar, nebo jestli odeslání e-mailu uvnitř selhalo — viz zadání
// "neprozrazuj zbytečně, zda email v databázi existuje".
const GENERIC_MESSAGE = "Pokud je možné tento email použít, poslali jsme na něj přihlašovací odkaz.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { email: rawEmail, callbackUrl } = (body ?? {}) as Record<string, unknown>;
  if (typeof rawEmail !== "string") return NextResponse.json({ ok: false }, { status: 400 });

  const email = normalizeEmail(rawEmail);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = isRateLimited(`magic-link:ip:${ip}`) || isRateLimited(`magic-link:email:${email}`);

  if (!limited && isValidEmail(email)) {
    try {
      const token = await createMagicLinkToken(email);
      const safeCallbackUrl = sanitizeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : null);
      const loginUrl = `${getSiteUrl()}/api/auth/verify?token=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(
        safeCallbackUrl
      )}`;
      await sendMagicLinkEmail({ to: email, loginUrl });
    } catch (error) {
      console.error("POST /api/auth/magic-link selhalo:", error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
