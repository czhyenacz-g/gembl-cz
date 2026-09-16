import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { DEFAULT_AUDIO_PREFERENCES, loadAudioPreferences, saveAudioPreferences } = await import(
  "../lib/audio/preferences.ts"
);
const { MUSIC_PLAYLISTS } = await import("../lib/audio/tracks.ts");
const { SFX_REGISTRY } = await import("../lib/audio/sfx.ts");
const { getActiveIndices, pickRandomTrackIndex } = await import("../lib/audio/playlist.ts");
const { getPlaylistForPath } = await import("../lib/audio/route-playlist.ts");

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const PLAYLIST_IDS = ["casino", "universal"] as const;

class FakeStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

function withFakeLocalStorage<T>(run: (storage: FakeStorage) => T): T {
  const storage = new FakeStorage();
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  // @ts-expect-error test fake, not a real Storage instance
  globalThis.localStorage = storage;
  try {
    return run(storage);
  } finally {
    // @ts-expect-error restoring possibly-undefined original
    globalThis.localStorage = original;
  }
}

describe("loadAudioPreferences", () => {
  test("bez globalThis.localStorage (SSR) vrátí výchozí preference, nespadne", () => {
    const original = (globalThis as { localStorage?: unknown }).localStorage;
    delete (globalThis as { localStorage?: unknown }).localStorage;
    try {
      assert.deepEqual(loadAudioPreferences(), DEFAULT_AUDIO_PREFERENCES);
    } finally {
      if (original) (globalThis as { localStorage?: unknown }).localStorage = original;
    }
  });

  test("bez uloženého záznamu vrátí výchozí preference", () => {
    withFakeLocalStorage(() => {
      assert.deepEqual(loadAudioPreferences(), DEFAULT_AUDIO_PREFERENCES);
    });
  });

  test("uložené preference se přesně načtou zpět (round-trip)", () => {
    withFakeLocalStorage(() => {
      const saved = { musicEnabled: false, sfxEnabled: true, volumeMusic: 0.1, volumeSfx: 0.9 };
      saveAudioPreferences(saved);
      assert.deepEqual(loadAudioPreferences(), saved);
    });
  });

  test("poškozený JSON vrátí výchozí preference, nespadne", () => {
    withFakeLocalStorage((storage) => {
      storage.setItem("gembl:audio-preferences", "{ not valid json");
      assert.deepEqual(loadAudioPreferences(), DEFAULT_AUDIO_PREFERENCES);
    });
  });

  test("neplatný tvar (chybí pole) vrátí výchozí preference, nespadne", () => {
    withFakeLocalStorage((storage) => {
      storage.setItem("gembl:audio-preferences", JSON.stringify({ musicEnabled: "yes" }));
      assert.deepEqual(loadAudioPreferences(), DEFAULT_AUDIO_PREFERENCES);
    });
  });
});

describe("saveAudioPreferences", () => {
  test("bez localStorage tiše no-opne, nespadne", () => {
    const original = (globalThis as { localStorage?: unknown }).localStorage;
    delete (globalThis as { localStorage?: unknown }).localStorage;
    try {
      assert.doesNotThrow(() => saveAudioPreferences(DEFAULT_AUDIO_PREFERENCES));
    } finally {
      if (original) (globalThis as { localStorage?: unknown }).localStorage = original;
    }
  });
});

describe("výchozí hlasitosti (viz zadání: hudba 0.15–0.22, SFX 0.35–0.5)", () => {
  test("hudba je tichá kulisa, SFX je slyšet ale nepřehlušuje", () => {
    assert.ok(
      DEFAULT_AUDIO_PREFERENCES.volumeMusic >= 0.15 && DEFAULT_AUDIO_PREFERENCES.volumeMusic <= 0.22,
      `volumeMusic ${DEFAULT_AUDIO_PREFERENCES.volumeMusic} mimo 0.15–0.22`
    );
    assert.ok(
      DEFAULT_AUDIO_PREFERENCES.volumeSfx >= 0.35 && DEFAULT_AUDIO_PREFERENCES.volumeSfx <= 0.5,
      `volumeSfx ${DEFAULT_AUDIO_PREFERENCES.volumeSfx} mimo 0.35–0.5`
    );
  });
});

