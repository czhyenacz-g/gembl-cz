"use client";

import { useSyncExternalStore } from "react";
import { useAudio } from "../../../../lib/audio/AudioProvider.tsx";
import { useSession } from "../../../../lib/auth/use-session-client.ts";
import { loadPlayerState, subscribePlayerState } from "../../../../lib/casino/storage.ts";
import type { CasinoSkin } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";

// Stejný zdroj pravdy jako AccountPanel.tsx (přihlášený = server přes
// useSession, host = localStorage) — jen jiná prezentace (napozicovaná
// nad artwork rámeček místo boxu v gridu). Business logika 1:1 stejná,
// jen zdvojená prezentační vrstva (JSX), viz zadání "měnit primárně
// prezentační vrstvu".
//
// Modal stav si NEDRŽÍ sama (na rozdíl od AccountPanel.tsx) — jen zavolá
// `onRequestLogin`/`onRequestTopUp`, které vlastní ClassicCasinoStage
// (jediné místo, které smí ve stage variantě rozhodnout, jaký modal je
// otevřený — viz zadání "jeden zdroj pravdy", "AccountOverlay nemá
// implementovat vlastní paralelní modal logiku"). Jinak by mohl vzniknout
// druhý modal nad/pod tím, který si nezávisle otevře jiná část stage.
export default function AccountOverlay({
  layout,
  onRequestLogin,
  onRequestTopUp,
}: {
  layout: CasinoSkin["layout"]["account"];
  onRequestLogin: () => void;
  onRequestTopUp: () => void;
}) {
  const { session } = useSession();
  const { playSfx } = useAudio();
  const localCredits = useSyncExternalStore(
    subscribePlayerState,
    () => loadPlayerState().credits,
    () => null
  );

  const loggedIn = session.status === "authenticated";
  const credits = session.status === "authenticated" ? session.credits : localCredits;
  const displayName = session.status === "authenticated" ? session.email : "Host";

  return (
    <>
      <div
        style={rectStyle(layout.avatar)}
        aria-hidden="true"
        className="flex items-center justify-center border-2 border-gembl-ink bg-gembl-paper font-serif text-2xl font-black text-gembl-ink"
      >
        {loggedIn ? displayName.charAt(0).toUpperCase() : "?"}
      </div>

      <p
        style={rectStyle(layout.name)}
        className="flex items-center justify-center overflow-hidden truncate whitespace-nowrap px-2 text-center font-serif text-xs font-bold uppercase tracking-wide text-gembl-ink"
        title={displayName}
      >
        {displayName}
      </p>

      <p
        style={rectStyle(layout.balance)}
        className="flex items-center justify-center overflow-hidden whitespace-nowrap px-2 font-mono text-xl font-bold text-gembl-red"
      >
        {credits === null ? "—" : `${credits.toLocaleString("cs-CZ")} G`}
      </p>

      <button
        type="button"
        style={rectStyle(layout.primaryCta)}
        onClick={() => {
          playSfx("ui_click");
          if (loggedIn) onRequestTopUp();
          else onRequestLogin();
        }}
        className="flex items-center justify-center bg-transparent font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
      >
        {loggedIn ? "Dobít kredit" : "Získat až 800 G"}
      </button>

      <button
        type="button"
        disabled
        style={rectStyle(layout.secondaryCta)}
        className="flex cursor-not-allowed items-center justify-center bg-transparent font-serif text-xs font-bold uppercase tracking-wide text-gembl-muted"
      >
        Historie transakcí
      </button>
    </>
  );
}
