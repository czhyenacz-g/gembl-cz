"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkNewAchievements, type Achievement } from "../../lib/casino/achievements";
import { pickRandomMessage } from "../../lib/casino/messages";
import { reportGameStatsDeltaClient } from "../../lib/casino/report-stats-client";
import { spin } from "../../lib/casino/slot-engine";
import { loadPlayerState, resetPlayerState, savePlayerState } from "../../lib/casino/storage";
import type { PlayerState, SlotSymbol } from "../../lib/casino/types";
import { SPIN_COST } from "../config/site";
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
// zadání "žádný zbytečně komplikovaný state management"). Jediný zdroj
// pravdy je `player` (zrcadlí localStorage přes storage.ts), reely a
// UI-only stavy (spinning/jackpot/toasty) jsou čistě lokální animační
// detaily bez perzistence.
export default function SlotMachine() {
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [jackpotFlash, setJackpotFlash] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const toastKeyRef = useRef(0);
  const pendingStatsRef = useRef({ spins: 0, wagered: 0, won: 0 });

  // Stav se čte z localStorage až po mountu (server o něm neví) — stejný
  // vzor jako BalanceBadge/getOrCreateAnonymousId napříč projekty, ať
  // nevznikne hydration mismatch (server vždy vyrenderuje skeleton níž).
  useEffect(() => {
    setPlayer(loadPlayerState());
    setMounted(true);
  }, []);

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

  function handleSpin() {
    if (!player || spinning || player.credits < SPIN_COST) return;

    setSpinning(true);
    setResultMessage(null);
    setJackpotFlash(false);

    window.setTimeout(() => {
      const result = spin();
      const withoutAchievements: PlayerState = {
        ...player,
        credits: player.credits - SPIN_COST,
        totalSpins: player.totalSpins + 1,
        totalWagered: player.totalWagered + SPIN_COST,
        totalWon: player.totalWon + result.payout,
      };
      const newAchievements: Achievement[] = checkNewAchievements(withoutAchievements);
      const finalState: PlayerState = {
        ...withoutAchievements,
        unlockedAchievements: [...withoutAchievements.unlockedAchievements, ...newAchievements.map((a) => a.id)],
      };

      savePlayerState(finalState);
      setPlayer(finalState);
      setReels(result.reels);
      setSpinning(false);

      pendingStatsRef.current.spins += 1;
      pendingStatsRef.current.wagered += SPIN_COST;
      pendingStatsRef.current.won += result.payout;
      if (pendingStatsRef.current.spins >= FLUSH_EVERY_N_SPINS) flushPendingStats();

      for (const achievement of newAchievements) pushToast(achievement.title);

      if (result.isTripleMatch) {
        setJackpotFlash(true);
        window.setTimeout(() => {
          setJackpotFlash(false);
          setResultMessage(pickRandomMessage());
        }, JACKPOT_FLASH_MS);
      } else {
        setResultMessage(pickRandomMessage());
      }
    }, SPIN_ANIMATION_MS);
  }

  function handleResetConfirm() {
    // Odešle, co se zatím nashromáždilo, a ve STEJNÉ dávce i sám reset —
    // ne dva samostatné requesty.
    flushPendingStats(1);
    const fresh = resetPlayerState();
    setPlayer(fresh);
    setReels(null);
    setResultMessage(null);
    setJackpotFlash(false);
    setShowResetConfirm(false);
  }

  if (!mounted || !player) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-28 w-64 animate-pulse rounded-lg bg-white/5" />
      </div>
    );
  }

  const canSpin = !spinning && player.credits >= SPIN_COST;
  const netLoss = player.totalWagered - player.totalWon;

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="fixed right-4 top-20 z-50 flex flex-col gap-2 sm:top-24">
        {toasts.map((t) => (
          <AchievementToast key={t.key} title={t.title} onDismiss={() => dismissToast(t.key)} />
        ))}
      </div>

      <div className="rounded-2xl border border-neon-purple/40 bg-gradient-to-b from-[#150025] to-[#0a0014] p-6 shadow-glow-pink sm:p-8">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <Reel symbol={reels ? reels[0] : null} spinning={spinning} />
          <Reel symbol={reels ? reels[1] : null} spinning={spinning} />
          <Reel symbol={reels ? reels[2] : null} spinning={spinning} />
        </div>

        <div className="mt-6 min-h-[3.5rem] text-center">
          {jackpotFlash && (
            <p className="animate-pulse font-serif text-3xl font-extrabold text-neon-gold text-glow-gold">JACKPOT!</p>
          )}
          {!jackpotFlash && resultMessage && (
            <div>
              <p className="font-serif text-xl font-bold text-white">Výhra: 0 G</p>
              <p className="mt-1 text-sm text-gray-400">{resultMessage}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin}
            className="min-h-[52px] w-full max-w-xs rounded-lg bg-neon-pink px-6 py-3 font-serif text-lg font-bold text-white shadow-glow-pink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
          >
            {spinning ? "TOČÍ SE…" : `ROZTOČIT ZA ${SPIN_COST} G`}
          </button>
          <p className="text-center text-[11px] text-gray-500">
            Upozornění: V této hře není možné vyhrát. Spin stojí {SPIN_COST} virtuálních kreditů a výhra je vždy 0 G.
          </p>
          {player.credits < SPIN_COST && (
            <p className="text-center text-sm text-neon-cyan">Nemáš dost kreditů. Resetuj kariéru a zkus to znovu.</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-serif text-lg text-neon-cyan">Statistiky</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <StatItem label="Zůstatek" value={`${player.credits.toLocaleString("cs-CZ")} G`} />
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
            className="min-h-[44px] rounded-md border border-white/20 px-4 py-2 text-sm text-gray-400 transition hover:border-neon-cyan/60 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
          >
            RESETOVAT KARIÉRU
          </button>
        ) : (
          <div className="mx-auto max-w-sm rounded-lg border border-neon-pink/40 bg-black/60 p-4">
            <p className="text-sm text-white">Opravdu chceš resetovat kariéru? Tohle nevratně smaže tvůj postup.</p>
            <div className="mt-3 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleResetConfirm}
                className="min-h-[40px] rounded-md bg-neon-pink px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Ano, resetovat
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="min-h-[40px] rounded-md border border-white/20 px-4 py-2 text-sm text-gray-300 transition hover:border-white/40"
              >
                Zrušit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-serif text-base font-semibold text-white">{value}</dd>
    </div>
  );
}
