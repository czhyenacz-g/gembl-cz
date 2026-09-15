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
//
// /skorapky (a další hry, co přibudou) má vlastní samostatnou herní
// obrazovku bez běžného menu/patičky na VŠECH šířkách — na rozdíl od
// /casino stage, která se zapíná jen nad skin.minStageWidth (pod ní jede
// LegacyCasinoLayout s headerem/footerem). Scéna si vlastní layout i
// `min-h-screen` řeší sama (viz app/(site)/skorapky/ShellGame.tsx).
const STANDALONE_GAME_ROUTES = new Set<string>(["/skorapky"]);

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // useMinWidth se MUSÍ volat nepodmíněně (Rules of Hooks) — kombinace s
  // route podmínkou až v samostatném řádku, ne přes `&&` short-circuit.
  const isWideEnough = useMinWidth(getActiveSkin().minStageWidth);
  const isDesktopStage = pathname === "/casino" && isWideEnough;
  const isStandaloneGame = STANDALONE_GAME_ROUTES.has(pathname);
  const hideChrome = isDesktopStage || isStandaloneGame;

  return (
    <div className={hideChrome ? undefined : "flex min-h-screen flex-col"}>
      {!hideChrome && <Header />}
      <main className={hideChrome ? undefined : "flex-1"}>{children}</main>
      {!hideChrome && <Footer />}
    </div>
  );
}
