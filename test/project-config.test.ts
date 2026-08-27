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

  test("uca a promotions jsou zapnuté (Gembl.cz je skutečně používá), zbytek zůstává vypnutý", () => {
    assert.equal(projectConfig.features.uca, true);
    assert.equal(projectConfig.features.promotions, true);
    assert.equal(projectConfig.features.assets, false);
    assert.equal(projectConfig.features.steamAuth, false);
    assert.equal(projectConfig.features.streams, false);
    assert.equal(projectConfig.features.feedback, false);
    assert.equal(projectConfig.features.communitySubmissions, false);
  });
});
