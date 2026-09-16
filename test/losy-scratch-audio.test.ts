import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const layerSource = read("../app/(site)/losy/ScratchLayer.tsx");
const cardSource = read("../app/(site)/losy/ScratchCard.tsx");
const providerSource = read("../lib/audio/AudioProvider.tsx");
const globalsSource = read("../app/globals.css");

const { SFX_REGISTRY } = await import("../lib/audio/sfx.ts");
const { measureScratchedRatio, SYMBOL_CELLS, SYMBOL_REVEAL_RATIO, SCRATCH_THRESHOLD_RATIO } = await import(
  "../lib/losy/scratch-sampling.ts"
);

describe("scratch SFX v registru: smyčka, ne one-shot", () => {
  test("je označený jako loop + má vlastní (tišší) hlasitost, ať je slyšet ale ne nepříjemný", () => {
    const def = SFX_REGISTRY.scratch;
    assert.equal(def.loop, true);
    assert.equal(def.placeholder, false);
    assert.match(def.src, /^\/audio\/sfx\/scratch-loop\.mp3$/);
    // efektivní hlasitost při výchozím volumeSfx 0.5 má být ~0.35–0.45
    const effective = 0.5 * (def.loopVolumeScale ?? 1);
    assert.ok(effective >= 0.35 && effective <= 0.45, `efektivní hlasitost scratch ${effective} mimo 0.35–0.45`);
  });

  test("soubor smyčky existuje, je malý a není to prázdný/obří soubor", () => {
    const filePath = path.join(REPO_ROOT, "public", SFX_REGISTRY.scratch.src);
    assert.ok(existsSync(filePath), `${SFX_REGISTRY.scratch.src} neexistuje v public/`);
    const size = statSync(filePath).size;
    assert.ok(size > 0 && size < 200 * 1024, `scratch-loop.mp3 má podezřelou velikost ${size} B`);
  });

  test("starý one-shot scratch.mp3 už v repu není (nahradila ho smyčka)", () => {
    assert.equal(existsSync(path.join(REPO_ROOT, "public", "audio", "sfx", "scratch.mp3")), false);
  });
});

describe("AudioProvider.tsx: smyčkové SFX (startSfxLoop/stopSfxLoop)", () => {
  test("vystavuje obě metody v kontextu (a no-op fallback mimo provider)", () => {
    assert.match(providerSource, /startSfxLoop: \(id: SfxId\) => void;/);
    assert.match(providerSource, /stopSfxLoop: \(id: SfxId\) => void;/);
    const noop = /const noopContextValue: AudioContextValue = \{[\s\S]*?\n\};/.exec(providerSource)?.[0] ?? "";
    assert.match(noop, /startSfxLoop: \(\) => \{\},/);
    assert.match(noop, /stopSfxLoop: \(\) => \{\},/);
  });

  test("při vypnutých efektech smyčka vůbec nezačne (globální sfxEnabled respektován)", () => {
    const startFn = /const startSfxLoop = useCallback\([\s\S]*?\n {2}\}, \[[^\]]*\]\);/.exec(providerSource)?.[0] ?? "";
    assert.ok(startFn.length > 0, "startSfxLoop musí existovat");
    assert.match(startFn, /if \(!preferencesRef\.current\.sfxEnabled\) return;/);
    // a běžící smyčka se vypnutím efektů utne
    assert.match(providerSource, /if \(preferences\.sfxEnabled\) return;\s*for \(const id of sfxLoopElsRef\.current\.keys\(\)\) stopSfxLoop\(id\);/);
  });

  test("smyčka se přehrává dokola (el.loop = true) a má vlastní fade, ne useknutí", () => {
    assert.match(providerSource, /el\.loop = true;/);
    assert.match(providerSource, /const SFX_LOOP_FADE_IN_MS = \d+;/);
    assert.match(providerSource, /const SFX_LOOP_FADE_OUT_MS = \d+;/);
    const stopFn = /const stopSfxLoop = useCallback\([\s\S]*?\n {2}\}, \[[^\]]*\]\);/.exec(providerSource)?.[0] ?? "";
    assert.match(stopFn, /fadeSfxLoopTo\(el, 0, SFX_LOOP_FADE_OUT_MS, \(\) => el\.pause\(\)\)/);
  });

  test("hlasitost smyčky = volumeSfx × loopVolumeScale (a reaguje na změnu hlasitosti)", () => {
    assert.match(providerSource, /preferencesRef\.current\.volumeSfx \* \(def\.loopVolumeScale \?\? 1\)/);
    assert.match(providerSource, /el\.volume = preferences\.volumeSfx \* \(def\.loopVolumeScale \?\? 1\);/);
  });

  test("smyčky se utnou při unmountu providera (odchod ze stránky)", () => {
    assert.match(providerSource, /for \(const loopEl of sfxLoops\.values\(\)\) loopEl\.pause\(\);/);
  });

  test("nový tah začíná na náhodném místě smyčky (míň znát opakování)", () => {
    const startFn = /const startSfxLoop = useCallback\([\s\S]*?\n {2}\}, \[[^\]]*\]\);/.exec(providerSource)?.[0] ?? "";
    assert.match(startFn, /if \(Number\.isFinite\(el\.duration\) && el\.duration > 0\) el\.currentTime = Math\.random\(\) \* el\.duration;/);
  });

  test("opakované volání během pohybu smyčku nerestartuje (běží dál, žádné cvakání)", () => {
    const startFn = /const startSfxLoop = useCallback\([\s\S]*?\n {2}\}, \[[^\]]*\]\);/.exec(providerSource)?.[0] ?? "";
    assert.match(startFn, /if \(el\.paused\) \{/);
    assert.match(startFn, /\} else \{\s*clearSfxLoopFade\(\);\s*el\.volume = target;\s*\}/);
  });
});

