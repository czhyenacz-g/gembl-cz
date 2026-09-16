// Skin = background artistry + souřadnice aktivních zón nad nimi, v
// designových px (viz classic.ts pro konkrétní hodnoty). Prezentační vrstva
// pro /casino a pro společný obsahový stage informačních stránek (viz
// app/components/stage/) — žádná herní/wallet/auth logika tu není, jen
// "kam co nakreslit". Připraveno na víc skinů (classic/vegas/win95/…),
// ale zatím existuje jen `classic` (viz index.ts) — žádný switcher, dokud
// není potřeba druhý skin.

/** Obdélníková zóna v designových px (souřadnicový systém = skutečné rozměry background obrázku). */
export type SkinRect = { x: number; y: number; width: number; height: number };

/**
 * Referenční canvas artworku: jeho skutečné rozměry (= souřadnicový systém
 * všech `SkinRect` zón) + samotný background. Sdílí ho každý stage — jak
 * herní /casino (viz classic.ts `background`), tak "univerzální" obsahový
 * stage pro informační stránky (`universal`), takže scaling mechanismus
 * (app/components/stage/ArtworkStage.tsx) je jen jeden.
 */
export type StageCanvas = {
  designWidth: number;
  designHeight: number;
  background: { src: string; alt: string; frames?: string[] };
};

// `active` NENÍ součástí dat — zvýraznění se počítá dynamicky z aktuálního
// pathname (viz MenuOverlay.tsx isActiveHref), ne ze statického flagu tady.
export type ClassicMenuItem = {
  label: string;
  href: string | null;
};

/**
 * "Univerzální" obsahový stage — jeden artwork + zóny pro živé HTML
 * overlaye, používaný informačními/uživatelskými stránkami (/profil,
 * /zebricky, /jak-to-funguje). Je součástí skinu, takže budoucí skin
 * (vegas/win95/…) si může dát vlastní artwork i zóny, aniž by se sáhlo do
 * prezentační vrstvy (viz classic.ts → `universal`).
 */
export type UniversalStage = StageCanvas & {
  layout: {
    /** Vytištěný box "← ZPĚT" vlevo nahoře — klikací overlay (text je v artworku). */
    back: SkinRect;
    /** Světlý centrální panel = obsahová plocha pro živé HTML (title + content). */
    panel: SkinRect;
  };
};

export type CasinoSkin = StageCanvas & {
  id: string;
  name: string;
  /** Pod touto šířkou viewportu se stage nepoužívá (viz StageViewSwitch), zůstává současný mobilní layout. */
  minStageWidth: number;
  /**
   * Background artwork herního stage. `src` je vždy první snímek / fallback
   * (SSR, no-JS i stav, než se změří `scale`). Volitelné `frames` zapnou
   * pomalý crossfade slideshow (viz app/components/stage/StageBackground.tsx);
   * `src` by měl odpovídat prvnímu snímku, ať při hydrataci neproblikne
   * prázdné pozadí.
   */
  layout: {
    /** Klikací plocha přes "GEMBL.cz" nápis v artworku — vede na homepage. */
    logoHome: SkinRect;
    menu: {
      /** Řádky menu shora dolů — aktivní položka se určuje z pathname (viz MenuOverlay.tsx), ne z pořadí tady. */
      items: ClassicMenuItem[];
      rows: SkinRect[];
    };
    account: {
      avatar: SkinRect;
      name: SkinRect;
      balance: SkinRect;
      primaryCta: SkinRect;
      secondaryCta: SkinRect;
    };
    slot: {
      reels: SkinRect;
      resultMessage: SkinRect;
      stakeControl: SkinRect;
      spinButton: SkinRect;
    };
    stats: {
      biggestLoser: SkinRect;
      lastWin: SkinRect;
      achievementsLabel: SkinRect;
      achievementsCta: SkinRect;
    };
  };
  /**
   * Společný obsahový stage pro informační stránky (Profil / Žebříčky /
   * Jak to funguje) — jeden artwork + zóny pro živé HTML. Drží se ve skinu,
   * aby i budoucí skin měl vlastní "univerzální" pozadí (viz zadání).
   */
  universal: UniversalStage;
};
