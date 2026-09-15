"use client";

import { useState, useSyncExternalStore } from "react";
import LoginModal from "../../components/auth/LoginModal.tsx";
import WelcomePrizeModal from "../../components/wallet/WelcomePrizeModal.tsx";
import { useSession } from "../../../lib/auth/use-session-client.ts";
import { loadPlayerState, subscribePlayerState } from "../../../lib/casino/storage.ts";
import { useWelcomePrizePopup } from "../../../lib/onboarding/use-welcome-prize-popup.ts";
import { MIN_BET } from "../../config/site.ts";

// Mobile/menší-desktop fallback ekvivalent stage's welcome-prize popup
// (viz app/(site)/casino/stage/ClassicCasinoStage.tsx) — stejná sdílená
// eligibilita (useWelcomePrizePopup), jen samostatná komponenta místo
// centrálního modal stavu, přesně stejný vzor jako CreditGateOnArrival.tsx
// (vlastní lokální `showLogin` toggle, žádný nový modal systém). Logika
// bonusu (2× po přihlášení, jedno vyzvednutí) je 1:1 stejná jako na stage
// (viz zadání "logika bonusu musí být stejná").
//
// Když je zůstatek pod MIN_BET, ustoupí (CreditGateOnArrival už v tu
// chvíli řeší naléhavější věc) — ať se na legacy layoutu nezobrazí dva
// modaly najednou.
export default function WelcomePrizeOnArrival() {
  const { session } = useSession();
  const localCredits = useSyncExternalStore(
    subscribePlayerState,
    () => loadPlayerState().credits,
    () => null
  );
  const welcomePrize = useWelcomePrizePopup();
  const [showLogin, setShowLogin] = useState(false);

  const effectiveCredits = session.status === "authenticated" ? session.credits : localCredits;
  const lowCredits = effectiveCredits !== null && effectiveCredits < MIN_BET;

  if (showLogin) return <LoginModal onClose={() => setShowLogin(false)} callbackUrl="/casino" />;
  if (lowCredits || welcomePrize.amountG === null) return null;

  return (
    <WelcomePrizeModal
      amountG={welcomePrize.amountG}
      loggedIn={welcomePrize.loggedIn}
      onClose={welcomePrize.dismiss}
      onRequestLogin={() => setShowLogin(true)}
    />
  );
}
