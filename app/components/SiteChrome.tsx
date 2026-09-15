"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { getActiveSkin } from "../../lib/casino-skins/index.ts";
import { useMinWidth } from "../../lib/use-min-width.ts";
import Footer from "./Footer";
import Header from "./Header";

// /casino má na dost širokém viewportu vlastní artwork stage (viz
// app/(site)/casino/stage/), který funguje jako samostatný vizuální
// canvas s vlastním menu/logem/patičkou vypálenými v obrázku — globální
// header (duplicitní menu) a footer (artwork má vlastní vizuální
// zakončení) by tam byly zdvojené. Pod stejným prahem, jaký používá
// CasinoViewSwitch (skin.minStageWidth), se ale pořád zobrazuje
// LegacyCasinoLayout, kde header/footer zůstávají beze změny — proto je
// podmínka na ROUTE (usePathname) I na VIEWPORT (useMinWidth), ne jen na
// jedno z toho. Všechny ostatní stránky mají header/footer vždy.
//
// `flex min-h-screen flex-col` (jinak natvrdo na <body>, viz app/layout.tsx)
// i `flex-1` na `main` se na téže kombinaci vynechávají: jinak by
// `min-h-screen` roztáhl stránku na výšku obrazovky i s krátkým obsahem
// stage, a vznikla by prázdná plocha pod stage (dřív nad footerem, viz
// zadání "velká prázdná plocha na screenshotu") — bez `min-h-screen`
// stránka jednoduše skončí tam, kde končí skutečný obsah.
export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // useMinWidth se MUSÍ volat nepodmíněně (Rules of Hooks) — kombinace s
  // route podmínkou až v samostatném řádku, ne přes `&&` short-circuit.
  const isWideEnough = useMinWidth(getActiveSkin().minStageWidth);
  const isDesktopStage = pathname === "/casino" && isWideEnough;

  return (
    <div className={isDesktopStage ? undefined : "flex min-h-screen flex-col"}>
      {!isDesktopStage && <Header />}
      <main className={isDesktopStage ? undefined : "flex-1"}>{children}</main>
      {!isDesktopStage && <Footer />}
    </div>
  );
}
