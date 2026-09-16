"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MUSIC_PLAYLISTS } from "./tracks.ts";
import { getActiveIndices, pickRandomTrackIndex } from "./playlist.ts";
import { getPlaylistForPath } from "./route-playlist.ts";
import { SFX_REGISTRY } from "./sfx.ts";
import { DEFAULT_AUDIO_PREFERENCES, loadAudioPreferences, saveAudioPreferences } from "./preferences.ts";
import type { AudioPreferences, MusicPlaylistId, SfxId } from "./types.ts";

// Krátký fade mezi tracky (viz zadání "0.5–1.5 s") — čisté HTMLAudioElement
// ramp přes volume (žádné WebAudio API, viz zadání "nepřidávej zbytečně
// WebAudio, pokud HTMLAudioElement stačí"). Jeden sdílený element = tracky
// se nepřekrývají (fade-out doznívajícího, pak fade-in nového), ale bez
// slyšitelného prasknutí, což zadání výslovně povoluje jako fallback.
const TRACK_FADE_MS = 800;
const FADE_STEP_MS = 40;
// Smyčkové SFX (scratch) — krátký fade na startu/konci, ať to necvakne;
// reakce musí být rychlá (zvuk jde rukou), takže desítky ms, ne stovky.
const SFX_LOOP_FADE_IN_MS = 60;
const SFX_LOOP_FADE_OUT_MS = 120;

type AudioContextValue = {
  /** false, dokud se preference nenačetly z localStorage (SSR/první frame) — ovládání se do té doby neukazuje. */
  ready: boolean;
  /** Kombinovaný stav pro jednoduché ovládání (viz AudioToggle) — true, když je vypnutá hudba I efekty. */
  muted: boolean;
  preferences: AudioPreferences;
  /** Přepne muted stav (hudba + efekty zároveň) — jediné ovládání v v1, viz zadání "nechci velký settings panel". */
  toggleMuted: () => void;
  /** Přehraje jeden SFX podle id z SFX_REGISTRY — no-op když jsou efekty vypnuté, soubor chybí, nebo mimo AudioProvider. */
  playSfx: (id: SfxId) => void;
  /** Spustí SMYČKOVÝ SFX (viz SfxDefinition.loop, např. scratch) — no-op při vypnutých efektech/chybějícím souboru/one-shot id. */
  startSfxLoop: (id: SfxId) => void;
  /** Zastaví smyčkový SFX s krátkým fade-outem (ne useknutí uprostřed vzorku). */
  stopSfxLoop: (id: SfxId) => void;
};

// Výchozí (no-op) hodnota kontextu — komponenty jako SlotMachine.tsx sdílí
// stejný useAudio() hook. Mimo AudioProvider (dnes už jen teoreticky, viz
// app/(site)/layout.tsx, kde je provider pro CELÝ web) playSfx() tiše nic
// nedělá — komponenta nikdy nespadne na chybějícím providerovi.
const noopContextValue: AudioContextValue = {
  ready: false,
  muted: true,
  preferences: DEFAULT_AUDIO_PREFERENCES,
  toggleMuted: () => {},
  playSfx: () => {},
  startSfxLoop: () => {},
  stopSfxLoop: () => {},
};

const AudioCtx = createContext<AudioContextValue>(noopContextValue);

export function useAudio(): AudioContextValue {
  return useContext(AudioCtx);
}

/**
 * Jediné místo v aplikaci, které smí vytvářet `new Audio()` instance (viz
 * zadání "nechci, aby si každá komponenta sama vytvářela nové Audio()
 * instance bez koordinace") — hudba i SFX jdou vždy přes tenhle manager,
 * komponenty volají jen `useAudio()`.
 *
 * Autoplay: hudba se NIKDY nespustí sama při mountu (viz zadání "žádné
 * agresivní autoplay hacky") — teprve první `pointerdown`/`keydown`
 * spustí přehrávání, a jen pokud to preference dovolují.
 *
 * ROUTE-AWARE: playlist se určuje z aktuálního pathname (route-playlist.ts),
 * takže jeden provider obsluhuje celý web — herní stránky hrají `casino`
 * playlist, obsahové stránky (Profil/Žebříčky/Jak to funguje) `universal`.
 * Při přechodu mezi typy stránek se starý track fade-outne a naskočí nový
 * z nového playlistu (viz efekt níž); route bez playlistu (např. /reset)
 * hraje ticho. Provider je mountnutý jednou v app/(site)/layout.tsx, takže
 * se NEMOUNTUJE/UMMOUNTUJE mezi routami a přechod tak může plynule
 * přefadovat (žádný druhý AudioProvider).
 */
