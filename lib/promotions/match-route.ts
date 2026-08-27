// Čisté, dependency-free route matching pro promotions — žádný
// server-only import, jde bezpečně použít i z "use client" komponenty
// (např. při klientském doladění po usePathname()). Ověřený vzor z
// HowToFish.cz, tady beze změny (je to už obecné, žádná úprava potřeba).
export type RouteMatchSpecificity = "exact" | "wildcard" | "global";

export function matchSpecificity(pattern: string, pathname: string): RouteMatchSpecificity | null {
  if (pattern === "*") {
    return pathname.startsWith("/") ? "global" : null;
  }

  if (pattern === pathname) {
    return "exact";
  }

  if (pattern.endsWith("/*")) {
    const base = pattern.slice(0, -2);
    if (base === "") {
      return pathname.startsWith("/") ? "wildcard" : null;
    }
    if (pathname === base || pathname.startsWith(`${base}/`)) {
      return "wildcard";
    }
  }

  return null;
}

/** http(s):// = externí odkaz (sponsored/target=_blank), "/..." = interní. */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
