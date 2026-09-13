"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import CreditGateModal from "../../components/wallet/CreditGateModal";
import { useSession } from "../../../lib/auth/use-session-client";
import { loadPlayerState, subscribePlayerState } from "../../../lib/casino/storage";
import { MIN_BET } from "../../config/site";

// "Modal se má objevit i když už uživatel přijde na /casino s nulovým
// kreditem" (viz zadání sekce 9) — na rozdíl od SlotMachine.tsx (kde je
// stejná logika navázaná na konkrétní pokus o spin) tohle jen zkontroluje
// stav při příchodu na přehledovou stránku.
export default function CreditGateOnArrival() {
  const { session } = useSession();
  const localCredits = useSyncExternalStore(
    subscribePlayerState,
    () => loadPlayerState().credits,
    () => null
  );
  const [dismissed, setDismissed] = useState(false);

  const effectiveCredits = session.status === "authenticated" ? session.credits : localCredits;

  useEffect(() => {
    setDismissed(false);
  }, [effectiveCredits]);

  if (session.status === "loading" || effectiveCredits === null || dismissed) return null;
  if (effectiveCredits >= MIN_BET) return null;

  return (
    <CreditGateModal loggedIn={session.status === "authenticated"} onClose={() => setDismissed(true)} callbackUrl="/casino" />
  );
}
