import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Pouze čisté helpery bez env proměnných — žádné reálné API volání (viz
// CLAUDE.md/task: "pouze unit testy pro čisté helpery, žádné reálné API
// call testy"). Každý provider musí bez nastavených proměnných vrátit
// status "not-configured" a NEsmí se pokusit zavolat fetch.
const ENV_KEYS = ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "YOUTUBE_API_KEY", "KICK_CLIENT_ID", "KICK_CLIENT_SECRET"];
const originalEnv: Record<string, string | undefined> = {};
const originalFetch = globalThis.fetch;

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
  // Kdyby provider přesto zavolal fetch, test to odhalí pádem.
  globalThis.fetch = (async () => {
    throw new Error("fetch by se nemělo volat, když provider není nakonfigurovaný");
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("stream providers — not-configured stav bez volání API", () => {
  test("Twitch bez env vrátí not-configured", async () => {
    const { getTwitchStreams } = await import("../features/streams/twitch.ts");
    const result = await getTwitchStreams("Some Game");
    assert.deepEqual(result, { platform: "twitch", status: "not-configured", streams: [] });
  });

  test("YouTube bez env vrátí not-configured", async () => {
    const { getYouTubeStreams } = await import("../features/streams/youtube.ts");
    const result = await getYouTubeStreams("Some Game");
    assert.deepEqual(result, { platform: "youtube", status: "not-configured", streams: [] });
  });

  test("Kick bez env vrátí not-configured", async () => {
    const { getKickStreams } = await import("../features/streams/kick.ts");
    const result = await getKickStreams("Some Category");
    assert.deepEqual(result, { platform: "kick", status: "not-configured", streams: [] });
  });
});
