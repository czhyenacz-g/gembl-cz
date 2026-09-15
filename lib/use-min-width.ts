"use client";

import { useLayoutEffect, useState } from "react";

// Sdílený "je viewport aspoň X px široký" hook — používá ho jak přepínání
// /casino stage/legacy layoutu (CasinoViewSwitch), tak skrývání globální
// navigace/patičky na desktop stage (SiteChrome), ať obě místa čtou
// STEJNOU logiku, ne dvě nezávislé kopie matchMedia kódu. Server vždy
// vrátí `false` (deterministický první render, žádný hydration mismatch),
// `useLayoutEffect` hodnotu doladí ještě před prvním vykreslením
// prohlížečem, takže probliknutí je v praxi nepostřehnutelné.
export function useMinWidth(px: number): boolean {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const mql = window.matchMedia(`(min-width: ${px}px)`);
    setMatches(mql.matches);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [px]);

  return matches;
}
