import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// "use client" + hooks — zdrojová kontrola, stejný vzor jako
// test/slot-machine-wiring.test.ts (žádný DOM test harness v tomhle
// starteru).
const source = readFileSync(fileURLToPath(new URL("../lib/onboarding/use-welcome-prize-popup.ts", import.meta.url)), "utf8");

describe("useWelcomePrizePopup — přihlášený uživatel popup nikdy automaticky nedostane", () => {
  test("fetch efekt je gatovaný na `loggedIn`, ne jen na `hasClaimedWelcomeBonus`/`alreadyClaimed`", () => {
    const fetchEffect = /useEffect\(\(\) => \{\s*if \(session\.status === "loading"\) return;[\s\S]*?\n {2}\}, \[session\.status, loggedIn, dismissed\]\);/.exec(
      source
    )?.[0] ?? "";
    assert.match(fetchEffect, /if \(loggedIn\) return;/);
    // Komentáře smí `hasClaimedWelcomeBonus`/`alreadyClaimed` zmiňovat jako vysvětlení — kód sám je ale jako
    // gating podmínku nesmí používat (žádná deklarace/přiřazení/porovnání s tímhle jménem).
    assert.doesNotMatch(source, /\balreadyClaimed\s*[:=]/);
    assert.doesNotMatch(source, /session\.hasClaimedWelcomeBonus/);
  });

  test("návratová hodnota vynuceně vrátí amountG: null, kdykoli je loggedIn true — bez ohledu na state/starý fetch", () => {
    assert.match(source, /return \{ amountG: loggedIn \|\| dismissed \? null : amountG, loggedIn, dismiss \};/);
  });

  test("loggedIn je odvozený přímo ze session.status, ne z odděleného flagu, co by mohl zaostávat", () => {
    assert.match(source, /const loggedIn = session\.status === "authenticated";/);
  });
});

describe("useWelcomePrizePopup — nepřihlášený nový návštěvník může dostat popup", () => {
  test("fetch efekt pro nepřihlášeného (a nezavřeného) proběhne — žádný guard navíc mimo loading/loggedIn/dismissed", () => {
    const fetchEffect = /useEffect\(\(\) => \{\s*if \(session\.status === "loading"\) return;[\s\S]*?\n {2}\}, \[session\.status, loggedIn, dismissed\]\);/.exec(
      source
    )?.[0] ?? "";
    assert.match(fetchEffect, /fetch\("\/api\/onboarding\/prize", \{ cache: "no-store" \}\)/);
    assert.match(fetchEffect, /setAmountG\(data\.amountG\)/);
  });
});
