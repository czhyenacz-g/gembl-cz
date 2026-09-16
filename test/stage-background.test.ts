import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classicSkin } from "../lib/casino-skins/classic.ts";

// "use client" + timery/DOM — zdrojová kontrola, stejný vzor jako
// test/losy-wiring.test.ts (žádný DOM test harness v tomhle starteru).
const bgSource = readFileSync(fileURLToPath(new URL("../app/components/stage/StageBackground.tsx", import.meta.url)), "utf8");
const stageSource = readFileSync(fileURLToPath(new URL("../app/components/stage/ArtworkStage.tsx", import.meta.url)), "utf8");

describe("classicSkin.background — animované pozadí stage", () => {
  test("má 4 snímky a první je shodný se `src` (žádné bliknutí při hydrataci)", () => {
    assert.equal(classicSkin.background.frames?.length, 4);
    assert.equal(classicSkin.background.frames?.[0], classicSkin.background.src);
  });

  test("všechny snímky jsou lokální WebP v /skins/classic (žádný vzdálený originál)", () => {
    for (const src of classicSkin.background.frames ?? []) {
      assert.match(src, /^\/skins\/classic\/.+\.webp$/);
    }
  });
});

describe("StageBackground.tsx — crossfade slideshow", () => {
  test("je 'use client' a používá stávající next/image (žádná nová knihovna)", () => {
    const firstLine = bgSource.trimStart().split("\n")[0];
    assert.match(firstLine, /^["']use client["']/);
    assert.match(bgSource, /import Image from "next\/image";/);
    assert.match(bgSource, /unoptimized/);
  });

  test("všechny snímky přednačte při mountu přes new window.Image()", () => {
    assert.match(bgSource, /const image = new window\.Image\(\);/);
    assert.match(bgSource, /image\.src = url;/);
    assert.match(bgSource, /image\.onload = done;/);
  });

  test("rotace se spustí, až když jsou snímky připravené (`ready`), a respektuje prefers-reduced-motion", () => {
    assert.match(bgSource, /if \(!ready \|\| count <= 1\) return;/);
    assert.match(bgSource, /prefers-reduced-motion: reduce/);
    assert.match(bgSource, /setInterval\(\(\) => setActive\(\(current\) => \(current \+ 1\) % count\), ROTATE_MS\)/);
  });

  test("přechod je plynulý crossfade přes opacity transition (ne blikání)", () => {
    assert.match(bgSource, /transition-opacity/);
    assert.match(bgSource, /opacity: index === active \? 1 : 0/);
  });
});

describe("ArtworkStage.tsx — napojení slideshow na stage", () => {
  test("používá StageBackground místo jednoho statického <Image> v scale větvi", () => {
    assert.match(stageSource, /import StageBackground from "\.\/StageBackground\.tsx";/);
    assert.match(stageSource, /<StageBackground[\s\S]*?frames=\{canvas\.background\.frames \?\? \[canvas\.background\.src\]\}/);
  });

  test("SSR/first-paint fallback používá stejnou URL jako první frame (unoptimized)", () => {
    assert.match(stageSource, /priority\n\s+unoptimized/);
  });
});
