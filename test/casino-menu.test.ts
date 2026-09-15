import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classicSkin } from "../lib/casino-skins/classic.ts";

describe("classicSkin.layout.menu — hlavní casino menu (artwork/stage)", () => {
  test("obsahuje přesně 5 položek v zadaném pořadí s reálnými route", () => {
    assert.deepEqual(
      classicSkin.layout.menu.items.map((item) => [item.label, item.href]),
      [
        ["Automaty", "/automaty"],
        ["Skořápky", "/skorapky"],
        ["Online losy", "/losy"],
        ["Žebříčky", "/zebricky"],
        ["Profil", "/profil"],
      ]
    );
  });

  test("Ruleta a Jak funguje byly z hlavního menu odstraněny", () => {
    const labels = classicSkin.layout.menu.items.map((item) => item.label);
    assert.ok(!labels.includes("Ruleta"));
    assert.ok(!labels.includes("Jak funguje"));
  });

  test("žádná položka nemá href: null — všechny jsou hned klikací, žádná 'čeká' na (brzy) větev", () => {
    for (const item of classicSkin.layout.menu.items) assert.notEqual(item.href, null);
  });

  test("data nenesou statický `active` flag — zvýraznění je dynamické z pathname (viz MenuOverlay.tsx)", () => {
    for (const item of classicSkin.layout.menu.items) assert.ok(!("active" in item));
  });

  test("artwork má 6 připravených řádků, ale položek je jen 5 — přebytečný řádek zůstává nevyužitý, ne filler", () => {
    assert.equal(classicSkin.layout.menu.rows.length, 6);
    assert.equal(classicSkin.layout.menu.items.length, 5);
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

  test("aktivní řádek se renderuje jako neklikací <div aria-current='page'>, ne <Link>", () => {
    assert.match(source, /if \(active\) \{/);
    assert.match(source, /aria-current="page"/);
  });
});
