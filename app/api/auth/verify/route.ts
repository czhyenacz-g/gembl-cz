import { NextResponse } from "next/server";
import { consumeMagicLinkToken } from "../../../../lib/auth/magic-link";
import { sanitizeCallbackUrl } from "../../../../lib/auth/safe-redirect";
import { createSessionCookieValue, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "../../../../lib/auth/session";
import { getSiteUrl } from "../../../../lib/site-url";
import { findOrCreateUserAndGrantWelcomeBonus } from "../../../../lib/wallet/ledger";

const WELCOME_BONUS_G = 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const callbackUrl = sanitizeCallbackUrl(url.searchParams.get("callbackUrl"));
  const siteUrl = getSiteUrl();

  if (!token) return NextResponse.redirect(`${siteUrl}/casino?login=invalid`);

  const consumed = await consumeMagicLinkToken(token);
  if (!consumed) return NextResponse.redirect(`${siteUrl}/casino?login=invalid`);

  // Založení/dohledání uživatele + jednorázový uvítací bonus v JEDNÉ
  // atomické DB transakci (viz lib/wallet/ledger.ts).
  const { userId } = await findOrCreateUserAndGrantWelcomeBonus(consumed.email, WELCOME_BONUS_G);

  const response = NextResponse.redirect(`${siteUrl}${callbackUrl}`);
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
