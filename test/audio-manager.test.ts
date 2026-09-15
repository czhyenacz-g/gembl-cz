import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const {
  DEFAULT_AUDIO_PREFERENCES,
  loadAudioPreferences,
  saveAudioPreferences,
} = await import("../lib/audio/preferences.ts");
const { MUSIC_PLAYLIST } = await import("../lib/audio/tracks.ts");
const { SFX_REGISTRY } = await import("../lib/audio/sfx.ts");
const { getActiveIndices, pickRandomTrackIndex } = await import("../lib/audio/playlist.ts");

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

describe("MUSIC_PLAYLIST", () => {
  test("obsahuje aspoň jednu skladbu, každá má src pod /audio/music/", () => {
    assert.ok(MUSIC_PLAYLIST.length > 0);
    for (const track of MUSIC_PLAYLIST) {
      assert.match(track.src, /^\/audio\/music\/.+\.mp3$/);
      assert.equal(typeof track.placeholder, "boolean");
    }
  });

  test("id skladeb jsou unikátní", () => {
    const ids = MUSIC_PLAYLIST.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("aktivní (placeholder: false) tracky ukazují na soubory, co reálně existují v public/", () => {
    const repoRoot = fileURLToPath(new URL("..", import.meta.url));
    const activeTracks = MUSIC_PLAYLIST.filter((t) => !t.placeholder);
    assert.ok(activeTracks.length >= 2, "očekávány aspoň 2 reálné produkční tracky");
    for (const track of activeTracks) {
      const filePath = path.join(repoRoot, "public", track.src);
      assert.ok(existsSync(filePath), `${track.src} neexistuje v public/`);
      const size = statSync(filePath).size;
      assert.ok(size > 0, `${track.src} je prázdný soubor`);
      // "nejsou extrémně velké" (viz zadání) — 5 MB je bezpečná horní mez pro pár minut 128 kbps MP3.
      assert.ok(size < 5 * 1024 * 1024, `${track.src} je podezřele velký (${size} B)`);
    }
  });

  test("reálné tracky mají vyplněné author/source/license (i když je licence zatím needs-verification), ne prázdné TODO", () => {
    for (const track of MUSIC_PLAYLIST.filter((t) => !t.placeholder)) {
      assert.notEqual(track.author, "TODO");
      assert.ok(track.source.length > 0);
      assert.ok(track.license.length > 0);
    }
  });
});

describe("lib/audio/playlist.ts: náhodný výběr playlistu", () => {
  test("getActiveIndices vrací jen indexy neplaceholder tracků", () => {
    const active = getActiveIndices();
    for (const index of active) assert.equal(MUSIC_PLAYLIST[index]?.placeholder, false);
  });

  test("pickRandomTrackIndex s injektovaným random je deterministický (stejný vzor jako slot-engine.ts spin)", () => {
    const active = getActiveIndices();
    assert.equal(pickRandomTrackIndex(null, () => 0), active[0]);
    assert.equal(pickRandomTrackIndex(null, () => 0.999), active[active.length - 1]);
  });

  test("s 2+ aktivními tracky NIKDY nevrátí excludeIndex (žádné bezprostřední opakování stejné skladby)", () => {
    const active = getActiveIndices();
    if (active.length < 2) return; // test má smysl jen s 2+ aktivními tracky
    for (const excludeIndex of active) {
      for (let i = 0; i < 50; i++) {
        assert.notEqual(pickRandomTrackIndex(excludeIndex, Math.random), excludeIndex);
      }
    }
  });

  test("nad 200 losování pokryje víc než jeden track (reálné náhodné střídání, ne pevný jeden výsledek)", () => {
    const active = getActiveIndices();
    if (active.length < 2) return;
    const seen = new Set<number>();
    let previous: number | null = null;
    for (let i = 0; i < 200; i++) {
      const next = pickRandomTrackIndex(previous);
      seen.add(next);
      previous = next;
    }
    assert.ok(seen.size > 1);
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
    "devil_laugh",
    "topup_open",
  ] as const;

  test("obsahuje přesně všechny SFX id ze zadání, každý se src pod /audio/sfx/", () => {
    assert.deepEqual(Object.keys(SFX_REGISTRY).sort(), [...expectedIds].sort());
    for (const id of expectedIds) {
      assert.equal(SFX_REGISTRY[id].id, id);
      assert.match(SFX_REGISTRY[id].src, /^\/audio\/sfx\/.+\.mp3$/);
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
    const repoRoot = fileURLToPath(new URL("..", import.meta.url));
    const providerPath = path.join(repoRoot, "lib", "audio", "AudioProvider.tsx");
    const offenders: string[] = [];

    for (const dir of ["app", "lib"]) {
      for (const file of listSourceFiles(path.join(repoRoot, dir))) {
        if (file === providerPath) continue;
        const content = readFileSync(file, "utf8");
        if (/new Audio\(/.test(content)) offenders.push(path.relative(repoRoot, file));
      }
    }

    assert.deepEqual(offenders, []);
  });
});

describe("AudioProvider.tsx: playlist používá náhodný výběr a fade při přechodu, ne pevné pořadí", () => {
  const source = readFileSync(fileURLToPath(new URL("../lib/audio/AudioProvider.tsx", import.meta.url)), "utf8");

  test("výběr dalšího tracku jde přes pickRandomTrackIndex z playlist.ts, ne (index + 1) % length", () => {
    assert.match(source, /import \{ getActiveIndices, pickRandomTrackIndex \} from "\.\/playlist\.ts"/);
    assert.match(source, /trackIndexRef\.current = pickRandomTrackIndex\(trackIndexRef\.current\)/);
    assert.doesNotMatch(source, /trackIndexRef\.current \+ 1\) % MUSIC_PLAYLIST\.length/);
  });

  test("fade-in/fade-out při přechodu mezi tracky (TRACK_FADE_MS v zadaném rozsahu 0.5–1.5 s), žádné WebAudio API", () => {
    assert.match(source, /const TRACK_FADE_MS = (\d+);/);
    const ms = Number(/const TRACK_FADE_MS = (\d+);/.exec(source)?.[1]);
    assert.ok(ms >= 500 && ms <= 1500, `TRACK_FADE_MS (${ms}ms) mimo zadaný rozsah 500-1500ms`);
    assert.match(source, /fadeVolumeTo\(el, 0,/);
    assert.match(source, /fadeVolumeTo\(el, preferencesRef\.current\.volumeMusic, TRACK_FADE_MS\)/);
    assert.doesNotMatch(source, /new (window\.)?(AudioContext|webkitAudioContext)\(|createGain\(/);
  });

  test("hudební <audio> element má preload=\"none\" (žádné stahování obou tracků při prvním renderu)", () => {
    assert.match(source, /el\.preload = "none";/);
  });
});

describe("SlotMachine.tsx: audio SFX napojené na spin/výsledek přes useAudio(), ne vlastní Audio()", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/(site)/automaty/SlotMachine.tsx", import.meta.url)), "utf8");

  test("importuje useAudio z centrálního AudioProvider", () => {
    assert.match(source, /import \{ useAudio \} from "\.\.\/\.\.\/\.\.\/lib\/audio\/AudioProvider\.tsx"/);
  });

  test("handleSpin přehraje spin_start při kliknutí na spin", () => {
    const handleSpinFn = /function handleSpin\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
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
});

describe("WelcomePrizeModal.tsx: popup_open při otevření, credit_added po úspěšném claimu", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/components/wallet/WelcomePrizeModal.tsx", import.meta.url)), "utf8");

  test("importuje useAudio z centrálního AudioProvider", () => {
    assert.match(source, /import \{ useAudio \} from "\.\.\/\.\.\/\.\.\/lib\/audio\/AudioProvider\.tsx"/);
  });

  test("popup_open se hraje v useEffect s prázdnými/stabilními deps (jen jednou při mountu)", () => {
    assert.match(source, /useEffect\(\(\) => \{\s*playSfx\("popup_open"\);\s*\}, \[playSfx\]\);/);
  });

  test("credit_added se hraje až PO úspěšném přijetí balance ze serveru, ne dřív", () => {
    const handleClaimFn = /async function handleClaim\(\)[\s\S]*?\n {2}\}\n/.exec(source)?.[0] ?? "";
    const balanceCheckIndex = handleClaimFn.indexOf("typeof data.balance !== \"number\"");
    const creditAddedIndex = handleClaimFn.indexOf('playSfx("credit_added")');
    assert.ok(balanceCheckIndex > -1 && creditAddedIndex > -1 && creditAddedIndex > balanceCheckIndex);
  });
});

describe("app/(site)/casino/layout.tsx: AudioProvider scoped na /casino", () => {
  const source = readFileSync(fileURLToPath(new URL("../app/(site)/casino/layout.tsx", import.meta.url)), "utf8");

  test("obaluje children AudioProviderem, ať se hudba zastaví při odchodu z /casino (unmount layoutu)", () => {
    assert.match(source, /<AudioProvider>/);
    assert.match(source, /\{children\}/);
  });
});
