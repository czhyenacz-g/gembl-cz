import { MUSIC_PLAYLISTS } from "./tracks.ts";
import type { MusicPlaylistId } from "./types.ts";

// Čistá výběrová logika playlistu — oddělená od AudioProvider.tsx (stejný
// vzor jako lib/casino/slot-engine.ts vs. SlotMachine.tsx), ať jde přímo
// unit-testovat bez React/JSX runtime. Všechno je playlist-scoped, protože
// hudba se liší podle typu stránky (viz route-playlist.ts).

function tracksOf(playlistId: MusicPlaylistId) {
  return MUSIC_PLAYLISTS[playlistId] ?? [];
}

/** Indexy AKTIVNÍCH (`placeholder: false`) tracků daného playlistu — když jsou v něm jen placeholdery, spadne zpátky na všechny, ať zůstane zachovaný "zkus další, tiše selži" fallback v AudioProvider.tsx. */
export function getActiveIndices(playlistId: MusicPlaylistId): number[] {
  const tracks = tracksOf(playlistId);
  const active = tracks.reduce<number[]>((acc, track, index) => {
    if (!track.placeholder) acc.push(index);
    return acc;
  }, []);
  return active.length > 0 ? active : tracks.map((_, index) => index);
}

/**
 * Náhodný track z aktivních v daném playlistu — s 2+ aktivními NIKDY
 * nevrátí `excludeIndex` (viz zadání "neopakuj bezprostředně stejný track
 * dvakrát po sobě"). `random` injectable (default `Math.random`), stejný
 * vzor jako `spin()` v lib/casino/slot-engine.ts, ať jde deterministicky
 * testovat.
 */
export function pickRandomTrackIndex(
  playlistId: MusicPlaylistId,
  excludeIndex: number | null,
  random: () => number = Math.random
): number {
  const pool = getActiveIndices(playlistId);
  if (pool.length === 0) return 0;
  const withoutCurrent = excludeIndex !== null && pool.length > 1 ? pool.filter((index) => index !== excludeIndex) : pool;
  const finalPool = withoutCurrent.length > 0 ? withoutCurrent : pool;
  return finalPool[Math.floor(random() * finalPool.length)] ?? 0;
}
