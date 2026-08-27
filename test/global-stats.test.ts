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

function statsRecord(id: number, spins: number, wagered: number) {
  return {
    id,
    status: "approved",
    data: { game: "automaty", spins, wagered, won: 0, resets: 0 },
    media: [],
    created_at: "",
    updated_at: "",
  };
}

describe("reportGameStatsDelta", () => {
  test("zapisuje do collection game_stats_events", async () => {
    const calls: Call[] = [];
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return { ok: true, status: 201, json: async () => ({ data: statsRecord(1, 10, 100) }) } as Response;
    }) as typeof fetch;

    const { reportGameStatsDelta } = await import("../lib/casino/global-stats.ts");
    await reportGameStatsDelta({ game: "automaty", spins: 10, wagered: 100, won: 0, resets: 0 });

    assert.match(calls[0].url, /collections\/game_stats_events\/records/);
    const body = JSON.parse(calls[0].init!.body as string);
    assert.deepEqual(body.data, { game: "automaty", spins: 10, wagered: 100, won: 0, resets: 0 });
  });

  test("je fail-open — chyba zápisu nikdy nevyhodí (nesmí přerušit hru)", async () => {
    globalThis.fetch = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    const { reportGameStatsDelta } = await import("../lib/casino/global-stats.ts");
    await assert.doesNotReject(reportGameStatsDelta({ game: "automaty", spins: 1, wagered: 10, won: 0, resets: 0 }));
  });
});

describe("getGlobalStats", () => {
  test("sečte spins/wagered napříč všemi eventy na jedné stránce", async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [statsRecord(1, 10, 100), statsRecord(2, 5, 50)],
          meta: { current_page: 1, last_page: 1, per_page: 50, total: 2 },
        }),
      }) as Response) as typeof fetch;

    const { getGlobalStats } = await import("../lib/casino/global-stats.ts");
    const stats = await getGlobalStats();
    assert.deepEqual(stats, { totalLost: 150, totalSpins: 15 });
  });

  test("projde víc stránek a sečte je dohromady", async () => {
    let page = 0;
    globalThis.fetch = (async () => {
      page++;
      const isLast = page === 2;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [statsRecord(page, 1, 10)],
          meta: { current_page: page, last_page: 2, per_page: 50, total: 2 },
        }),
      } as Response;
    }) as typeof fetch;

    const { getGlobalStats } = await import("../lib/casino/global-stats.ts");
    const stats = await getGlobalStats();
    assert.deepEqual(stats, { totalLost: 20, totalSpins: 2 });
    assert.equal(page, 2);
  });

  test("výpadek UCA vrátí null, nikdy nevyhodí", async () => {
    globalThis.fetch = (async () => {
      throw new Error("boom");
    }) as typeof fetch;
    const { getGlobalStats } = await import("../lib/casino/global-stats.ts");
    assert.equal(await getGlobalStats(), null);
  });

  test("žádné eventy -> totalSpins 0, totalLost 0 (ne null)", async () => {
    globalThis.fetch = (async () =>
      ({ ok: true, status: 200, json: async () => ({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 } }) }) as Response) as typeof fetch;
    const { getGlobalStats } = await import("../lib/casino/global-stats.ts");
    assert.deepEqual(await getGlobalStats(), { totalLost: 0, totalSpins: 0 });
  });
});
