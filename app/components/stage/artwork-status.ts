// Čistá stavová logika artwork loaderu — záměrně BEZ Reactu (a tím i bez
// "use client"), aby se dala testovat přímo v node:test (testy tady běží
// s `--conditions=react-server`, kde client hooky importovat nelze).
// Používá ji use-artwork-ready.ts.

export type ArtworkStatus = "loading" | "ready" | "failed";

/**
 * Pravidla přechodů stavu:
 * - `ready` je KONEČNÝ — jakmile je artwork načtený, nesmí ho nic přepsat
 *   (ani pozdní `onerror`, ani safety timeout, který se ozve 9 s po startu).
 *   Přesně bez tohohle pravidla se scéna po 9 s tvářila jako rozbitá
 *   („Nepodařilo se načíst scénu.“ uprostřed hry).
 * - `failed` se smí uplatnit jen dokud jsme ve `loading`.
 * - pozdní `ready` po `failed` (pomalá síť) stav spraví zpátky na `ready`.
 */
export function nextArtworkStatus(current: ArtworkStatus, next: ArtworkStatus): ArtworkStatus {
  if (current === "ready" || next === "ready") return "ready";
  return current === "loading" ? next : current;
}
