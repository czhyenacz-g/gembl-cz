// Skin = jeden background artwork + souřadnice aktivních zón nad ním, v
// designových px (viz classic.ts pro konkrétní hodnoty). Nová prezentační
// vrstva pro /casino (viz app/(site)/casino/stage/) — žádná herní/wallet/
// auth logika tu není, jen "kam co nakreslit". Připraveno na víc skinů
// (classic/vegas/win95/christmas), ale zatím existuje jen `classic`
// (viz index.ts) — žádný switcher, dokud není potřeba druhý skin.

/** Obdélníková zóna v designových px (souřadnicový systém = skutečné rozměry background obrázku). */
export type SkinRect = { x: number; y: number; width: number; height: number };

export type ClassicMenuItem = {
  label: string;
  href: string | null;
  active?: boolean;
};

export type CasinoSkin = {
  id: string;
  name: string;
  /** Skutečné rozměry background obrázku — referenční canvas pro celý stage scaling mechanismus. */
  designWidth: number;
  designHeight: number;
  /** Pod touto šířkou viewportu se stage nepoužívá (viz CasinoSkinSwitch), zůstává současný mobilní layout. */
  minStageWidth: number;
  background: { src: string; alt: string };
  layout: {
    /** Klikací plocha přes "GEMBL.cz" nápis v artworku — vede na homepage. */
    logoHome: SkinRect;
    menu: {
      /** Řádky menu shora dolů — první je vždy aktivní (Automaty), zbytek buď reálná route, nebo disabled "brzy". */
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
