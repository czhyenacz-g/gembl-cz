import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";
import { isValidBet } from "../../../../lib/wallet/bet";
import { InsufficientCreditsError, spendCredits } from "../../../../lib/wallet/ledger";

// Generický bet endpoint pro DALŠÍ hry mimo /automaty (ten má vlastní
// /api/wallet/spin, viz zadání "neměň /automaty funkcionalitu" — tenhle
// endpoint ho nenahrazuje, jen sdílí STEJNOU wallet logiku, spendCredits/
// isValidBet z lib/wallet/, ať nevzniká druhá skoro-stejná
// implementace). `game` je whitelistovaný na serveru, ne libovolný
// klientem podvržený string — používá se jen jako čitelný popisek v
// ledgeru (credit_transactions.description), stejný vzor jako spin
// route ("Roztočení automatu (sázka X G)"). Payout u nových her jde vždy
// přes tenhle endpoint jen jako ODEČET (spendCredits) — žádná výhra se
// nikdy nepřipisuje, stejně jako u /automaty (viz slot-engine.ts payout: 0).
const GAME_LABELS: Record<string, string> = {
  skorapky: "Skořápky",
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { game, bet } = (body ?? {}) as Record<string, unknown>;
  if (typeof game !== "string" || !(game in GAME_LABELS)) {
    return NextResponse.json({ error: "invalid_game" }, { status: 400 });
  }
  if (!isValidBet(bet)) return NextResponse.json({ error: "invalid_bet" }, { status: 400 });

  try {
    const { balance } = await spendCredits(user.id, bet, `${GAME_LABELS[game]} (sázka ${bet} G)`);
    return NextResponse.json({ balance });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "insufficient_credits", balance: user.credits }, { status: 402 });
    }
    console.error("POST /api/wallet/bet selhalo:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
