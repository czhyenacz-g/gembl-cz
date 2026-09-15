import type { AudioPreferences } from "./types.ts";

// localStorage perzistence audio preferencí — stejný vzor jako
// lib/casino/storage.ts (globalThis.localStorage guard, try/catch,
// tichý fallback na výchozí hodnoty při chybě/poškozených datech).
const STORAGE_KEY = "gembl:audio-preferences";

// Výchozí hlasitosti jsou záměrně umírněné (viz zadání "nechci hlasité
// nebo agresivní zvuky") — hudba je jen tichá kulisa (0.15–0.25, viz
// zadání "background music nastav spíš nízko"), SFX smí být výraznější.
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  musicEnabled: true,
  sfxEnabled: true,
  volumeMusic: 0.2,
  volumeSfx: 0.5,
};

function isValidPreferences(value: unknown): value is AudioPreferences {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.musicEnabled === "boolean" &&
    typeof v.sfxEnabled === "boolean" &&
    typeof v.volumeMusic === "number" &&
    Number.isFinite(v.volumeMusic) &&
    typeof v.volumeSfx === "number" &&
    Number.isFinite(v.volumeSfx)
  );
}

/** Bez localStorage (SSR, private mode) nebo s poškozenými daty vrátí výchozí preference — nikdy nespadne. */
export function loadAudioPreferences(): AudioPreferences {
  if (!globalThis.localStorage) return DEFAULT_AUDIO_PREFERENCES;

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIO_PREFERENCES;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidPreferences(parsed)) return DEFAULT_AUDIO_PREFERENCES;

    return parsed;
  } catch {
    return DEFAULT_AUDIO_PREFERENCES;
  }
}

export function saveAudioPreferences(preferences: AudioPreferences): void {
  if (!globalThis.localStorage) return;

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Zápis selhal (quota, private mode) — přehrávání pokračuje v rámci
    // aktuální session, jen se volba neuloží mezi reloady.
  }
}
