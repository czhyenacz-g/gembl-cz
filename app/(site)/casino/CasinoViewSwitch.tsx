"use client";

import type { ReactNode } from "react";
import { getActiveSkin } from "../../../lib/casino-skins/index.ts";
import { useMinWidth } from "../../../lib/use-min-width.ts";

// DŮLEŽITÉ: `stage` a `legacy` musí být VŽDY jen jedna z nich reálně
// mountnutá, nikdy obě zároveň (na rozdíl od čistě CSS `hidden`/`block`
// přepínače) — obě větve totiž obsahují komponenty s vedlejšími efekty
// při mountu (PromotionSlot → impression tracking, useSession() → fetch
// /api/auth/me, SlotMachine timery, CreditGateOnArrival), které by se při
// CSS-only přepínání (obě v DOM, jen jedna viditelná) spustily DVAKRÁT
// současně — třeba by se stejná promotion impression započítala dvakrát
// za jedno zobrazení stránky, nebo by se ukázaly dva credit-gate modaly.
// Proto JS větev: server vždy pošle `legacy` (deterministický první
// render, žádný hydration mismatch), a `useMinWidth` (viz lib/use-min-width.ts)
// hned po hydrataci přepne na `stage`, pokud je viewport dost široký.
// Breakpoint se čte ze skin configu (skin.minStageWidth), ne jako
// samostatná zadrátovaná konstanta — stejnou hodnotu čte i SiteChrome.tsx
// (skrývání header/footer), ať se obě místa nikdy nerozejdou.
export default function CasinoViewSwitch({ stage, legacy }: { stage: ReactNode; legacy: ReactNode }) {
  const isStage = useMinWidth(getActiveSkin().minStageWidth);
  return isStage ? <>{stage}</> : <>{legacy}</>;
}
