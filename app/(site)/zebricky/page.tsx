import type { Metadata } from "next";
import GlobalStatsLine from "../../components/GlobalStatsLine";
import ContentPage from "../../components/stage/ContentPage";

const TITLE = "Žebříčky";
const DESCRIPTION = "Žebříčky hráčů na GEMBL.cz — výsledková listina nejvytrvalejších smolařů.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/zebricky" },
  openGraph: { images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
};

// Per-hráč leaderboard zatím žádný backend nemá (žádný takový zdroj v UCA
// neexistuje), takže se tu nevykreslují žádná fake data — jen prázdná
// retro výsledková listina s poctivým "připravujeme" a reálný globální
// součet prohraných G, který projekt už má (GlobalStatsLine, stejný zdroj
// jako na /casino). Až leaderboard vznikne, doplní se sem řádky.
export default function ZebrickyPage() {
  return (
    <ContentPage title="Žebříčky" subtitle="Výsledková listina nejvytrvalejších smolařů.">
      <div className="border border-gembl-ink">
        <div className="grid grid-cols-[5rem_1fr_auto] gap-3 border-b border-gembl-ink bg-gembl-paper-dark px-3 py-2 font-serif text-xs font-bold uppercase tracking-wide text-gembl-ink">
          <span>Pořadí</span>
          <span>Hráč</span>
          <span className="text-right">Prohráno</span>
        </div>

        <p className="px-3 py-6 text-center text-base text-gembl-muted">
          Žebříček připravujeme. Až bude hotový, uvidíš tady pořadí, hráče a jejich celkovou prohru
          &mdash; nic z toho si nevymýšlíme, takže tu zatím nejsou žádná čísla.
        </p>
      </div>

      <div className="mt-5">
        <GlobalStatsLine />
      </div>
    </ContentPage>
  );
}
