import type { CasinoSkin } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";

// MOCK DATA — stejná hodnota a stejné odůvodnění jako RightSidebarPanels.tsx
// (žádný per-hráč leaderboard v UCA zatím neexistuje, viz lib/casino/global-stats.ts).
// Jen jiná prezentace nad artwork ikonové řádky (kostka/pohár/koruna).
const MOCK_BIGGEST_LOSER = { nickname: "Nevyhraju101", amount: "-12 480 G" };
const MOCK_LAST_WIN = { nickname: "Lucky_nejdřív", amount: "+0 G" };

export default function StatsOverlay({ layout }: { layout: CasinoSkin["layout"]["stats"] }) {
  return (
    <>
      <div style={rectStyle(layout.biggestLoser)} className="flex flex-col items-center justify-center gap-0.5 px-2 text-center">
        <p className="font-serif text-xs font-bold uppercase tracking-wide text-gembl-ink">{MOCK_BIGGEST_LOSER.nickname}</p>
        <p className="font-mono text-base font-bold text-gembl-red">{MOCK_BIGGEST_LOSER.amount}</p>
      </div>

      <div style={rectStyle(layout.lastWin)} className="flex flex-col items-center justify-center gap-0.5 px-2 text-center">
        <p className="font-serif text-xs font-bold uppercase tracking-wide text-gembl-ink">{MOCK_LAST_WIN.nickname}</p>
        <p className="font-mono text-base font-bold text-gembl-ink">{MOCK_LAST_WIN.amount}</p>
      </div>

      <div style={rectStyle(layout.achievementsLabel)} className="flex flex-col items-center justify-center gap-0.5 px-2 text-center">
        <p className="font-serif text-xs font-bold uppercase tracking-wide text-gembl-ink">Gembl klub</p>
        <p className="text-[10px] text-gembl-muted">Sbírej achievementy</p>
      </div>

      {/* Achievementy zatím nemají vlastní přehledovou stránku (odemykají
          se jen jako toasty přímo ve hře) — tlačítko zůstává disabled,
          stejné chování jako RightSidebarPanels.tsx dřív. */}
      <button
        type="button"
        disabled
        style={rectStyle(layout.achievementsCta)}
        className="flex cursor-not-allowed items-center justify-center bg-transparent font-serif text-xs font-bold uppercase tracking-wide text-gembl-muted"
      >
        Zobrazit achievementy
      </button>
    </>
  );
}
