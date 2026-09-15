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
      // Šířka 204 (dřív 200) dává trochu víc rezervy pro delší slova
      // ("Žebříčky") — pravý okraj řádků v artworku je až ~x=384.
      rows: [
        { x: 178, y: 199, width: 204, height: 42 },
        { x: 178, y: 241, width: 204, height: 43 },
        { x: 178, y: 284, width: 204, height: 43 },
        { x: 178, y: 327, width: 204, height: 43 },
        { x: 178, y: 370, width: 204, height: 44 },
        { x: 178, y: 414, width: 204, height: 44 },
      ],
    },

    // Pixel-tuning pass (viz commit): avatar/name/balance přeměřené přímo
    // z artworku (čtvercový rámeček je 70×72, ne 90×55 na x:1165/y:178
    // jak bylo původně odhadnuto). Y následně posunuto o +20 (vizuální
    // zpětná vazba: blok s avatarem seděl opticky moc vysoko) —
    // name/balance posunuté pod něj se stejnými rozestupy.
    account: {
      avatar: { x: 1142, y: 240, width: 70, height: 72 },
      name: { x: 1075, y: 320, width: 200, height: 22 },
      balance: { x: 1075, y: 346, width: 200, height: 36 },
      primaryCta: { x: 1081, y: 393, width: 188, height: 44 },
      secondaryCta: { x: 1069, y: 446, width: 212, height: 42 },
    },

    slot: {
      // Reel okno = tři symboly, co artwork už kreslí (cherry/7/bell) —
      // idle stav je background samotný, HTML reely se ukážou až po
      // prvním spinu (viz SlotMachine.tsx `embedded` větev).
      reels: { x: 558, y: 358, width: 348, height: 108 },
      // Pravý blank panel pod automatem (rámeček s ikonami ovoce/zvonek/7) —
      // přeměřeno, panel má reálný obsahový rámeček x:740-1035, y:760-900.
      resultMessage: { x: 740, y: 762, width: 295, height: 136 },
      // Levý blank panel pod automatem (rámeček s ikonou žetonu) — sázka a
      // spin tlačítko posunuté níž/větší, ať nevisí hned pod nadpisem.
      stakeControl: { x: 415, y: 772, width: 280, height: 55 },
      spinButton: { x: 415, y: 850, width: 280, height: 90 },
    },

    // Stat řádky přeměřené přímo z artworku (ikona+hodnota buňka, ne celý
    // "vizuální blok" — ten je o dost vyšší a přesahoval by do dalšího
    // řádku, přesně to bylo dřív vidět jako zdvojený/přetékající box).
    stats: {
      biggestLoser: { x: 1137, y: 552, width: 137, height: 56 },
      lastWin: { x: 1137, y: 633, width: 137, height: 59 },
      achievementsLabel: { x: 1137, y: 718, width: 137, height: 57 },
      // Spodní karta s žetony/kartami — vnitřní ozdobný rámeček je jen
      // 180 px široký (x:1090-1270), ne 300 — dřív přesahoval mimo panel
      // do dekorativního pozadí vpravo.
      achievementsCta: { x: 1090, y: 957, width: 180, height: 48 },
    },
  },
};
