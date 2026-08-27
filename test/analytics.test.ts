import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const ENV = { UCA_BASE_URL: "https://content-api.darbujan.com", UCA_PROJECT_SLUG: "my-project", UCA_API_TOKEN: "secret" };
const originalFetch = globalThis.fetch;
const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of Object.keys(ENV)) originalEnv[key] = process.env[key];
  Object.assign(process.env, ENV);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

type Call = { url: string; init?: RequestInit };

function mockFetchSequence(responses: unknown[]): Call[] {
  const calls: Call[] = [];
  let i = 0;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const body = responses[Math.min(i, responses.length - 1)];
    i++;
    return { ok: true, status: 200, json: async () => body } as Response;
  }) as typeof fetch;
  return calls;
}

describe("trackEvent", () => {
  test("zapisuje do collection 'analytics_events' ve výchozím stavu", async () => {
    const calls = mockFetchSequence([{ data: { id: 1, status: "pending", data: {}, media: [], created_at: "", updated_at: "" } }]);

    const { trackEvent } = await import("../lib/analytics/track-event.ts");
    await trackEvent({ event: "page_view", path: "/" });

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/collections\/analytics_events\/records/);
    const sentBody = JSON.parse(calls[0].init!.body as string);
    assert.equal(sentBody.data.event, "page_view");
    assert.equal(sentBody.data.path, "/");
    assert.equal(sentBody.data.steam_id, null);
    assert.equal(sentBody.data.anonymous_id, null);
    assert.deepEqual(sentBody.data.metadata, {});
  });

  test("collection lze přepsat", async () => {
    const calls = mockFetchSequence([{ data: { id: 1, status: "pending", data: {}, media: [], created_at: "", updated_at: "" } }]);

    const { trackEvent } = await import("../lib/analytics/track-event.ts");
    await trackEvent({ event: "custom", collection: "my_events" });

    assert.match(calls[0].url, /\/collections\/my_events\/records/);
  });

  test("je fail-open — chyba zápisu (fetch throws) nespadne, jen se zaloguje", async () => {
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;

    const { trackEvent } = await import("../lib/analytics/track-event.ts");
    await assert.doesNotReject(trackEvent({ event: "page_view" }));
  });
});

describe("getOrCreateAnonymousId", () => {
  test("bez globalThis.localStorage (SSR) vrátí null, nespadne", async () => {
    const original = (globalThis as { localStorage?: Storage }).localStorage;
    delete (globalThis as { localStorage?: Storage }).localStorage;

    try {
      const { getOrCreateAnonymousId } = await import("../lib/analytics/anonymous-id.ts");
      assert.equal(getOrCreateAnonymousId(), null);
    } finally {
      if (original) (globalThis as { localStorage?: Storage }).localStorage = original;
    }
  });

  test("s localStorage vygeneruje a persistuje ID, opakované volání vrátí to samé", async () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;

    try {
      const { getOrCreateAnonymousId } = await import("../lib/analytics/anonymous-id.ts");
      const first = getOrCreateAnonymousId();
      const second = getOrCreateAnonymousId();
      assert.ok(first);
      assert.equal(first, second);
    } finally {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
  });
});

describe("isRateLimited", () => {
  test("povolí do MAX_PER_WINDOW volání, pak limituje", async () => {
    const { isRateLimited } = await import("../lib/analytics/rate-limit.ts");
    const key = `test-key-${Math.random()}`;
    const now = Date.now();

    for (let i = 0; i < 60; i++) {
      assert.equal(isRateLimited(key, now), false, `volání ${i} nemělo být limitované`);
    }
    assert.equal(isRateLimited(key, now), true);
  });

  test("mimo okno (60s) se počítadlo resetuje", async () => {
    const { isRateLimited } = await import("../lib/analytics/rate-limit.ts");
    const key = `test-key-window-${Math.random()}`;
    const now = Date.now();

    for (let i = 0; i < 60; i++) isRateLimited(key, now);
    assert.equal(isRateLimited(key, now), true);
    assert.equal(isRateLimited(key, now + 61_000), false);
  });
});
