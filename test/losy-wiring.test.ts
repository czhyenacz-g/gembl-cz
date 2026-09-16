import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// "use client" + timery/DOM/canvas — zdrojová kontrola, stejný vzor jako
// test/skorapky-wiring.test.ts (žádný DOM test harness v tomhle
// starteru). Čistá herní logika je testovaná přímo v
// test/losy-engine.test.ts a test/scratch-sampling.test.ts.
const source = readFileSync(fileURLToPath(new URL("../app/(site)/losy/ScratchCard.tsx", import.meta.url)), "utf8");

test("ScratchCard.tsx: je 'use client'", () => {
  const firstLine = source.trimStart().split("\n")[0];
  assert.match(firstLine, /^["']use client["']/);
});

describe("state machine", () => {
  test("state je jeden ScratchTicketPhase z lib/losy/types.ts, ne sada booleanů", () => {
    assert.match(source, /import type \{ ScratchResult, ScratchTicketPhase \} from "\.\.\/\.\.\/\.\.\/lib\/losy\/types\.ts"/);
    assert.match(source, /const \[phase, setPhase\] = useState<ScratchTicketPhase>\("idle"\);/);
  });

  test("idle: cena losu je TICKET_PRICE = MIN_BET ze sdíleného site configu, ne vlastní zadrátovaná konstanta", () => {
    assert.match(source, /import \{ MIN_BET \} from "\.\.\/\.\.\/config\/site\.ts"/);
    assert.match(source, /const TICKET_PRICE = MIN_BET;/);
  });

  test("purchasing: HRÁT/koupit se blokuje synchronně přes purchasingRef PŘED prvním awaitem", () => {
    const handleBuyFn = /function handleBuy\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(handleBuyFn, /if \(purchasingRef\.current \|\| phase !== "idle"/);
    const lockIndex = handleBuyFn.indexOf("purchasingRef.current = true;");
    const asyncCallIndex = handleBuyFn.indexOf("void purchaseAndStart();");
    assert.ok(lockIndex !== -1 && asyncCallIndex !== -1 && lockIndex < asyncCallIndex);
  });

  test("scratching: výsledek se vygeneruje HNED po úspěšném nákupu (generateScratchResult), stírání ho jen odkrývá", () => {
    assert.match(source, /import \{ generateScratchResult, SYMBOL_DISPLAY \} from "\.\.\/\.\.\/\.\.\/lib\/losy\/engine\.ts"/);
    const startFn = /function startScratching\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(startFn, /setTicketResult\(generateScratchResult\(\)\);/);
    assert.match(startFn, /setPhase\("scratching"\);/);
  });

  test("revealing: fade-out + krátký delay PŘED přechodem do result, ne okamžitě", () => {
    const fn = /function handleThresholdReached\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(fn, /if \(phase !== "scratching"\) return;/);
    assert.match(fn, /setPhase\("revealing"\);/);
    assert.match(fn, /scheduleTimeout\(\(\) => \{\s*setPhase\("result"\);/);
    assert.match(fn, /\}, REVEAL_FADE_MS \+ REVEAL_RESULT_DELAY_MS\);/);
  });

  test("result: hláška se vybírá podle matchType přes pickScratchMessage z lib/losy/messages.ts", () => {
    assert.match(source, /import \{ pickScratchMessage \} from "\.\.\/\.\.\/\.\.\/lib\/losy\/messages\.ts"/);
    assert.match(source, /pickScratchMessage\(ticketResult\.matchType\)/);
  });
});

describe("wallet — server je vždy autoritativní zdroj pravdy", () => {
  test("přihlášený hráč: nákup jde přes POST /api/wallet/bet s game: 'losy', ne přímý zápis credits", () => {
    const fn = /async function purchaseAndStart\(\)[\s\S]*$/.exec(source)?.[0] ?? "";
    assert.match(fn, /fetch\("\/api\/wallet\/bet", \{/);
    assert.match(fn, /body: JSON\.stringify\(\{ game: "losy", bet: TICKET_PRICE \}\)/);
  });

  test("host (nepřihlášený): odečet jde přes savePlayerState ze sdíleného storage.ts, ne přes localStorage přímo ani vlastní wallet modul", () => {
    assert.match(source, /import \{ loadPlayerState, savePlayerState \} from "\.\.\/\.\.\/\.\.\/lib\/casino\/storage\.ts"/);
    assert.match(source, /savePlayerState\(updated\);/);
    assert.doesNotMatch(source, /localStorage\.(get|set)Item/);
  });

  test("0 G (nebo pokles pod TICKET_PRICE) otevře existující CreditGateModal, žádný vlastní modal systém", () => {
    assert.match(source, /import CreditGateModal from "\.\.\/\.\.\/components\/wallet\/CreditGateModal";/);
    assert.match(source, /if \(effectiveCredits < TICKET_PRICE\) setShowCreditGate\(true\);/);
    assert.match(source, /\{showCreditGate && <CreditGateModal loggedIn=\{loggedIn\} onClose=\{[^}]+\} callbackUrl="\/losy" \/>\}/);
  });

  test("nákup se neodečítá dřív, než při dalším nákupu — KOUPIT DALŠÍ LOS jen resetuje do idle, nevolá purchaseAndStart", () => {
    const fn = /function handleBuyAnother\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.doesNotMatch(fn, /purchaseAndStart/);
    assert.match(fn, /setPhase\("idle"\);/);
  });

  test("payout se nikde neposílá ani nepřičítá", () => {
    assert.doesNotMatch(source, /credits:\s*\w+\.credits\s*\+/);
    assert.doesNotMatch(source, /payout/i);
  });
});

describe("anti-race / double click", () => {
  test("wallet request má requestId guard proti zastaralé/odloučené odpovědi (reset/unmount během fetch)", () => {
    assert.match(source, /const requestId = \+\+requestIdRef\.current;/);
    assert.match(source, /if \(requestIdRef\.current !== requestId \|\| !mountedRef\.current\) return;/);
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

  test("nový los = nová ScratchLayer instance přes key={roundKey}, ne ruční reset canvasu", () => {
    assert.match(source, /setRoundKey\(\(key\) => key \+ 1\);/);
    assert.match(source, /<ScratchLayer\s*\n\s*key=\{roundKey\}/);
  });
});

describe("SFX", () => {
  test("napojené eventy: ui_click (koupě), spin_stop (reveal), lose (výsledek)", () => {
    assert.match(source, /playSfx\("ui_click"\)/);
    assert.match(source, /playSfx\("spin_stop"\)/);
    assert.match(source, /playSfx\("lose"\)/);
  });
});

describe("ScratchLayer.tsx — canvas stírací vrstva", () => {
  const layerSource = readFileSync(fileURLToPath(new URL("../app/(site)/losy/ScratchLayer.tsx", import.meta.url)), "utf8");

  test("je 'use client'", () => {
    const firstLine = layerSource.trimStart().split("\n")[0];
    assert.match(firstLine, /^["']use client["']/);
  });

  test("maže přes destination-out (ne přemalování), pointerdown/move/up jsou napojené", () => {
    assert.match(layerSource, /ctx\.globalCompositeOperation = "destination-out";/);
    assert.match(layerSource, /onPointerDown=\{handlePointerDown\}/);
    assert.match(layerSource, /onPointerMove=\{handlePointerMove\}/);
    assert.match(layerSource, /onPointerUp=\{handlePointerUp\}/);
  });

  test("progress se počítá throttlovaně (jen každý N-tý pointermove), přes measureScratchedRatio z lib/losy/scratch-sampling.ts", () => {
    assert.match(
      layerSource,
      /import \{\s*isScratchThresholdReached,\s*measureScratchedRatio,\s*SYMBOL_CELLS,\s*SYMBOL_REVEAL_RATIO,\s*\} from "\.\.\/\.\.\/\.\.\/lib\/losy\/scratch-sampling\.ts"/
    );
    assert.match(layerSource, /moveCountRef\.current % PROGRESS_CHECK_EVERY_N_MOVES === 0/);
  });

  test("onThresholdReached se zavolá nejvýš jednou (thresholdReachedRef guard)", () => {
    const checkFn = /function checkProgress\(\)[\s\S]*?\n {2}\}\n/.exec(layerSource)?.[0] ?? "";
    assert.match(checkFn, /if \(!canvas \|\| !ctx \|\| thresholdReachedRef\.current\) return;/);
    assert.match(checkFn, /thresholdReachedRef\.current = true;/);
  });

  test("neaktivní stav (mimo scratching) blokuje pointer handlery přes ref, ne jen přes prop", () => {
    assert.match(layerSource, /if \(!activeRef\.current\) return;/);
    assert.match(layerSource, /if \(!activeRef\.current \|\| !isPointerDownRef\.current\) return;/);
  });
});
