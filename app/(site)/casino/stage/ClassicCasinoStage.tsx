import Link from "next/link";
import type { ReactNode } from "react";
import type { CasinoSkin } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";
import SlotMachine from "../../automaty/SlotMachine.tsx";
import AccountOverlay from "./AccountOverlay.tsx";
import CasinoStage from "./CasinoStage.tsx";
import MenuOverlay from "./MenuOverlay.tsx";
import StatsOverlay from "./StatsOverlay.tsx";

// Skládá celý "classic" skin dohromady: background canvas (CasinoStage) +
// živé HTML overlaye napozicované podle skin.layout. Žádná herní/wallet/
// auth logika tady není — jen kompozice existujících kusů (SlotMachine
// embedded větev, AccountPanel-equivalent, RightSidebarPanels-equivalent).
// `promotionSlot`/`globalStats` se předávají jako children zvenčí (server
// komponenty, viz page.tsx), protože tenhle soubor by jinak musel být
// "use client" jen kvůli CasinoStage a nešlo by do něj vložit server
// komponenty přímo.
export default function ClassicCasinoStage({
  skin,
  promotionSlot,
}: {
  skin: CasinoSkin;
  promotionSlot?: ReactNode;
}) {
  return (
    <div>
      {/* H1 zůstává v DOM pro SEO/accessibility — vizuálně ho nahrazuje
          artwork ("AUTOMATY" / "Těsně vedle."), ať se titulek nezdvojuje. */}
      <h1 className="sr-only">Automaty — Těsně vedle.</h1>

      <CasinoStage skin={skin}>
        <Link
          href="/"
          style={rectStyle(skin.layout.logoHome)}
          aria-label="GEMBL.cz — domů"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
        />

        <MenuOverlay items={skin.layout.menu.items} rows={skin.layout.menu.rows} />
        <AccountOverlay layout={skin.layout.account} />
        <StatsOverlay layout={skin.layout.stats} />
        <SlotMachine embedded layout={skin.layout.slot} />
      </CasinoStage>

      {promotionSlot && <div className="mt-8">{promotionSlot}</div>}
    </div>
  );
}
