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
      // Artwork má připravených 6 řádků, teď využitých všech 6 (Ruleta je
      // pryč z hlavního menu, viz zadání — "Jak funguje" se ale vrátila
      // zpět jako 6. řádek pod Profil, jen odsunutá na konec, ne úplně
      // pryč). Všech 6 položek má reálnou route a je klikací hned (žádné
      // "(brzy)") — i /losy, /zebricky, /profil mají zatím jen
      // placeholder stránku, ale menu na to nesmí čekat (viz zadání).
      // "Achievementy" v menu není, má vlastní zónu v pravém sloupci
      // (stats.achievementsLabel).
      items: [
        { label: "Automaty", href: "/automaty" },
        { label: "Skořápky", href: "/skorapky" },
        { label: "Online losy", href: "/losy" },
        { label: "Žebříčky", href: "/zebricky" },
        { label: "Profil", href: "/profil" },
        { label: "Jak funguje", href: "/jak-to-funguje" },
      ],
      // Šířka 204 (dřív 200) dává trochu víc rezervy pro delší slova
      // ("Žebříčky") — pravý okraj řádků v artworku je až ~x=384. "Online
      // losy" je delší, ale při text-sm/bold se pohodlně vejde na jeden
      // řádek stejně jako "Žebříčky", takže souřadnice zůstávají beze
      // změny (viz zadání "uprav jen pokud je to potřeba").
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
    // jak bylo původně odhadnuto). Y následně posunuto o +5 (vizuální
    // zpětná vazba: +20 byl 4× moc) — name/balance posunuté pod něj se
    // stejnými rozestupy jako před touto úpravou. Výška avatar boxu +10 %
    // (72→79, vycentrováno na stejný střed), ať HTML overlay celý
    // překryje vytištěný rámeček — jinak byl nahoře/dole vidět kousek
    // artworku pod ním.
    account: {
      avatar: { x: 1142, y: 222, width: 70, height: 79 },
      name: { x: 1075, y: 305, width: 200, height: 24 },
      balance: { x: 1075, y: 335, width: 200, height: 38 },
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
