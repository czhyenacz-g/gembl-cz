import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { UcaPaginatedResponse, UcaRecord } from "../lib/uca/types.ts";

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

function mockJsonFetch(body: unknown) {
  globalThis.fetch = (async () =>
    ({
      ok: true,
      status: 200,
      json: async () => body,
    }) as Response) as typeof fetch;
}

function makeRecord(overrides: Partial<UcaRecord["data"]> & { id: number }): UcaRecord {
  const { id, ...data } = overrides;
  return {
    id,
    status: "approved",
    data,
    media: [],
    created_at: `2026-01-0${id}T00:00:00Z`,
    updated_at: `2026-01-0${id}T00:00:00Z`,
  };
}

describe("assets", () => {
  test("getLatestAsset vybere první asset ze seznamu (nejnovější první)", async () => {
    const records: UcaRecord[] = [
      makeRecord({ id: 2, title: "Novější asset", tags: ["a"] }),
      makeRecord({ id: 1, title: "Starší asset", tags: ["a"] }),
    ];
    mockJsonFetch({ data: records } satisfies UcaPaginatedResponse<UcaRecord>);

    const { getLatestAsset } = await import("../lib/assets/get-assets.ts");
    const latest = await getLatestAsset();
    assert.equal(latest?.id, "2");
    assert.equal(latest?.title, "Novější asset");
  });

  test("getLatestAsset vrátí null, když nejsou žádné assety", async () => {
    mockJsonFetch({ data: [] } satisfies UcaPaginatedResponse<UcaRecord>);

    const { getLatestAsset } = await import("../lib/assets/get-assets.ts");
    assert.equal(await getLatestAsset(), null);
  });

  test("getAssetsByTag filtruje case-insensitive podle tagu", async () => {
    const records: UcaRecord[] = [
      makeRecord({ id: 1, title: "S tagem", tags: ["Léto"] }),
      makeRecord({ id: 2, title: "Bez tagu", tags: ["zima"] }),
    ];
    mockJsonFetch({ data: records } satisfies UcaPaginatedResponse<UcaRecord>);

    const { getAssetsByTag } = await import("../lib/assets/get-assets.ts");
    const matched = await getAssetsByTag("léto");
    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, "1");
  });
});
