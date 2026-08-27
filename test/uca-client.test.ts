import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Uloží a po testu obnoví env, aby test neovlivnil ostatní soubory sdílející
// stejný proces (node --test spouští soubory v jednom procesu).
function withEnv<T>(vars: Record<string, string | undefined>, run: () => T): T {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) previous[key] = process.env[key];
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("uca client — URL building", () => {
  test("recordsPath sestaví správnou cestu vč. project slugu a collection", async () => {
    const { recordsPath } = await import("../lib/uca/client.ts");
    withEnv(
      { UCA_BASE_URL: "https://content-api.darbujan.com", UCA_PROJECT_SLUG: "my-project", UCA_API_TOKEN: "secret" },
      () => {
        assert.equal(recordsPath("assets"), "/api/v1/projects/my-project/collections/assets/records");
        assert.equal(recordsPath("assets", "/42"), "/api/v1/projects/my-project/collections/assets/records/42");
        assert.equal(
          recordsPath("assets", "?status=approved"),
          "/api/v1/projects/my-project/collections/assets/records?status=approved"
        );
      }
    );
  });

  test("mediaPath sestaví správnou cestu", async () => {
    const { mediaPath } = await import("../lib/uca/client.ts");
    withEnv(
      { UCA_BASE_URL: "https://content-api.darbujan.com", UCA_PROJECT_SLUG: "my-project", UCA_API_TOKEN: "secret" },
      () => {
        assert.equal(mediaPath(), "/api/v1/projects/my-project/media");
      }
    );
  });
});

describe("uca client — error handling", () => {
  test("chybějící env proměnné vyhodí UcaError místo pádu", async () => {
    const { recordsPath, UcaError } = await import("../lib/uca/client.ts");
    withEnv({ UCA_BASE_URL: undefined, UCA_PROJECT_SLUG: undefined, UCA_API_TOKEN: undefined }, () => {
      assert.throws(() => recordsPath("assets"), UcaError);
    });
  });
});

describe("uca client — token není vystaven client-side", () => {
  test("client.ts / records.ts / media.ts importují 'server-only'", () => {
    for (const relPath of ["../lib/uca/client.ts", "../lib/uca/records.ts", "../lib/uca/media.ts"]) {
      const filePath = fileURLToPath(new URL(relPath, import.meta.url));
      const source = readFileSync(filePath, "utf8");
      assert.match(
        source,
        /import\s+"server-only"/,
        `${relPath} musí importovat "server-only", aby ho nešlo omylem zabundlit do klienta`
      );
    }
  });
});
