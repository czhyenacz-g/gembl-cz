import { MUSIC_PLAYLIST } from "./tracks.ts";

// Čistá výběrová logika playlistu — oddělená od AudioProvider.tsx (stejný
// vzor jako lib/casino/slot-engine.ts vs. SlotMachine.tsx), ať jde přímo
// unit-testovat bez React/JSX runtime.

/** Indexy AKTIVNÍCH (`placeholder: false`) tracků — s prázdným aktivním playlistem (jen placeholdery) spadne zpátky na všechny, ať zůstane zachovaný "zkus další, tiše selži" fallback v AudioProvider.tsx. */
export function getActiveIndices(): number[] {
  const active = MUSIC_PLAYLIST.reduce<number[]>((acc, track, index) => {
    if (!track.placeholder) acc.push(index);
    return acc;
  }, []);
  return active.length > 0 ? active : MUSIC_PLAYLIST.map((_, index) => index);
}

/**
 * Náhodný track z aktivních — s 2+ aktivními NIKDY nevrátí `excludeIndex`
 * (viz zadání "neopakuj bezprostředně stejný track dvakrát po sobě").
 * `random` injectable (default `Math.random`), stejný vzor jako `spin()`
 * v lib/casino/slot-engine.ts, ať jde deterministicky testovat.
 */
export function pickRandomTrackIndex(excludeIndex: number | null, random: () => number = Math.random): number {
  const pool = getActiveIndices();
  const withoutCurrent = excludeIndex !== null && pool.length > 1 ? pool.filter((index) => index !== excludeIndex) : pool;
  const finalPool = withoutCurrent.length > 0 ? withoutCurrent : pool;
  return finalPool[Math.floor(random() * finalPool.length)] ?? 0;
}
