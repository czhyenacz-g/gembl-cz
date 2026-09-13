import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";
import { InsufficientCreditsError, spendCredits } from "../../../../lib/wallet/ledger";
import { SPIN_COST } from "../../../config/site";

// Cena spinu je server-side konstanta (SPIN_COST) — klient nikdy neposílá
// vlastní částku, viz zadání "žádné přičítání/odečítání podle klienta".
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { balance } = await spendCredits(user.id, SPIN_COST, "Roztočení automatu");
    return NextResponse.json({ balance });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "insufficient_credits", balance: user.credits }, { status: 402 });
    }
    console.error("POST /api/wallet/spin selhalo:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
