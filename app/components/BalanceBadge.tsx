"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "../../lib/auth/use-session-client";
import { loadPlayerState, subscribePlayerState } from "../../lib/casino/storage";

// Malý odznak v headeru se zůstatkem — globální (root layout). Pro
// přihlášené je zdrojem pravdy server (useSession, viz
// lib/auth/use-session-client.ts), pro hosty localStorage jako dřív (viz
// storage.ts). `getServerSnapshot` vrací null (server nikdy nezná
// localStorage), takže se badge neukáže dřív, než je hydratovaný.
export default function BalanceBadge() {
  const { session } = useSession();
  const localCredits = useSyncExternalStore(
    subscribePlayerState,
    () => loadPlayerState().credits,
    () => null
  );

  const credits = session.status === "authenticated" ? session.credits : localCredits;
  if (credits === null) return null;

  return (
    <span className="inline-flex items-center gap-1 border-2 border-gembl-ink bg-gembl-paper px-3 py-1 font-mono text-sm font-semibold text-gembl-ink">
      {credits.toLocaleString("cs-CZ")} G
    </span>
  );
}
