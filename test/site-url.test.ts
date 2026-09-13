import { test } from "node:test";
import assert from "node:assert/strict";
import { getSiteUrl } from "../lib/site-url.ts";

function withEnv(vars: Record<string, string | undefined>, run: () => void) {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    original[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    run();
  } finally {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
}

test("getSiteUrl: použije NEXT_PUBLIC_SITE_URL, pokud je nastavená (oříznuté trailing lomítko)", () => {
  withEnv({ NEXT_PUBLIC_SITE_URL: "https://www.gembl.cz/", VERCEL_URL: "gembl-cz-git-foo.vercel.app" }, () => {
    assert.equal(getSiteUrl(), "https://www.gembl.cz");
  });
});

test("getSiteUrl: bez NEXT_PUBLIC_SITE_URL spadne na VERCEL_URL (Preview deploy nemá a nemůže mít pevnou URL)", () => {
  withEnv({ NEXT_PUBLIC_SITE_URL: undefined, VERCEL_URL: "gembl-cz-git-foo-czhyenacz-g.vercel.app" }, () => {
    assert.equal(getSiteUrl(), "https://gembl-cz-git-foo-czhyenacz-g.vercel.app");
  });
});

test("getSiteUrl: bez obojího spadne na localhost (lokální vývoj)", () => {
  withEnv({ NEXT_PUBLIC_SITE_URL: undefined, VERCEL_URL: undefined }, () => {
    assert.equal(getSiteUrl(), "http://localhost:3000");
  });
});
