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
// StageViewSwitch (skin.minStageWidth), se ale pořád zobrazuje
// LegacyCasinoLayout, kde header/footer zůstávají beze změny — proto je
// podmínka na ROUTE (usePathname) I na VIEWPORT (useMinWidth), ne jen na
// jedno z toho. Ostatní obsahové stránky (Profil / Žebříčky / Jak to
// funguje) mají header/footer jen v mobile fallbacku — na desktopu mají
// vlastní artwork stage, viz UNIVERSAL_STAGE_ROUTES níž.
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
// /jak-to-funguje se sem přidal taky (viz zadání "aby tam nebylo to menu,
// footer, ale byla tam ta šipka zpět") — je to obsahová stránka, ale jede
// ve stejném "samostatném" režimu jako hry a vlastní šipku zpět si kreslí
// sama (viz app/(site)/jak-to-funguje/page.tsx).
const STANDALONE_ROUTES = new Set<string>(["/skorapky", "/losy", "/automaty", "/jak-to-funguje"]);

// Obsahové/uživatelské stránky, které mají na desktopu vlastní artwork stage
// (classicSkin.universal, viz app/components/stage/ContentPage.tsx) — stejně
// jako /casino stage je artwork sám nositelem menu/patičky, takže globální
// header/footer by se zdvojily. Pod breakpointem (mobile fallback) zůstává
// běžná stránka s headerem/footerem; /jak-to-funguje je bez chrome na všech
// šířkách (STANDALONE_ROUTES výš), takže tam se nic nemění.
const UNIVERSAL_STAGE_ROUTES = new Set<string>(["/profil", "/zebricky", "/jak-to-funguje"]);

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // useMinWidth se MUSÍ volat nepodmíněně (Rules of Hooks) — kombinace s
  // route podmínkou až v samostatném řádku, ne přes `&&` short-circuit.
  const isWideEnough = useMinWidth(getActiveSkin().minStageWidth);
  const isDesktopStage = pathname === "/casino" && isWideEnough;
  const isUniversalStage = UNIVERSAL_STAGE_ROUTES.has(pathname) && isWideEnough;
  const isStandalone = STANDALONE_ROUTES.has(pathname);
  const hideChrome = isDesktopStage || isUniversalStage || isStandalone;

  return (
    <div className={hideChrome ? undefined : "flex min-h-screen flex-col"}>
      {!hideChrome && <Header />}
      <main className={hideChrome ? undefined : "flex-1"}>{children}</main>
      {!hideChrome && <Footer />}
    </div>
  );
}
