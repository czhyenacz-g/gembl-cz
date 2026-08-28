"use client";

import { useSyncExternalStore } from "react";
import { loadPlayerState, subscribePlayerState } from "../../../lib/casino/storage";

// Nickname zatím nemá žádný zdroj pravdy (žádný účet/auth systém, viz
// zadání) — stejný dočasný placeholder jako v headeru, dokud nepřibude
// skutečný profil. Zůstatek je naopak reálný (localStorage přes
// storage.ts, stejný vzor jako BalanceBadge).
const PLACEHOLDER_NICKNAME = "Smolar77";

export default function AccountPanel() {
  const credits = useSyncExternalStore(
    subscribePlayerState,
    () => loadPlayerState().credits,
    () => null
  );

  return (
    <div className="gembl-panel">
      <p className="gembl-panel-title">Účet</p>
      <div className="gembl-panel-body flex flex-col items-center text-center">
        <div
          className="flex h-16 w-16 items-center justify-center border-2 border-gembl-ink bg-gembl-paper font-serif text-xl font-black text-gembl-ink"
          aria-hidden="true"
        >
          {PLACEHOLDER_NICKNAME.charAt(0)}
        </div>
        <p className="mt-2 font-serif text-base font-bold uppercase text-gembl-ink">{PLACEHOLDER_NICKNAME}</p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gembl-muted">Zůstatek</p>
        <p className="font-mono text-3xl font-bold text-gembl-red">
          {credits === null ? "—" : `${credits.toLocaleString("cs-CZ")} G`}
        </p>

        <div className="mt-5 flex w-full flex-col gap-2">
          {/* Skutečné dobíjení kreditů zatím neexistuje (žádné platby,
              viz zadání) — tlačítka jsou zatím jen UI, bez handleru. */}
          <button type="button" className="gembl-cta gembl-cta--disabled w-full" disabled>
            Dobít kredit
          </button>
          <button type="button" className="gembl-cta gembl-cta--disabled w-full" disabled>
            Historie transakcí
          </button>
        </div>
      </div>
    </div>
  );
}
