import "server-only";
import { createRecord, getRecordsPage } from "../uca/records.ts";

// Globální statistiky napříč VŠEMI hráči (např. "Hráči na Gembl.cz už
// společně prohráli 1 284 930 G."), přes Universal Content API — stejná
// infrastruktura jako zbytek platformy (viz CLAUDE.md), žádná vlastní
// DB. Zápis je INKREMENTÁLNÍ DELTA na jeden event (viz reportGameStatsDelta),
// ne přepis běžícího součtu — čtení (getGlobalStats) sečte všechny
// eventy. Klient volá přes /api/game-stats (token zůstává server-only).
const COLLECTION = "game_stats_events";
// Bezpečný strop na počet stránek při sčítání — až bude eventů víc,
// tohle je první místo, kam přidat skutečnou agregaci na UCA straně
// (cron/batch job), ne měnit frontend kód.
const MAX_PAGES = 20;
const PER_PAGE = 50;
const REVALIDATE_SECONDS = 300;

export type GameStatsDelta = {
  game: string;
  spins: number;
  wagered: number;
  won: number;
  resets: number;
};

export type GlobalStats = {
  totalLost: number;
  totalSpins: number;
};

/** Fail-open — nikdy nesmí přerušit hru, jen se daný dílčí přírůstek nezapočítá do globálních statistik. */
export async function reportGameStatsDelta(delta: GameStatsDelta): Promise<void> {
  try {
    await createRecord(COLLECTION, {
      game: delta.game,
      spins: delta.spins,
      wagered: delta.wagered,
      won: delta.won,
      resets: delta.resets,
    });
  } catch (error) {
    console.error("reportGameStatsDelta selhal:", error instanceof Error ? error.message : error);
  }
}

function toNonNegNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

/** `null` při výpadku UCA nebo bez dat — volající (homepage/automaty) se pak statistiky prostě nezobrazí. */
export async function getGlobalStats(game?: string): Promise<GlobalStats | null> {
  try {
    let totalSpins = 0;
    let totalWagered = 0;
    let page = 1;
    let lastPage = 1;

    do {
      const response = await getRecordsPage(COLLECTION, {
        status: "approved",
        perPage: PER_PAGE,
        page,
        filter: game ? { game } : undefined,
        revalidateSeconds: REVALIDATE_SECONDS,
      });

      for (const record of response.data) {
        totalSpins += toNonNegNumber(record.data.spins);
        totalWagered += toNonNegNumber(record.data.wagered);
      }

      lastPage = response.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage && page <= MAX_PAGES);

    return { totalLost: totalWagered, totalSpins };
  } catch {
    return null;
  }
}
