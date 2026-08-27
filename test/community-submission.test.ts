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

describe("createCommunitySubmission", () => {
  test("nikdy sama neposílá pole 'status' — spoléhá se, že ho vynutí server", async () => {
    const calls = mockFetchSequence([{ data: { id: 1, status: "pending", data: {}, media: [], created_at: "", updated_at: "" } }]);

    const { createCommunitySubmission } = await import("../lib/community/create-submission.ts");
    await createCommunitySubmission({ collection: "fish-suggestions", data: { name: "Kapr", weightKg: 3.2 } });

    assert.equal(calls.length, 1);
    const sentBody = JSON.parse(calls[0].init!.body as string);
    assert.deepEqual(Object.keys(sentBody), ["data"]);
    assert.equal(sentBody.status, undefined);
  });

  test("data payload je generický — funguje pro libovolnou doménu/kolekci beze změny helperu", async () => {
    const calls = mockFetchSequence([{ data: { id: 42, status: "pending", data: {}, media: [], created_at: "", updated_at: "" } }]);

    const { createCommunitySubmission } = await import("../lib/community/create-submission.ts");
    const result = await createCommunitySubmission({
      collection: "boss-suggestions",
      data: { bossName: "Drakolisk", location: "Jeskyně", steamId: "76561198000000000" },
    });

    assert.equal(result.recordId, 42);
    assert.equal(result.media, null);
    const sentBody = JSON.parse(calls[0].init!.body as string);
    assert.deepEqual(sentBody.data, { bossName: "Drakolisk", location: "Jeskyně", steamId: "76561198000000000" });
  });

  test("s médiem nahraje soubor a naváže ho na vytvořený record_id", async () => {
    const calls = mockFetchSequence([
      { data: { id: 7, status: "pending", data: {}, media: [], created_at: "", updated_at: "" } },
      { data: { id: 99, record_id: 7, public_url: "https://example.com/x.webp", original_filename: "x.webp", mime_type: "image/webp", size_bytes: 10, width: null, height: null, created_at: "" } },
    ]);

    const { createCommunitySubmission } = await import("../lib/community/create-submission.ts");
    const file = new File(["hello"], "x.webp", { type: "image/webp" });
    const result = await createCommunitySubmission({ collection: "catches", data: { note: "test" }, media: file });

    assert.equal(calls.length, 2);
    assert.equal(result.media?.public_url, "https://example.com/x.webp");
    const uploadForm = calls[1].init!.body as FormData;
    assert.equal(uploadForm.get("record_id"), "7");
  });
});
