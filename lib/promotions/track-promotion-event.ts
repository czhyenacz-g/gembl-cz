import "server-only";
import { createRecord } from "../uca/records.ts";

// Jednoduchý, čistě append-only event log pro impression/click na
// promotion — jeden malý record na jeden event (stejný vzor jako
// game_scores/analytics_events jinde), žádný update/increment na
// existujícím počítadle (to by bylo náchylné na race conditions přes
// souběžné návštěvníky, viz UCA PATCH = replace-not-merge). CTR/"která
// reklama funguje nejlépe" se pak počítá při čtení (COUNT přes tuhle
// collection), ne při zápisu — viz docs/API.md.
const COLLECTION = "promotion_events";

export type PromotionEventType = "impression" | "click";

/** Vždy fail-open — tracking nikdy nesmí shodit banner ani navigaci na odkaz. */
export async function trackPromotionEvent(promotionId: string, type: PromotionEventType): Promise<void> {
  try {
    await createRecord(COLLECTION, { promotion_id: promotionId, type });
  } catch (error) {
    console.error(`trackPromotionEvent(${promotionId}, ${type}) selhal:`, error instanceof Error ? error.message : error);
  }
}
