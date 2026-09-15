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
import { BET_STEP, MAX_BET, MIN_BET } from "../../config/site";
import { maxAffordableBet } from "../../../lib/wallet/bet";
import type { CasinoSkin } from "../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../lib/casino-skins/rect-style.ts";
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
// jako dřív, čistě lokálně, bez serveru. `bet` (výše sázky, 10–100 G po
// 10) je čistě UI stav, nepersistuje se mezi reloady — po odehrání se
// zachovává pro další kolo, jen se sráží (clamp), když na ni přestane
// stačit zůstatek (viz efekt níž).
type SlotMachineProps = {
  /** Když true (+ `layout`), vykreslí jen holé živé prvky napozicované
   * podle `layout` (viz app/(site)/casino/stage/) místo vlastního
   * `gembl-block` boxu se statistikami/resetem — pro overlay nad /casino
   * artwork skinem. Veškerá logika/state výš je STEJNÁ v obou režimech,
   * mění se jen JSX na konci komponenty (viz zadání "měnit primárně
   * prezentační vrstvu, ne business logiku"). */
  embedded?: boolean;
  layout?: CasinoSkin["layout"]["slot"];
  /** Sdílený stav "je otevřený credit-gate modal" — na /casino stage ho
   * ovládá rodič (ClassicCasinoStage), aby SlotMachine a AccountOverlay
   * nikdy neotevřely dva modaly zároveň (viz zadání "jeden zdroj pravdy").
   * Na /automaty (embedded=false) se nepředává — komponenta si drží
   * vlastní lokální stav přesně jako dřív. */
  creditGate?: { open: boolean; onOpenChange: (open: boolean) => void };
};

