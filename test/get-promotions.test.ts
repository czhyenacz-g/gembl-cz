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
    return { ok: true, status: 200, json: async () => body } as Response;
  }) as typeof fetch;
  return calls;
}

function record(id: number, data: Record<string, unknown>, withMedia = false) {
  return {
    id,
    status: "approved",
    data,
    media: withMedia
      ? [{ id: id * 10, public_url: `https://x/media/${id * 10}`, original_filename: "a.webp", mime_type: "image/webp", size_bytes: 1, width: 1200, height: 300, created_at: "" }]
      : [],
    created_at: "2026-01-01T00:00:00+00:00",
    updated_at: "",
  };
}

describe("getActivePromotions", () => {
  test("posílá filter[placement]=... server-side (nefiltruje jen klientsky)", async () => {
    const calls = mockFetchOnce({ data: [] });
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    await getActivePromotions("homepage_top");

    assert.match(calls[0].url, /filter%5Bplacement%5D=homepage_top|filter\[placement\]=homepage_top/);
    assert.match(calls[0].url, /status=approved/);
  });

  test("mapuje affiliate_key, weight a obrázek (poslední médium)", async () => {
    const calls = mockFetchOnce({
      data: [
        record(1, { placement: "homepage_top", page_pattern: "*", title: "T", active: true, weight: 6, href: "https://x", affiliate_key: "gembl_banner_monitor" }, true),
      ],
    });
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    const promotions = await getActivePromotions("homepage_top");

    assert.equal(promotions.length, 1);
    assert.equal(promotions[0].affiliateKey, "gembl_banner_monitor");
    assert.equal(promotions[0].weight, 6);
    assert.ok(promotions[0].imageUrl);
    void calls;
  });

  test("promotion bez active:true se přeskočí", async () => {
    mockFetchOnce({ data: [record(1, { placement: "homepage_top", page_pattern: "*", title: "T", active: false, weight: 1 }, true)] });
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    assert.deepEqual(await getActivePromotions("homepage_top"), []);
  });

  test("neplatný placement (mimo whitelist) se přeskočí", async () => {
    mockFetchOnce({ data: [record(1, { placement: "carousel", page_pattern: "*", title: "T", active: true, weight: 1 }, true)] });
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    assert.deepEqual(await getActivePromotions("homepage_top"), []);
  });

  test("mimo validity okno (valid_until v minulosti) se přeskočí", async () => {
    mockFetchOnce({
      data: [
        record(1, {
          placement: "homepage_top",
          page_pattern: "*",
          title: "Expired",
          active: true,
          weight: 1,
          valid_until: "2020-01-01T00:00:00+00:00",
        }, true),
      ],
    });
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    assert.deepEqual(await getActivePromotions("homepage_top", Date.parse("2026-06-01T00:00:00Z")), []);
  });

  test("před valid_from se přeskočí, po valid_from se zobrazí", async () => {
    mockFetchOnce({
      data: [
        record(1, {
          placement: "homepage_top",
          page_pattern: "*",
          title: "Future",
          active: true,
          weight: 1,
          valid_from: "2026-06-01T00:00:00+00:00",
        }, true),
      ],
    });
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    assert.equal((await getActivePromotions("homepage_top", Date.parse("2026-01-01T00:00:00Z"))).length, 0);
    assert.equal((await getActivePromotions("homepage_top", Date.parse("2026-07-01T00:00:00Z"))).length, 1);
  });

  test("bez valid_from/valid_until je promotion platná vždy", async () => {
    mockFetchOnce({ data: [record(1, { placement: "homepage_top", page_pattern: "*", title: "T", active: true, weight: 1 }, true)] });
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    assert.equal((await getActivePromotions("homepage_top")).length, 1);
  });

  test("výpadek UCA se nikdy nepropaguje jako neošetřená chyba", async () => {
    globalThis.fetch = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    const { getActivePromotions } = await import("../lib/promotions/get-promotions.ts");
    assert.deepEqual(await getActivePromotions("homepage_top"), []);
  });
});
