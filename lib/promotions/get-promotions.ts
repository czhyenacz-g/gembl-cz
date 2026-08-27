import "server-only";
import { getRecords } from "../uca/records.ts";
import type { UcaRecord } from "../uca/types.ts";
import { pickPromotion } from "./pick-promotion.ts";
import type { Promotion, PromotionPlacement } from "./types.ts";

const COLLECTION = "promotions";
// Promo obsah není realtime (spravuje se ručně) — bezpečné cachovat o
// něco déle než běžný obsah.
const REVALIDATE_SECONDS = 120;

const PLACEMENT_VALUES: readonly PromotionPlacement[] = [
  "banner",
  "seller",
  "homepage_top",
  "homepage_middle",
  "game_top",
  "game_bottom",
  "sidebar",
  "mobile_inline",
];

function isPromotionPlacement(value: unknown): value is PromotionPlacement {
  return typeof value === "string" && (PLACEMENT_VALUES as readonly string[]).includes(value);
}

/**
 * null = record není zobrazitelná promotion — UCA o poli `active` nic
 * neví (je to jen další hodnota v `data`), filtrování je čistě na nás.
 * Stejně tak `valid_from`/`valid_until` (časové okno platnosti) — UCA
 * je jen uloží, vyhodnocení dělá volající při čtení.
 */
function mapRecordToPromotion(record: UcaRecord, now: number): Promotion | null {
  const data = record.data;
  if (data.active !== true) return null;

  if (!isPromotionPlacement(data.placement)) return null;
  const placement = data.placement;

  const pagePattern = typeof data.page_pattern === "string" ? data.page_pattern : null;
  const title = typeof data.title === "string" ? data.title : null;
  if (!pagePattern || !title) return null;

  const validFrom = typeof data.valid_from === "string" ? data.valid_from : undefined;
  const validUntil = typeof data.valid_until === "string" ? data.valid_until : undefined;
  if (validFrom && now < Date.parse(validFrom)) return null;
  if (validUntil && now > Date.parse(validUntil)) return null;

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
    affiliateKey: typeof data.affiliate_key === "string" && data.affiliate_key ? data.affiliate_key : undefined,
    validFrom,
    validUntil,
  };
}

/**
 * Všechny aktivní (a v rámci platnosti) promotions daného placementu —
 * `filter[placement]=...` se řeší server-side v UCA (viz docs/API.md),
 * takže se nestahují ani nemapují promotions jiných placementů zbytečně.
 */
export async function getActivePromotions(placement: PromotionPlacement, now: number = Date.now()): Promise<Promotion[]> {
  const records = await getRecords(COLLECTION, {
    status: "approved",
    filter: { placement },
    perPage: 50,
    revalidateSeconds: REVALIDATE_SECONDS,
  }).catch(() => []);

  return records
    .map((record) => mapRecordToPromotion(record, now))
    .filter((p): p is Promotion => p !== null);
}

/** Server-side výběr jedné promotion pro daný placement — browser nikdy nevidí kandidáty. */
export async function getActivePromotionForRoute(
  placement: PromotionPlacement,
  pathname: string
): Promise<Promotion | null> {
  const candidates = await getActivePromotions(placement);
  return pickPromotion(candidates, pathname);
}
