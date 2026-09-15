import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";
import {
  PENDING_PRIZE_COOKIE_NAME,
  resolveBaseAmountG,
  verifyPendingPrizeCookieValue,
  WELCOME_PRIZE_LOGIN_MULTIPLIER,
} from "../../../../lib/onboarding/welcome-prize";
import { findOrCreateUserAndGrantWelcomeBonus } from "../../../../lib/wallet/ledger";

// Přihlášený hráč klikne "VYZVEDNOUT VÝHRU" přímo ve welcome popupu (viz
// zadání sekce 5, "Stav B — přihlášený"). Stejná bezpečná cesta jako
// GET /api/auth/verify: základní částka se čte VÝHRADNĚ z podepsané
// cookie tohohle requestu (nikdy z těla), × WELCOME_PRIZE_LOGIN_MULTIPLIER,
// a skutečné připsání jde přes findOrCreateUserAndGrantWelcomeBonus —
// STEJNÝ ledger guard (welcome_bonus_granted_at IS NULL + partial unique
// index), takže opakované volání je neškodné no-op (granted: false),
// nikdy druhé připsání.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const pendingPrizeG = verifyPendingPrizeCookieValue(cookieStore.get(PENDING_PRIZE_COOKIE_NAME)?.value);
  const amountG = resolveBaseAmountG(pendingPrizeG) * WELCOME_PRIZE_LOGIN_MULTIPLIER;

  const { granted, balance } = await findOrCreateUserAndGrantWelcomeBonus(user.email, amountG);

  const response = NextResponse.json({ granted, balance });
  // Výhra je vyzvednutá (nebo už byla dřív) — cookie dál nemá smysl.
  response.cookies.delete(PENDING_PRIZE_COOKIE_NAME);
  return response;
}
