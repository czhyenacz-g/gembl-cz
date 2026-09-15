import type { CasinoSkin } from "./types.ts";

// Souřadnice změřené přímo z artworku (public/skins/classic/casino-desktop.webp,
// 1448×1086 px) — pixel-scan přes ploché barevné/ohraničené zóny (menu
// řádky, account box, stat řádky) + vizuální odhad u ozdobnějších částí
// (reel okno, blank panely pod automatem). Malá nepřesnost (pár px) je
// v pořádku, protože celý stage škáluje proporcionálně (viz CasinoStage).
export const classicSkin: CasinoSkin = {
  id: "classic",
  name: "Classic",
  designWidth: 1448,
  designHeight: 1086,
  minStageWidth: 1100,
  background: {
    src: "/skins/classic/casino-desktop.webp",
    alt: "",
  },
  layout: {
    logoHome: { x: 170, y: 35, width: 350, height: 70 },

    menu: {
      // Artwork má přesně 6 řádků (1 aktivní + 5 dalších) — "Achievementy"
      // proto v menu není, má vlastní zónu v pravém sloupci (stats.achievementsLabel).
      items: [
        { label: "Automaty", href: "/automaty", active: true },
        { label: "Jak funguje", href: "/jak-to-funguje" },
        { label: "Ruleta", href: null },
        { label: "Losy", href: null },
        { label: "Žebříčky", href: null },
        { label: "Profil", href: null },
      ],
      rows: [
        { x: 178, y: 199, width: 200, height: 42 },
        { x: 178, y: 241, width: 200, height: 43 },
        { x: 178, y: 284, width: 200, height: 43 },
        { x: 178, y: 327, width: 200, height: 43 },
        { x: 178, y: 370, width: 200, height: 44 },
        { x: 178, y: 414, width: 200, height: 46 },
      ],
    },

    account: {
      avatar: { x: 1165, y: 178, width: 90, height: 55 },
      name: { x: 1075, y: 245, width: 200, height: 26 },
      balance: { x: 1075, y: 278, width: 200, height: 40 },
      primaryCta: { x: 1081, y: 393, width: 188, height: 44 },
      secondaryCta: { x: 1067, y: 446, width: 216, height: 42 },
    },

    slot: {
      // Reel okno = tři symboly, co artwork už kreslí (cherry/7/bell) —
      // idle stav je background samotný, HTML reely se ukážou až po
      // prvním spinu (viz SlotMachine.tsx `embedded` větev).
      reels: { x: 555, y: 355, width: 353, height: 115 },
      // Pravý blank panel pod automatem (rámeček s ikonami ovoce/zvonek/7).
      resultMessage: { x: 745, y: 760, width: 290, height: 140 },
      // Levý blank panel pod automatem (rámeček s ikonou žetonu).
      stakeControl: { x: 415, y: 760, width: 280, height: 60 },
      spinButton: { x: 415, y: 840, width: 280, height: 80 },
    },

    stats: {
      biggestLoser: { x: 1137, y: 558, width: 140, height: 85 },
      lastWin: { x: 1137, y: 648, width: 140, height: 85 },
      achievementsLabel: { x: 1137, y: 738, width: 140, height: 85 },
      achievementsCta: { x: 1090, y: 955, width: 300, height: 46 },
    },
  },
};