describe("MUSIC_PLAYLISTS — dva oddělené světy (casino vs universal)", () => {
  test("obsahuje právě playlisty casino a universal, každý se 2 tracky", () => {
    assert.deepEqual(Object.keys(MUSIC_PLAYLISTS).sort(), [...PLAYLIST_IDS].sort());
    for (const id of PLAYLIST_IDS) {
      assert.equal(MUSIC_PLAYLISTS[id].length, 2, `${id} má mít 2 tracky (viz zadání "očekávám 2 tracky")`);
    }
  });

  test("každý track má src pod /audio/music/ a unikátní id v rámci všech playlistů", () => {
    const ids = new Set<string>();
    for (const id of PLAYLIST_IDS) {
      for (const track of MUSIC_PLAYLISTS[id]) {
        assert.match(track.src, /^\/audio\/music\/.+\.mp3$/);
        assert.equal(typeof track.placeholder, "boolean");
        assert.ok(!ids.has(track.id), `duplicitní track id ${track.id}`);
        ids.add(track.id);
      }
    }
    assert.equal(ids.size, 4);
  });

  test("casino playlist = původní retro-casino tracky, universal = nové lounge tracky", () => {
    assert.deepEqual(
      MUSIC_PLAYLISTS.casino.map((t) => t.src),
      ["/audio/music/retro-casino-01.mp3", "/audio/music/retro-casino-02.mp3"]
    );
    assert.deepEqual(
      MUSIC_PLAYLISTS.universal.map((t) => t.src),
      ["/audio/music/universal-lounge-01.mp3", "/audio/music/universal-lounge-02.mp3"]
    );
  });

  test("všechny tracky jsou reálné (placeholder: false), soubory existují v public/ a nejsou obří", () => {
    for (const id of PLAYLIST_IDS) {
      for (const track of MUSIC_PLAYLISTS[id]) {
        assert.equal(track.placeholder, false, `${track.id} má být reálný soubor`);
        const filePath = path.join(REPO_ROOT, "public", track.src);
        assert.ok(existsSync(filePath), `${track.src} neexistuje v public/`);
        const size = statSync(filePath).size;
        assert.ok(size > 0 && size < 5 * 1024 * 1024, `${track.src} má podezřelou velikost ${size} B`);
      }
    }
  });

  test("reálné tracky mají vyplněné author/source/license (i když je licence zatím needs-verification), ne prázdné TODO", () => {
    for (const id of PLAYLIST_IDS) {
      for (const track of MUSIC_PLAYLISTS[id]) {
        assert.notEqual(track.author, "TODO");
        assert.ok(track.source.length > 0);
        assert.ok(track.license.length > 0);
      }
    }
  });
});

describe("lib/audio/playlist.ts: náhodný výběr v rámci playlistu", () => {
  for (const playlistId of PLAYLIST_IDS) {
    test(`${playlistId}: getActiveIndices vrací jen indexy neplaceholder tracků`, () => {
      const active = getActiveIndices(playlistId);
      assert.ok(active.length > 0);
      for (const index of active) assert.equal(MUSIC_PLAYLISTS[playlistId][index]?.placeholder, false);
    });

    test(`${playlistId}: pickRandomTrackIndex s injektovaným random je deterministický`, () => {
      const active = getActiveIndices(playlistId);
      assert.equal(pickRandomTrackIndex(playlistId, null, () => 0), active[0]);
      assert.equal(pickRandomTrackIndex(playlistId, null, () => 0.999), active[active.length - 1]);
    });

    test(`${playlistId}: s 2+ aktivními tracky NIKDY nevrátí excludeIndex`, () => {
      const active = getActiveIndices(playlistId);
      if (active.length < 2) return;
      for (const excludeIndex of active) {
        for (let i = 0; i < 50; i++) {
          assert.notEqual(pickRandomTrackIndex(playlistId, excludeIndex, Math.random), excludeIndex);
        }
      }
    });
  }
});

