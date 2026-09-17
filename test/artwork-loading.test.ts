import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { nextArtworkStatus } from "../app/components/stage/artwork-status.ts";

// Zdrojová kontrola loading vrstvy artwork stageů (stejný vzor jako
// universal-stage.test.ts — žádný DOM/browser harness v tomhle starteru).
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const hookSource = read("../app/components/stage/use-artwork-ready.ts");
const coverSource = read("../app/components/stage/ArtworkLoadingCover.tsx");
const sceneSource = read("../app/components/stage/ArtworkScene.tsx");
const stageSource = read("../app/components/stage/ArtworkStage.tsx");
const globalsSource = read("../app/globals.css");

const PAGE_SOURCES = {
  "/automaty": read("../app/(site)/automaty/SlotMachine.tsx"),
  "/skorapky": read("../app/(site)/skorapky/ShellGame.tsx"),
  "/losy": read("../app/(site)/losy/ScratchCard.tsx"),
} as const;

describe("use-artwork-ready.ts — detekce skutečného načtení backgroundu", () => {
  test("je 'use client' a staví na reálném onload/onerror obrázku, ne na timeoutu", () => {
    assert.match(hookSource.trimStart().split("\n")[0], /^["']use client["']/);
    assert.match(hookSource, /const image = new window\.Image\(\);/);
    assert.match(hookSource, /image\.onload = \(\) => settle\("ready"\);/);
    assert.match(hookSource, /image\.onerror = \(\) => settle\("failed"\);/);
    assert.match(hookSource, /image\.src = src;/);
  });

  test("cached obrázek se pozná synchronně přes `complete` (žádné zbytečné bliknutí loaderu)", () => {
    assert.match(hookSource, /if \(image\.complete\) settle\(image\.naturalWidth > 0 \? "ready" : "failed"\);/);
  });

  test("safety timeout je jen pojistka (loader nesmí zůstat viset navždy) a uklidí se", () => {
    assert.match(hookSource, /const SAFETY_TIMEOUT_MS = 9000;/);
    assert.match(hookSource, /window\.setTimeout\(\(\) => settle\("failed"\), SAFETY_TIMEOUT_MS\)/);
    assert.match(hookSource, /window\.clearTimeout\(safety\);/);
    assert.match(hookSource, /image\.onload = null;/);
  });

  test("REGRESE: `failed` nesmí přepsat už načtenou scénu (`ready` je konečný stav)", () => {
    // Safety timeout volá `failed` i 9 s po úspěšném onloadu — přesně tenhle
    // přechod dřív ukazoval „Nepodařilo se načíst scénu.“ uprostřed hry.
    assert.equal(nextArtworkStatus("ready", "failed"), "ready");
    assert.equal(nextArtworkStatus("failed", "failed"), "failed");
  });

  test("přechody stavu: loading → ready/failed, pozdní ready po failed stav spraví", () => {
    assert.equal(nextArtworkStatus("loading", "ready"), "ready");
    assert.equal(nextArtworkStatus("loading", "failed"), "failed");
    assert.equal(nextArtworkStatus("failed", "ready"), "ready");
  });

  test("settle používá nextArtworkStatus (jediný zdroj pravidel přechodů)", () => {
    assert.match(hookSource, /setStatus\(\(current\) => nextArtworkStatus\(current, next\)\);/);
  });

  test("stav se resetuje při změně src (jiný skin/artwork)", () => {
    assert.match(hookSource, /\}, \[src\]\);/);
    assert.match(hookSource, /setStatus\("loading"\);/);
  });

  test("`src: null` (embedded režim bez vlastního artworku) znamená hned ready, nic se nestahuje", () => {
    assert.match(hookSource, /export function useArtworkReady\(src: string \| null\): ArtworkStatus/);
    assert.match(hookSource, /useState<ArtworkStatus>\(src \? "loading" : "ready"\)/);
    assert.match(hookSource, /if \(!src\) \{\s*setStatus\("ready"\);\s*return;\s*\}/);
  });
});

