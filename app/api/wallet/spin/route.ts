import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";
import { isValidBet } from "../../../../lib/wallet/bet";
import { InsufficientCreditsError, spendCredits } from "../../../../lib/wallet/ledger";

// Sázku volí hráč (+/- v UI, viz SlotMachine.tsx), ale server ji NIKDY
// neveří naslepo — isValidBet ověří rozsah/krok předtím, než se cokoli
// odečte, a spendCredits atomicky ověří i dostatek kreditů (viz zadání
// "Nespoléhej pouze na disabled tlačítka v UI").
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { bet } = (body ?? {}) as Record<string, unknown>;
  if (!isValidBet(bet)) return NextResponse.json({ error: "invalid_bet" }, { status: 400 });

  try {
    const { balance } = await spendCredits(user.id, bet, `Roztočení automatu (sázka ${bet} G)`);
    return NextResponse.json({ balance });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "insufficient_credits", balance: user.credits }, { status: 402 });
    }
    console.error("POST /api/wallet/spin selhalo:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
