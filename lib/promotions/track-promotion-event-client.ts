import type { PromotionEventType } from "./track-promotion-event.ts";

// Klientský fire-and-forget POST na interní /api/promotion-events —
// prohlížeč nikdy nedostane UCA token (viz app/api/promotion-events/route.ts).
// Nikdy nevyhazuje, nikdy nic nečeká — banner/klik nesmí čekat na tracking.
export function trackPromotionEventClient(promotionId: string, type: PromotionEventType): void {
  try {
    fetch("/api/promotion-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promotionId, type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fail-open
  }
}
