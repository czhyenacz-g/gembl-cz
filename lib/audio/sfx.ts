import type { SfxDefinition, SfxId } from "./types.ts";

// Registry herních zvukových efektů (viz AudioProvider.tsx → playSfx).
// Stejně jako u MUSIC_PLAYLIST (tracks.ts) jsou všechny položky zatím
// PLACEHOLDER — soubory na `src` cestách v public/ zatím neexistují.
// AudioProvider.playSfx() s chybějícím souborem počítá (viz try/catch a
// `.catch()` na `el.play()`), nikdy nespadne a nikdy neovlivní herní
// logiku (spin/wallet) — je to čistě prezentační side effect.
//
// Až budou k dispozici legální krátké SFX (jemné, ne hlasité/agresivní):
// 1. ulož soubor do `public/audio/sfx/<soubor>.mp3`
// 2. přepiš `src` na skutečnou cestu a nastav `placeholder: false`
// Viz docs/audio-assets.md.
export const SFX_REGISTRY: Record<SfxId, SfxDefinition> = {
  ui_click: { id: "ui_click", title: "UI klik", src: "/audio/sfx/ui-click.mp3", placeholder: true },
  spin_start: { id: "spin_start", title: "Start otočení", src: "/audio/sfx/spin-start.mp3", placeholder: true },
  reel_tick: { id: "reel_tick", title: "Cvaknutí válce", src: "/audio/sfx/reel-tick.mp3", placeholder: true },
  spin_stop: { id: "spin_stop", title: "Zastavení válců", src: "/audio/sfx/spin-stop.mp3", placeholder: true },
  near_miss: { id: "near_miss", title: "Těsně vedle", src: "/audio/sfx/near-miss.mp3", placeholder: true },
  lose: { id: "lose", title: "Prohra", src: "/audio/sfx/lose.mp3", placeholder: true },
  credit_added: { id: "credit_added", title: "Kredit připsán", src: "/audio/sfx/credit-added.mp3", placeholder: true },
  popup_open: { id: "popup_open", title: "Otevření popupu", src: "/audio/sfx/popup-open.mp3", placeholder: true },
  // Později (viz zadání) — registrováno, zatím nikde nevoláno.
  devil_laugh: { id: "devil_laugh", title: "Ďábelský smích (později)", src: "/audio/sfx/devil-laugh.mp3", placeholder: true },
  topup_open: { id: "topup_open", title: "Otevření dobití kreditu", src: "/audio/sfx/topup-open.mp3", placeholder: true },
};
