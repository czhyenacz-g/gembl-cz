import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createPendingPrizeCookieValue,
  PENDING_PRIZE_COOKIE_MAX_AGE_SECONDS,
  PENDING_PRIZE_COOKIE_NAME,
  pickRandomPrizeAmount,
  verifyPendingPrizeCookieValue,
} from "../../../../lib/onboarding/welcome-prize";

// Vylosuje welcome-prize základní částku JEDNOU na návštěvníka a uloží ji
// do podepsané cookie (viz lib/onboarding/welcome-prize.ts) — opakované
// volání (refresh stránky) vrací POŘÁD STEJNÉ číslo, dokud cookie
// nevyexspiruje, protože platná cookie se jen přečte, ne přepíše. Žádná
// auth/session tady není potřeba — funguje i pro úplně anonymního
// návštěvníka, to je celý smysl (viz zadání "nový anonymní návštěvník").
export async function GET() {
  const cookieStore = await cookies();
  const existing = verifyPendingPrizeCookieValue(cookieStore.get(PENDING_PRIZE_COOKIE_NAME)?.value);

  const amountG = existing ?? pickRandomPrizeAmount();
  const response = NextResponse.json({ amountG });

  if (existing === null) {
    response.cookies.set(PENDING_PRIZE_COOKIE_NAME, createPendingPrizeCookieValue(amountG), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PENDING_PRIZE_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
