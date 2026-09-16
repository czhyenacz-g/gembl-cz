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

test("SlotMachine.tsx: MIN_BET/MAX_BET/BET_STEP se importují ze sdíleného config, nejsou zadrátované napevno", () => {
  assert.match(source, /import \{ BET_STEP, MAX_BET, MIN_BET \} from "\.\.\/\.\.\/config\/site"/);
  assert.doesNotMatch(source, /const (MIN_BET|MAX_BET|BET_STEP) = \d+/);
});

test("SlotMachine.tsx: sázka je nastavitelná stavem (useState), výchozí hodnota MIN_BET, nikdy pevná konstanta", () => {
  assert.match(source, /const \[bet, setBet\] = useState\(MIN_BET\);/);
});

test("SlotMachine.tsx: +/- tlačítka mění sázku o BET_STEP a jsou disabled na hranicích rozsahu", () => {
  const adjustBetFn = /function adjustBet\(delta: number\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  assert.match(adjustBetFn, /if \(next < MIN_BET \|\| next > maxAllowedBet\) return current;/);
  assert.match(source, /onClick=\{\(\) => adjustBet\(-BET_STEP\)\}/);
  assert.match(source, /onClick=\{\(\) => adjustBet\(BET_STEP\)\}/);
  assert.match(source, /disabled=\{spinning \|\| bet <= MIN_BET\}/);
  assert.match(source, /disabled=\{spinning \|\| bet >= maxAllowedBet\}/);
});

test("SlotMachine.tsx: maxAllowedBet se počítá přes maxAffordableBet (nikdy vlastní duplicitní zaokrouhlovací logika)", () => {
  assert.match(source, /import \{ maxAffordableBet \} from "\.\.\/\.\.\/\.\.\/lib\/wallet\/bet"/);
  assert.match(source, /const maxAllowedBet = effectiveCredits === null \? MAX_BET : maxAffordableBet\(effectiveCredits\);/);
});

test("SlotMachine.tsx: sázka se po odehrání/přihlášení/dobití automaticky srazí na maxAllowedBet, když na ni přestane stačit zůstatek", () => {
  const clampEffect = /useEffect\(\(\) => \{\s*setBet\(\(current\) => \{[\s\S]*?\n  \}, \[maxAllowedBet\]\);/.exec(source)?.[0] ?? "";
  assert.match(clampEffect, /if \(current > maxAllowedBet\) return maxAllowedBet;/);
});

test("SlotMachine.tsx: po spinu se credits VŽDY jen odečítá o zvolenou sázku (host) nebo přebírá server-potvrzenou hodnotu (přihlášen), nikdy lokálně nepřičítá výhru", () => {
  const runSpin = /async function runSpin\(wagered: number\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  // Host: lokální odečet o přesně zvolenou (uzamčenou v okamžiku kliknutí) sázku.
  assert.match(runSpin, /applySpinResult\(player, player\.credits - wagered, result\.payout, wagered\)/);
  // Přihlášený: credits = balance vrácený serverem z POST /api/wallet/spin (viz lib/wallet/ledger.ts spendCredits), ne lokální výpočet.
  assert.match(runSpin, /applySpinResult\(player, data\.balance, result\.payout, wagered\)/);
  assert.doesNotMatch(runSpin, /credits:\s*player\.credits\s*\+/);
  assert.doesNotMatch(runSpin, /credits:\s*data\.balance\s*\+/);
});

test("SlotMachine.tsx: sázka se serveru posílá v těle requestu (POST /api/wallet/spin), server si ji sám validuje", () => {
  assert.match(source, /body: JSON\.stringify\(\{ bet: wagered \}\)/);
});

test("SlotMachine.tsx: totalWon se počítá z result.payout (vždy 0), totalWagered z předané sázky, ne z pevné hodnoty", () => {
  assert.match(
    source,
    /function applySpinResult\(player: PlayerState, credits: number, payout: number, wagered: number\)/
  );
  assert.match(source, /totalWon: player\.totalWon \+ payout/);
  assert.match(source, /totalWagered: player\.totalWagered \+ wagered/);
  // Volající vždy předává result.payout, nikdy vlastní/pevnou hodnotu.
  const payoutCallSites = source.match(/applySpinResult\([^)]*result\.payout, wagered\)/g) ?? [];
  assert.equal(payoutCallSites.length, 2, "applySpinResult se volá přesně na 2 místech (host/přihlášený), obě s result.payout a wagered");
});

test("SlotMachine.tsx: tlačítko má text 'VSADIT {bet} G' a je disabled bez dost kreditů na zvolenou sázku/během spinu", () => {
  assert.match(source, /VSADIT \$\{bet\} G/);
  assert.match(source, /disabled=\{!canSpin\}/);
  assert.match(
    source,
    /const canSpin = !spinning && effectiveCredits !== null && effectiveCredits >= bet && bet >= MIN_BET;/
  );
});

test("SlotMachine.tsx: sázka se zamkne v okamžiku kliknutí (handleSpin), ne až uvnitř asynchronního runSpin", () => {
  const handleSpinFn = /function handleSpin\(\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  assert.match(handleSpinFn, /const wagered = bet;/);
  assert.match(handleSpinFn, /void runSpin\(wagered\);/);
});

test("SlotMachine.tsx: varovný text o nemožnosti výhry je vždy přítomný a zmiňuje rozsah sázky (ne pevnou cenu)", () => {
  assert.match(
    source,
    /V této hře není možné vyhrát\. Sázka je \{MIN_BET\}–\{MAX_BET\} G \(po \{BET_STEP\}\), výhra je vždy 0 G\./
  );
});

test("SlotMachine.tsx: reset kariéry tu záměrně NENÍ — přesunul se na vlastní stránku /reset (viz test/reset-page.test.ts)", () => {
  assert.doesNotMatch(source, /RESETOVAT KARIÉRU/);
  assert.doesNotMatch(source, /handleResetConfirm/);
  assert.doesNotMatch(source, /showResetConfirm/);
  // Bez resetu tu není co mazat — stav se přes storage.ts jen čte a ukládá při hře.
  assert.doesNotMatch(source, /resetPlayerState/);
  assert.doesNotMatch(source, /createInitialPlayerState/);
});

test("SlotMachine.tsx: nově odemknuté achievementy se pushnou jako toasty po každém spinu", () => {
  const applySpinResultFn =
    /function applySpinResult\(player: PlayerState, credits: number, payout: number, wagered: number\)[\s\S]*?\n  \}\n/.exec(source)?.[0] ?? "";
  assert.match(applySpinResultFn, /checkNewAchievements\(withoutAchievements\)/);
  assert.match(applySpinResultFn, /for \(const achievement of newAchievements\) pushToast\(achievement\.title\)/);
});

test("SlotMachine.tsx: žádný setInterval (polling) — jen jednorázové setTimeout na animace", () => {
  assert.doesNotMatch(source, /setInterval/);
});

test("SlotMachine.tsx: čte/ukládá stav přes storage.ts (loadPlayerState/savePlayerState), ne přímo localStorage", () => {
  assert.match(source, /import \{ loadPlayerState, savePlayerState \} from "\.\.\/\.\.\/\.\.\/lib\/casino\/storage"/);
  assert.doesNotMatch(source, /localStorage\.(get|set)Item/);
});

test("SlotMachine.tsx: globální statistiky se reportují v dávkách (po FLUSH_EVERY_N_SPINS), ne po každém jednotlivém spinu, s reálnou odehranou sázkou", () => {
  assert.match(source, /const FLUSH_EVERY_N_SPINS = 10;/);
  const finishSpinAnimationFn = /function finishSpinAnimation\(result: ReturnType<typeof spin>, wagered: number\)[\s\S]*?\n  \}\n/.exec(
    source
  )?.[0] ?? "";
  assert.match(finishSpinAnimationFn, /pendingStatsRef\.current\.spins \+= 1;/);
  assert.match(finishSpinAnimationFn, /pendingStatsRef\.current\.wagered \+= wagered;/);
  assert.match(finishSpinAnimationFn, /if \(pendingStatsRef\.current\.spins >= FLUSH_EVERY_N_SPINS\) flushPendingStats\(\);/);
  // Report se NEVOLÁ přímo v finishSpinAnimation mimo flushPendingStats — jinak by šlo o report na každý spin.
  assert.doesNotMatch(finishSpinAnimationFn, /reportGameStatsDeltaClient\(/);
});

test("SlotMachine.tsx: nedokončená dávka se odešle při odchodu ze stránky (visibilitychange hidden + pagehide)", () => {
  assert.match(source, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(source, /window\.addEventListener\("pagehide", handlePageHide\)/);
  assert.match(source, /if \(document\.visibilityState === "hidden"\) flushPendingStats\(\);/);
});

test("SlotMachine.tsx: odehraná dávka se reportuje bez resetu (resets: 0) — reset kariéry řeší samostatná stránka /reset", () => {
  const flushFn = /const flushPendingStats = useCallback\(\(\) => \{[\s\S]*?\n {2}\}, \[\]\);/.exec(source)?.[0] ?? "";
  assert.match(
    flushFn,
    /reportGameStatsDeltaClient\(\{ game: GAME_ID, spins: pending\.spins, wagered: pending\.wagered, won: pending\.won, resets: 0 \}\)/
  );
  assert.doesNotMatch(source, /resets: 1/);
  assert.doesNotMatch(source, /flushPendingStats\(1\)/);
});

test("SlotMachine.tsx: nedokončená dávka se odešle i při odchodu na jinou route (unmount) — typicky odchod na /reset", () => {
  const cleanup = /return \(\) => \{\s*document\.removeEventListener\("visibilitychange", handleVisibilityChange\);\s*window\.removeEventListener\("pagehide", handlePageHide\);\s*flushPendingStats\(\);\s*\};/.exec(
    source
  )?.[0] ?? "";
  assert.ok(cleanup, "cleanup efektu musí po odebrání listenerů ještě flushnout nedokončenou dávku");
});

test("SlotMachine.tsx: flushPendingStats má stabilní identitu (useCallback, prázdné deps) a je idempotentní (po odeslání pending vynuluje)", () => {
  assert.match(source, /const flushPendingStats = useCallback\(\(\) => \{[\s\S]*?\n {2}\}, \[\]\);/);
  assert.match(source, /pendingStatsRef\.current = \{ spins: 0, wagered: 0, won: 0 \};/);
});
