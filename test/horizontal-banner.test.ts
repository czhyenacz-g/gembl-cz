import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// "use client" — zdrojová kontrola, stejný vzor jako framework-vázané
// testy jinde (žádný DOM harness v projektu).
const source = readFileSync(fileURLToPath(new URL("../app/components/promotions/HorizontalBanner.tsx", import.meta.url)), "utf8");

describe("HorizontalBanner.tsx", () => {
  test("je 'use client'", () => {
    const firstLine = source.trimStart().split("\n")[0];
    assert.match(firstLine, /^["']use client["']/);
  });

  test("bez promotion (null) nebo bez imageUrl nevykresluje nic — žádná rezervovaná prázdná plocha", () => {
    assert.match(source, /if \(!promotion \|\| !promotion\.imageUrl\) return null;/);
  });

  test("externí href dostane target=_blank a rel sponsored, interní Next Link ani jedno", () => {
    assert.match(source, /rel="noopener noreferrer sponsored"/);
    assert.match(source, /target="_blank"/);
    const linkBranch = /return \(\s*<Link([\s\S]*?)<\/Link>/.exec(source)?.[1] ?? "";
    assert.doesNotMatch(linkBranch, /target="_blank"/);
    assert.doesNotMatch(linkBranch, /rel="noopener noreferrer sponsored"/);
  });

  test("interní/externí rozlišuje přes isExternalHref (žádná duplicitní detekce)", () => {
    assert.match(source, /import \{ isExternalHref \} from "\.\.\/\.\.\/\.\.\/lib\/promotions\/match-route"/);
    assert.match(source, /isExternalHref\(promotion\.href\)/);
  });

  test("impression se trackuje na mount (jen při změně promotion.id)", () => {
    assert.match(source, /useEffect\(\(\) => \{/);
    assert.match(source, /trackPromotionEventClient\(promotion\.id, "impression"\)/);
    assert.match(source, /\}, \[promotion\?\.id\]\);/);
  });

  test("klik trackuje 'click', ne 'impression'", () => {
    const clickHandler = /function handleClick\(\) \{([\s\S]*?)\n {2}\}/.exec(source)?.[1] ?? "";
    assert.match(clickHandler, /trackPromotionEventClient\(promotion!\.id, "click"\)/);
  });
});
