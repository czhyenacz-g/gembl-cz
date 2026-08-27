import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, checkNewAchievements } from "../lib/casino/achievements.ts";
import type { PlayerState } from "../lib/casino/types.ts";

function state(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    credits: 1000,
    totalSpins: 0,
    totalWagered: 0,
    totalWon: 0,
    unlockedAchievements: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("checkNewAchievements", () => {
  test("čerstvý hráč (0 spinů) nemá žádný nový achievement", () => {
    assert.deepEqual(checkNewAchievements(state()), []);
  });

  test("po prvním spinu se odemkne 'První prohra'", () => {
    const result = checkNewAchievements(state({ totalSpins: 1, totalWagered: 10 }));
    assert.deepEqual(
      result.map((a) => a.id),
      ["first-loss"]
    );
  });

  test("při totalWagered >= 100 se odemkne '100 G v tahu' (a první prohra, pokud ještě nebyla)", () => {
    const result = checkNewAchievements(state({ totalSpins: 10, totalWagered: 100 }));
    const ids = result.map((a) => a.id);
    assert.ok(ids.includes("wagered-100"));
    assert.ok(ids.includes("first-loss"));
  });

  test("už odemknuté achievementy se znovu nevrací", () => {
    const result = checkNewAchievements(
      state({ totalSpins: 1, totalWagered: 10, unlockedAchievements: ["first-loss"] })
    );
    assert.deepEqual(result, []);
  });

  test("50 spinů odemkne '50 spinů', ale ne '500 G v tahu' ani 'Profesionální smolař'", () => {
    const result = checkNewAchievements(
      state({ totalSpins: 50, totalWagered: 500, unlockedAchievements: ["first-loss", "wagered-100"] })
    );
    const ids = result.map((a) => a.id);
    assert.ok(ids.includes("spins-50"));
    assert.ok(ids.includes("wagered-500"));
    assert.ok(!ids.includes("professional-loser"));
  });

  test("100 spinů odemkne 'Profesionální smolař'", () => {
    const result = checkNewAchievements(
      state({
        totalSpins: 100,
        totalWagered: 1000,
        unlockedAchievements: ["first-loss", "wagered-100", "spins-50", "wagered-500"],
      })
    );
    assert.deepEqual(
      result.map((a) => a.id),
      ["professional-loser"]
    );
  });

  test("ACHIEVEMENTS má unikátní id a neprázdné title", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const a of ACHIEVEMENTS) {
      assert.ok(a.title.length > 0);
    }
  });
});