describe("lib/audio/route-playlist.ts: která stránka hraje co", () => {
  test("herní stránky hrají casino playlist", () => {
    for (const route of ["/casino", "/automaty", "/skorapky", "/losy"]) {
      assert.equal(getPlaylistForPath(route), "casino", route);
    }
  });

  test("obsahové stránky hrají universal playlist", () => {
    for (const route of ["/profil", "/zebricky", "/jak-to-funguje"]) {
      assert.equal(getPlaylistForPath(route), "universal", route);
    }
  });

  test("route bez playlistu (např. /reset) hraje ticho, ne omylem nějaký playlist", () => {
    assert.equal(getPlaylistForPath("/reset"), null);
    assert.equal(getPlaylistForPath("/"), null);
    assert.equal(getPlaylistForPath("/neexistuje"), null);
  });

  test("podstrom dědí playlist rodiče, ale podobná route ne (žádný substring match)", () => {
    assert.equal(getPlaylistForPath("/profil/neco"), "universal");
    assert.equal(getPlaylistForPath("/automaty-2"), null);
  });
});

describe("SFX_REGISTRY", () => {
  const expectedIds = [
    "ui_click",
    "spin_start",
    "reel_tick",
    "spin_stop",
    "near_miss",
    "lose",
    "credit_added",
    "popup_open",
    "topup_open",
    "shell_shuffle",
    "scratch",
    "devil_laugh",
  ] as const;

  test("obsahuje přesně všechna SFX id (včetně nových shell_shuffle a scratch), každý se src pod /audio/sfx/", () => {
    assert.deepEqual(Object.keys(SFX_REGISTRY).sort(), [...expectedIds].sort());
    for (const id of expectedIds) {
      assert.equal(SFX_REGISTRY[id].id, id);
      assert.match(SFX_REGISTRY[id].src, /^\/audio\/sfx\/.+\.mp3$/);
    }
  });

  test("všechny soubory kromě devil_laugh reálně existují, jsou krátké a malé", () => {
    const placeholders = Object.values(SFX_REGISTRY).filter((def) => def.placeholder);
    assert.deepEqual(
      placeholders.map((def) => def.id),
      ["devil_laugh"],
      "jediný zamýšlený placeholder je devil_laugh (viz zadání)"
    );

    for (const def of Object.values(SFX_REGISTRY)) {
      if (def.placeholder) continue;
      const filePath = path.join(REPO_ROOT, "public", def.src);
      assert.ok(existsSync(filePath), `${def.src} neexistuje v public/`);
      const size = statSync(filePath).size;
      assert.ok(size > 0 && size < 200 * 1024, `${def.src} má podezřelou velikost ${size} B`);
    }
  });

  test("každý SFX soubor je opravdu MP3 (ID3 hlavička nebo MPEG frame sync)", () => {
    for (const def of Object.values(SFX_REGISTRY)) {
      if (def.placeholder) continue;
      const bytes = readFileSync(path.join(REPO_ROOT, "public", def.src));
      const isId3 = bytes.slice(0, 3).toString("ascii") === "ID3";
      const isFrameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
      assert.ok(isId3 || isFrameSync, `${def.src} nevypadá jako MP3`);
    }
  });
});

