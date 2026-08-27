import { getActivePromotionForRoute } from "../../../lib/promotions/get-promotions";
import type { PromotionPlacement } from "../../../lib/promotions/types";
import HorizontalBanner from "./HorizontalBanner";

// Server komponenta — vybere aktivní promotion pro daný placement
// server-side (browser nikdy nevidí kandidáty ani UCA token) a předá
// jediný výsledek do HorizontalBanner. `.catch(() => null)` navíc nad
// už fail-open getActivePromotionForRoute — výpadek UCA se nikdy
// nesmí projevit jinak než "banner se prostě nezobrazí".
export default async function PromotionSlot({
  placement,
  pathname,
  className,
}: {
  placement: PromotionPlacement;
  pathname: string;
  className?: string;
}) {
  const promotion = await getActivePromotionForRoute(placement, pathname).catch(() => null);
  return <HorizontalBanner promotion={promotion} className={className} />;
}