describe("ArtworkLoadingCover.tsx — retro loader + chybový stav", () => {
  test("je 'use client' a používá značku GEMBL.cz + text + tři tečky (žádný moderní spinner)", () => {
    assert.match(coverSource.trimStart().split("\n")[0], /^["']use client["']/);
    assert.match(coverSource, /GEMBL<span[^>]*>\.cz<\/span>/);
    assert.match(coverSource, /\{label\}/);
    assert.match(coverSource, /animate-loader-dot/);
    assert.match(coverSource, /animationDelay: `\$\{index \* 160\}ms`/);
    assert.doesNotMatch(coverSource, /<svg|animate-spin|role="progressbar"/);
  });

  test("překrývá celý stage (inset-0), takže overlaye pod ním nejsou klikatelné", () => {
    assert.match(coverSource, /absolute inset-0 z-40/);
    assert.match(coverSource, /role="status"/);
  });

  test("po načtení plynule zmizí (fade out) a pak se odmountuje", () => {
    assert.match(coverSource, /export const LOADER_FADE_MS = 320;/);
    assert.match(coverSource, /transition-opacity duration-300/);
    assert.match(coverSource, /status === "ready" \? "pointer-events-none opacity-0" : "opacity-100"/);
    assert.match(coverSource, /window\.setTimeout\(\(\) => setUnmounted\(true\), LOADER_FADE_MS\)/);
    assert.match(coverSource, /if \(unmounted\) return null;/);
  });

  test("failure fallback: chybový pruh + reload, žádné věčné visení loaderu", () => {
    assert.match(coverSource, /if \(status === "failed"\) return <ArtworkLoadError \/>;/);
    assert.match(coverSource, /Nepodařilo se načíst scénu\./);
    assert.match(coverSource, /window\.location\.reload\(\)/);
    assert.match(coverSource, /role="alert"/);
  });
});

describe("ArtworkScene.tsx — společný obal herních scén", () => {
  test("drží aspect ratio z rozměrů scény (žádný layout shift) a hlásí loading label", () => {
    assert.match(sceneSource, /style=\{\{ aspectRatio: `\$\{width\} \/ \$\{height\}` \}\}/);
    assert.match(sceneSource, /loadingLabel: string;/);
    assert.match(sceneSource, /<ArtworkLoadingCover status=\{status\} label=\{loadingLabel\} \/>/);
  });

  test("overlay obsah renderuje až po načtení (a s fade in), ne během loading stavu", () => {
    assert.match(sceneSource, /\{status !== "loading" && <div className="animate-gembl-fade-in">\{children\}<\/div>\}/);
  });

  test("artwork je next/image s prioritou (kritický asset stage)", () => {
    assert.match(sceneSource, /import Image from "next\/image";/);
    assert.match(sceneSource, /priority/);
  });
});

describe("ArtworkStage.tsx — sdílený stage (casino + obsahové stránky)", () => {
  test("používá stejný hook i loader, overlaye vykreslí až po načtení", () => {
    assert.match(stageSource, /import ArtworkLoadingCover from "\.\/ArtworkLoadingCover\.tsx";/);
    assert.match(stageSource, /import \{ useArtworkReady \} from "\.\/use-artwork-ready\.ts";/);
    assert.match(stageSource, /const status = useArtworkReady\(canvas\.background\.src\);/);
    assert.match(stageSource, /\{status !== "loading" && <div className="animate-gembl-fade-in">\{children\}<\/div>\}/);
    assert.match(stageSource, /<ArtworkLoadingCover status=\{status\} label=\{loadingLabel\} \/>/);
  });

  test("loader je MIMO transformovaný box (neškáluje se) a scaling logika zůstala beze změny", () => {
    const coverIndex = stageSource.indexOf("<ArtworkLoadingCover");
    const transformedBox = stageSource.indexOf("transform: `scale(${scale})`");
    assert.ok(transformedBox !== -1 && coverIndex > transformedBox, "cover musí být až za transform boxem");
    assert.match(stageSource, /setScale\(width \/ canvas\.designWidth\)/);
  });

  test("loadingLabel předává herní i obsahový stage", () => {
    assert.match(read("../app/(site)/casino/stage/ClassicCasinoStage.tsx"), /loadingLabel="Kasino se otevírá…"/);
    assert.match(read("../app/components/stage/UniversalContentStage.tsx"), /loadingLabel="Připravujeme stůl…"/);
  });
});

describe("Herní scény používají společný ArtworkScene (žádný vlastní loader)", () => {
  for (const [route, source] of Object.entries(PAGE_SOURCES)) {
    test(`${route}: renderuje ArtworkScene a artwork neřeší vlastním <Image>`, () => {
      assert.match(source, /import ArtworkScene from "\.\.\/\.\.\/components\/stage\/ArtworkScene\.tsx";/);
      assert.match(source, /<ArtworkScene/);
      assert.match(source, /loadingLabel="/);
      assert.match(source, /<\/ArtworkScene>/);
      // Scéna si nedělá vlastní aspect-ratio container (to řeší ArtworkScene).
      assert.doesNotMatch(source, /aspectRatio: `\$\{SCENE_WIDTH\}/);
      // Hlavní artwork jde přes ArtworkScene. Vlastní next/image smí scéna
      // použít jen na další vizuální vrstvy (u /automaty stavové obrázky
      // páky) — nikdy na samotný artwork scény.
      if (route === "/automaty") {
        assert.match(source, /<ArtworkScene[\s\S]*?src=\{SCENE_SRC\}/);
        assert.match(source, /LEVER_FRAMES/);
      } else {
        assert.doesNotMatch(source, /import Image from "next\/image"/);
      }
    });
  }

  test("každá scéna má vlastní text loaderu (retro tón, ne 'Loading…')", () => {
    assert.match(PAGE_SOURCES["/automaty"], /loadingLabel="Spouštíme automat…"/);
    assert.match(PAGE_SOURCES["/skorapky"], /loadingLabel="Připravujeme stůl…"/);
    assert.match(PAGE_SOURCES["/losy"], /loadingLabel="Připravujeme losy…"/);
  });
});

describe("/automaty — panely mimo scénu nesmí být aktivní pod loaderem", () => {
  const source = PAGE_SOURCES["/automaty"];

  test("stav scény se čte i v SlotMachine a v embedded režimu se nic nečeká (null)", () => {
    assert.match(source, /import \{ useArtworkReady \} from "\.\.\/\.\.\/components\/stage\/use-artwork-ready\.ts";/);
    assert.match(source, /const SCENE_SRC = "\/skins\/automaty\/automaty\.webp";/);
    assert.match(source, /const artworkStatus = useArtworkReady\(embedded \? null : SCENE_SRC\);/);
    assert.match(source, /const artworkLoading = artworkStatus === "loading";/);
    assert.match(source, /<ArtworkScene[\s\S]*?src=\{SCENE_SRC\}/);
  });

  test("ovládání i statistiky jsou během načítání `inert` (rozměry zůstávají → žádný posun)", () => {
    const inertCount = (source.match(/inert=\{artworkLoading \|\| undefined\}/g) ?? []).length;
    assert.equal(inertCount, 2, "inert musí být na panelu ovládání i statistik");
    // žádné skrývání panelů (to by na mobilu rozhýbalo layout)
    assert.doesNotMatch(source, /artworkLoading && \(/);
  });
});

describe("Mobile fallback loader nedostává", () => {
  test("legacy (mobile) větev sdíleného shellu je bez loaderu — loader patří jen artwork stagei", () => {
    const shell = read("../app/components/stage/ContentPage.tsx");
    assert.match(shell, /legacy=\{/);
    assert.doesNotMatch(shell, /ArtworkLoadingCover|ArtworkScene|ArtworkStage|useArtworkReady/);
  });
});

describe("globals.css — loader animace", () => {
  test("má keyframes pro tečky i fade in a respektuje prefers-reduced-motion", () => {
    assert.match(globalsSource, /@keyframes gembl-loader-dot/);
    assert.match(globalsSource, /\.animate-loader-dot \{/);
    assert.match(globalsSource, /@keyframes gembl-fade-in/);
    assert.match(globalsSource, /\.animate-gembl-fade-in \{/);
    assert.match(globalsSource, /@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe("/automaty: páka jako stavové obrázky", () => {
  const source = read("../app/(site)/automaty/SlotMachine.tsx");

  test("používá právě mid/down stavové obrázky; základní (up) zůstává artwork scény", () => {
    assert.match(source, /mid: "\/skins\/automaty\/automaty-lever-mid\.webp",/);
    assert.match(source, /down: "\/skins\/automaty\/automaty-lever-down\.webp",/);
    // `up` stav nemá vlastní obrázek — je to základní artwork scény.
    assert.doesNotMatch(source, /up: "\/skins/);
    assert.match(source, /const SCENE_SRC = "\/skins\/automaty\/automaty\.webp";/);
  });
});
