// Datové typy pro audio vrstvu (hudba + SFX) — viz AudioProvider.tsx pro
// samotný manager a docs/audio-assets.md pro licenční evidenci tracků.

/** Které stránky mají jakou hudbu (viz lib/audio/route-playlist.ts). */
export type MusicPlaylistId = "casino" | "universal";

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
  | "topup_open"
  | "shell_shuffle"
  | "scratch"
  | "devil_laugh";

export type SfxDefinition = {
  id: SfxId;
  title: string;
  /** Cesta v public/, např. "/audio/sfx/spin-start.mp3". */
  src: string;
  /** true = soubor na `src` zatím fyzicky neexistuje v public/ (viz docs/audio-assets.md). */
  placeholder: boolean;
  /**
   * true = SMYČKOVÝ efekt (např. scratch během stírání losu) — nepřehrává se
   * jako one-shot, ale přes `startSfxLoop`/`stopSfxLoop`, dokud trvá
   * interakce. Soubor musí být seamless smyčka (viz docs/audio-assets.md).
   */
  loop?: boolean;
  /**
   * Násobek `volumeSfx` pro smyčkové efekty — scratch má být slyšet, ale
   * nesmí být nepříjemný (efektivně ~0.35–0.45 při výchozím volumeSfx 0.5).
   */
  loopVolumeScale?: number;
};

export type AudioPreferences = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  /** 0–1 */
  volumeMusic: number;
  /** 0–1 */
  volumeSfx: number;
};
