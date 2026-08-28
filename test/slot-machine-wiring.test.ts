import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// "use client" + timery/DOM — zdrojová kontrola, stejný vzor jako
// framework-vázané testy v jiných projektech (žádný DOM test harness
// v tomhle starteru). Čistá herní logika je testovaná přímo
// (slot-engine.test.ts, achievements.test.ts, casino-storage.test.ts).
const source = readFileSync(fileURLToPath(new URL("../app/(site)/automaty/SlotMachine.tsx", import.meta.url)), "utf8");

test("SlotMachine.tsx: je 'use client'", () => {
  const firstLine = source.trimStart().split("\n")[0];
  assert.match(firstLine, /^["']use client["']/);
});

test("SlotMachine.tsx: SPIN_COST se importuje ze sdíleného config, není zadrátovaný napevno", () => {
  assert.match(source, /import \{ SPIN_COST \} from "\.\.\/\.\.\/config\/site"/);
  assert.doesNotMatch(source, /const SPIN_COST = \d+/);
});

test("SlotMachine.tsx: po spinu se credits VŽDY jen odečítá o SPIN_COST, nikdy nepřičítá žádná výhra", () => {
  const spinHandler = /function handleSpin\(\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  assert.match(spinHandler, /credits: player\.credits - SPIN_COST/);
  assert.doesNotMatch(spinHandler, /credits:\s*player\.credits\s*\+/);
});

test("SlotMachine.tsx: totalWon se počítá z result.payout (vždy 0), ne z pevné hodnoty", () => {
  assert.match(source, /totalWon: player\.totalWon \+ result\.payout/);
});

test("SlotMachine.tsx: tlačítko má text 'ROZTOČIT ZA {SPIN_COST} G' a je disabled bez dost kreditů/během spinu", () => {
  assert.match(source, /ROZTOČIT ZA \$\{SPIN_COST\} G/);
  assert.match(source, /disabled=\{!canSpin\}/);
  assert.match(source, /const canSpin = !spinning && player\.credits >= SPIN_COST;/);
});

test("SlotMachine.tsx: varovný text o nemožnosti výhry je vždy přítomný (ne jen před prvním spinem)", () => {
  assert.match(
    source,
    /V této hře není možné vyhrát\. Spin stojí \{SPIN_COST\} virtuálních kreditů a výhra je vždy 0 G\./
  );
});

test("SlotMachine.tsx: reset vyžaduje potvrzovací krok (showResetConfirm), ne rovnou akci", () => {
  assert.match(source, /onClick=\{\(\) => setShowResetConfirm\(true\)\}/);
  assert.match(source, /Opravdu chceš resetovat kariéru\?/);
  assert.match(source, /onClick=\{handleResetConfirm\}/);
});

test("SlotMachine.tsx: nově odemknuté achievementy se pushnou jako toasty po každém spinu", () => {
  const spinHandler = /function handleSpin\(\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  assert.match(spinHandler, /checkNewAchievements\(withoutAchievements\)/);
  assert.match(spinHandler, /for \(const achievement of newAchievements\) pushToast\(achievement\.title\)/);
});

test("SlotMachine.tsx: žádný setInterval (polling) — jen jednorázové setTimeout na animace", () => {
  assert.doesNotMatch(source, /setInterval/);
});

test("SlotMachine.tsx: čte/ukládá stav přes storage.ts (loadPlayerState/savePlayerState/resetPlayerState), ne přímo localStorage", () => {
  assert.match(source, /import \{ loadPlayerState, resetPlayerState, savePlayerState \} from "\.\.\/\.\.\/\.\.\/lib\/casino\/storage"/);
  assert.doesNotMatch(source, /localStorage\.(get|set)Item/);
});

test("SlotMachine.tsx: globální statistiky se reportují v dávkách (po FLUSH_EVERY_N_SPINS), ne po každém jednotlivém spinu", () => {
  assert.match(source, /const FLUSH_EVERY_N_SPINS = 10;/);
  const spinHandler = /function handleSpin\(\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  assert.match(spinHandler, /pendingStatsRef\.current\.spins \+= 1;/);
  assert.match(spinHandler, /pendingStatsRef\.current\.wagered \+= SPIN_COST;/);
  assert.match(spinHandler, /if \(pendingStatsRef\.current\.spins >= FLUSH_EVERY_N_SPINS\) flushPendingStats\(\);/);
  // Report se NEVOLÁ přímo v handleSpin mimo flushPendingStats — jinak by šlo o report na každý spin.
  assert.doesNotMatch(spinHandler, /reportGameStatsDeltaClient\(/);
});

test("SlotMachine.tsx: nedokončená dávka se odešle při odchodu ze stránky (visibilitychange hidden + pagehide)", () => {
  assert.match(source, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(source, /window\.addEventListener\("pagehide", handlePageHide\)/);
  assert.match(source, /if \(document\.visibilityState === "hidden"\) flushPendingStats\(\);/);
});

test("SlotMachine.tsx: reset odešle nedokončenou dávku SE započítaným resetem (jeden request, ne dva)", () => {
  const resetHandler = /function handleResetConfirm\(\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  assert.match(resetHandler, /flushPendingStats\(1\);/);
});

test("SlotMachine.tsx: flushPendingStats má stabilní identitu (useCallback, prázdné deps)", () => {
  assert.match(source, /const flushPendingStats = useCallback\(\(resets = 0\) => \{[\s\S]*?\n {2}\}, \[\]\);/);
});
