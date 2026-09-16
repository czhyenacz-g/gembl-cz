"use client";

import { useEffect, useState } from "react";
import { notifySessionChanged } from "../../../lib/auth/use-session-client.ts";
import { useAudio } from "../../../lib/audio/AudioProvider.tsx";
import ModalShell from "../ModalShell";

// Onboarding "vyhrál jsi zdarma" popup (viz zadání) — retro-marketingový
// tón, žádný nový modal systém: stejný ModalShell jako Login/TopUp/
// CreditGate. `amountG` je vždy ZÁKLADNÍ (nezdvojená) částka — přihlášením
// dostane hráč interně 2× tolik (viz lib/onboarding/welcome-prize.ts), ale
// tenhle text to nikde neříká natvrdo (zadání "nekomunikovat 2x").
export default function WelcomePrizeModal({
  amountG,
  loggedIn,
  onClose,
  onRequestLogin,
}: {
  amountG: number;
  loggedIn: boolean;
  onClose: () => void;
  onRequestLogin: () => void;
}) {
  const { playSfx } = useAudio();
  const [claiming, setClaiming] = useState(false);
  const [claimedBalance, setClaimedBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Jednou při otevření popupu — parody casino, klidně přehnaně slavnostní
  // fanfára i pro pouhé (virtuální) kredity zdarma (viz zadání). `playSfx`
  // má stabilní identitu (useCallback, viz AudioProvider.tsx), takže je
  // bezpečné v deps bez re-triggerování při každé změně preferencí.
  useEffect(() => {
    playSfx("popup_open");
  }, [playSfx]);

  async function handleClaim() {
    playSfx("ui_click");
    if (!loggedIn) {
      onRequestLogin();
      return;
    }
    if (claiming) return;
    setClaiming(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/claim-welcome-prize", { method: "POST" });
      const data = (await response.json()) as { balance?: number; error?: string };
      if (!response.ok || typeof data.balance !== "number") throw new Error(data.error ?? "claim_failed");
      notifySessionChanged();
      setClaimedBalance(data.balance);
      playSfx("credit_added");
    } catch {
      setError("Výhru se nepodařilo vyzvednout, zkus to prosím znovu.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <ModalShell title="Blahopřejeme!" onClose={onClose}>
      {claimedBalance !== null ? (
        <>
          <p className="text-sm text-gembl-ink">Výhra byla připsána na tvůj účet.</p>
          <p className="mt-2 font-mono text-2xl font-bold text-gembl-red">{claimedBalance.toLocaleString("cs-CZ")} G</p>
          <button type="button" onClick={onClose} className="gembl-cta mt-4 w-full">
            Hrát dál
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gembl-ink">
            Dnes jste vyhrál <strong className="font-mono text-gembl-red">{amountG} G</strong> zdarma do hry.
          </p>
          <p className="mt-2 text-sm text-gembl-ink">Přihlaste se e-mailem a můžete získat ještě vyšší výhru.</p>
          <button type="button" onClick={handleClaim} disabled={claiming} className="gembl-cta mt-4 w-full disabled:opacity-60">
            {claiming ? "Vyzvedávám…" : "VYZVEDNOUT VÝHRU"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 text-xs font-semibold uppercase tracking-wide text-gembl-muted underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
          >
            Teď ne
          </button>
          {error && <p className="mt-3 text-xs font-semibold text-gembl-red">{error}</p>}
        </>
      )}
    </ModalShell>
  );
}