export default function SlotMachine({ embedded, layout, creditGate }: SlotMachineProps = {}) {
  const { session, refresh: refreshSession } = useSession();
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [bet, setBet] = useState(MIN_BET);
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [jackpotFlash, setJackpotFlash] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [localShowCreditGate, setLocalShowCreditGate] = useState(false);
  const showCreditGate = creditGate ? creditGate.open : localShowCreditGate;
  const setShowCreditGate = creditGate ? creditGate.onOpenChange : setLocalShowCreditGate;
  const toastKeyRef = useRef(0);
  const pendingStatsRef = useRef({ spins: 0, wagered: 0, won: 0 });

  const loggedIn = session.status === "authenticated";
  const effectiveCredits = session.status === "authenticated" ? session.credits : player?.credits ?? null;
  const maxAllowedBet = effectiveCredits === null ? MAX_BET : maxAffordableBet(effectiveCredits);

  // Stav se čte z localStorage až po mountu (server o něm neví) — stejný
  // vzor jako BalanceBadge/getOrCreateAnonymousId napříč projekty, ať
  // nevznikne hydration mismatch (server vždy vyrenderuje skeleton níž).
  useEffect(() => {
    setPlayer(loadPlayerState());
    setMounted(true);
  }, []);

  // Sázka nikdy nepřesáhne, co si hráč může dovolit — po odehrání (nebo po
  // přihlášení/dobití, kdy se effectiveCredits taky mění) se sama srazí na
  // nejvyšší povolenou hodnotu (viz zadání "20 G zůstane → sázka se sníží
  // na 20 G"), ale nikdy netlačí nahoru nad MIN_BET, když na sázku vůbec
  // nezbývá (tlačítko je pak stejně disabled přes canSpin).
  useEffect(() => {
    setBet((current) => {
      if (maxAllowedBet < MIN_BET) return current;
      if (current > maxAllowedBet) return maxAllowedBet;
      if (current < MIN_BET) return MIN_BET;
      return current;
    });
  }, [maxAllowedBet]);

  // Automaticky nabídne dobití/přihlášení, jakmile hráči na skutečnou hru
  // nezbývá ani minimální sázka (viz zadání "modal se má objevit i s
  // nulovým kreditem") — jednou na stav, ne opakovaně při každém renderu.
  useEffect(() => {
    if (effectiveCredits === null) return;
    if (effectiveCredits < MIN_BET) setShowCreditGate(true);
    // `setShowCreditGate` je buď stabilní useState setter (lokální režim),
    // nebo `creditGate.onOpenChange` z rodiče (stage režim) — ten NENÍ
    // garantovaně stabilní napříč rendery, proto je v deps (na rozdíl od
    // efektu výš pro `maxAllowedBet`, kde je to čistý useState setter).
  }, [effectiveCredits, setShowCreditGate]);

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

  function adjustBet(delta: number) {
    setBet((current) => {
      const next = current + delta;
      if (next < MIN_BET || next > maxAllowedBet) return current;
      return next;
    });
  }

  function applySpinResult(player: PlayerState, credits: number, payout: number, wagered: number): PlayerState {
    const withoutAchievements: PlayerState = {
      ...player,
      credits,
      totalSpins: player.totalSpins + 1,
      totalWagered: player.totalWagered + wagered,
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

  function finishSpinAnimation(result: ReturnType<typeof spin>, wagered: number) {
    setReels(result.reels);
    setSpinning(false);

    pendingStatsRef.current.spins += 1;
    pendingStatsRef.current.wagered += wagered;
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
    if (!player || spinning || effectiveCredits === null || effectiveCredits < bet) {
      if (effectiveCredits !== null && effectiveCredits < MIN_BET) setShowCreditGate(true);
      return;
    }

    const wagered = bet;
    setSpinning(true);
    setResultMessage(null);
    setJackpotFlash(false);

    window.setTimeout(() => {
      void runSpin(wagered);
    }, SPIN_ANIMATION_MS);
  }

  async function runSpin(wagered: number) {
    if (!player) return;
    const result = spin();

    if (loggedIn) {
      try {
        const response = await fetch("/api/wallet/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bet: wagered }),
        });
        const data = (await response.json()) as { balance?: number; error?: string };

        if (!response.ok || typeof data.balance !== "number") {
          setSpinning(false);
          await refreshSession();
          if (response.status === 402) setShowCreditGate(true);
          return;
        }

        const finalState = applySpinResult(player, data.balance, result.payout, wagered);
        savePlayerState(finalState);
        setPlayer(finalState);
        notifySessionChanged();
        finishSpinAnimation(result, wagered);
      } catch {
        setSpinning(false);
      }
      return;
    }

    const finalState = applySpinResult(player, player.credits - wagered, result.payout, wagered);
    savePlayerState(finalState);
    setPlayer(finalState);
    finishSpinAnimation(result, wagered);
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
    setBet(MIN_BET);
    setReels(null);
    setResultMessage(null);
    setJackpotFlash(false);
    setShowResetConfirm(false);
  }

  if (!mounted || !player) {
    // Embedded (/casino stage): dokud není hydratováno, necháme prostě
    // vidět artwork idle stav pod tím — žádný pulsing skeleton box přes
    // připravené plochy.
    if (embedded) return null;
    return (
      <div className="flex justify-center py-16">
        <div className="h-28 w-64 animate-pulse border border-gembl-line bg-gembl-paper-dark" />
      </div>
    );
  }

  const canSpin = !spinning && effectiveCredits !== null && effectiveCredits >= bet && bet >= MIN_BET;
  const netLoss = player.totalWagered - player.totalWon;
  const displayCredits = effectiveCredits ?? player.credits;

  if (embedded && layout) {
    return (
      <>
        <div className="fixed right-4 top-20 z-50 flex flex-col gap-2 sm:top-24">
          {toasts.map((t) => (
            <AchievementToast key={t.key} title={t.title} onDismiss={() => dismissToast(t.key)} />
          ))}
        </div>

        {/* Idle stav = artwork samo (statické symboly v obrázku) — živé
            válce se ukážou, až se má co ukazovat (spin/výsledek), viz
            zadání "pokud artwork obsahuje statické symboly, použij je
            jako idle state". */}
        {(spinning || reels) && (
          <div style={rectStyle(layout.reels)} className="flex items-center justify-center gap-2">
            <Reel symbol={reels ? reels[0] : null} spinning={spinning} />
            <Reel symbol={reels ? reels[1] : null} spinning={spinning} />
            <Reel symbol={reels ? reels[2] : null} spinning={spinning} />
          </div>
        )}

        <div style={rectStyle(layout.resultMessage)} className="flex flex-col items-center justify-center gap-1 px-2 text-center">
          {jackpotFlash && <p className="animate-pulse font-serif text-2xl font-black uppercase text-gembl-red">JACKPOT!</p>}
          {!jackpotFlash && resultMessage && (
            <>
              <p className="font-serif text-base font-bold text-gembl-ink">Výhra: 0 G</p>
              <p className="text-sm text-gembl-muted">{resultMessage}</p>
            </>
          )}
        </div>

        <div style={rectStyle(layout.stakeControl)} className="flex items-center justify-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gembl-muted">Sázka</span>
          <button
            type="button"
            onClick={() => adjustBet(-BET_STEP)}
            disabled={spinning || bet <= MIN_BET}
            aria-label="Snížit sázku"
            className="flex h-8 w-8 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-lg font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
          >
            −
          </button>
          <span className="min-w-[4rem] text-center font-mono text-base font-bold text-gembl-ink">{bet} G</span>
          <button
            type="button"
            onClick={() => adjustBet(BET_STEP)}
            disabled={spinning || bet >= maxAllowedBet}
            aria-label="Zvýšit sázku"
            className="flex h-8 w-8 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-lg font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
          >
            +
          </button>
        </div>

        <div style={rectStyle(layout.spinButton)} className="flex flex-col items-center justify-center gap-1.5 px-2">
          <button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin}
            className="min-h-[44px] w-full max-w-[240px] border-2 border-gembl-ink bg-gembl-red px-4 py-2 font-serif text-base font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
          >
            {spinning ? "TOČÍ SE…" : `VSADIT ${bet} G`}
          </button>
          {!canSpin && !spinning && (
            <button
              type="button"
              onClick={() => setShowCreditGate(true)}
              className="text-center text-xs font-semibold text-gembl-red underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
            >
              {loggedIn ? "Nemáš dost kreditů." : "Přihlas se a dobij G."}
            </button>
          )}
        </div>

        {/* Když je creditGate řízený zvenčí (stage), modal renderuje
            ClassicCasinoStage — jinak by šlo o druhou paralelní instanci
            CreditGateModal nad tou sdílenou. */}
        {!creditGate && showCreditGate && (
          <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/casino" />
        )}
      </>
    );
  }

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

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gembl-muted">Sázka</span>
            <button
              type="button"
              onClick={() => adjustBet(-BET_STEP)}
              disabled={spinning || bet <= MIN_BET}
              aria-label="Snížit sázku"
              className="flex h-10 w-10 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-xl font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[5.5rem] text-center font-mono text-xl font-bold text-gembl-ink">{bet} G</span>
            <button
              type="button"
              onClick={() => adjustBet(BET_STEP)}
              disabled={spinning || bet >= maxAllowedBet}
              aria-label="Zvýšit sázku"
              className="flex h-10 w-10 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-xl font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin}
            className="min-h-[52px] w-full max-w-xs border-2 border-gembl-ink bg-gembl-red px-6 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
          >
            {spinning ? "TOČÍ SE…" : `VSADIT ${bet} G`}
          </button>
          <p className="text-center text-[11px] text-gembl-muted">
            Upozornění: V této hře není možné vyhrát. Sázka je {MIN_BET}–{MAX_BET} G (po {BET_STEP}), výhra je vždy 0 G.
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
