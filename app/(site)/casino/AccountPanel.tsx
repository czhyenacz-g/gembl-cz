"use client";

import { useState, useSyncExternalStore } from "react";
import LoginModal from "../../components/auth/LoginModal";
import { useAudio } from "../../../lib/audio/AudioProvider.tsx";
import TopUpModal from "../../components/wallet/TopUpModal";
import { useSession } from "../../../lib/auth/use-session-client";
import { loadPlayerState, subscribePlayerState } from "../../../lib/casino/storage";

// Zůstatek: pro přihlášené je zdrojem pravdy server (useSession), pro
// hosty localStorage jako dřív (viz storage.ts) — stejné pravidlo jako
// BalanceBadge v headeru.
export default function AccountPanel() {
  const { session } = useSession();
  const { playSfx } = useAudio();
  const localCredits = useSyncExternalStore(
    subscribePlayerState,
    () => loadPlayerState().credits,
    () => null
  );
  const [showLogin, setShowLogin] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  const loggedIn = session.status === "authenticated";
  const credits = session.status === "authenticated" ? session.credits : localCredits;

  return (
    <div className="gembl-panel">
      <p className="gembl-panel-title">Účet</p>
      <div className="gembl-panel-body flex flex-col items-center text-center">
        <div
          className="flex h-16 w-16 items-center justify-center border-2 border-gembl-ink bg-gembl-paper font-serif text-xl font-black text-gembl-ink"
          aria-hidden="true"
        >
          {session.status === "authenticated" ? session.email.charAt(0).toUpperCase() : "?"}
        </div>
        <p className="mt-2 max-w-full truncate font-serif text-base font-bold uppercase text-gembl-ink">
          {session.status === "authenticated" ? session.email : "Host"}
        </p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gembl-muted">Zůstatek</p>
        <p className="font-mono text-3xl font-bold text-gembl-red">
          {credits === null ? "—" : `${credits.toLocaleString("cs-CZ")} G`}
        </p>

        {!loggedIn && (
          <p className="mt-3 text-xs text-gembl-muted">
            Dochází G? Přihlas se jen e-mailem a dostaneš <strong className="text-gembl-ink">až 800 G zdarma</strong>.
          </p>
        )}

        <div className="mt-5 flex w-full flex-col gap-2">
          {loggedIn ? (
            <button
              type="button"
              className="gembl-cta w-full"
              onClick={() => {
                playSfx("ui_click");
                setShowTopUp(true);
              }}
            >
              Dobít kredit
            </button>
          ) : (
            <button
              type="button"
              className="gembl-cta w-full"
              onClick={() => {
                playSfx("ui_click");
                setShowLogin(true);
              }}
            >
              Získat až 800 G
            </button>
          )}
          <button type="button" className="gembl-cta gembl-cta--disabled w-full" disabled>
            Historie transakcí
          </button>
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} callbackUrl="/casino" />}
      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </div>
  );
}
