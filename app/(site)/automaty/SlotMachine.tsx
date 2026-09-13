"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CreditGateModal from "../../components/wallet/CreditGateModal";
import { notifySessionChanged, useSession } from "../../../lib/auth/use-session-client";
import { checkNewAchievements, type Achievement } from "../../../lib/casino/achievements";
import { pickRandomMessage } from "../../../lib/casino/messages";
import { reportGameStatsDeltaClient } from "../../../lib/casino/report-stats-client";
import { spin } from "../../../lib/casino/slot-engine";
import { createInitialPlayerState, loadPlayerState, resetPlayerState, savePlayerState } from "../../../lib/casino/storage";
import type { PlayerState, SlotSymbol } from "../../../lib/casino/types";
import { SPIN_COST } from "../../config/site";
import AchievementToast from "./AchievementToast";
import Reel from "./Reel";

const SPIN_ANIMATION_MS = 900;
const JACKPOT_FLASH_MS = 800;
const GAME_ID = "automaty";
// Globální statistiky se reportují v DÁVKÁCH, ne po každém spinu (viz
// zadání "aby každý spin neznamenal zbytečně drahou operaci") — po 10
// spinech, nebo dřív, když hráč stránku opustí/schová tab (viz
// visibilitychange/pagehide níž), ať se nic neztratí.
const FLUSH_EVERY_N_SPINS = 10;

type ToastItem = { key: number; title: string };

