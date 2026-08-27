import "server-only";
import { getRecords } from "../uca/records.ts";
import type { UcaRecord } from "../uca/types.ts";
import { pickPromotion } from "./pick-promotion.ts";
import type { Promotion, PromotionPlacement } from "./types.ts";

const COLLECTION = "promotions";
// Promo obsah není realtime (spravuje se ručně) — bezpečné cachovat o
// něco déle než běžný obsah.
const REVALIDATE_SECONDS = 120;

/**
 * null = record není zobrazitelná promotion — UCA o poli `active` nic
 * neví (je to jen další hodnota v `data`), filtrování je čistě na nás.
 */
function mapRecordToPromotion(record: UcaRecord): Promotion | null {
  const data = record.data;
  if (data.active !== true) return null;

  const placement = data.placement;
  if (placement !== "banner" && placement !== "seller") return null;

  const pagePattern = typeof data.page_pattern === "string" ? data.page_pattern : null;
  const title = typeof data.title === "string" ? data.title : null;
  if (!pagePattern || !title) return null;

  const media = record.media[record.media.length - 1];
  const weightRaw = data.weight;

  return {
    id: `${record.id}`,
    placement,
    pagePattern,
    title,
    bodyHtml: typeof data.body_html === "string" && data.body_html ? data.body_html : undefined,
    ctaLabel: typeof data.cta_label === "string" && data.cta_label ? data.cta_label : undefined,
    href: typeof data.href === "string" && data.href ? data.href : undefined,
    imageUrl: media?.public_url,
    weight: typeof weightRaw === "number" && weightRaw > 0 ? weightRaw : 1,
  };
}

/** Všechny aktivní promotions daného placementu. */
export async function getActivePromotions(placement: PromotionPlacement): Promise<Promotion[]> {
  const records = await getRecords(COLLECTION, {
    status: "approved",
    revalidateSeconds: REVALIDATE_SECONDS,
  }).catch(() => []);

  return records
    .map(mapRecordToPromotion)
    .filter((p): p is Promotion => p !== null && p.placement === placement);
}

/** Server-side výběr jedné promotion pro danou route — browser nikdy nevidí kandidáty. */
export async function getActivePromotionForRoute(
  placement: PromotionPlacement,
  pathname: string
): Promise<Promotion | null> {
  const candidates = await getActivePromotions(placement);
  return pickPromotion(candidates, pathname);
}
