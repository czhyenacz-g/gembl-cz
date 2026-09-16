import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classicSkin } from "../lib/casino-skins/classic.ts";

// Zdrojová + konfigurační kontrola (stejný vzor jako stage-background.test.ts
// a skorapky-wiring.test.ts — žádný DOM/browser harness v tomhle starteru).
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const stageSource = read("../app/components/stage/UniversalContentStage.tsx");
const pageShellSource = read("../app/components/stage/ContentPage.tsx");
const artworkStageSource = read("../app/components/stage/ArtworkStage.tsx");
const switchSource = read("../app/components/stage/StageViewSwitch.tsx");
const chromeSource = read("../app/components/SiteChrome.tsx");

const UNIVERSAL_ASSET = fileURLToPath(new URL("../public/skins/classic/universal-background.webp", import.meta.url));

/**
 * Přečte rozměry přímo z WebP hlavičky (bez image knihovny) — podporuje
 * rozšířený VP8X (alpha) i prostý lossy "VP8 " chunk, protože artwork bez
 * průhlednosti sharp zapisuje jako jednoduchý VP8.
 */
function webpInfo(path: string) {
  const buf = readFileSync(path);
  assert.equal(buf.slice(0, 4).toString("ascii"), "RIFF");
  assert.equal(buf.slice(8, 12).toString("ascii"), "WEBP");
  const chunk = buf.slice(12, 15).toString("ascii");
  const bytes = statSync(path).size;

  if (chunk === "VP8") {
    // lossy: frame tag (3) + start code (3) + šířka/výška (14 bitů každá)
    const width = (buf[26] | (buf[27] << 8)) & 0x3fff;
    const height = (buf[28] | (buf[29] << 8)) & 0x3fff;
    return { width, height, bytes, alpha: false };
  }

  // VP8X: flags (1) + reserved (3) + canvas šířka/výška mínus jedna (3+3)
  assert.equal(chunk, "VP8X", `neznámý WebP chunk: ${chunk}`);
  const read24 = (o: number) => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
  return { width: read24(24) + 1, height: read24(27) + 1, bytes, alpha: (buf[20] & 0x10) !== 0 };
}

describe("classicSkin.universal — konfigurace společného obsahového stage", () => {
  const u = classicSkin.universal;

  test("má vlastní referenční canvas (1536×1024) a lokální WebP background", () => {
    assert.equal(u.designWidth, 1536);
    assert.equal(u.designHeight, 1024);
    assert.match(u.background.src, /^\/skins\/classic\/universal-background\.webp$/);
    // statický artwork — žádné frames (slideshow by tu neměla smysl)
    assert.equal(u.background.frames, undefined);
  });

  test("zóny (ZPĚT + centrální panel) leží uvnitř canvasu a mají reálné rozměry", () => {
    for (const [name, rect] of Object.entries(u.layout)) {
      assert.ok(rect.x >= 0 && rect.y >= 0, `${name} musí začínat v canvasu`);
      assert.ok(rect.x + rect.width <= u.designWidth, `${name} nesmí přetéct vpravo`);
      assert.ok(rect.y + rect.height <= u.designHeight, `${name} nesmí přetéct dolů`);
      assert.ok(rect.width > 40 && rect.height > 40, `${name} musí mít použitelné rozměry`);
    }
  });

  test("panel je velký obsahový prostor, ZPĚT box je malý vlevo nahoře", () => {
    assert.ok(u.layout.panel.width > u.layout.back.width * 3);
    assert.ok(u.layout.panel.height > u.layout.back.height * 3);
    assert.ok(u.layout.back.x < 100 && u.layout.back.y < 100, "ZPĚT box je vlevo nahoře");
    assert.ok(u.layout.panel.x > 200, "panel začíná až za levým sloupcem artworku");
  });
});

