// Klientský (localStorage) anonymní identifikátor pro first-party
// analytics — bez fingerprintingu, bez IP/UA. Bezpečné volat i mimo
// prohlížeč (SSR): bez `localStorage` vrátí `null`, nikdy nevygeneruje
// nepersistované "duch" ID.

const STORAGE_KEY = "analytics_anonymous_id";

export function getOrCreateAnonymousId(): string | null {
  if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage) return null;

  try {
    const existing = globalThis.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    globalThis.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return null;
  }
}
