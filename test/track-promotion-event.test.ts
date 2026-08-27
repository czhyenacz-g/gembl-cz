import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const ENV = { UCA_BASE_URL: "https://content-api.example.test", UCA_PROJECT_SLUG: "gembl", UCA_API_TOKEN: "secret" };
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

function mockFetchOnce(body: unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return { ok: true, status: 201, json: async () => body } as Response;
  }) as typeof fetch;
  return calls;
}

describe("trackPromotionEvent", () => {
  test("zapisuje do collection promotion_events s promotion_id a type", async () => {
    const calls = mockFetchOnce({ data: { id: 1, status: "approved", data: {}, media: [], created_at: "", updated_at: "" } });
    const { trackPromotionEvent } = await import("../lib/promotions/track-promotion-event.ts");
    await trackPromotionEvent("42", "click");

    assert.match(calls[0].url, /collections\/promotion_events\/records/);
    const body = JSON.parse(calls[0].init!.body as string);
    assert.deepEqual(body.data, { promotion_id: "42", type: "click" });
  });

  test("je fail-open — chyba zápisu nikdy nevyhodí", async () => {
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    const { trackPromotionEvent } = await import("../lib/promotions/track-promotion-event.ts");
    await assert.doesNotReject(trackPromotionEvent("1", "impression"));
  });
});
