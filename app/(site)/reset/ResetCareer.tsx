"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STARTING_CREDITS } from "../../config/site";
import { useSession } from "../../../lib/auth/use-session-client";
import { reportGameStatsDeltaClient } from "../../../lib/casino/report-stats-client";
import { createInitialPlayerState, loadPlayerState, resetPlayerState, savePlayerState } from "../../../lib/casino/storage";
import type { PlayerState } from "../../../lib/casino/types";

// Reset kariéry je globální (jeden localStorage klíč pro všechny hry, viz
// lib/casino/storage.ts), takže se do globálních statistik reportuje pod
// vlastním id — ne pod konkrétní hrou, na které tlačítko dřív bývalo.
const RESET_GAME_ID = "career";

// Dvoukrokové potvrzení (tlačítko → "Opravdu…?") — stejný vzor a stejné
// texty, jaké měl reset dřív na /automaty (viz git historie
// app/(site)/automaty/SlotMachine.tsx), jen přesunuté na vlastní stránku.
type Phase = "idle" | "confirm" | "done";

export default function ResetCareer() {
  const { session } = useSession();
  // Stav se čte z localStorage až po mountu (server o něm neví) — stejný
  // vzor jako SlotMachine/BalanceBadge, ať nevznikne hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    setPlayer(loadPlayerState());
    setMounted(true);
  }, []);

  function handleReset() {
    // Fail-open report globálního resetu — nesmí ovlivnit samotný reset
    // (viz report-stats-client.ts). Posílá se sám, bez nedokončené dávky:
    // tu si /automaty odešle sama při odchodu ze stránky.
    reportGameStatsDeltaClient({ game: RESET_GAME_ID, spins: 0, wagered: 0, won: 0, resets: 1 });

    // U přihlášeného hráče reset smaže jen lokální statistiky/achievementy
    // (kosmetika) — kredity jsou vázané na serverový účet (welcome bonus +
    // Stripe nákupy), takže se NIKDY nevrací na STARTING_CREDITS. Jinak by
    // byl reset triviální způsob, jak si kredity "vyresetovat" zdarma.
    const fresh =
      session.status === "authenticated" ? { ...createInitialPlayerState(), credits: session.credits } : resetPlayerState();
    if (session.status === "authenticated") savePlayerState(fresh);

    setPlayer(fresh);
    setPhase("done");
  }

  if (!mounted || !player) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="h-40 w-full animate-pulse border border-gembl-line bg-gembl-paper-dark" />
      </div>
    );
  }

  const loggedIn = session.status === "authenticated";
  const netLoss = player.totalWagered - player.totalWon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-gembl-ink">
      <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">Reset kariéry</h1>

      {phase === "done" ? (
        <section className="mt-8 border-2 border-gembl-ink bg-gembl-paper-dark p-5">
          <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-gembl-red">Kariéra je vynulovaná</h2>
          <p className="mt-3">
            Statistiky i achievementy jsou pryč a začínáš znovu od začátku.{" "}
            {loggedIn
              ? `Zůstatek na účtu zůstává ${player.credits.toLocaleString("cs-CZ")} G (kredity se resetem nemění).`
              : `Vrací se ti startovní zůstatek ${STARTING_CREDITS.toLocaleString("cs-CZ")} G.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/automaty"
              className="min-h-[44px] border-2 border-gembl-ink bg-gembl-red px-5 py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
            >
              Hrát znovu
            </Link>
            <Link
              href="/casino"
              className="min-h-[44px] border-2 border-gembl-ink px-5 py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-ink transition hover:bg-gembl-paper-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
            >
              Zpět do kasina
            </Link>
          </div>
        </section>
      ) : (
        <>
          <p className="mt-4 text-lg text-gembl-muted">
            Tohle je jediné místo, kde se dá kariéra vynulovat. Smaže se tvůj postup v prohlížeči — statistiky her i
            odemčené achievementy — a začneš znovu od začátku.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-2 border-gembl-ink bg-gembl-paper-dark p-5 sm:grid-cols-3">
            <StatRow label="Zůstatek" value={`${player.credits.toLocaleString("cs-CZ")} G`} />
            <StatRow label="Spinů" value={player.totalSpins.toLocaleString("cs-CZ")} />
            <StatRow label="Protočeno" value={`${player.totalWagered.toLocaleString("cs-CZ")} G`} />
            <StatRow label="Vyhráno" value={`${player.totalWon.toLocaleString("cs-CZ")} G`} />
            <StatRow label="Čistá ztráta" value={`${netLoss.toLocaleString("cs-CZ")} G`} />
            <StatRow label="Achievementy" value={player.unlockedAchievements.length.toLocaleString("cs-CZ")} />
          </dl>

          <p className="mt-6 text-sm text-gembl-muted">
            {loggedIn
              ? `Jsi přihlášený, takže ti zůstane zůstatek z účtu (${player.credits.toLocaleString("cs-CZ")} G) — smažou se jen statistiky a achievementy.`
              : `Nejsi přihlášený — postup se ukládá jen v tomhle prohlížeči a resetem se vrátíš na startovních ${STARTING_CREDITS.toLocaleString("cs-CZ")} G.`}
          </p>

          {phase === "idle" ? (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setPhase("confirm")}
                className="min-h-[44px] border-2 border-gembl-ink bg-gembl-red px-5 py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
              >
                RESETOVAT KARIÉRU
              </button>
            </div>
          ) : (
            <div className="mt-8 border-2 border-gembl-red bg-gembl-paper p-5">
              <p className="text-center text-gembl-ink">
                Opravdu chceš resetovat kariéru? Tohle nevratně smaže tvůj postup.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-[44px] border-2 border-gembl-ink bg-gembl-red px-5 py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
                >
                  Ano, resetovat
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("idle")}
                  className="min-h-[44px] border-2 border-gembl-ink px-5 py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-ink transition hover:bg-gembl-paper-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
                >
                  Zrušit
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-wide text-gembl-muted">{label}</dt>
      <dd className="font-mono text-lg font-semibold text-gembl-ink">{value}</dd>
    </div>
  );
}
