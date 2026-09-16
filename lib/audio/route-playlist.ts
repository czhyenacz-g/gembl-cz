import type { MusicPlaylistId } from "./types.ts";

// Jediné místo, které rozhoduje, jaká hudba patří na jakou route (viz
// zadání "playlist scope"). AudioProvider.tsx si playlist čte odsud přes
// usePathname(), takže hudba se přepíná sama při navigaci — žádné ruční
// předávání playlistu z každého layoutu (a žádný druhý AudioProvider).
//
// Route, která tu není, hraje ticho (např. /reset) — to je záměr, ne
// opomenutí: zvuk patří jen na herní a "lounge" obsahové stránky.
export const ROUTE_PLAYLISTS: ReadonlyArray<{ prefix: string; playlist: MusicPlaylistId }> = [
  // Herní stránky — energičtější swing.
  { prefix: "/casino", playlist: "casino" },
  { prefix: "/automaty", playlist: "casino" },
  { prefix: "/skorapky", playlist: "casino" },
  { prefix: "/losy", playlist: "casino" },
  // Informační/uživatelské stránky — pomalejší lounge jako kulisa.
  { prefix: "/profil", playlist: "universal" },
  { prefix: "/zebricky", playlist: "universal" },
  { prefix: "/jak-to-funguje", playlist: "universal" },
];

/**
 * Playlist pro daný pathname (`null` = na téhle route hudba nehraje).
 * Přesná shoda i podstrom (`/profil/neco` zdědí rodičovský playlist).
 */
export function getPlaylistForPath(pathname: string): MusicPlaylistId | null {
  const match = ROUTE_PLAYLISTS.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`));
  return match ? match.playlist : null;
}