// Zdrojová kontrola (žádný DOM test harness v tomhle starteru, viz
// slot-machine-wiring.test.ts) — architektonické pravidlo "jeden centrální
// audio manager, žádná komponenta si nesmí tvořit vlastní `new Audio()`"
// (viz zadání) je vynucené i testem, ne jen komentářem.
function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...listSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("Audio architektura: jediné centrální místo tvoří new Audio()", () => {
  test("app/ a lib/ mimo lib/audio/AudioProvider.tsx nikde přímo nevolají `new Audio(`", () => {
    const providerPath = path.join(REPO_ROOT, "lib", "audio", "AudioProvider.tsx");
    const offenders: string[] = [];

    for (const dir of ["app", "lib"]) {
      for (const file of listSourceFiles(path.join(REPO_ROOT, dir))) {
        if (file === providerPath) continue;
        if (/new Audio\(/.test(readFileSync(file, "utf8"))) offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    assert.deepEqual(offenders, []);
  });

  test("AudioProvider je v celém app/ mountnutý právě jednou (žádný druhý provider)", () => {
    const mounts: string[] = [];
    for (const file of listSourceFiles(path.join(REPO_ROOT, "app"))) {
      if (/<AudioProvider[\s>]/.test(readFileSync(file, "utf8"))) mounts.push(path.relative(REPO_ROOT, file));
    }
    assert.deepEqual(mounts, [path.join("app", "(site)", "layout.tsx")]);
  });
});

describe("AudioProvider.tsx: route-aware playlist, náhodný výběr a fade při přechodu", () => {
  const source = readFileSync(fileURLToPath(new URL("../lib/audio/AudioProvider.tsx", import.meta.url)), "utf8");

  test("playlist se čte z aktuální route (usePathname + route-playlist.ts), ne z propu každého layoutu", () => {
    assert.match(source, /import \{ usePathname \} from "next\/navigation";/);
    assert.match(source, /import \{ getPlaylistForPath \} from "\.\/route-playlist\.ts";/);
    assert.match(source, /const playlistId = getPlaylistForPath\(pathname\);/);
  });

  test("přechod mezi playlisty dělá fade-out starého a fade-in nového tracku", () => {
    assert.match(source, /if \(!el\.paused && el\.src\) \{\s*stopTrack\(\(\) => startTrack\(playlistId, null\)\);/);
    assert.match(source, /const startTrack = useCallback\(/);
    assert.match(source, /const stopTrack = useCallback\(/);
  });

  test("výběr tracku jde přes pickRandomTrackIndex z playlist.ts (playlist-scoped), ne (index + 1) % length", () => {
    assert.match(source, /import \{ getActiveIndices, pickRandomTrackIndex \} from "\.\/playlist\.ts"/);
    assert.match(source, /const index = pickRandomTrackIndex\(id, excludeIndex\);/);
    assert.doesNotMatch(source, /\(index \+ 1\) % /);
  });

  test("fade-in/fade-out při přechodu mezi tracky (TRACK_FADE_MS v zadaném rozsahu 0.5–1.5 s), žádné WebAudio API", () => {
    const ms = Number(/const TRACK_FADE_MS = (\d+);/.exec(source)?.[1]);
    assert.ok(ms >= 500 && ms <= 1500, `TRACK_FADE_MS (${ms}ms) mimo zadaný rozsah 500-1500ms`);
    assert.match(source, /fadeVolumeTo\(el, 0,/);
    assert.match(source, /fadeVolumeTo\(el, preferencesRef\.current\.volumeMusic, TRACK_FADE_MS\)/);
    assert.doesNotMatch(source, /new (window\.)?(AudioContext|webkitAudioContext)\(|createGain\(/);
  });

  test("hudební <audio> element má preload=\"none\" (žádné stahování tracků při prvním renderu)", () => {
    assert.match(source, /el\.preload = "none";/);
  });

  test("playSfx nikdy nevyhodí chybu do volajícího (try/catch + .catch() na play) — chybějící asset nesmí shodit hru", () => {
    const playSfxFn = /const playSfx = useCallback\(\(id: SfxId\) => \{[\s\S]*?\n {2}\}, \[\]\);/.exec(source)?.[0] ?? "";
    assert.ok(playSfxFn.length > 0, "playSfx musí existovat");
    assert.match(playSfxFn, /try \{/);
    assert.match(playSfxFn, /catch \{/);
    assert.match(playSfxFn, /void el\.play\(\)\.catch\(\(\) => \{/);
  });
});

describe("app/(site)/layout.tsx: jeden globální AudioProvider + toggle", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/(site)/layout.tsx", import.meta.url)), "utf8");

  test("mountuje AudioProvider i AudioToggle pro celý web", () => {
    assert.match(source, /import AudioProvider from "\.\.\/\.\.\/lib\/audio\/AudioProvider\.tsx";/);
    assert.match(source, /import AudioToggle from "\.\.\/components\/audio\/AudioToggle\.tsx";/);
    assert.match(source, /<AudioProvider>/);
    assert.match(source, /<AudioToggle \/>/);
    assert.match(source, /\{children\}/);
  });

  test("her se už netýkají vlastní audio layouty (byly by druhý provider)", () => {
    for (const route of ["casino", "losy", "skorapky"]) {
      assert.equal(
        existsSync(path.join(REPO_ROOT, "app", "(site)", route, "layout.tsx")),
        false,
        `app/(site)/${route}/layout.tsx už nemá existovat`
      );
    }
  });
});

describe("SlotMachine.tsx: SFX napojené na spin/válce/výsledek přes useAudio()", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/(site)/automaty/SlotMachine.tsx", import.meta.url)), "utf8");

  test("importuje useAudio z centrálního AudioProvider", () => {
    assert.match(source, /import \{ useAudio \} from "\.\.\/\.\.\/\.\.\/lib\/audio\/AudioProvider\.tsx"/);
  });

  test("handleSpin přehraje ui_click (klik) i spin_start (páka) při kliknutí na spin", () => {
    const handleSpinFn = /function handleSpin\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(handleSpinFn, /audio\.playSfx\("ui_click"\)/);
    assert.match(handleSpinFn, /audio\.playSfx\("spin_start"\)/);
  });

  test("finishSpinAnimation přehraje spin_stop a near_miss/lose podle výsledku, po setReels/setSpinning (nemění timing)", () => {
    const finishFn = /function finishSpinAnimation\(result: ReturnType<typeof spin>, wagered: number\)[\s\S]*?\n {2}\}\n/.exec(
      source
    )?.[0] ?? "";
    assert.match(finishFn, /audio\.playSfx\("spin_stop"\)/);
    assert.match(finishFn, /audio\.playSfx\(classifySpinResult\(result\)\)/);
  });

  test("classifySpinResult je čistá funkce nad už hotovým výsledkem (nemění payout)", () => {
    assert.doesNotMatch(source, /function classifySpinResult[\s\S]*?payout\s*=/);
  });

  test("reel_tick se hraje jen BĚHEM točení (efekt na `spinning`) a je throttlovaný", () => {
    const tickEffect = /useEffect\(\(\) => \{\s*if \(!spinning\) return;[\s\S]*?\n {2}\}, \[spinning, playSfx\]\);/.exec(source)?.[0] ?? "";
    assert.ok(tickEffect.length > 0, "efekt pro reel_tick musí být gatovaný na `spinning`");
    assert.match(tickEffect, /playSfx\("reel_tick"\)/);
    const tickMs = Number(/const REEL_TICK_MS = (\d+);/.exec(source)?.[1]);
    assert.ok(tickMs >= 150, `REEL_TICK_MS (${tickMs}ms) je moc rychlé (max pár ticků za sekundu)`);
    // Záměrně bez setInterval (viz slot-machine-wiring.test.ts) — řetěz setTimeoutů,
    // který se sám ukončí s animací.
    assert.doesNotMatch(tickEffect, /setInterval/);
    assert.match(tickEffect, /window\.setTimeout\(tick, REEL_TICK_MS\)/);
  });

  test("+/- sázka hraje ui_click (a jen když je tlačítko opravdu aktivní)", () => {
    assert.match(source, /onClick=\{\(\) => \{\s*audio\.playSfx\("ui_click"\);\s*adjustBet\(-BET_STEP\);\s*\}\}/);
    assert.match(source, /onClick=\{\(\) => \{\s*audio\.playSfx\("ui_click"\);\s*adjustBet\(BET_STEP\);\s*\}\}/);
  });
});

describe("ShellGame.tsx: SFX míchání a výběru kelímku", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/(site)/skorapky/ShellGame.tsx", import.meta.url)), "utf8");

  test("klik na HRÁT hraje ui_click (ne zvuk páky z automatů)", () => {
    const handlePlayFn = /function handlePlay\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(handlePlayFn, /playSfx\("ui_click"\)/);
    assert.doesNotMatch(handlePlayFn, /playSfx\("spin_start"\)/);
  });

  test("začátek míchání hraje shell_shuffle (mechanické dřevěné posuny)", () => {
    const startFn = /function startShuffling\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(startFn, /playSfx\("shell_shuffle"\)/);
  });

  test("klik na kelímek = ui_click, reveal = spin_stop, prohra = lose", () => {
    const selectFn = /function handleSelectCup\(cup: CupIndex\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(selectFn, /playSfx\("ui_click"\)/);
    assert.match(selectFn, /playSfx\("spin_stop"\)/);
    assert.match(selectFn, /playSfx\("lose"\)/);
  });
});

describe("ScratchCard.tsx: SFX koupě a stírání losu", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/(site)/losy/ScratchCard.tsx", import.meta.url)), "utf8");

  test("koupě losu hraje ui_click, stírání scratch, reveal spin_stop, prohra lose", () => {
    const buyFn = /function handleBuy\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    const scratchFn = /function startScratching\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    const thresholdFn = /function handleThresholdReached\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(buyFn, /playSfx\("ui_click"\)/);
    assert.match(scratchFn, /playSfx\("scratch"\)/);
    assert.match(thresholdFn, /playSfx\("spin_stop"\)/);
    assert.match(thresholdFn, /playSfx\("lose"\)/);
  });
});

describe("WelcomePrizeModal.tsx / TopUpModal.tsx / LoginModal.tsx: SFX modalů", () => {
  test("welcome popup: popup_open při otevření, ui_click na claim, credit_added až po úspěchu", () => {
    const source = readFileSync(fileURLToPath(new URL("../app/components/wallet/WelcomePrizeModal.tsx", import.meta.url)), "utf8");
    assert.match(source, /useEffect\(\(\) => \{\s*playSfx\("popup_open"\);\s*\}, \[playSfx\]\);/);
    const handleClaimFn = /async function handleClaim\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(handleClaimFn, /playSfx\("ui_click"\)/);
    const balanceCheckIndex = handleClaimFn.indexOf('typeof data.balance !== "number"');
    const creditAddedIndex = handleClaimFn.indexOf('playSfx("credit_added")');
    assert.ok(balanceCheckIndex > -1 && creditAddedIndex > -1 && creditAddedIndex > balanceCheckIndex);
  });

  test("dobití: topup_open při otevření modalu (čistě prezentační, Stripe flow netknutý)", () => {
    const source = readFileSync(fileURLToPath(new URL("../app/components/wallet/TopUpModal.tsx", import.meta.url)), "utf8");
    assert.match(source, /useEffect\(\(\) => \{\s*playSfx\("topup_open"\);\s*\}, \[playSfx\]\);/);
    assert.match(source, /fetch\("\/api\/checkout\/session"/);
  });

  test("login CTA: ui_click při odeslání formuláře", () => {
    const source = readFileSync(fileURLToPath(new URL("../app/components/auth/LoginModal.tsx", import.meta.url)), "utf8");
    const submitFn = /async function handleSubmit\(event: FormEvent\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    assert.match(submitFn, /playSfx\("ui_click"\)/);
  });
});
