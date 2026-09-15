"use client";

import { useCallback, useEffect, useState } from "react";

export type SessionState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; email: string; credits: number; hasClaimedWelcomeBonus: boolean };

type MeResponse = { loggedIn: boolean; email?: string; credits?: number; hasClaimedWelcomeBonus?: boolean };

// Malý pub/sub podobný lib/casino/storage.ts (subscribePlayerState) — po
// akci, co mění balance na serveru (spin, dokončený nákup, login/logout),
// zavolej notifySessionChanged() a všechny mountnuté useSession() instance
// (Header, AccountPanel, ...) se samy přenačtou. Žádný Context/Redux.
const listeners = new Set<() => void>();

export function notifySessionChanged(): void {
  for (const listener of listeners) listener();
}

async function fetchSession(): Promise<SessionState> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await response.json()) as MeResponse;
    if (data.loggedIn && typeof data.email === "string" && typeof data.credits === "number") {
      return {
        status: "authenticated",
        email: data.email,
        credits: data.credits,
        hasClaimedWelcomeBonus: data.hasClaimedWelcomeBonus === true,
      };
    }
    return { status: "guest" };
  } catch {
    return { status: "guest" };
  }
}

export function useSession(): { session: SessionState; refresh: () => Promise<void> } {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    setSession(await fetchSession());
  }, []);

  useEffect(() => {
    refresh();
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);

  return { session, refresh };
}
