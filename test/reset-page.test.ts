import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// "use client" + hooks — zdrojová kontrola, stejný vzor jako
// test/slot-machine-wiring.test.ts (žádný DOM test harness v tomhle starteru).
const pageSource = readFileSync(fileURLToPath(new URL("../app/(site)/reset/page.tsx", import.meta.url)), "utf8");
const componentSource = readFileSync(fileURLToPath(new URL("../app/(site)/reset/ResetCareer.tsx", import.meta.url)), "utf8");

describe("reset — stránka /reset (volně přístupná, ale skrytá robotům)", () => {
  test("page.tsx: robots noindex + nofollow, ať se stránka neobjeví ve vyhledávačích", () => {
    assert.match(pageSource, /robots: \{ index: false, follow: false \}/);
    // canonical na noindex stránce nedává smysl — být tu nemá.
    assert.doesNotMatch(pageSource, /alternates:/);
  });

  test("page.tsx: metadata mají titulek, stránka renderuje ResetCareer", () => {
    assert.match(pageSource, /title: TITLE/);
    assert.match(pageSource, /return <ResetCareer \/>;/);
  });
});

describe("ResetCareer.tsx — chování resetu kariéry", () => {
  test("je 'use client' a stav čte z localStorage až po mountu (žádný hydration mismatch)", () => {
    const firstLine = componentSource.trimStart().split("\n")[0];
    assert.match(firstLine, /^["']use client["']/);
    assert.match(componentSource, /if \(!mounted \|\| !player\)/);
    assert.match(componentSource, /setPlayer\(loadPlayerState\(\)\);\s*setMounted\(true\);/);
  });

  test("stav čte/ukládá přes storage.ts, nikdy přímo localStorage", () => {
    assert.match(
      componentSource,
      /import \{ createInitialPlayerState, loadPlayerState, resetPlayerState, savePlayerState \} from "\.\.\/\.\.\/\.\.\/lib\/casino\/storage"/
    );
    assert.doesNotMatch(componentSource, /localStorage\.(get|set)Item/);
  });

  test("reset vyžaduje potvrzovací krok (žádná nevratná akce na první klik)", () => {
    assert.match(componentSource, /type Phase = "idle" \| "confirm" \| "done";/);
    assert.match(componentSource, /onClick=\{\(\) => setPhase\("confirm"\)\}/);
    assert.match(componentSource, /Opravdu chceš resetovat kariéru\?/);
    assert.match(componentSource, /onClick=\{handleReset\}/);
    assert.match(componentSource, /RESETOVAT KARIÉRU/);
  });

  test("reset reportuje globální reset do statistik jedním requestem (resets: 1), fail-open přes report-stats-client", () => {
    assert.match(componentSource, /import \{ reportGameStatsDeltaClient \} from "\.\.\/\.\.\/\.\.\/lib\/casino\/report-stats-client"/);
    assert.match(
      componentSource,
      /reportGameStatsDeltaClient\(\{ game: RESET_GAME_ID, spins: 0, wagered: 0, won: 0, resets: 1 \}\)/
    );
  });

  test("u přihlášeného hráče se kredity NIKDY nevrací na STARTING_CREDITS — zůstává serverový zůstatek", () => {
    assert.match(
      componentSource,
      /session\.status === "authenticated" \? \{ \.\.\.createInitialPlayerState\(\), credits: session\.credits \} : resetPlayerState\(\)/
    );
    assert.match(componentSource, /if \(session\.status === "authenticated"\) savePlayerState\(fresh\);/);
  });

  test("nepřihlášený hráč jde přes resetPlayerState (čistý lokální reset na startovní stav)", () => {
    assert.match(componentSource, /: resetPlayerState\(\);/);
    assert.match(componentSource, /STARTING_CREDITS/);
  });
});

describe("přesun resetu pryč z /automaty a zrušené stránky", () => {
  const slotMachineSource = readFileSync(
    fileURLToPath(new URL("../app/(site)/automaty/SlotMachine.tsx", import.meta.url)),
    "utf8"
  );
  const siteConfigSource = readFileSync(fileURLToPath(new URL("../app/config/site.ts", import.meta.url)), "utf8");

  test("/automaty už reset kariéry neobsahuje (tlačítko ani potvrzovací dialog)", () => {
    assert.doesNotMatch(slotMachineSource, /RESETOVAT KARIÉRU/);
    assert.doesNotMatch(slotMachineSource, /Opravdu chceš resetovat kariéru/);
  });

  test("/hry a /o-projektu už nemají vlastní route (soubory smazané)", () => {
    assert.equal(existsSync(fileURLToPath(new URL("../app/(site)/hry/page.tsx", import.meta.url))), false);
    assert.equal(existsSync(fileURLToPath(new URL("../app/(site)/o-projektu/page.tsx", import.meta.url))), false);
  });

  test("NAV_LINKS už na zrušené stránky neodkazují a /jak-to-funguje zůstává", () => {
    assert.doesNotMatch(siteConfigSource, /href: "\/hry"/);
    assert.doesNotMatch(siteConfigSource, /href: "\/o-projektu"/);
    assert.match(siteConfigSource, /href: "\/jak-to-funguje"/);
  });

  test("zrušené stránky mají v next.config.ts trvalý redirect — /o-projektu na sloučenou stránku, /hry na /casino (žádná 404 na původních URL)", () => {
    const nextConfigSource = readFileSync(fileURLToPath(new URL("../next.config.ts", import.meta.url)), "utf8");
    assert.match(nextConfigSource, /source: "\/o-projektu", destination: "\/jak-to-funguje", permanent: true/);
    assert.match(nextConfigSource, /source: "\/hry", destination: "\/casino", permanent: true/);
  });

  test("obsah /o-projektu (satira + disclaimer) zůstal na /jak-to-funguje i po přesunu do stage shellu", () => {
    const jakSource = readFileSync(
      fileURLToPath(new URL("../app/(site)/jak-to-funguje/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(jakSource, /Proč to existuje/);
    assert.match(jakSource, /Důležité upozornění/);
    assert.match(jakSource, /\{DISCLAIMER\}/);
  });

  test("/jak-to-funguje jede bez menu/patičky (STANDALONE_ROUTES) a jeho mobile fallback má šipku zpět", () => {
    const chromeSource = readFileSync(fileURLToPath(new URL("../app/components/SiteChrome.tsx", import.meta.url)), "utf8");
    assert.match(chromeSource, /\/jak-to-funguje"\]\);/);
    const jakSource = readFileSync(
      fileURLToPath(new URL("../app/(site)/jak-to-funguje/page.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(jakSource, /legacyBack/);
    // Vlastní šipka zpět žije ve sdíleném shellu (ContentPage), ne v page.tsx.
    const contentPageSource = readFileSync(
      fileURLToPath(new URL("../app/components/stage/ContentPage.tsx", import.meta.url)),
      "utf8"
    );
    assert.match(contentPageSource, /← ZPĚT/);
    assert.match(contentPageSource, /aria-label="Zpět do kasina"/);
  });
});
