import { NextResponse } from "next/server";
import { trackPromotionEvent } from "../../../lib/promotions/track-promotion-event";

const MAX_PROMOTION_ID_LENGTH = 20;

// Malý interní ingest endpoint — jediný důvod, proč existuje, je že
// klient nesmí dostat UCA token (viz lib/uca/client.ts, "server-only").
// Whitelist typu (impression|click) + délkový limit ID jsou jediná
// validace — žádný rate limit v MVP (nízkofrekvenční, žádný volný
// text/payload k zneužití), viz zadání "nepřidávej komplikovaný
// analytický systém".
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { promotionId, type } = (body ?? {}) as { promotionId?: unknown; type?: unknown };

  if (typeof promotionId !== "string" || promotionId.length === 0 || promotionId.length > MAX_PROMOTION_ID_LENGTH) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (type !== "impression" && type !== "click") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await trackPromotionEvent(promotionId, type);
  return NextResponse.json({ ok: true });
}
