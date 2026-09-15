import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// "use client" + JSX — zdrojová kontrola, stejný vzor jako
// test/slot-machine-wiring.test.ts (žádný DOM test harness v tomhle
// starteru).
const teaserSource = readFileSync(fileURLToPath(new URL("../app/(site)/casino/stage/SlotTeaser.tsx", import.meta.url)), "utf8");
const stageSource = readFileSync(fileURLToPath(new URL("../app/(site)/casino/stage/ClassicCasinoStage.tsx", import.meta.url)), "utf8");

describe("SlotTeaser.tsx — /casino je jen vizuální teaser, žádná druhá plnohodnotná hra", () => {
  test("nevolá žádný fetch (žádný wallet spin/bet request)", () => {
    assert.doesNotMatch(teaserSource, /fetch\(/);
    assert.doesNotMatch(teaserSource, /\/api\/wallet/);
  });

  test("nečte ani nezapisuje localStorage/player state (žádné odečítání G na homepage)", () => {
    assert.doesNotMatch(teaserSource, /localStorage/);
    assert.doesNotMatch(teaserSource, /savePlayerState|loadPlayerState/);
  });

  test("nepoužívá žádný herní engine (spin/slot-engine) ani stats reporting — čistě prezentační", () => {
    assert.doesNotMatch(teaserSource, /slot-engine/);
    assert.doesNotMatch(teaserSource, /reportGameStatsDeltaClient/);
  });

  test("nemá žádný useState/useEffect — žádný interní herní stav, jen statický odkaz", () => {
    assert.doesNotMatch(teaserSource, /useState|useEffect/);
  });

  test("CTA vede na /automaty přes next/link Link (client-side navigace podle současné architektury)", () => {
    assert.match(teaserSource, /import Link from "next\/link";/);
    assert.match(teaserSource, /<Link\s*\n\s*href="\/automaty"/);
    assert.match(teaserSource, /HRÁT AUTOMATY/);
  });

  test("žádné bet/stake controls (+/-, sázka) v teaseru", () => {
    assert.doesNotMatch(teaserSource, /adjustBet|BET_STEP|Sázka/);
  });
});

describe("ClassicCasinoStage.tsx — embedded SlotMachine nahrazený teaserem", () => {
  test("už neimportuje ani nerenderuje SlotMachine (skutečná hra zůstává jen na /automaty)", () => {
    assert.doesNotMatch(stageSource, /from "\.\.\/\.\.\/automaty\/SlotMachine/);
    assert.doesNotMatch(stageSource, /<SlotMachine/);
  });

  test("renderuje SlotTeaser místo toho", () => {
    assert.match(stageSource, /import SlotTeaser from "\.\/SlotTeaser\.tsx";/);
    assert.match(stageSource, /<SlotTeaser layout=\{skin\.layout\.slot\} \/>/);
  });

  test("žádný auto credit-gate na /casino stage (ten patřil jen k embedded automatu, který je pryč)", () => {
    // Komentáře smí "credit-gate" zmiňovat jako vysvětlení, proč tady žádný
    // není — kód sám ale žádný credit-gate stav/import mít nesmí. Stejný vzor
    // jako test/welcome-prize-popup.test.ts (taky povoluje zmínku v komentáři).
    assert.doesNotMatch(stageSource, /kind: "credit-gate"/);
    assert.doesNotMatch(stageSource, /CreditGateModal/);
  });
});
