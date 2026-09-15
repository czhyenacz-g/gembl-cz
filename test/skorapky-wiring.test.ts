import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// "use client" + timery/DOM — zdrojová kontrola, stejný vzor jako
// test/slot-machine-wiring.test.ts (žádný DOM test harness v tomhle
// starteru). Čistá herní logika je testovaná přímo v test/skorapky-engine.test.ts.
const source = readFileSync(fileURLToPath(new URL("../app/(site)/skorapky/ShellGame.tsx", import.meta.url)), "utf8");

test("ShellGame.tsx: je 'use client'", () => {
  const firstLine = source.trimStart().split("\n")[0];
  assert.match(firstLine, /^["']use client["']/);
});

describe("state machine", () => {
  test("state je jeden ShellGamePhase z lib/skorapky/types.ts, ne sada booleanů", () => {
    assert.match(source, /import type \{ CupIndex, ShellGamePhase, ShuffleStep \} from "\.\.\/\.\.\/\.\.\/lib\/skorapky\/types\.ts"/);
    assert.match(source, /const \[phase, setPhase\] = useState<ShellGamePhase>\("idle"\);/);
    assert.doesNotMatch(source, /useState<boolean>\(false\).*(covering|shuffling|choosing|revealing)/is);
  });

  test("idle: přesně jedna viditelná kulička (ballPosition), přiřazená náhodně přes pickRandomCup", () => {
    assert.match(source, /const \[ballPosition, setBallPosition\] = useState<CupIndex>\(0\);/);
    assert.match(source, /setBallPosition\(pickRandomCup\(\)\);/);
    // Vždy jen JEDNO pole pro pozici kuličky idle stavu, ne pole/Set více pozic.
    assert.doesNotMatch(source, /ballPositions/);
  });

  test("choosing: kelímek je klikací jen v choosing a dokud není vybraný (selectingRef guard)", () => {
    const handleSelectFn = /function handleSelectCup\(cup: CupIndex\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(handleSelectFn, /if \(phase !== "choosing" \|\| selectingRef\.current\) return;/);
    assert.match(source, /selectable=\{phase === "choosing" && selectedCup === null\}/);
  });

  test("žádné samostatné tlačítko 'Odkrýt' — klik na kelímek rovnou plánuje suspense delay a revealing", () => {
    assert.doesNotMatch(source, /Odkrýt/);
    const handleSelectFn = /function handleSelectCup\(cup: CupIndex\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(handleSelectFn, /scheduleTimeout\(\(\) => \{\s*setPhase\("revealing"\);/);
    assert.match(handleSelectFn, /\}, CHOOSE_SUSPENSE_MS\);/);
  });

  test("po reveal timeoutu následuje result se selhávací hláškou z lib/skorapky/messages.ts", () => {
    assert.match(source, /import \{ pickRandomShellMessage \} from "\.\.\/\.\.\/\.\.\/lib\/skorapky\/messages\.ts"/);
    assert.match(source, /setPhase\("result"\);\s*setResultMessage\(pickRandomShellMessage\(\)\);/);
  });
});

describe("určení výsledku — hráč nikdy nevybere kuličku", () => {
  test("reveal pozice se počítá VÝHRADNĚ přes pickRevealCup(cup) z engine.ts, ne vlastní inline náhodou", () => {
    assert.match(source, /import \{ generateShuffleSequence, pickRandomCup, pickRevealCup \} from "\.\.\/\.\.\/\.\.\/lib\/skorapky\/engine\.ts"/);
    assert.match(source, /const reveal = pickRevealCup\(cup\);/);
    assert.match(source, /setRevealCup\(reveal\);/);
  });
});

describe("wallet — server je vždy autoritativní zdroj pravdy", () => {
  test("přihlášený hráč: bet jde přes POST /api/wallet/bet s game: 'skorapky', ne přímý zápis credits", () => {
    const fn = /async function placeBetAndStart\(\)[\s\S]*$/.exec(source)?.[0] ?? "";
    assert.match(fn, /fetch\("\/api\/wallet\/bet", \{/);
    assert.match(fn, /body: JSON\.stringify\(\{ game: "skorapky", bet: BET \}\)/);
  });

  test("fixní sázka BET = MIN_BET ze sdíleného site configu, ne vlastní zadrátovaná konstanta", () => {
    assert.match(source, /import \{ MIN_BET \} from "\.\.\/\.\.\/config\/site\.ts"/);
    assert.match(source, /const BET = MIN_BET;/);
  });

  test("host (nepřihlášený): odečet jde přes savePlayerState ze sdíleného storage.ts, ne přes localStorage přímo ani přes vlastní wallet modul", () => {
    assert.match(
      source,
      /import \{ loadPlayerState, savePlayerState \} from "\.\.\/\.\.\/\.\.\/lib\/casino\/storage\.ts"/
    );
    assert.match(source, /savePlayerState\(updated\);/);
    assert.doesNotMatch(source, /localStorage\.(get|set)Item/);
  });

  test("0 G (nebo pokles pod BET) otevře existující CreditGateModal, žádný vlastní modal systém", () => {
    assert.match(source, /import CreditGateModal from "\.\.\/\.\.\/components\/wallet\/CreditGateModal";/);
    assert.match(source, /if \(effectiveCredits < BET\) setShowCreditGate\(true\);/);
    assert.match(source, /\{showCreditGate && <CreditGateModal loggedIn=\{loggedIn\} onClose=\{[^}]+\} callbackUrl="\/skorapky" \/>\}/);
  });

  test("payout se nikde neposílá ani nepřičítá — žádné 'credits +' nebo pole payout v komponentě", () => {
    assert.doesNotMatch(source, /credits:\s*\w+\.credits\s*\+/);
    assert.doesNotMatch(source, /payout/i);
  });
});

describe("anti-race / double click", () => {
  test("HRÁT: placingBetRef zamyká synchronně PŘED prvním awaitem (ne až po něm)", () => {
    const handlePlayFn = /function handlePlay\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(handlePlayFn, /if \(placingBetRef\.current \|\| phase !== "idle"/);
    const lockIndex = handlePlayFn.indexOf("placingBetRef.current = true;");
    const asyncCallIndex = handlePlayFn.indexOf("void placeBetAndStart();");
    assert.ok(lockIndex !== -1 && asyncCallIndex !== -1 && lockIndex < asyncCallIndex);
  });

  test("wallet request má requestId guard proti zastaralé/odloučené odpovědi (reset/unmount během fetch)", () => {
    assert.match(source, /const requestId = \+\+requestIdRef\.current;/);
    assert.match(source, /if \(requestIdRef\.current !== requestId \|\| !mountedRef\.current\) return;/);
  });

  test("kelímek: selectingRef zamyká synchronně, druhý klik ve stejné fázi je no-op", () => {
    const handleSelectFn = /function handleSelectCup\(cup: CupIndex\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    const guardIndex = handleSelectFn.indexOf('if (phase !== "choosing" || selectingRef.current) return;');
    const lockIndex = handleSelectFn.indexOf("selectingRef.current = true;");
    assert.ok(guardIndex !== -1 && lockIndex !== -1 && lockIndex > guardIndex);
  });

  test("timeout cleanup v useEffect (unmount během timeoutu nikdy nespustí callback po odmountování)", () => {
    const mountEffect = /useEffect\(\(\) => \{\s*mountedRef\.current = true;[\s\S]*?\n {2}\}, \[\]\);/.exec(source)?.[0] ?? "";
    assert.match(mountEffect, /mountedRef\.current = false;/);
    assert.match(mountEffect, /if \(timeoutRef\.current !== null\) window\.clearTimeout\(timeoutRef\.current\);/);
  });

  test("scheduleTimeout vždy nejdřív zruší předchozí pending timeout (nikdy dva souběžné řetězy)", () => {
    const scheduleFn = /const scheduleTimeout = useCallback\(\(fn: \(\) => void, ms: number\) => \{[\s\S]*?\n {2}\}, \[\]\);/.exec(
      source
    )?.[0] ?? "";
    assert.match(scheduleFn, /if \(timeoutRef\.current !== null\) window\.clearTimeout\(timeoutRef\.current\);/);
    assert.match(scheduleFn, /if \(!mountedRef\.current\) return;/);
  });
});

describe("SFX", () => {
  test("napojené eventy: spin_start (HRÁT), ui_click (výběr), spin_stop (reveal), lose (prohra)", () => {
    assert.match(source, /playSfx\("spin_start"\)/);
    assert.match(source, /playSfx\("ui_click"\)/);
    assert.match(source, /playSfx\("spin_stop"\)/);
    assert.match(source, /playSfx\("lose"\)/);
  });
});

describe("HRÁT ZNOVU", () => {
  test("reset vrací state machine do idle, čistí selectedCup/revealCup/resultMessage a losuje novou ballPosition", () => {
    const fn = /function handlePlayAgain\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(fn, /setSelectedCup\(null\);/);
    assert.match(fn, /setRevealCup\(null\);/);
    assert.match(fn, /setResultMessage\(null\);/);
    assert.match(fn, /setBallPosition\(pickRandomCup\(\)\);/);
    assert.match(fn, /setPhase\("idle"\);/);
  });
});
