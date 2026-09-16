import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Zdrojová kontrola (stejný vzor jako skorapky-wiring.test.ts) + kontrola
// skutečných produkčních assetů na disku — obojí bez DOM/browser harnessu.
const cupSource = readFileSync(fileURLToPath(new URL("../app/(site)/skorapky/Cup.tsx", import.meta.url)), "utf8");
const shellGameSource = readFileSync(fileURLToPath(new URL("../app/(site)/skorapky/ShellGame.tsx", import.meta.url)), "utf8");

const CUP_PATH = fileURLToPath(new URL("../public/games/shells/cup.webp", import.meta.url));
const BALL_PATH = fileURLToPath(new URL("../public/games/shells/ball.webp", import.meta.url));

/** Přečte rozměry + alpha flag přímo z WebP (VP8X chunk) — bez image knihovny. */
function webpInfo(path: string) {
  const buf = readFileSync(path);
  assert.equal(buf.slice(0, 4).toString("ascii"), "RIFF", `${path} musí být RIFF kontejner`);
  assert.equal(buf.slice(8, 12).toString("ascii"), "WEBP", `${path} musí být WebP`);
  assert.equal(buf.slice(12, 16).toString("ascii"), "VP8X", `${path} musí mít rozšířený (alpha) WebP hlavičku`);
  const read24 = (o: number) => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
  return { alpha: (buf[20] & 0x10) !== 0, width: read24(24) + 1, height: read24(27) + 1, bytes: statSync(path).size };
}

describe("produkční assety kelímku a kuličky", () => {
  test("cup.webp existuje, je WebP s alfou, ~čtvercový a v rozumné retina velikosti (ne 2k/4k)", () => {
    const info = webpInfo(CUP_PATH);
    assert.equal(info.alpha, true, "kelímek musí mít zachovanou průhlednost");
    assert.ok(info.width >= 240 && info.width <= 480, `šířka kelímku má být 240–480 px (retina rezerva), je ${info.width}`);
    assert.ok(Math.abs(info.width / info.height - 1) < 0.05, "kelímek má být zhruba čtvercový (odpovídá poměru, se kterým počítá Cup.tsx)");
    assert.ok(info.bytes < 120 * 1024, `kelímek má být rozumně malý, je ${Math.round(info.bytes / 1024)} kB`);
  });

  test("ball.webp existuje, je WebP s alfou, čtvercový a malý (kulička se renderuje pod 50 px)", () => {
    const info = webpInfo(BALL_PATH);
    assert.equal(info.alpha, true, "kulička musí mít zachovanou průhlednost");
    assert.ok(info.width >= 80 && info.width <= 200, `šířka kuličky má být 80–200 px (retina rezerva), je ${info.width}`);
    assert.ok(Math.abs(info.width / info.height - 1) < 0.05, "kulička má být čtvercová (včetně poměru stran)");
    assert.ok(info.bytes < 40 * 1024, `kulička má být malá, je ${Math.round(info.bytes / 1024)} kB`);
  });
});

describe("Cup.tsx — reálné assety místo CSS-divo objektů", () => {
  test("je 'use client' a používá oba produkční assety z /games/shells", () => {
    assert.match(cupSource.trimStart().split("\n")[0], /^["']use client["']/);
    assert.match(cupSource, /src: "\/games\/shells\/cup\.webp", width: 320, height: 316/);
    assert.match(cupSource, /src: "\/games\/shells\/ball\.webp", width: 128, height: 128/);
    assert.match(cupSource, /import Image from "next\/image";/);
  });

  test("už žádné CSS-kreslené objekty (žádný bg/border/shadow box, který by dělal rámeček kolem assetu)", () => {
    assert.doesNotMatch(cupSource, /bg-gembl-ink/);
    assert.doesNotMatch(cupSource, /bg-amber-400/);
    assert.doesNotMatch(cupSource, /shadow-hard-sm/);
    assert.doesNotMatch(cupSource, /border-2 border-gembl-ink/);
  });

  test("kelímek zůstává <button> s onClick/disabled/aria-label (klik i keyboard zůstávají)", () => {
    assert.match(cupSource, /<button/);
    assert.match(cupSource, /onClick=\{\(\) => onSelect\(position\)\}/);
    assert.match(cupSource, /disabled=\{!selectable\}/);
    assert.match(cupSource, /aria-label=\{selectable \? `Vybrat \$\{CUP_LABELS\[position\]\} kelímek` : `\$\{CUP_LABELS\[position\]\} kelímek`\}/);
  });

  test("wrapper → obrázek: transform (zvednutí i shake) drží wrapper, obrázky jen renderují vzhled (alt=\"\", žádný translate)", () => {
    assert.match(cupSource, /raised \? "-translate-y-\[60%\]" : "translate-y-0"/);
    assert.match(cupSource, /highlighted \? "animate-shell-shake/);
    // oba obrázky jsou dekorativní (label má tlačítko) a bez vlastního transformu
    const images = cupSource.match(/<Image[\s\S]*?\/>/g) ?? [];
    assert.equal(images.length, 2, "Cup.tsx má renderovat právě 2 obrázky (kelímek + kulička)");
    for (const img of images) assert.match(img, /alt=""/);
    assert.doesNotMatch(cupSource, /className="[^"]*translate[^"]*"[\s\S]*?alt=""/);
  });

  test("kulička je před kelímkem a s nižším z-indexem (zavírající kelímek ji překryje)", () => {
    const ballIndex = cupSource.indexOf("BALL_ASSET.src");
    const cupIndex = cupSource.indexOf("CUP_ASSET.src");
    assert.ok(ballIndex !== -1 && cupIndex !== -1 && ballIndex < cupIndex, "kulička musí být v DOM před kelímkem");
    assert.match(cupSource, /z-0 aspect-square w-\[24%\]/);
    assert.match(cupSource, /z-10 w-\[78%\]/);
  });

  test("kulička si drží stav přes hasBall (opacity) a nemá vlastní animaci transformu", () => {
    assert.match(cupSource, /hasBall \? "opacity-100" : "opacity-0"/);
    assert.match(cupSource, /transition-opacity duration-200/);
    assert.doesNotMatch(cupSource, /animate-spin|animate-pulse|animate-bounce/);
  });

  test("kritické assety se nenačítají lazy (žádné bliknutí prázdné scény při startu)", () => {
    const eager = cupSource.match(/loading="eager"/g) ?? [];
    assert.equal(eager.length, 2, "kelímek i kulička mají být eager");
  });
});

describe("ShellGame.tsx — pozice slotů a herní logika zůstávají beze změny", () => {
  test("geometrie scény a tří vytištěných elips je pořád stejná (assety se do ní jen vkládají)", () => {
    assert.match(shellGameSource, /const SCENE_WIDTH = 1672;/);
    assert.match(shellGameSource, /const SCENE_HEIGHT = 941;/);
    assert.match(shellGameSource, /const SLOT_X: Record<CupIndex, number> = \{ 0: 33\.2, 1: 49\.94, 2: 66\.99 \};/);
    assert.match(shellGameSource, /const SLOT_Y = 70\.35;/);
    assert.match(shellGameSource, /width: "12%",\s*height: "15%",\s*transform: "translate\(-50%, -60%\)",/);
  });

  test("herní logika/stavy se nemění — raised/phase podmínky a pickRevealCup zůstávají", () => {
    assert.match(shellGameSource, /const raised = phase === "idle" \|\| phase === "revealing" \|\| phase === "result";/);
    assert.match(shellGameSource, /const reveal = pickRevealCup\(cup\);/);
    assert.match(shellGameSource, /phase === "choosing" && selectedCup === null/);
  });
});