describe("universal-background.webp — produkční asset", () => {
  test("existuje, je WebP ve stejných rozměrech jako design canvas a je rozumně velký", () => {
    const info = webpInfo(UNIVERSAL_ASSET);
    assert.equal(info.width, classicSkin.universal.designWidth);
    assert.equal(info.height, classicSkin.universal.designHeight);
    // artwork je bez průhlednosti (3 kanály) → lossy VP8, žádný alpha
    assert.equal(info.alpha, false);
    assert.ok(info.bytes < 700 * 1024, `artwork má být rozumně velký, je ${Math.round(info.bytes / 1024)} kB`);
  });
});

describe("UniversalContentStage.tsx — artwork + živé overlaye", () => {
  test("reuse stejného scaling mechanismu jako /casino (ArtworkStage), ne druhý vlastní", () => {
    assert.match(stageSource, /import ArtworkStage from "\.\/ArtworkStage\.tsx";/);
    assert.match(stageSource, /<ArtworkStage canvas=\{stage\} loadingLabel=/);
    assert.match(stageSource, /rectStyle\(stage\.layout\.back\)/);
    assert.match(stageSource, /rectStyle\(stage\.layout\.panel\)/);
  });

  test("tlačítko zpět je deterministický link na /casino (žádný history.back)", () => {
    assert.match(stageSource, /href="\/casino"/);
    assert.match(stageSource, /aria-label="Zpět do kasina"/);
    // Žádný návrat přes prohlížečovou historii v kódu (komentář to smí zmínit).
    assert.doesNotMatch(stageSource, /window\.history|useRouter|router\.back/);
    assert.doesNotMatch(pageShellSource, /window\.history|useRouter|router\.back/);
  });

  test("H1 je živé HTML v panelu (artwork route-specific nadpis nemá)", () => {
    assert.match(stageSource, /<h1 className="gembl-masthead[^"]*">\{title\}<\/h1>/);
  });

  test("obsah se scrolluje jen uvnitř panelu a scrollbar je retro (gembl-scroll)", () => {
    assert.match(stageSource, /flex flex-col overflow-hidden/);
    assert.match(stageSource, /gembl-scroll[^"]*overflow-y-auto/);
  });
});

describe("ContentPage.tsx — jeden shell pro všechny 3 stránky", () => {
  test("přepíná stage/legacy existujícím mechanismem (StageViewSwitch + skin.minStageWidth)", () => {
    assert.match(pageShellSource, /import StageViewSwitch from "\.\/StageViewSwitch\.tsx";/);
    assert.match(pageShellSource, /<StageViewSwitch/);
    assert.match(pageShellSource, /getActiveSkin\(\)\.universal/);
    assert.match(switchSource, /useMinWidth\(getActiveSkin\(\)\.minStageWidth\)/);
  });

  test("obě větve mají H1 (SEO/accessibility i v SSR větvi) a sdílený obsah", () => {
    const h1Count = (pageShellSource.match(/<h1/g) ?? []).length;
    assert.equal(h1Count, 1, "legacy H1 je v shellu; stage H1 řeší UniversalContentStage");
    assert.match(pageShellSource, /stage=\{/);
    assert.match(pageShellSource, /legacy=\{/);
    // stejný `children` se předává do obou větví (wrapper se neimplementuje 3×)
    const childrenRefs = (pageShellSource.match(/\{children\}/g) ?? []).length;
    assert.equal(childrenRefs, 2);
  });

  test("mobile fallback má volitelně vlastní šipku zpět (legacyBack pro /jak-to-funguje)", () => {
    assert.match(pageShellSource, /legacyBack = false/);
    assert.match(pageShellSource, /legacyBack && \(/);
  });
});

describe("SiteChrome.tsx — desktop stage skryje header/footer, mobile fallback ne", () => {
  test("obsahové stránky jsou v UNIVERSAL_STAGE_ROUTES a hideChrome je zahrnuje", () => {
    assert.match(chromeSource, /const UNIVERSAL_STAGE_ROUTES = new Set<string>\(\["\/profil", "\/zebricky", "\/jak-to-funguje"\]\);/);
    assert.match(chromeSource, /const isUniversalStage = UNIVERSAL_STAGE_ROUTES\.has\(pathname\) && isWideEnough;/);
    assert.match(chromeSource, /const hideChrome = isDesktopStage \|\| isUniversalStage \|\| isStandalone;/);
  });

  test("breakpoint je stejný jako pro /casino stage (skin.minStageWidth, žádná druhá konstanta)", () => {
    assert.match(chromeSource, /useMinWidth\(getActiveSkin\(\)\.minStageWidth\)/);
    assert.doesNotMatch(chromeSource, /useMinWidth\(\d+\)/);
  });
});

describe("stránky používají společný shell (wrapper se neimplementuje třikrát)", () => {
  for (const [route, file, expectLegacyBack] of [
    ["/profil", "../app/(site)/profil/page.tsx", false],
    ["/zebricky", "../app/(site)/zebricky/page.tsx", false],
    ["/jak-to-funguje", "../app/(site)/jak-to-funguje/page.tsx", true],
  ] as const) {
    test(`${route} renderuje ContentPage${expectLegacyBack ? " s legacyBack" : ""}`, () => {
      const source = read(file);
      assert.match(source, /import ContentPage from "\.\.\/\.\.\/components\/stage\/ContentPage";/);
      assert.match(source, /<ContentPage/);
      assert.match(source, /title="/);
      if (expectLegacyBack) assert.match(source, /legacyBack/);
      else assert.doesNotMatch(source, /legacyBack/);
    });
  }
});

describe("Profil — jen existující data, žádné vymyšlené", () => {
  const panelSource = read("../app/(site)/profil/ProfilPanel.tsx");

  test("je 'use client' a stav čte z existujících zdrojů (session + storage), ne z nového API", () => {
    assert.match(panelSource.trimStart().split("\n")[0], /^["']use client["']/);
    assert.match(panelSource, /import \{ useSession \} from "\.\.\/\.\.\/\.\.\/lib\/auth\/use-session-client";/);
    assert.match(panelSource, /import \{ loadPlayerState \} from "\.\.\/\.\.\/\.\.\/lib\/casino\/storage";/);
    assert.match(panelSource, /setPlayer\(loadPlayerState\(\)\);/);
  });

  test("historie transakcí zůstává jen disabled CTA (backend pro ni není)", () => {
    assert.match(panelSource, /Historie transakcí/);
    assert.match(panelSource, /gembl-cta--disabled/);
  });
});

describe("Žebříčky — žádná fake data", () => {
  const pageSource = read("../app/(site)/zebricky/page.tsx");

  test("používá reálný globální součet a místo leaderboardu poctivý prázdný stav", () => {
    assert.match(pageSource, /import GlobalStatsLine from "\.\.\/\.\.\/components\/GlobalStatsLine";/);
    assert.match(pageSource, /<GlobalStatsLine \/>/);
    assert.match(pageSource, /Žebříček připravujeme/);
    // žádné mock hráče/čísla jako ve stage StatsOverlay
    assert.doesNotMatch(pageSource, /MOCK_/);
    assert.doesNotMatch(pageSource, /Nevyhraju101|Lucky_/);
  });
});

describe("ArtworkStage — jedna sdílená scaling vrstva pro oba stage", () => {
  test("je obecný (StageCanvas) a používá ho i /casino", () => {
    assert.match(artworkStageSource, /import type \{ StageCanvas \} from "\.\.\/\.\.\/\.\.\/lib\/casino-skins\/index\.ts";/);
    assert.match(artworkStageSource, /export default function ArtworkStage\(\{\s*canvas,\s*loadingLabel,\s*children,\s*\}: \{\s*canvas: StageCanvas;\s*loadingLabel: string;\s*children: ReactNode;\s*\}\)/);
    assert.match(artworkStageSource, /setScale\(width \/ canvas\.designWidth\)/);
    const classicStage = read("../app/(site)/casino/stage/ClassicCasinoStage.tsx");
    assert.match(classicStage, /import ArtworkStage from "\.\.\/\.\.\/\.\.\/components\/stage\/ArtworkStage\.tsx";/);
    assert.match(classicStage, /<ArtworkStage canvas=\{skin\} loadingLabel=/);
  });
});
