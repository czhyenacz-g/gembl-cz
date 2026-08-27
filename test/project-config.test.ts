import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { projectConfig } from "../app/config/project.ts";

describe("projectConfig", () => {
  test("má očekávaný tvar a všechny feature flagy jsou boolean", () => {
    assert.equal(typeof projectConfig.slug, "string");
    assert.equal(typeof projectConfig.name, "string");
    assert.equal(typeof projectConfig.domain, "string");

    const featureKeys = ["uca", "assets", "promotions", "steamAuth", "streams", "feedback", "communitySubmissions"] as const;
    for (const key of featureKeys) {
      assert.equal(typeof projectConfig.features[key], "boolean", `features.${key} musí být boolean`);
    }
  });

  test("defaultně jsou všechny features vypnuté (starter sám nic nezapíná)", () => {
    for (const value of Object.values(projectConfig.features)) {
      assert.equal(value, false);
    }
  });
});
