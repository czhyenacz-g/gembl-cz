// Ochrana proti open-redirectu (viz zadání "callbackUrl bezpečně validuj").
// `callbackUrl` smí být jen relativní cesta v rámci webu.
export function sanitizeCallbackUrl(raw: string | null | undefined, fallback = "/casino"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  // "//evil.com" i "/\evil.com" prohlížeč umí interpretovat jako
  // protokol-relativní URL na cizí doménu.
  if (raw.startsWith("//") || raw.startsWith("/\\") || raw.includes("://")) return fallback;
  return raw;
}
