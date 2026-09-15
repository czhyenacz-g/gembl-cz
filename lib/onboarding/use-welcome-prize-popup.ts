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
 *
 * PŘIHLÁŠENÝ uživatel (`loggedIn`) tenhle popup NIKDY automaticky
 * nedostane — gate je na `loggedIn`, ne jen na `hasClaimedWelcomeBonus`
 * (viz zadání "ani při refreshi, ani pokud zůstal starý pending prize").
 * Přihlášením se totiž welcome bonus vždy uděluje rovnou při GET
 * /api/auth/verify (viz app/api/auth/verify/route.ts), takže tenhle popup
 * u přihlášeného účtu už nemá co nabízet — `loggedIn` gate to garantuje
 * i pro edge-case, kdy by `hasClaimedWelcomeBonus` z nějakého důvodu
 * (např. ještě neproběhlý refetch session) zaostávalo za realitou.
 */
export function useWelcomePrizePopup(): WelcomePrizePopupState {
  const { session } = useSession();
  const [amountG, setAmountG] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const loggedIn = session.status === "authenticated";

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  useEffect(() => {
    if (session.status === "loading") return;
    if (loggedIn) return;
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
  }, [session.status, loggedIn, dismissed]);

  function dismiss() {
    writeDismissed();
    setDismissed(true);
  }

  // `loggedIn` v návratu vynuceně vrátí `amountG: null` bez ohledu na to,
  // co je v `amountG` state — i kdyby se hráč přihlásil PROTI BĚHU
  // popupu (stejná tab session), na dalším renderu se popup okamžitě
  // schová (viz zadání "ani při refreshi").
  return { amountG: loggedIn || dismissed ? null : amountG, loggedIn, dismiss };
}
