import { NextResponse } from "next/server";
import { consumeMagicLinkToken } from "../../../../lib/auth/magic-link";
import { sanitizeCallbackUrl } from "../../../../lib/auth/safe-redirect";
import { createSessionCookieValue, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "../../../../lib/auth/session";
import { getSiteUrl } from "../../../../lib/site-url";
import { PENDING_PRIZE_COOKIE_NAME, resolveBaseAmountG, WELCOME_PRIZE_LOGIN_MULTIPLIER } from "../../../../lib/onboarding/welcome-prize";
import { findOrCreateUserAndGrantWelcomeBonus } from "../../../../lib/wallet/ledger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const callbackUrl = sanitizeCallbackUrl(url.searchParams.get("callbackUrl"));
  const siteUrl = getSiteUrl();

  if (!token) return NextResponse.redirect(`${siteUrl}/casino?login=invalid`);

  const consumed = await consumeMagicLinkToken(token);
  if (!consumed) return NextResponse.redirect(`${siteUrl}/casino?login=invalid`);

  // Uvítací bonus = základní welcome-prize částka asociovaná s TÍMHLE
  // tokenem v okamžiku jeho vyžádání (viz lib/auth/magic-link.ts,
  // POST /api/auth/magic-link) × WELCOME_PRIZE_LOGIN_MULTIPLIER — nikdy
  // z ničeho, co posílá tenhle (verify) request samotný. Fallback
  // (resolveBaseAmountG) je jen pojistka pro token bez asociované výhry
  // (stará data, edge case), ne běžná cesta.
  const welcomeBonusG = resolveBaseAmountG(consumed.pendingPrizeG) * WELCOME_PRIZE_LOGIN_MULTIPLIER;

  // Založení/dohledání uživatele + jednorázový uvítací bonus v JEDNÉ
  // atomické DB transakci (viz lib/wallet/ledger.ts).
  const { userId } = await findOrCreateUserAndGrantWelcomeBonus(consumed.email, welcomeBonusG);

  const response = NextResponse.redirect(`${siteUrl}${callbackUrl}`);
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
  // Výhra je vyzvednutá (granted, nebo už byla dřív) — pending-prize
  // cookie dál nemá smysl, ať se stejné číslo neukazuje pořád dokola.
  response.cookies.delete(PENDING_PRIZE_COOKIE_NAME);

  return response;
}
