import "server-only";

// Jednoduchý in-memory sliding-window rate limiter pro lehké ingest
// endpointy (např. POST /api/events) — bez Redisu, bez sdílení mezi
// instancemi, best-effort. Pro cokoliv, kde je potřeba přesný/sdílený
// limit napříč instancemi, tenhle helper nestačí.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_PER_WINDOW) {
    hits.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return false;
}