export default function AudioProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [preferences, setPreferences] = useState<AudioPreferences>(DEFAULT_AUDIO_PREFERENCES);

  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Playlist se čte z aktuální route (route-playlist.ts) — jediné místo,
  // které rozhoduje, co kde hraje.
  const pathname = usePathname();
  const playlistId = getPlaylistForPath(pathname);
  const playlistIdRef = useRef<MusicPlaylistId | null>(playlistId);
  useEffect(() => {
    playlistIdRef.current = playlistId;
  }, [playlistId]);

  const musicElRef = useRef<HTMLAudioElement | null>(null);
  // Jaký playlist má právě nahraný track v `musicElRef` (null = nic/ticho).
  const currentPlaylistRef = useRef<MusicPlaylistId | null>(null);
  // -1 = ještě nebyl vybraný žádný track (viz startCurrentTrack) — pak se
  // při startu session vylosuje náhodně (viz zadání), ne vždy index 0.
  const trackIndexRef = useRef(-1);
  const errorStreakRef = useRef(0);
  const fadeIntervalRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);
  const sfxElsRef = useRef<Map<SfxId, HTMLAudioElement>>(new Map());
  // Smyčkové SFX mají vlastní elementy i vlastní fade rampu — nesmí si
  // krást tu hudební (ta má jediný `fadeIntervalRef`, viz fadeVolumeTo).
  const sfxLoopElsRef = useRef<Map<SfxId, HTMLAudioElement>>(new Map());
  const sfxLoopFadeRef = useRef<number | null>(null);

  const clearFade = useCallback(() => {
    if (fadeIntervalRef.current !== null) {
      window.clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const clearSfxLoopFade = useCallback(() => {
    if (sfxLoopFadeRef.current !== null) {
      window.clearInterval(sfxLoopFadeRef.current);
      sfxLoopFadeRef.current = null;
    }
  }, []);

  // Stejný lineární ramp jako u hudby, ale s vlastním interval refem (viz
  // komentář u sfxLoopFadeRef) — smyčka se nesmí hádat s fade hudby.
  const fadeSfxLoopTo = useCallback(
    (el: HTMLAudioElement, target: number, durationMs: number, onDone?: () => void) => {
      clearSfxLoopFade();
      const start = el.volume;
      const startedAt = Date.now();
      sfxLoopFadeRef.current = window.setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
        el.volume = start + (target - start) * progress;
        if (progress >= 1) {
          clearSfxLoopFade();
          onDone?.();
        }
      }, FADE_STEP_MS);
    },
    [clearSfxLoopFade]
  );

  const loopVolume = useCallback((def: { loopVolumeScale?: number }) => {
    return preferencesRef.current.volumeSfx * (def.loopVolumeScale ?? 1);
  }, []);

  /**
   * Smyčkový SFX (viz SfxDefinition.loop) — používá ho scratch při stírání
   * losu. Opakované volání během pokračujícího pohybu je no-op (smyčka už
   * běží), takže volající může hlásit aktivitu klidně na každý pointermove.
   * Nikdy nevyhodí chybu do volajícího (stejná fail-safe jako playSfx).
   */
  const startSfxLoop = useCallback(
    (id: SfxId) => {
      if (!preferencesRef.current.sfxEnabled) return;
      if (typeof Audio === "undefined") return;
      try {
        const def = SFX_REGISTRY[id];
        if (!def?.loop) return;

        let el = sfxLoopElsRef.current.get(id);
        if (!el) {
          el = new Audio(def.src);
          el.loop = true;
          el.preload = "auto";
          sfxLoopElsRef.current.set(id, el);
        }

        const target = loopVolume(def);
        if (el.paused) {
          clearSfxLoopFade();
          // Náhodný start uvnitř smyčky — nový tah nezačíná pořád na stejném
          // místě vzorku, takže je míň poznat, že se smyčka opakuje.
          // (`duration` je známá až po načtení metadat, proto guard.)
          if (Number.isFinite(el.duration) && el.duration > 0) el.currentTime = Math.random() * el.duration;
          el.volume = 0;
          void el
            .play()
            .then(() => fadeSfxLoopTo(el, target, SFX_LOOP_FADE_IN_MS))
            .catch(() => {
              // Autoplay blokovaný / soubor chybí — tiše nic.
            });
        } else {
          clearSfxLoopFade();
          el.volume = target;
        }
      } catch {
        // Smyčka je čistě prezentační — nikdy nesmí ovlivnit hru.
      }
    },
    [clearSfxLoopFade, fadeSfxLoopTo, loopVolume]
  );

  const stopSfxLoop = useCallback(
    (id: SfxId) => {
      const el = sfxLoopElsRef.current.get(id);
      if (!el || el.paused) return;
      fadeSfxLoopTo(el, 0, SFX_LOOP_FADE_OUT_MS, () => el.pause());
    },
    [fadeSfxLoopTo]
  );

  // Vypnutí efektů musí utnout i běžící smyčku (jinak by scratch dozníval
  // dál i po "vypnout zvuk").
  useEffect(() => {
    if (preferences.sfxEnabled) return;
    for (const id of sfxLoopElsRef.current.keys()) stopSfxLoop(id);
  }, [preferences.sfxEnabled, stopSfxLoop]);

  // Změna hlasitosti efektů se promítne i do běžící smyčky.
  useEffect(() => {
    for (const [id, el] of sfxLoopElsRef.current) {
      const def = SFX_REGISTRY[id];
      if (def?.loop) el.volume = preferences.volumeSfx * (def.loopVolumeScale ?? 1);
    }
  }, [preferences.volumeSfx]);

  // Lineární ramp hlasitosti právě hrajícího elementu k `target` za
  // `durationMs` — používá se pro fade-out konce tracku i fade-in nového
  // (viz handleTrackEnded/handleTimeUpdate níž). Nový fade vždy zruší ten
  // předchozí (clearFade), ať dva souběžné rampy netahají hlasitost proti sobě.
  const fadeVolumeTo = useCallback(
    (el: HTMLAudioElement, target: number, durationMs: number, onDone?: () => void) => {
      clearFade();
      const start = el.volume;
      const startedAt = Date.now();
      fadeIntervalRef.current = window.setInterval(() => {
        const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
        el.volume = start + (target - start) * progress;
        if (progress >= 1) {
          clearFade();
          onDone?.();
        }
      }, FADE_STEP_MS);
    },
    [clearFade]
  );

  // Preference se čtou z localStorage až po mountu (server o nich neví) —
  // stejný vzor jako lib/casino/storage.ts/loadPlayerState.
  useEffect(() => {
    setPreferences(loadAudioPreferences());
    setMounted(true);
  }, []);

  // Jediné místo, které nastavuje `src` hudebního elementu: vybere náhodný
  // track z daného playlistu (s vyloučením `excludeIndex`, viz "neopakuj
  // stejný track dvakrát po sobě") a spustí ho s fade-inem z ticha.
  const startTrack = useCallback(
    (id: MusicPlaylistId, excludeIndex: number | null) => {
      const el = musicElRef.current;
      // Index se losuje PŘESNĚ jednou (dvě volání by mohla vybrat různé tracky).
      const index = pickRandomTrackIndex(id, excludeIndex);
      const track = MUSIC_PLAYLISTS[id]?.[index];
      if (!el || !track) return;

      trackIndexRef.current = index;
      currentPlaylistRef.current = id;
      clearFade();
      fadingOutRef.current = false;
      el.src = track.src;
      el.volume = 0;
      void el
        .play()
        .then(() => {
          // Track se opravdu rozeběhl — až teď je bezpečné zapomenout
          // předchozí chybovou sérii (viz handleTrackError).
          errorStreakRef.current = 0;
          fadeVolumeTo(el, preferencesRef.current.volumeMusic, TRACK_FADE_MS);
        })
        .catch(() => {
          // Autoplay zablokovaný prohlížečem (žádná interakce ještě
          // neproběhla) nebo soubor chybí — zkusí se znovu při další
          // interakci/skladbě.
        });
    },
    [clearFade, fadeVolumeTo]
  );

  // Zastaví hudbu s fade-outem (a vrátí hlasitost na cílovou úroveň, ať
  // případný další start/resume nezačíná potichu).
  const stopTrack = useCallback(
    (onDone?: () => void) => {
      const el = musicElRef.current;
      if (!el) return;
      const finish = () => {
        el.pause();
        el.volume = preferencesRef.current.volumeMusic;
        onDone?.();
      };
      if (el.paused) {
        finish();
        return;
      }
      fadeVolumeTo(el, 0, TRACK_FADE_MS, finish);
    },
    [fadeVolumeTo]
  );

  // Track doznil přirozeně (fade-out už proběhl přes handleTimeUpdate níž,
  // viz TRACK_FADE_MS) — vylosuje DALŠÍ náhodný track s vyloučením toho
  // právě skončivšího (viz zadání "neopakuj bezprostředně stejný track
  // dvakrát po sobě"), naskočí na tichu a plynule fade-in na cílovou hlasitost.
  const handleTrackEnded = useCallback(() => {
    const id = currentPlaylistRef.current;
    if (!id) return;
    // Další track ze STEJNÉHO playlistu, s vyloučením toho, co právě dohrál.
    startTrack(id, trackIndexRef.current);
  }, [startTrack]);

  const handleTrackError = useCallback(() => {
    // Placeholder bez reálného MP3 (viz tracks.ts) nebo poškozený soubor —
    // zkusí jiný náhodný track z aktuálního playlistu, ale nejvýš tolikrát,
    // kolik je v něm aktivních tracků, ať to při samých rozbitých souborech
    // nezacyklí požadavky donekonečna.
    const id = currentPlaylistRef.current;
    if (!id) return;
    errorStreakRef.current += 1;
    if (errorStreakRef.current >= getActiveIndices(id).length) return;
    startTrack(id, trackIndexRef.current);
  }, [startTrack]);

  // Cca TRACK_FADE_MS před koncem aktuálního tracku spustí fade-out (viz
  // zadání "fade out končícího tracku"), jen jednou za track (fadingOutRef).
  // Samotný přechod na další skladbu pak řeší 'ended' (handleTrackEnded) —
  // v okamžiku, kdy 'ended' nastane, je hlasitost už na/blízko nule, takže
  // přechod nepraská.
  const handleTimeUpdate = useCallback(() => {
    const el = musicElRef.current;
    if (!el || fadingOutRef.current) return;
    if (!Number.isFinite(el.duration) || el.duration <= 0) return;
    const remainingMs = (el.duration - el.currentTime) * 1000;
    if (remainingMs <= TRACK_FADE_MS) {
      fadingOutRef.current = true;
      fadeVolumeTo(el, 0, Math.max(remainingMs, FADE_STEP_MS));
    }
  }, [fadeVolumeTo]);

  // Lazy-vytvoří sdílený <audio> element pro hudbu (žádné JSX <audio>,
  // ať nejde o hydration-sensitive DOM uzel) — `preload="none"`, ať se
  // nic nestahuje, dokud hudba reálně nezačne hrát (viz zadání "výkon").
  useEffect(() => {
    if (typeof Audio === "undefined") return;
    const el = new Audio();
    el.preload = "none";
    el.addEventListener("ended", handleTrackEnded);
    el.addEventListener("error", handleTrackError);
    el.addEventListener("timeupdate", handleTimeUpdate);
    musicElRef.current = el;
    // Zachyceno TEĎ (mount), ne přečteno z refu až v cleanup — do té doby
    // playSfx() mohl přidat další položky do stejné Map instance, ale
    // sama Map (referenci drží tenhle `const`) se za dobu života providera
    // nemění, viz sfxElsRef inicializace přes useRef(new Map()) výš.
    const sfxEls = sfxElsRef.current;
    const sfxLoops = sfxLoopElsRef.current;

    return () => {
      el.pause();
      el.removeEventListener("ended", handleTrackEnded);
      el.removeEventListener("error", handleTrackError);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      clearFade();
      currentPlaylistRef.current = null;
      musicElRef.current = null;
      // SFX elementy taky zastavit — odchod z /casino (provider unmount)
      // nesmí nechat doznívat nic na pozadí (viz zadání "po odchodu z
      // /casino hudbu zastav").
      for (const sfxEl of sfxEls.values()) sfxEl.pause();
      sfxEls.clear();
      // Smyčkové efekty taky utnout (jinak by scratch dozníval po odchodu ze stránky).
      clearSfxLoopFade();
      for (const loopEl of sfxLoops.values()) loopEl.pause();
      sfxLoops.clear();
    };
  }, [handleTrackEnded, handleTrackError, handleTimeUpdate, clearFade, clearSfxLoopFade]);

  // Drží hudbu v souladu s (mounted, musicEnabled, aktuální playlist):
  // - route bez playlistu nebo vypnutá hudba → fade-out a ticho,
  // - stejný playlist už hraje → jen dohrát (resume po unmute),
  // - jiný playlist (navigace mezi typy stránek) → fade-out starého tracku
  //   a plynulý fade-in nového z nového playlistu.
  useEffect(() => {
    if (!mounted) return;
    const el = musicElRef.current;
    if (!el) return;

    if (!playlistId || !preferences.musicEnabled) {
      if (!el.paused) stopTrack();
      return;
    }

    if (currentPlaylistRef.current === playlistId && el.src) {
      if (el.paused) {
        el.volume = preferencesRef.current.volumeMusic;
        void el.play().catch(() => {});
      }
      return;
    }

    if (!el.paused && el.src) {
      stopTrack(() => startTrack(playlistId, null));
    } else {
      el.pause();
      startTrack(playlistId, null);
    }
  }, [mounted, preferences.musicEnabled, playlistId, startTrack, stopTrack]);

  // Živě promítne změnu hlasitosti do právě hrající skladby.
  useEffect(() => {
    if (musicElRef.current) musicElRef.current.volume = preferences.volumeMusic;
  }, [preferences.volumeMusic]);

  // Relevantní první interakce (klik/klávesa kdekoli v podstromu providera
  // = kdekoli na /casino, viz zadání "kliknutí na spin/CTA/kamkoliv do
  // stage") — pokusí se spustit hudbu, pokud ještě nehraje a preference to
  // dovolují. Listener zůstává napořád (ne jen "once"), ať se hudba umí
  // rozjet i při druhém pokusu, když první `.play()` selže.
  useEffect(() => {
    if (!mounted) return;

    function handleInteraction() {
      if (!preferencesRef.current.musicEnabled) return;
      const el = musicElRef.current;
      if (!el || !el.paused) return;
      const id = playlistIdRef.current;
      if (!id) return;
      if (currentPlaylistRef.current !== id || !el.src) {
        startTrack(id, null);
        return;
      }
      el.volume = preferencesRef.current.volumeMusic;
      void el.play().catch(() => {});
    }

    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [mounted, startTrack]);

  const toggleMuted = useCallback(() => {
    setPreferences((current) => {
      const nextEnabled = !(current.musicEnabled || current.sfxEnabled);
      const next: AudioPreferences = { ...current, musicEnabled: nextEnabled, sfxEnabled: nextEnabled };
      saveAudioPreferences(next);
      return next;
    });
  }, []);

  // Jeden Audio element na SFX id, znovupoužitý při každém přehrání
  // (`currentTime = 0` + `play()`) místo vytváření nové instance — brání
  // to nekontrolovanému hromadění přehrávačů při rychlém opakovaném
  // triggeru STEJNÉHO efektu (viz zadání "zabránění překrývání/chaosu"),
  // zatímco RŮZNÉ efekty (např. spin_stop + near_miss) hrát souběžně smí.
  // Celé tělo v try/catch — SFX je čistě prezentační vrstva a NESMÍ
  // ovlivnit spin/wallet logiku volajícího, ani při neočekávané chybě
  // (viz zadání "audio failure nesmí ovlivnit spin API nebo wallet").
  const playSfx = useCallback((id: SfxId) => {
    if (!preferencesRef.current.sfxEnabled) return;
    if (typeof Audio === "undefined") return;

    try {
      const def = SFX_REGISTRY[id];
      if (!def) return;

      let el = sfxElsRef.current.get(id);
      if (!el) {
        el = new Audio(def.src);
        el.preload = "auto";
        sfxElsRef.current.set(id, el);
      }
      el.volume = preferencesRef.current.volumeSfx;
      el.currentTime = 0;
      void el.play().catch(() => {
        // Soubor chybí (placeholder), nenačetl se, nebo autoplay
        // zablokovaný — tiše ignorováno.
      });
    } catch {
      // Viz komentář výš — SFX nikdy nesmí prohodit chybu do volajícího.
    }
  }, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      ready: mounted,
      muted: !preferences.musicEnabled && !preferences.sfxEnabled,
      preferences,
      toggleMuted,
      playSfx,
      startSfxLoop,
      stopSfxLoop,
    }),
    [mounted, preferences, toggleMuted, playSfx, startSfxLoop, stopSfxLoop]
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}
