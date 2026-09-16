import type { SfxDefinition, SfxId } from "./types.ts";

// Registry herních zvukových efektů (viz AudioProvider.tsx → playSfx).
//
// Všechny soubory níž jsou REÁLNÉ a leží v `public/audio/sfx/` (mono MP3
// 128 kbps, peak-normalizované na -3 dBFS) — AŽ NA `devil_laugh`, který
// záměrně zůstává placeholderem (viz zadání "nech placeholder, později pro
// čerta"). `placeholder: false` tedy znamená "soubor existuje".
//
// Zvuky jsou mechanické/retro (dřevo, kov, žetony, papír) — ŽÁDNÉ arcade
// beepy ani elektronické sweepy. Vygenerované in-house (viz
// docs/audio-assets.md) — žádná třetí strana, žádné licenční riziko.
//
// AudioProvider.playSfx() s chybějícím souborem počítá (viz try/catch a
// `.catch()` na `el.play()`), nikdy nespadne a nikdy neovlivní herní
// logiku (spin/wallet) — je to čistě prezentační side effect.
export const SFX_REGISTRY: Record<SfxId, SfxDefinition> = {
  ui_click: { id: "ui_click", title: "UI klik", src: "/audio/sfx/ui-click.mp3", placeholder: false },
  spin_start: { id: "spin_start", title: "Start otočení (páka)", src: "/audio/sfx/spin-start.mp3", placeholder: false },
  reel_tick: { id: "reel_tick", title: "Cvaknutí válce", src: "/audio/sfx/reel-tick.mp3", placeholder: false },
  spin_stop: { id: "spin_stop", title: "Zastavení válců", src: "/audio/sfx/spin-stop.mp3", placeholder: false },
  near_miss: { id: "near_miss", title: "Těsně vedle (wah-wah)", src: "/audio/sfx/near-miss.mp3", placeholder: false },
  lose: { id: "lose", title: "Prohra (žeton na stole)", src: "/audio/sfx/lose.mp3", placeholder: false },
  credit_added: { id: "credit_added", title: "Kredit připsán (žetony)", src: "/audio/sfx/credit-added.mp3", placeholder: false },
  popup_open: { id: "popup_open", title: "Otevření popupu (swish + sting)", src: "/audio/sfx/popup-open.mp3", placeholder: false },
  topup_open: { id: "topup_open", title: "Otevření dobití (pokladna)", src: "/audio/sfx/topup-open.mp3", placeholder: false },
  shell_shuffle: { id: "shell_shuffle", title: "Míchání kelímků", src: "/audio/sfx/shell-shuffle.mp3", placeholder: false },
  scratch: { id: "scratch", title: "Stírání losu", src: "/audio/sfx/scratch.mp3", placeholder: false },
  // Placeholder — asset záměrně není hotový (viz zadání "později pro čerta").
  devil_laugh: { id: "devil_laugh", title: "Ďábelský smích (později)", src: "/audio/sfx/devil-laugh.mp3", placeholder: true },
};
