// Skin = jeden background artwork + souřadnice aktivních zón nad ním, v
// designových px (viz classic.ts pro konkrétní hodnoty). Nová prezentační
// vrstva pro /casino (viz app/(site)/casino/stage/) — žádná herní/wallet/
// auth logika tu není, jen "kam co nakreslit". Připraveno na víc skinů
// (classic/vegas/win95/christmas), ale zatím existuje jen `classic`
// (viz index.ts) — žádný switcher, dokud není potřeba druhý skin.

/** Obdélníková zóna v designových px (souřadnicový systém = skutečné rozměry background obrázku). */
export type SkinRect = { x: number; y: number; width: number; height: number };

// `active` NENÍ součástí dat — zvýraznění se počítá dynamicky z aktuálního
// pathname (viz MenuOverlay.tsx isActiveHref), ne ze statického flagu tady.
export type ClassicMenuItem = {
  label: string;
  href: string | null;
};

export type CasinoSkin = {
  id: string;
  name: string;
  /** Skutečné rozměry background obrázku — referenční canvas pro celý stage scaling mechanismus. */
  designWidth: number;
  designHeight: number;
  /** Pod touto šířkou viewportu se stage nepoužívá (viz CasinoSkinSwitch), zůstává současný mobilní layout. */
  minStageWidth: number;
  /**
   * Background artwork. `src` je vždy první snímek / fallback (SSR, no-JS i
   * stav, než se změří `scale`). Volitelné `frames` zapnou pomalý crossfade
   * slideshow (viz stage/StageBackground.tsx); `src` by měl odpovídat
   * prvnímu snímku, ať při hydrataci neproblikne prázdné pozadí.
   */
  background: { src: string; alt: string; frames?: string[] };
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
};
