import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isScratchThresholdReached, measureScratchedRatio, SCRATCH_THRESHOLD_RATIO } from "../lib/losy/scratch-sampling.ts";

describe("measureScratchedRatio — čistá logika bez skutečného canvasu", () => {
  test("nic setřeno (samá neprůhledná alpha) -> ratio 0", () => {
    const ratio = measureScratchedRatio(320, 140, () => 255);
    assert.equal(ratio, 0);
  });

  test("úplně setřeno (samá průhledná alpha) -> ratio 1", () => {
    const ratio = measureScratchedRatio(320, 140, () => 0);
    assert.equal(ratio, 1);
  });

  test("levá polovina setřená -> ratio ~0.5", () => {
    const ratio = measureScratchedRatio(320, 140, (x) => (x < 160 ? 0 : 255));
    assert.ok(ratio > 0.4 && ratio < 0.6, `ratio = ${ratio}, čekáno ~0.5`);
  });

  test("nulové rozměry se nezacyklí a vrátí 0", () => {
    assert.equal(measureScratchedRatio(0, 0, () => 0), 0);
  });
});

describe("isScratchThresholdReached", () => {
  test("false pod prahem, true na/nad prahem (SCRATCH_THRESHOLD_RATIO)", () => {
    assert.equal(isScratchThresholdReached(SCRATCH_THRESHOLD_RATIO - 0.01), false);
    assert.equal(isScratchThresholdReached(SCRATCH_THRESHOLD_RATIO), true);
    assert.equal(isScratchThresholdReached(1), true);
  });

  test("práh leží v zadaném rozsahu 55-65 % (např. 60 %)", () => {
    assert.ok(SCRATCH_THRESHOLD_RATIO >= 0.55 && SCRATCH_THRESHOLD_RATIO <= 0.65);
  });
});
