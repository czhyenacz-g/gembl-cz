import ArtworkPlaceholder from "../../components/ArtworkPlaceholder";

// MOCK DATA — žádný per-hráč leaderboard v UCA zatím neexistuje
// (game_stats_events agreguje napříč VŠEMI hráči anonymně, ne po
// nicknamu, viz lib/casino/global-stats.ts). Hodnoty jsou natvrdo dané
// příklady ze zadání, ne reálný výpočet — nevytváříme kvůli tomuhle
// kroku nový backend/agregaci (viz zadání).
const MOCK_BIGGEST_LOSER = { nickname: "Nevyhraju101", amount: "-12 480 G" };
const MOCK_LAST_WIN = { nickname: "Lucky_nejdřív", amount: "+0 G" };

// Zbytek pravého sloupce KROMĚ účtu (viz AccountPanel.tsx) — účet je
// samostatný grid item schválně, na mobile má vyšší prioritu pořadí
// než tenhle blok (viz .gembl-page-grid v gembl-newspaper.css).
export default function RightSidebarPanels() {
  return (
    <div className="gembl-sidebar flex flex-col gap-6">
      <div className="gembl-panel">
        <p className="gembl-panel-title">Dnešní nejsmolnější hráč</p>
        <div className="gembl-panel-body flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-gembl-ink bg-gembl-paper font-serif text-base font-black text-gembl-ink"
            aria-hidden="true"
          >
            {MOCK_BIGGEST_LOSER.nickname.charAt(0)}
          </div>
          <div>
            <p className="font-serif text-sm font-bold uppercase text-gembl-ink">{MOCK_BIGGEST_LOSER.nickname}</p>
            <p className="font-mono text-lg font-bold text-gembl-red">{MOCK_BIGGEST_LOSER.amount}</p>
          </div>
        </div>
      </div>

      <div className="gembl-panel">
        <p className="gembl-panel-title">Poslední výhra</p>
        <div className="gembl-panel-body flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-gembl-ink bg-gembl-paper font-serif text-base font-black text-gembl-ink"
            aria-hidden="true"
          >
            {MOCK_LAST_WIN.nickname.charAt(0)}
          </div>
          <div>
            <p className="font-serif text-sm font-bold uppercase text-gembl-ink">{MOCK_LAST_WIN.nickname}</p>
            <p className="font-mono text-lg font-bold text-gembl-ink">{MOCK_LAST_WIN.amount}</p>
          </div>
        </div>
      </div>

      <div className="gembl-panel">
        <p className="gembl-panel-title">Gembl klub</p>
        <div className="gembl-panel-body">
          <ArtworkPlaceholder label="Ilustrace poháru" aspectRatio="1 / 1" className="mx-auto max-w-[140px]" />
          <p className="mt-3 text-sm text-gembl-muted">Sbírej achievementy a získej exkluzivní odměny.</p>
          {/* Achievementy zatím nemají vlastní přehledovou stránku
              (odemykají se jen jako toasty přímo ve hře) — tlačítko je
              proto zatím bez navigace, viz zadání "disabled stav". */}
          <button type="button" className="gembl-cta gembl-cta--disabled mt-4 w-full" disabled>
            Zobrazit achievementy
          </button>
        </div>
      </div>
    </div>
  );
}
