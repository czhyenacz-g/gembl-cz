import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Zdrojová kontrola (stejný vzor jako slot-machine-wiring.test.ts / artwork-loading.test.ts)
// — páka je čistě prezentační vrstva nad existující herní logikou.
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const source = readFileSync(fileURLToPath(new URL("../app/(site)/automaty/SlotMachine.tsx", import.meta.url)), "utf8");

/** Přečte rozměry z WebP hlavičky (VP8X i prostý lossy "VP8 "). */
function webpInfo(file: string) {
  const buf = readFileSync(file);
  assert.equal(buf.slice(0, 4).toString("ascii"), "RIFF");
  assert.equal(buf.slice(8, 12).toString("ascii"), "WEBP");
  const chunk = buf.slice(12, 15).toString("ascii");
  const bytes = statSync(file).size;
  if (chunk === "VP8") {
    return { width: (buf[26] | (buf[27] << 8)) & 0x3fff, height: (buf[28] | (buf[29] << 8)) & 0x3fff, bytes };
  }
  const read24 = (o: number) => buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
  return { width: read24(24) + 1, height: read24(27) + 1, bytes };
}

describe("assety páky", () => {
  test("mid/down stavové obrázky existují, sedí na rozměry scény a nejsou obří", () => {
    for (const file of ["automaty-lever-mid.webp", "automaty-lever-down.webp"]) {
      const full = path.join(REPO_ROOT, "public", "skins", "automaty", file);
      assert.ok(existsSync(full), `${file} neexistuje v public/skins/automaty/`);
      const info = webpInfo(full);
      assert.equal(info.width, 1536, `${file} musí mít šířku scény (jinak by overlaye v % neseděly)`);
      assert.equal(info.height, 1024);
      assert.ok(info.bytes > 0 && info.bytes < 600 * 1024, `${file} má podezřelou velikost ${info.bytes} B`);
    }
  });
});

