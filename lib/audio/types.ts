// Datové typy pro audio vrstvu (hudba + SFX) — viz AudioProvider.tsx pro
// samotný manager a docs/audio-assets.md pro licenční evidenci tracků.

export type MusicTrack = {
  /** Stabilní klíč, nezávislý na pořadí v playlistu. */
  id: string;
  title: string;
  /** Cesta v public/, např. "/audio/music/hot-club-shuffle.mp3". */
  src: string;
  /** Autor/interpret, jak má být uveden podle licence (TODO u placeholderů). */
  author: string;
  /** Odkud skladba pochází, např. "Free Music Archive" (TODO u placeholderů). */
  source: string;
  /** Přesný název licence, např. "CC BY 4.0", "CC0", "Public Domain" (TODO u placeholderů). */
  license: string;
  /** Vyžaduje licence explicitní attribution credit? */
  attributionRequired: boolean;
  /** true = soubor na `src` zatím fyzicky neexistuje v public/ (viz docs/audio-assets.md). */
  placeholder: boolean;
};

export type SfxId =
  | "ui_click"
  | "spin_start"
  | "reel_tick"
  | "spin_stop"
  | "near_miss"
  | "lose"
  | "credit_added"
  | "popup_open"
  | "devil_laugh"
  | "topup_open";

export type SfxDefinition = {
  id: SfxId;
  title: string;
  /** Cesta v public/, např. "/audio/sfx/spin-start.mp3". */
  src: string;
  /** true = soubor na `src` zatím fyzicky neexistuje v public/ (viz docs/audio-assets.md). */
  placeholder: boolean;
};

export type AudioPreferences = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  /** 0–1 */
  volumeMusic: number;
  /** 0–1 */
  volumeSfx: number;
};
