import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { consumeMagicLinkToken } from "../../../../lib/auth/magic-link";
import { sanitizeCallbackUrl } from "../../../../lib/auth/safe-redirect";
import { createSessionCookieValue, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from "../../../../lib/auth/session";
import { getSiteUrl } from "../../../../lib/site-url";
import { grantWelcomeBonusOnce } from "../../../../lib/wallet/ledger";

const WELCOME_BONUS_G = 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const callbackUrl = sanitizeCallbackUrl(url.searchParams.get("callbackUrl"));
  const siteUrl = getSiteUrl();

  if (!token) return NextResponse.redirect(`${siteUrl}/casino?login=invalid`);

  const consumed = await consumeMagicLinkToken(token);
  if (!consumed) return NextResponse.redirect(`${siteUrl}/casino?login=invalid`);

  // Upsert v jednom atomickém dotazu — `DO UPDATE` (místo `DO NOTHING`) jen
  // proto, aby `RETURNING id` fungovalo i při konfliktu (existující účet).
  const userResult = await sql<{ id: number }>`
    INSERT INTO users (email) VALUES (${consumed.email})
    ON CONFLICT (email) DO UPDATE SET updated_at = now()
    RETURNING id
  `;
  const userId = userResult.rows[0].id;

  await grantWelcomeBonusOnce(userId, WELCOME_BONUS_G);

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
