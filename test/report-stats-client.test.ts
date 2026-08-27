import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { reportGameStatsDeltaClient } from "../lib/casino/report-stats-client.ts";

const originalNavigator = globalThis.navigator;
const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.defineProperty(globalThis, "navigator", { value: originalNavigator, configurable: true });
  globalThis.fetch = originalFetch;
});

describe("reportGameStatsDeltaClient", () => {
  test("preferuje navigator.sendBeacon, když je k dispozici a uspěje", () => {
    let beaconCalled = false;
    let beaconUrl = "";
    let fetchCalled = false;

    Object.defineProperty(globalThis, "navigator", {
      value: { sendBeacon: (url: string) => { beaconCalled = true; beaconUrl = url; return true; } },
      configurable: true,
    });
    globalThis.fetch = (async () => { fetchCalled = true; return {} as Response; }) as typeof fetch;

    reportGameStatsDeltaClient({ game: "automaty", spins: 10, wagered: 100, won: 0, resets: 0 });

    assert.equal(beaconCalled, true);
    assert.equal(beaconUrl, "/api/game-stats");
    assert.equal(fetchCalled, false);
  });

  test("padne zpátky na fetch(keepalive), když sendBeacon selže (vrátí false)", () => {
    let fetchCalled = false;
    let fetchBody = "";

    Object.defineProperty(globalThis, "navigator", {
      value: { sendBeacon: () => false },
      configurable: true,
    });
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      fetchCalled = true;
      fetchBody = init?.body as string;
      return {} as Response;
    }) as typeof fetch;

    reportGameStatsDeltaClient({ game: "automaty", spins: 5, wagered: 50, won: 0, resets: 1 });

    assert.equal(fetchCalled, true);
    assert.deepEqual(JSON.parse(fetchBody), { game: "automaty", spins: 5, wagered: 50, won: 0, resets: 1 });
  });

  test("padne zpátky na fetch, když navigator.sendBeacon vůbec neexistuje", () => {
    let fetchCalled = false;
    Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
    globalThis.fetch = (async () => { fetchCalled = true; return {} as Response; }) as typeof fetch;

    reportGameStatsDeltaClient({ game: "automaty", spins: 1, wagered: 10, won: 0, resets: 0 });
    assert.equal(fetchCalled, true);
  });

  test("nikdy nevyhodí, i když sendBeacon i fetch selžou (fail-open)", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { sendBeacon: () => { throw new Error("boom"); } },
      configurable: true,
    });
    assert.doesNotThrow(() => reportGameStatsDeltaClient({ game: "automaty", spins: 1, wagered: 10, won: 0, resets: 0 }));
  });
});
