"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

// Práh, od kterého dává artwork stage smysl (viz lib/casino-skins/classic.ts
// `minStageWidth` — drženo tady jako čistě prezentační breakpoint, ne
// skin data, protože o samotném PŘEPÍNÁNÍ layoutů skin nic neví).
const STAGE_BREAKPOINT_PX = 1100;

// DŮLEŽITÉ: `stage` a `legacy` musí být VŽDY jen jedna z nich reálně
// mountnutá, nikdy obě zároveň (na rozdíl od čistě CSS `hidden`/`block`
// přepínače) — obě větve totiž obsahují komponenty s vedlejšími efekty
// při mountu (PromotionSlot → impression tracking, useSession() → fetch
// /api/auth/me, SlotMachine timery), které by se při CSS-only přepínání
// (obě v DOM, jen jedna viditelná) spustily DVAKRÁT současně — třeba by
// se stejná promotion impression započítala dvakrát za jedno zobrazení
// stránky. Proto JS větev: server vždy pošle `legacy` (deterministický
// první render, žádný hydration mismatch), a `useLayoutEffect` hned po
// hydrataci (ještě před prvním vykreslením prohlížečem) přepne na
// `stage`, pokud je viewport dost široký — na klientské navigaci je
// probliknutí prakticky nepostřehnutelné, na tvrdém page loadu jde o
// jeden frame.
export default function CasinoViewSwitch({ stage, legacy }: { stage: ReactNode; legacy: ReactNode }) {
  const [isStage, setIsStage] = useState(false);

  useLayoutEffect(() => {
    const mql = window.matchMedia(`(min-width: ${STAGE_BREAKPOINT_PX}px)`);
    setIsStage(mql.matches);

    function handleChange(event: MediaQueryListEvent) {
      setIsStage(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isStage ? <>{stage}</> : <>{legacy}</>;
}