describe("ScratchLayer.tsx: scratch jen při skutečném pohybu, jinak rychle ticho", () => {
  test("používá centrální AudioProvider (startSfxLoop/stopSfxLoop), ne vlastní Audio()", () => {
    assert.match(layerSource, /import \{ useAudio \} from "\.\.\/\.\.\/\.\.\/lib\/audio\/AudioProvider\.tsx";/);
    assert.match(layerSource, /const \{ startSfxLoop, stopSfxLoop \} = useAudio\(\);/);
    assert.match(layerSource, /startSfxLoop\("scratch"\)/);
    assert.match(layerSource, /stopSfxLoop\("scratch"\)/);
    assert.doesNotMatch(layerSource, /new Audio\(/);
  });

  test("zvuk startuje z POHYBU (pointermove + minimální posun), ne z pouhého držení tlačítka", () => {
    const moveFn = /function handlePointerMove\([\s\S]*?\n {2}\}\n/.exec(layerSource)?.[0] ?? "";
    assert.ok(moveFn.length > 0);
    assert.match(moveFn, /const movedFar = !last \|\| Math\.hypot\(point\.x - last\.x, point\.y - last\.y\) >= SCRATCH_MOVE_MIN_PX;/);
    assert.match(moveFn, /reportScratchActivity\(\)/);
    // pointerdown zvuk nespouští (jen připraví stav) — hraje se až při pohybu
    const downFn = /function handlePointerDown\([\s\S]*?\n {2}\}\n/.exec(layerSource)?.[0] ?? "";
    assert.doesNotMatch(downFn, /reportScratchActivity|startSfxLoop/);
  });

  test("při zastavení pohybu zvuk do SCRATCH_IDLE_MS dozní (setTimeout, žádný setInterval)", () => {
    assert.match(layerSource, /const SCRATCH_IDLE_MS = \d+;/);
    const reportFn = /const reportScratchActivity = useCallback\([\s\S]*?\n {2}\}, \[[^\]]*\]\);/.exec(layerSource)?.[0] ?? "";
    assert.match(reportFn, /scratchIdleTimeoutRef\.current = window\.setTimeout\(/);
    assert.match(reportFn, /stopSfxLoop\("scratch"\)/);
    assert.doesNotMatch(layerSource, /setInterval\(/);
  });

  test("stop na pointerup / pointercancel / pointerleave", () => {
    assert.match(layerSource, /onPointerUp=\{handlePointerUp\}/);
    assert.match(layerSource, /onPointerCancel=\{handlePointerUp\}/);
    assert.match(layerSource, /onPointerLeave=\{handlePointerUp\}/);
    const upFn = /function handlePointerUp\(\)[\s\S]*?\n {2}\}\n/.exec(layerSource)?.[0] ?? "";
    assert.match(upFn, /stopScratchSound\(\)/);
  });

  test("stop při dokončení losu (active === false) i při unmountu", () => {
    assert.match(layerSource, /if \(!active\) stopScratchSound\(\);/);
    assert.match(layerSource, /useEffect\(\(\) => stopScratchSound, \[stopScratchSound\]\);/);
  });
});

