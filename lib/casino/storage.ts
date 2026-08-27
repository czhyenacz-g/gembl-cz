import type { PlayerState } from "./types.ts";
import { STARTING_CREDITS } from "../../app/config/site.ts";

// localStorage perzistence hráčova stavu — čistě klientská, žádný
// server/DB v MVP (viz CLAUDE.md). `globalThis.localStorage` (ne
// `window.`), ať jde v testech nahradit jednoduchým in-memory fake bez
// DOM/jsdom. Explicitní `if (!globalThis.localStorage)` guard PŘED
// jakýmkoli čtením/zápisem — optional chaining samo o sobě by tiše
// vracelo undefined a volající by pak omylem vygeneroval nepersistovaný
// "duch" stav (viz historie bugu se stejným vzorem v jiném projektu).
const STORAGE_KEY = "gembl:player-state";

// Malý in-memory pub/sub, aby si BalanceBadge (globální header) a
// SlotMachine (/automaty) nemusely nic posílat přes props/context —
// obě čtou/zapisují STEJNÝ localStorage klíč, jen z různých míst stromu
// komponent. Volá se z savePlayerState(), takže žádné volající místo
// nemusí notify explicitně řešit. Viz BalanceBadge.tsx (useSyncExternalStore).
const listeners = new Set<() => void>();

export function subscribePlayerState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function createInitialPlayerState(): PlayerState {
  return {
    credits: STARTING_CREDITS,
    totalSpins: 0,
    totalWagered: 0,
    totalWon: 0,
    unlockedAchievements: [],
    createdAt: new Date().toISOString(),
  };
}

function isValidPlayerState(value: unknown): value is PlayerState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.credits === "number" &&
    Number.isFinite(v.credits) &&
    typeof v.totalSpins === "number" &&
    typeof v.totalWagered === "number" &&
    typeof v.totalWon === "number" &&
    Array.isArray(v.unlockedAchievements) &&
    v.unlockedAchievements.every((a) => typeof a === "string") &&
    typeof v.createdAt === "string"
  );
}

/** Bez localStorage (SSR, private mode) nebo s poškozenými daty vrátí čerstvý výchozí stav — nikdy nespadne. */
export function loadPlayerState(): PlayerState {
  if (!globalThis.localStorage) return createInitialPlayerState();

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialPlayerState();

    const parsed: unknown = JSON.parse(raw);
    if (!isValidPlayerState(parsed)) return createInitialPlayerState();

    return parsed;
  } catch {
    return createInitialPlayerState();
  }
}

export function savePlayerState(state: PlayerState): void {
  if (!globalThis.localStorage) return;

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Zápis selhal (quota, private mode) — hra musí fungovat dál i bez
    // úspěšné perzistence, jen se stav neuloží mezi reloady.
  } finally {
    // I při selhání zápisu se odběratelé nechají přepočítat — čtou
    // znovu přes loadPlayerState() samy, tohle je jen "podívej se znovu".
    for (const listener of listeners) listener();
  }
}

export function resetPlayerState(): PlayerState {
  const fresh = createInitialPlayerState();
  savePlayerState(fresh);
  return fresh;
}
