import { getActivePromotionForRoute } from "../../lib/promotions/get-promotions";
import type { Promotion, PromotionPlacement } from "../../lib/promotions/types";

// Infrastruktura, ne vzhled — AdSlot vybírá aktivní promotion server-side
// (žádné kandidáty do browseru, jen finální výsledek) a nechává VŠECHNA
// designová rozhodnutí na volajícím přes `render`. Nezapíná se nikde
// automaticky (viz app/page.tsx) — je jen připravená k použití.
//
// Použití (v libovolné Server Component stránce):
//
//   <AdSlot
//     placement="banner"
//     pathname="/nejaka-stranka"
//     render={(promotion) =>
//       promotion ? <MyBanner imageSrc={promotion.imageUrl} href={promotion.href} title={promotion.title} /> : <MyPlaceholder />
//     }
//   />
export default async function AdSlot({
  placement,
  pathname,
  render,
}: {
  placement: PromotionPlacement;
  pathname: string;
  render: (promotion: Promotion | null) => React.ReactNode;
}) {
  const promotion = await getActivePromotionForRoute(placement, pathname).catch(() => null);
  return <>{render(promotion)}</>;
}