describe("SlotMachine.tsx: animace páky přepínáním obrázků (žádná GSAP)", () => {
  test("nepoužívá žádnou animační knihovnu ani setInterval", () => {
    assert.doesNotMatch(source, /from "(gsap|framer-motion|react-spring)[^"]*"/);
    assert.doesNotMatch(source, /setInterval\(/);
  });

  test("vrstvy páky jsou v DOM pořád (preload zdarma) a jen se přepíná viditelnost", () => {
    assert.match(source, /\{\(\["mid", "down"\] as const\)\.map\(\(frame\) => \(/);
    assert.match(source, /src=\{LEVER_FRAMES\[frame\]\}/);
    // žádné podmíněné renderování (to by znamenalo pozdní načtení a bliknutí)
    assert.match(source, /leverFrame === frame \? "opacity-100" : "opacity-0"/);
    // a jsou nad základním artworkem, ale pod z-10 overlaye (válce/tlačítka)
    assert.match(source, /pointer-events-none absolute inset-0 h-full w-full object-contain/);
  });

  test("sekvence: mid hned → down v LEVER_STEP_DOWN_MS (tady spin) → mid → up", () => {
    const pullFn = /function pullLever\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.ok(pullFn.length > 0, "pullLever musí existovat");
    assert.match(pullFn, /setLeverFrame\("mid"\);/);
    assert.match(pullFn, /scheduleLeverFrame\("down", LEVER_STEP_DOWN_MS\);/);
    assert.match(pullFn, /window\.setTimeout\(\(\) => handleSpin\(\), LEVER_STEP_DOWN_MS\)/);
    assert.match(pullFn, /scheduleLeverReturn\(\);/);

    const returnFn = /function scheduleLeverReturn\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(returnFn, /scheduleLeverFrame\("mid", LEVER_STEP_BACK_MID_MS\);/);
    assert.match(returnFn, /scheduleLeverFrame\("up", LEVER_STEP_UP_MS\);/);
    // časování odpovídá zadané sekvenci (down 180–220 ms, zpět mid 300–360, up 430–520)
    for (const [name, lo, hi] of [
      ["LEVER_STEP_DOWN_MS", 180, 220],
      ["LEVER_STEP_BACK_MID_MS", 300, 360],
      ["LEVER_STEP_UP_MS", 430, 520],
    ] as const) {
      const value = Number(new RegExp(`const ${name} = (\\d+);`).exec(source)?.[1]);
      assert.ok(value >= lo && value <= hi, `${name} = ${value} je mimo ${lo}–${hi} ms`);
    }
  });

  test("během animace i během spinu je vstup ignorovaný (žádné dvojité zatažení ani dvojitý spin)", () => {
    const pullFn = /function pullLever\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(pullFn, /if \(leverBusyRef\.current \|\| spinning\) return;/);
    const downFn = /function handleLeverPointerDown\([\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(downFn, /if \(leverBusyRef\.current \|\| spinning\) return;/);
    // zámek se uvolní až po dojetí animace
    assert.match(source, /leverBusyRef\.current = false;/);
  });
});

describe("SlotMachine.tsx: interakce páky (klik + tažení)", () => {
  test("hitbox je neviditelné tlačítko nad páku s aria-label a správnými souřadnicemi", () => {
    assert.match(source, /const LEVER_RECT = \{ left: [\d.]+, top: [\d.]+, width: [\d.]+, height: [\d.]+ \};/);
    assert.match(source, /aria-label="Zatáhnout za páku"/);
    assert.match(source, /style=\{pct\(LEVER_RECT\)\}/);
    // nedělá se žádný vlastní click target přes celou scénu
    assert.match(source, /className=\{`absolute z-10 touch-none/);
  });

  test("klik/klávesa = plné zatažení; myší klik zpracují pointer handlery (žádné dvojité spuštění)", () => {
    assert.match(source, /onPointerDown=\{handleLeverPointerDown\}/);
    assert.match(source, /onPointerMove=\{handleLeverPointerMove\}/);
    assert.match(source, /onPointerUp=\{handleLeverPointerUp\}/);
    assert.match(source, /onPointerCancel=\{handleLeverPointerUp\}/);
    assert.match(source, /if \(event\.detail === 0\) pullLever\(\);/);
  });

  test("tažení: malý tah = mid, větší tah = down (+ spin právě jednou), puštění = návrat", () => {
    const moveFn = /function handleLeverPointerMove\([\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(moveFn, /const pulledToBottom = event\.clientY - drag\.startY >= LEVER_DRAG_DOWN_PX;/);
    assert.match(moveFn, /setLeverFrame\(pulledToBottom \? "down" : "mid"\);/);
    assert.match(moveFn, /if \(pulledToBottom && !drag\.fired\) \{[\s\S]*?drag\.fired = true;[\s\S]*?handleSpin\(\);/);

    const upFn = /function handleLeverPointerUp\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(upFn, /if \(!drag\.fired\) \{\s*setLeverFrame\("down"\);\s*handleSpin\(\);\s*\}/);
    assert.match(upFn, /scheduleLeverReturn\(\);/);
    // tažení používá pointer capture (up dorazí i mimo hitbox)
    assert.match(source, /event\.currentTarget\.setPointerCapture\(event\.pointerId\);/);
  });

  test("naplánované kroky animace se uklidí při unmountu", () => {
    assert.match(source, /useEffect\(\(\) => clearLeverTimeouts, \[\]\);/);
    const clearFn = /function clearLeverTimeouts\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(clearFn, /window\.clearTimeout\(id\)/);
  });

  test("herní logika spinu zůstala nedotčená (páka jen volá existující handleSpin)", () => {
    const spinFn = /function handleSpin\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(spinFn, /const wagered = bet;/);
    assert.match(spinFn, /void runSpin\(wagered\);/);
    // páka nikde nepočítá kredity/výsledek
    assert.doesNotMatch(source, /leverFrame[\s\S]{0,200}(credits|payout)/);
  });
});
