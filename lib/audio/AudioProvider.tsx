"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MUSIC_PLAYLIST } from "./tracks.ts";
import { SFX_REGISTRY } from "./sfx.ts";
import { DEFAULT_AUDIO_PREFERENCES, loadAudioPreferences, saveAudioPreferences } from "./preferences.ts";
import type { AudioPreferences, SfxId } from "./types.ts";

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
};

// Výchozí (no-op) hodnota kontextu — komponenty jako SlotMachine.tsx sdílí
// stejný useAudio() hook i mimo /casino (např. na /automaty, viz zadání
// "co neměnit: skin architekturu" — SlotMachine je sdílená mezi oběma
// routami). Mimo AudioProvider (dnes jen app/(site)/casino/layout.tsx)
// playSfx() tiše nic nedělá — komponenta nikdy nespadne na chybějícím
// providerovi.
const noopContextValue: AudioContextValue = {
  ready: false,
  muted: true,
  preferences: DEFAULT_AUDIO_PREFERENCES,
  toggleMuted: () => {},
  playSfx: () => {},
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
 * kdekoli v podstromu, kde je provider mountnutý (tj. kdekoli na /casino,
 * viz app/(site)/casino/layout.tsx), spustí přehrávání, a jen pokud to
 * preference dovolují. Odchod z /casino provider unmountne → efekt níž
 * hudbu zastaví (viz zadání "po odchodu z /casino hudbu zastav").
 */
export default function AudioProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [preferences, setPreferences] = useState<AudioPreferences>(DEFAULT_AUDIO_PREFERENCES);

  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const musicElRef = useRef<HTMLAudioElement | null>(null);
  const trackIndexRef = useRef(0);
  const errorStreakRef = useRef(0);
  const sfxElsRef = useRef<Map<SfxId, HTMLAudioElement>>(new Map());

  // Preference se čtou z localStorage až po mountu (server o nich neví) —
  // stejný vzor jako lib/casino/storage.ts/loadPlayerState.
  useEffect(() => {
    setPreferences(loadAudioPreferences());
    setMounted(true);
  }, []);

  const startCurrentTrack = useCallback(() => {
    const el = musicElRef.current;
    const track = MUSIC_PLAYLIST[trackIndexRef.current];
    if (!el || !track) return;
    el.src = track.src;
    el.volume = preferencesRef.current.volumeMusic;
    void el.play().catch(() => {
      // Autoplay zablokovaný prohlížečem (žádná interakce ještě neproběhla)
      // nebo soubor chybí — zkusí se znovu při další interakci/skladbě.
    });
  }, []);

  const handleTrackEnded = useCallback(() => {
    errorStreakRef.current = 0;
    trackIndexRef.current = (trackIndexRef.current + 1) % MUSIC_PLAYLIST.length;
    startCurrentTrack();
  }, [startCurrentTrack]);

  const handleTrackError = useCallback(() => {
    // Placeholder bez reálného MP3 (viz tracks.ts) nebo poškozený soubor —
    // zkusí další skladbu, ale nejvýš jednou přes celý playlist, ať to
    // při samých placeholderech nezacyklí požadavky donekonečna.
    errorStreakRef.current += 1;
    if (errorStreakRef.current >= MUSIC_PLAYLIST.length) return;
    trackIndexRef.current = (trackIndexRef.current + 1) % MUSIC_PLAYLIST.length;
    startCurrentTrack();
  }, [startCurrentTrack]);

  // Lazy-vytvoří sdílený <audio> element pro hudbu (žádné JSX <audio>,
  // ať nejde o hydration-sensitive DOM uzel) — `preload="none"`, ať se
  // nic nestahuje, dokud hudba reálně nezačne hrát (viz zadání "výkon").
  useEffect(() => {
    if (typeof Audio === "undefined") return;
    const el = new Audio();
    el.preload = "none";
    el.addEventListener("ended", handleTrackEnded);
    el.addEventListener("error", handleTrackError);
    musicElRef.current = el;
    // Zachyceno TEĎ (mount), ne přečteno z refu až v cleanup — do té doby
    // playSfx() mohl přidat další položky do stejné Map instance, ale
    // sama Map (referenci drží tenhle `const`) se za dobu života providera
    // nemění, viz sfxElsRef inicializace přes useRef(new Map()) výš.
    const sfxEls = sfxElsRef.current;

    return () => {
      el.pause();
      el.removeEventListener("ended", handleTrackEnded);
      el.removeEventListener("error", handleTrackError);
      musicElRef.current = null;
      // SFX elementy taky zastavit — odchod z /casino (provider unmount)
      // nesmí nechat doznívat nic na pozadí (viz zadání "po odchodu z
      // /casino hudbu zastav").
      for (const sfxEl of sfxEls.values()) sfxEl.pause();
      sfxEls.clear();
    };
  }, [handleTrackEnded, handleTrackError]);

  // Hudbu zapíná/vypíná preference.musicEnabled — buď z toggleMuted()
  // (sám je user gesto, přehrání projde), nebo z počátečního načtení
  // localStorage (bez gesta prohlížeč přehrání zablokuje, viz `.catch()`
  // výš — o skutečný start se pak postará interakční listener níž).
  useEffect(() => {
    if (!mounted) return;
    const el = musicElRef.current;
    if (!el) return;

    if (!preferences.musicEnabled) {
      el.pause();
      return;
    }
    if (!el.src) {
      errorStreakRef.current = 0;
      startCurrentTrack();
    } else {
      void el.play().catch(() => {});
    }
  }, [mounted, preferences.musicEnabled, startCurrentTrack]);

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
      if (!el.src) startCurrentTrack();
      else void el.play().catch(() => {});
    }

    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [mounted, startCurrentTrack]);

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
    }),
    [mounted, preferences, toggleMuted, playSfx]
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}
