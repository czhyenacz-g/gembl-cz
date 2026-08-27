import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialPlayerState,
  loadPlayerState,
  resetPlayerState,
  savePlayerState,
  subscribePlayerState,
} from "../lib/casino/storage.ts";
import { STARTING_CREDITS } from "../app/config/site.ts";

class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

function withFakeLocalStorage<T>(run: (storage: FakeStorage) => T): T {
  const storage = new FakeStorage();
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  // @ts-expect-error test fake, not a real Storage instance
  globalThis.localStorage = storage;
  try {
    return run(storage);
  } finally {
    // @ts-expect-error restoring possibly-undefined original
    globalThis.localStorage = original;
  }
}

describe("createInitialPlayerState", () => {
  test("začíná na STARTING_CREDITS, nulové statistiky, žádné achievementy", () => {
    const s = createInitialPlayerState();
    assert.equal(s.credits, STARTING_CREDITS);
    assert.equal(s.totalSpins, 0);
    assert.equal(s.totalWagered, 0);
    assert.equal(s.totalWon, 0);
    assert.deepEqual(s.unlockedAchievements, []);
    assert.equal(typeof s.createdAt, "string");
  });
});

describe("loadPlayerState", () => {
  test("bez globalThis.localStorage (SSR) vrátí čerstvý stav, nespadne", () => {
    const original = (globalThis as { localStorage?: unknown }).localStorage;
    delete (globalThis as { localStorage?: unknown }).localStorage;
    try {
      const s = loadPlayerState();
      assert.equal(s.credits, STARTING_CREDITS);
    } finally {
      if (original) (globalThis as { localStorage?: unknown }).localStorage = original;
    }
  });

  test("bez uloženého záznamu vrátí čerstvý stav", () => {
    withFakeLocalStorage(() => {
      const s = loadPlayerState();
      assert.equal(s.credits, STARTING_CREDITS);
    });
  });

  test("uložený stav se přesně načte zpět (round-trip)", () => {
    withFakeLocalStorage(() => {
      const saved = { ...createInitialPlayerState(), credits: 870, totalSpins: 13, totalWagered: 130 };
      savePlayerState(saved);
      const loaded = loadPlayerState();
      assert.deepEqual(loaded, saved);
    });
  });

  test("poškozený JSON v localStorage vrátí čerstvý stav, nespadne", () => {
    withFakeLocalStorage((storage) => {
      storage.setItem("gembl:player-state", "{ not valid json");
      const s = loadPlayerState();
      assert.equal(s.credits, STARTING_CREDITS);
    });
  });

  test("neplatný tvar (chybí pole) vrátí čerstvý stav, nespadne", () => {
    withFakeLocalStorage((storage) => {
      storage.setItem("gembl:player-state", JSON.stringify({ credits: "not-a-number" }));
      const s = loadPlayerState();
      assert.equal(s.credits, STARTING_CREDITS);
    });
  });
});

describe("savePlayerState", () => {
  test("bez localStorage tiše no-opne, nespadne", () => {
    const original = (globalThis as { localStorage?: unknown }).localStorage;
    delete (globalThis as { localStorage?: unknown }).localStorage;
    try {
      assert.doesNotThrow(() => savePlayerState(createInitialPlayerState()));
    } finally {
      if (original) (globalThis as { localStorage?: unknown }).localStorage = original;
    }
  });
});

describe("subscribePlayerState", () => {
  test("listener se zavolá při savePlayerState (BalanceBadge se přepočítá bez ohledu na to, kdo stav změnil)", () => {
    withFakeLocalStorage(() => {
      let calls = 0;
      const unsubscribe = subscribePlayerState(() => {
        calls++;
      });
      savePlayerState(createInitialPlayerState());
      assert.equal(calls, 1);
      unsubscribe();
    });
  });

  test("listener se zavolá i při resetPlayerState", () => {
    withFakeLocalStorage(() => {
      let calls = 0;
      const unsubscribe = subscribePlayerState(() => {
        calls++;
      });
      resetPlayerState();
      assert.equal(calls, 1);
      unsubscribe();
    });
  });

  test("unsubscribe skutečně přestane volat listener", () => {
    withFakeLocalStorage(() => {
      let calls = 0;
      const unsubscribe = subscribePlayerState(() => {
        calls++;
      });
      unsubscribe();
      savePlayerState(createInitialPlayerState());
      assert.equal(calls, 0);
    });
  });
});

describe("resetPlayerState", () => {
  test("vrátí čerstvý stav A rovnou ho uloží (další loadPlayerState ho vidí)", () => {
    withFakeLocalStorage(() => {
      savePlayerState({ ...createInitialPlayerState(), credits: 5, totalSpins: 999 });
      const reset = resetPlayerState();
      assert.equal(reset.credits, STARTING_CREDITS);
      assert.equal(loadPlayerState().credits, STARTING_CREDITS);
      assert.equal(loadPlayerState().totalSpins, 0);
    });
  });
});
