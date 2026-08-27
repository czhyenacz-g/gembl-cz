// Místo pro budoucí globální statistiky napříč VŠEMI hráči (např.
// "Hráči na Gembl.cz už společně prohráli 1 284 930 G.") — v MVP nemá
// odkud číst (žádný backend/DB, viz CLAUDE.md), takže vrací `null` a
// nikde se v UI nevolá. Až vznikne API (typicky přes Universal Content
// API, stejně jako u ostatních projektů), stačí tuhle jednu funkci
// nahradit skutečným fetchem — volající kód (pokud/až ho použije) se
// měnit nemusí.
export type GlobalStats = {
  totalLost: number;
  totalSpins: number;
};

export async function getGlobalStats(): Promise<GlobalStats | null> {
  return null;
}