// Hlavní orchestrátor hry — obyčejný useState, žádný Redux/Context (viz
// zadání "žádný zbytečně komplikovaný state management"). `player` (stats/
// achievementy) pořád zrcadlí localStorage přes storage.ts jako dřív, ale
// `player.credits` je u přihlášeného hráče jen ZRCADLO poslední hodnoty ze
// serveru (viz useSession) — skutečná sázka i kontrola dostatku kreditů
// jde přes POST /api/wallet/spin, ne přes lokální odečet, aby šlo nakoupit
// G přes Stripe a mít to reálně vymahatelné. Nepřihlášení hrají přesně
// jako dřív, čistě lokálně, bez serveru.
export default function SlotMachine() {
  const { session, refresh: refreshSession } = useSession();
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [jackpotFlash, setJackpotFlash] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCreditGate, setShowCreditGate] = useState(false);
  const toastKeyRef = useRef(0);
  const pendingStatsRef = useRef({ spins: 0, wagered: 0, won: 0 });

  const loggedIn = session.status === "authenticated";
  const effectiveCredits = session.status === "authenticated" ? session.credits : player?.credits ?? null;

  // Stav se čte z localStorage až po mountu (server o něm neví) — stejný
  // vzor jako BalanceBadge/getOrCreateAnonymousId napříč projekty, ať
  // nevznikne hydration mismatch (server vždy vyrenderuje skeleton níž).
  useEffect(() => {
    setPlayer(loadPlayerState());
    setMounted(true);
  }, []);

  // Automaticky nabídne dobití/přihlášení, jakmile hráči na skutečnou hru
  // nezbývá dost G (viz zadání "modal se má objevit i s nulovým kreditem") —
  // jednou na stav, ne opakovaně při každém renderu.
  useEffect(() => {
    if (effectiveCredits === null) return;
    if (effectiveCredits < SPIN_COST) setShowCreditGate(true);
  }, [effectiveCredits]);

  // Stabilní identita (useCallback, prázdné deps) — čte/píše jen refy,
  // takže je bezpečné ji použít v efektu níž bez re-registrace listenerů.
  const flushPendingStats = useCallback((resets = 0) => {
    const pending = pendingStatsRef.current;
    if (pending.spins === 0 && pending.wagered === 0 && pending.won === 0 && resets === 0) return;

    reportGameStatsDeltaClient({ game: GAME_ID, spins: pending.spins, wagered: pending.wagered, won: pending.won, resets });
    pendingStatsRef.current = { spins: 0, wagered: 0, won: 0 };
  }, []);

  // Odešle, co se zatím nashromáždilo, i když hráč nedohraje na násobek
  // 10 spinů — jinak by se poslední nedokončená dávka ztratila.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushPendingStats();
    }
    function handlePageHide() {
      flushPendingStats();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushPendingStats]);

  function pushToast(title: string) {
    const key = ++toastKeyRef.current;
    setToasts((prev) => [...prev, { key, title }]);
  }

  function dismissToast(key: number) {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }

  function applySpinResult(player: PlayerState, credits: number, payout: number): PlayerState {
    const withoutAchievements: PlayerState = {
      ...player,
      credits,
      totalSpins: player.totalSpins + 1,
      totalWagered: player.totalWagered + SPIN_COST,
      totalWon: player.totalWon + payout,
    };
    const newAchievements: Achievement[] = checkNewAchievements(withoutAchievements);
    const finalState: PlayerState = {
      ...withoutAchievements,
      unlockedAchievements: [...withoutAchievements.unlockedAchievements, ...newAchievements.map((a) => a.id)],
    };
    for (const achievement of newAchievements) pushToast(achievement.title);
    return finalState;
  }

  function finishSpinAnimation(result: ReturnType<typeof spin>) {
    setReels(result.reels);
    setSpinning(false);

    pendingStatsRef.current.spins += 1;
    pendingStatsRef.current.wagered += SPIN_COST;
    pendingStatsRef.current.won += result.payout;
    if (pendingStatsRef.current.spins >= FLUSH_EVERY_N_SPINS) flushPendingStats();

    if (result.isTripleMatch) {
      setJackpotFlash(true);
      window.setTimeout(() => {
        setJackpotFlash(false);
        setResultMessage(pickRandomMessage());
      }, JACKPOT_FLASH_MS);
    } else {
      setResultMessage(pickRandomMessage());
    }
  }

  function handleSpin() {
    if (!player || spinning || effectiveCredits === null || effectiveCredits < SPIN_COST) {
      if (effectiveCredits !== null && effectiveCredits < SPIN_COST) setShowCreditGate(true);
      return;
    }

    setSpinning(true);
    setResultMessage(null);
    setJackpotFlash(false);

    window.setTimeout(() => {
      void runSpin();
    }, SPIN_ANIMATION_MS);
  }

  async function runSpin() {
    if (!player) return;
    const result = spin();

    if (loggedIn) {
      try {
        const response = await fetch("/api/wallet/spin", { method: "POST" });
        const data = (await response.json()) as { balance?: number; error?: string };

        if (!response.ok || typeof data.balance !== "number") {
          setSpinning(false);
          await refreshSession();
          if (response.status === 402) setShowCreditGate(true);
          return;
        }

        const finalState = applySpinResult(player, data.balance, result.payout);
        savePlayerState(finalState);
        setPlayer(finalState);
        notifySessionChanged();
        finishSpinAnimation(result);
      } catch {
        setSpinning(false);
      }
      return;
    }

    const finalState = applySpinResult(player, player.credits - SPIN_COST, result.payout);
    savePlayerState(finalState);
    setPlayer(finalState);
    finishSpinAnimation(result);
  }

  function handleResetConfirm() {
    // Odešle, co se zatím nashromáždilo, a ve STEJNÉ dávce i sám reset —
    // ne dva samostatné requesty.
    flushPendingStats(1);

    // U přihlášeného hráče reset smaže jen lokální statistiky/achievementy
    // (kosmetika) — kredity se NIKDY nevrací na STARTING_CREDITS, protože
    // ty jsou u přihlášených účtů reálně vázané na serverový zůstatek
    // (welcome bonus + Stripe nákupy). Jinak by "reset kariéry" byl
    // triviální způsob, jak si "vyresetovat" zpět kredity zdarma.
    const fresh: PlayerState =
      session.status === "authenticated" ? { ...createInitialPlayerState(), credits: session.credits } : resetPlayerState();
    if (session.status === "authenticated") savePlayerState(fresh);

    setPlayer(fresh);
    setReels(null);
    setResultMessage(null);
    setJackpotFlash(false);
    setShowResetConfirm(false);
  }

  if (!mounted || !player) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-28 w-64 animate-pulse border border-gembl-line bg-gembl-paper-dark" />
      </div>
    );
  }

  const canSpin = !spinning && effectiveCredits !== null && effectiveCredits >= SPIN_COST;
  const netLoss = player.totalWagered - player.totalWon;
  const displayCredits = effectiveCredits ?? player.credits;

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="fixed right-4 top-20 z-50 flex flex-col gap-2 sm:top-24">
        {toasts.map((t) => (
          <AchievementToast key={t.key} title={t.title} onDismiss={() => dismissToast(t.key)} />
        ))}
      </div>

      <div className="gembl-block p-6 shadow-hard sm:p-8">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <Reel symbol={reels ? reels[0] : null} spinning={spinning} />
          <Reel symbol={reels ? reels[1] : null} spinning={spinning} />
          <Reel symbol={reels ? reels[2] : null} spinning={spinning} />
        </div>

        <div className="mt-6 min-h-[3.5rem] text-center">
          {jackpotFlash && <p className="animate-pulse font-serif text-3xl font-black uppercase text-gembl-red">JACKPOT!</p>}
          {!jackpotFlash && resultMessage && (
            <div>
              <p className="font-serif text-xl font-bold text-gembl-ink">Výhra: 0 G</p>
              <p className="mt-1 text-sm text-gembl-muted">{resultMessage}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin}
            className="min-h-[52px] w-full max-w-xs border-2 border-gembl-ink bg-gembl-red px-6 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
          >
            {spinning ? "TOČÍ SE…" : `ROZTOČIT ZA ${SPIN_COST} G`}
          </button>
          <p className="text-center text-[11px] text-gembl-muted">
            Upozornění: V této hře není možné vyhrát. Spin stojí {SPIN_COST} virtuálních kreditů a výhra je vždy 0 G.
          </p>
          {!canSpin && !spinning && (
            <button type="button" onClick={() => setShowCreditGate(true)} className="text-center text-sm font-semibold text-gembl-red underline">
              {loggedIn ? "Nemáš dost kreditů. Dobij G a hraj dál." : "Nemáš dost kreditů. Přihlas se a dobij G."}
            </button>
          )}
        </div>
      </div>

      <div className="gembl-block mt-8 p-5">
        <h2 className="gembl-section-heading text-lg">Statistiky</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
          <StatItem label="Zůstatek" value={`${displayCredits.toLocaleString("cs-CZ")} G`} />
          <StatItem label="Spinů" value={player.totalSpins.toLocaleString("cs-CZ")} />
          <StatItem label="Protočeno" value={`${player.totalWagered.toLocaleString("cs-CZ")} G`} />
          <StatItem label="Vyhráno" value={`${player.totalWon.toLocaleString("cs-CZ")} G`} />
          <StatItem label="Čistá ztráta" value={`${netLoss.toLocaleString("cs-CZ")} G`} />
        </dl>
      </div>

      <div className="mt-6 text-center">
        {!showResetConfirm ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="min-h-[44px] border border-gembl-ink px-4 py-2 text-sm uppercase tracking-wide text-gembl-muted transition hover:border-gembl-red hover:text-gembl-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
          >
            RESETOVAT KARIÉRU
          </button>
        ) : (
          <div className="mx-auto max-w-sm border-2 border-gembl-red bg-gembl-paper p-4">
            <p className="text-sm text-gembl-ink">Opravdu chceš resetovat kariéru? Tohle nevratně smaže tvůj postup.</p>
            <div className="mt-3 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleResetConfirm}
                className="min-h-[40px] border-2 border-gembl-ink bg-gembl-red px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gembl-paper shadow-hard-sm transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                Ano, resetovat
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="min-h-[40px] border border-gembl-ink px-4 py-2 text-sm text-gembl-ink transition hover:bg-gembl-paper-dark"
              >
                Zrušit
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreditGate && <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/automaty" />}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gembl-muted">{label}</dt>
      <dd className="font-mono text-base font-semibold text-gembl-ink">{value}</dd>
    </div>
  );
}
