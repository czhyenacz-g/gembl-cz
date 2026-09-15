import Link from "next/link";
import type { CasinoSkin } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";

// Čistě vizuální teaser automatu na /casino — /casino už NENÍ druhá
// plnohodnotná hra (viz zadání), jen vstupní brána do skutečného
// automatu na /automaty. Žádná herní logika, žádný wallet, žádné stats:
// jediná "akce" tady je odkaz. Skutečná hra (spin/wallet/stats) zůstává
// výhradně v SlotMachine.tsx (/automaty) — jeden zdroj pravdy, žádný
// druhý engine.
//
// Reel okno a result panel zůstávají prázdné (artwork background má tam
// vlastní vytištěné statické symboly, viz classic.ts komentář u
// layout.slot) — přesně stejný vzhled, jaký měl idle stav před prvním
// spinem i v předchozí (plně hratelné) verzi, jen bez interaktivní
// sázky/spin tlačítka. `stakeControl` zóna se vůbec nevykresluje (viz
// zadání "preferuji čistý teaser bez falešné možnosti vsadit").
export default function SlotTeaser({ layout }: { layout: CasinoSkin["layout"]["slot"] }) {
  return (
    <div style={rectStyle(layout.spinButton)} className="flex flex-col items-center justify-center gap-1.5 px-2">
      <Link
        href="/automaty"
        className="flex min-h-[44px] w-full max-w-[240px] items-center justify-center border-2 border-gembl-ink bg-gembl-red px-4 py-2 text-center font-serif text-base font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
      >
        HRÁT AUTOMATY
      </Link>
    </div>
  );
}
