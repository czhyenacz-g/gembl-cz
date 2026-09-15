"use client";

import { useEffect, useState } from "react";
import { useSession } from "../auth/use-session-client.ts";

// Session-scoped (ne localStorage) "zavřel bez vyzvednutí" flag — po
// zavření se popup do konce téhle tab session (refresh, klik jinam)
// neukazuje znovu (viz zadání "nemusí vyskakovat opakovaně při každém
// reloadu"), ale nová návštěva (nová záložka/po zavření prohlížeče) ho
// zase nabídne, dokud výhra skutečně nebude vyzvednutá — server pravda
// (hasClaimedWelcomeBonus / DB idempotence) je jediná věc, co popup
// natrvalo vypne.
const DISMISS_KEY = "gembl:welcome-popup-dismissed";

function readDismissed(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    globalThis.sessionStorage?.setItem(DISMISS_KEY, "1");
  } catch {
    // sessionStorage nedostupné (private mode apod.) — popup se prostě
    // může znovu ukázat při dalším renderu, není to kritické.
  }
}

type WelcomePrizePopupState = {
  /** `null`, dokud se ještě nenačetlo (nebo návštěvník nemá nárok) — nerenderuj popup. */
  amountG: number | null;
  loggedIn: boolean;
  dismiss: () => void;
};

/**
 * Sdílená eligibilita + načtení pending welcome-prize částky — používá ji
 * jak desktop stage (ClassicCasinoStage), tak mobile fallback
 * (WelcomePrizeOnArrival), ať obě cesty jedou přesně stejnou logikou (viz
 * zadání "logika bonusu musí být stejná").
 */
export function useWelcomePrizePopup(): WelcomePrizePopupState {
  const { session } = useSession();
  const [amountG, setAmountG] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const loggedIn = session.status === "authenticated";
  const alreadyClaimed = session.status === "authenticated" && session.hasClaimedWelcomeBonus;

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  useEffect(() => {
    if (session.status === "loading") return;
    if (alreadyClaimed) return;
    if (dismissed) return;

    let cancelled = false;
    fetch("/api/onboarding/prize", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { amountG?: number }) => {
        if (!cancelled && typeof data.amountG === "number") setAmountG(data.amountG);
      })
      .catch(() => {
        // Fail-open jako zbytek fail-open UX flow v projektu (viz
        // GlobalStatsLine apod.) — bez pending prize se popup jen
        // neukáže, nic dalšího se nerozbije.
      });
    return () => {
      cancelled = true;
    };
  }, [session.status, alreadyClaimed, dismissed]);

  function dismiss() {
    writeDismissed();
    setDismissed(true);
  }

  return { amountG: alreadyClaimed || dismissed ? null : amountG, loggedIn, dismiss };
}
