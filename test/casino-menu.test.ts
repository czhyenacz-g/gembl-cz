import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classicSkin } from "../lib/casino-skins/classic.ts";

describe("classicSkin.layout.menu — hlavní casino menu (artwork/stage)", () => {
  test("obsahuje přesně 6 položek v zadaném pořadí s reálnými route (Jak funguje jako 6. řádek pod Profil)", () => {
    assert.deepEqual(
      classicSkin.layout.menu.items.map((item) => [item.label, item.href]),
      [
        ["Automaty", "/automaty"],
        ["Skořápky", "/skorapky"],
        ["Online losy", "/losy"],
        ["Žebříčky", "/zebricky"],
        ["Profil", "/profil"],
        ["Jak funguje", "/jak-to-funguje"],
      ]
    );
  });

  test("Ruleta byla z hlavního menu odstraněna", () => {
    const labels = classicSkin.layout.menu.items.map((item) => item.label);
    assert.ok(!labels.includes("Ruleta"));
  });

  test("žádná položka nemá href: null — všechny jsou hned klikací, žádná 'čeká' na (brzy) větev", () => {
    for (const item of classicSkin.layout.menu.items) assert.notEqual(item.href, null);
  });

  test("data nenesou statický `active` flag — zvýraznění je dynamické z pathname (viz MenuOverlay.tsx)", () => {
    for (const item of classicSkin.layout.menu.items) assert.ok(!("active" in item));
  });

  test("artwork má 6 připravených řádků a teď i 6 položek — žádný řádek nezůstává prázdný", () => {
    assert.equal(classicSkin.layout.menu.rows.length, 6);
    assert.equal(classicSkin.layout.menu.items.length, 6);
  });
});

describe("MenuOverlay.tsx — aktivní položka podle pathname", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/(site)/casino/stage/MenuOverlay.tsx", import.meta.url)), "utf8");

  test("je 'use client' a používá usePathname (aktivní stav se nepočítá ze statických dat)", () => {
    const firstLine = source.trimStart().split("\n")[0];
    assert.match(firstLine, /^["']use client["']/);
    assert.match(source, /import \{ usePathname \} from "next\/navigation";/);
    assert.doesNotMatch(source, /item\.active/);
  });

  test("isActiveHref: přesná shoda NEBO detail podstránka (prefix) drží aktivní rodičovskou položku", () => {
    const fn = /function isActiveHref\(pathname: string, href: string\): boolean \{[\s\S]*?\n\}\n/.exec(source)?.[0] ?? "";
    assert.match(fn, /pathname === href \|\| pathname\.startsWith\(`\$\{href\}\/`\)/);
  });

  test("speciální případ: pohled na /casino (stage) počítá jako aktivní Automaty", () => {
    const fn = /function isActiveHref\(pathname: string, href: string\): boolean \{[\s\S]*?\n\}\n/.exec(source)?.[0] ?? "";
    assert.match(fn, /pathname === "\/casino" && href === "\/automaty"/);
  });

  test("aktivní řádek je TAKÉ klikatelný <Link> (na /casino vede 'Automaty' do hry), se zachovaným aria-current", () => {
    const activeBranch = /if \(active && item\.href\) \{[\s\S]*?\n {2}\}/.exec(source)?.[0] ?? "";
    assert.ok(activeBranch.length > 0, "aktivní větev musí existovat");
    assert.match(activeBranch, /<Link/);
    assert.match(activeBranch, /href=\{item\.href\}/);
    assert.match(activeBranch, /aria-current="page"/);
    // Vizuál aktivního řádku (světlý text na tmavém vytištěném řádku) zůstává.
    assert.match(activeBranch, /text-gembl-paper/);
    // A je poznat, že se dá kliknout (hover + focus ring).
    assert.match(activeBranch, /hover:bg-white\/10/);
    assert.match(activeBranch, /focus-visible:ring-2/);
  });

  test("řádek bez href zůstává neklikatelný, i kdyby byl aktivní", () => {
    const disabledBranch = /return \(\s*<span[\s\S]*?<\/span>\s*\);/.exec(source)?.[0] ?? "";
    assert.ok(disabledBranch.length > 0, "disabled větev musí existovat");
    assert.match(disabledBranch, /aria-disabled="true"/);
    assert.doesNotMatch(disabledBranch, /<Link/);
  });
});