describe("ScratchCard.tsx: pop efekt na odhaleném symbolu", () => {
  test("pop se pouští jednou na symbol a resetuje při nové rundě", () => {
    assert.match(cardSource, /const \[poppedSymbols, setPoppedSymbols\] = useState<readonly number\[\]>\(\[\]\);/);
    const handlerFn = /function handleSymbolRevealed\(index: number\)[\s\S]*?\n {2}\}\n/.exec(cardSource)?.[0] ?? "";
    assert.match(handlerFn, /setPoppedSymbols\(\(current\) => \(current\.includes\(index\) \? current : \[\.\.\.current, index\]\)\);/);
    const startFn = /function startScratching\(\)[\s\S]*?\n {2}\}\n/.exec(cardSource)?.[0] ?? "";
    assert.match(startFn, /setPoppedSymbols\(\[\]\);/);
  });

  test("symbol dostane animaci jen když je 'popnutý' a je inline-block (kvůli transformu)", () => {
    assert.match(cardSource, /className=\{`inline-block \$\{poppedSymbols\.includes\(index\) \? "animate-symbol-pop" : ""\}`\}/);
    assert.match(cardSource, /onSymbolRevealed=\{handleSymbolRevealed\}/);
  });

  test("detekce 'symbol je celý vidět' jde přes třetiny canvasu (SYMBOL_CELLS), ne přes herní výsledek", () => {
    assert.match(layerSource, /SYMBOL_CELLS\.forEach\(\(cell, index\) => \{/);
    assert.match(layerSource, /measureScratchedRatio\(canvas\.width, canvas\.height, readAlpha, cell\) >= SYMBOL_REVEAL_RATIO/);
    assert.match(layerSource, /revealedSymbolsRef\.current\.add\(index\);/);
    assert.match(layerSource, /onSymbolRevealed\(index\)/);
    // herní logika losu se nemění — v ScratchCardu se nic nepřepočítává
    assert.doesNotMatch(cardSource, /SYMBOL_REVEAL_RATIO|measureScratchedRatio/);
  });
});

describe("scratch-sampling.ts: měření po obdélnících (třetiny = symboly)", () => {
  /** Fake alpha reader: setřeno jen v zadaných sloupcích (podle zlomku šířky). */
  const makeReader = (width: number, clearedFraction: number) => (x: number) => (x / width < clearedFraction ? 0 : 255);

  test("celý setřený canvas = 1, nesetřený = 0", () => {
    assert.equal(measureScratchedRatio(320, 140, () => 0), 1);
    assert.equal(measureScratchedRatio(320, 140, () => 255), 0);
  });

  test("obdélník omezí měření jen na svoji část canvasu", () => {
    const readAlpha = makeReader(320, 1 / 3);
    assert.equal(measureScratchedRatio(320, 140, readAlpha, SYMBOL_CELLS[0]), 1);
    assert.equal(measureScratchedRatio(320, 140, readAlpha, SYMBOL_CELLS[1]), 0);
    assert.equal(measureScratchedRatio(320, 140, readAlpha, SYMBOL_CELLS[2]), 0);
  });

  test("tři buňky pokrývají celou šířku a práh pro pop je rozumně nastavený", () => {
    assert.equal(SYMBOL_CELLS.length, 3);
    assert.equal(SYMBOL_CELLS.reduce((sum, cell) => sum + cell.width, 0), 1);
    for (const cell of SYMBOL_CELLS) {
      assert.equal(cell.left + cell.width <= 1, true);
      assert.equal(cell.height, 1);
    }
    assert.ok(SYMBOL_REVEAL_RATIO > SCRATCH_THRESHOLD_RATIO, "symbol musí být celý vidět ještě před reveal celého losu");
    assert.ok(SYMBOL_REVEAL_RATIO < 1);
  });
});

describe("globals.css: zoom-pop animace symbolu", () => {
  test("má keyframes zoom-in → zpět a respektuje prefers-reduced-motion", () => {
    assert.match(globalsSource, /@keyframes gembl-symbol-pop/);
    assert.match(globalsSource, /\.animate-symbol-pop \{/);
    assert.match(globalsSource, /transform: scale\(1\.35\);/);
    assert.match(globalsSource, /transform: scale\(1\);/);
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/.exec(globalsSource)?.[0] ?? "";
    assert.match(reduced, /\.animate-symbol-pop/);
  });
});
