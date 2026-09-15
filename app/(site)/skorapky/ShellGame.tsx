"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CreditGateModal from "../../components/wallet/CreditGateModal";
import { notifySessionChanged, useSession } from "../../../lib/auth/use-session-client";
import { useAudio } from "../../../lib/audio/AudioProvider.tsx";
import { loadPlayerState, savePlayerState } from "../../../lib/casino/storage.ts";
import type { PlayerState } from "../../../lib/casino/types.ts";
import { generateShuffleSequence, pickRandomCup, pickRevealCup } from "../../../lib/skorapky/engine.ts";
import { pickRandomShellMessage } from "../../../lib/skorapky/messages.ts";
import type { CupIndex, ShellGamePhase, ShuffleStep } from "../../../lib/skorapky/types.ts";
import { MIN_BET } from "../../config/site.ts";
import Cup from "./Cup.tsx";

// Fixní sázka pro MVP (viz zadání "preferuji teď jednoduchost") — reuse
// MIN_BET ze sdíleného site configu (stejné min/max jako /automaty), ne
// vlastní zadrátovaná konstanta. Žádný +/- bet control v v1.
const BET = MIN_BET;

const COVER_MS = 400;
const SHUFFLE_STEP_MS = 350;
// 6-10 kroků * 350 ms = 2.1-3.5 s, v zadaném rozsahu "cca 2-4 sekundy".
const SHUFFLE_MIN_STEPS = 6;
const SHUFFLE_MAX_STEPS = 10;
const CHOOSE_SUSPENSE_MS = 750;
const REVEAL_MS = 400;

const STATUS_TEXT: Record<Exclude<ShellGamePhase, "result">, string> = {
  idle: "Zapamatuj si, kde je kulička.",
  covering: "Kelímky se zavírají…",
  shuffling: "Míchání…",
  choosing: "Vyber jeden.",
  revealing: "Odkrývám…",
};

const CUPS: readonly CupIndex[] = [0, 1, 2];

// Hlavní orchestrátor Skořápek — jeden useState state machine (viz
// zadání "nepoužívej chaotickou sadu booleanů"), stejný vzor jednoduchého
// klientského stavu jako SlotMachine.tsx (žádný Redux/Context). Wallet
// jde přes STEJNOU serverovou logiku jako /automaty (spendCredits přes
// nový generický /api/wallet/bet, viz lib/wallet/ledger.ts) — u
// přihlášeného hráče je `player.credits` jen zrcadlo poslední hodnoty ze
// serveru, u hosta se odečítá lokálně přes storage.ts (stejný sdílený
// localStorage klíč jako automaty/BalanceBadge, ne paralelní wallet).
export default function ShellGame() {
  const { session, refresh: refreshSession } = useSession();
  const { playSfx } = useAudio();

  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [phase, setPhase] = useState<ShellGamePhase>("idle");
  const [ballPosition, setBallPosition] = useState<CupIndex>(0);
  const [selectedCup, setSelectedCup] = useState<CupIndex | null>(null);
  const [revealCup, setRevealCup] = useState<CupIndex | null>(null);
  const [highlightedCups, setHighlightedCups] = useState<readonly CupIndex[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [placingBet, setPlacingBet] = useState(false);
  const [showCreditGate, setShowCreditGate] = useState(false);

  // Refy pro anti-race (viz zadání "double click na HRÁT/kelímek, změna
  // stavu během API requestu, unmount během timeoutu") — na rozdíl od
  // state jsou zapsané OKAMŽITĚ, ne až po re-renderu, takže spolehlivě
  // zastaví i dva kliky, co proběhnou dřív, než React stihne přerenderovat.
  const timeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const placingBetRef = useRef(false);
  const selectingRef = useRef(false);

  const loggedIn = session.status === "authenticated";
  const effectiveCredits = session.status === "authenticated" ? session.credits : player?.credits ?? null;
  const displayCredits = effectiveCredits ?? player?.credits ?? 0;

  useEffect(() => {
    mountedRef.current = true;
    setPlayer(loadPlayerState());
    setBallPosition(pickRandomCup());
    setMounted(true);
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // Stejný vzor jako SlotMachine.tsx: jakmile hráči nezbývá ani sázka,
  // nabídne se credit-gate automaticky, ne jen po kliku na HRÁT.
  useEffect(() => {
    if (effectiveCredits === null) return;
    if (effectiveCredits < BET) setShowCreditGate(true);
  }, [effectiveCredits]);

  // Naplánuje DALŠÍ krok animace a zruší případný předchozí pending
  // timeout (nikdy dva souběžné řetězy) — `fn` se zavolá jen když
  // komponenta ještě žije (viz mountedRef, "unmount během timeoutu").
  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      if (!mountedRef.current) return;
      fn();
    }, ms);
  }, []);

  function runShuffleStep(sequence: ShuffleStep[], index: number) {
    if (index >= sequence.length) {
      setHighlightedCups([]);
      setPhase("choosing");
      return;
    }
    setHighlightedCups(sequence[index].cups);
    scheduleTimeout(() => runShuffleStep(sequence, index + 1), SHUFFLE_STEP_MS);
  }

  function startShuffling() {
    setPhase("shuffling");
    const stepCount = SHUFFLE_MIN_STEPS + Math.floor(Math.random() * (SHUFFLE_MAX_STEPS - SHUFFLE_MIN_STEPS + 1));
    runShuffleStep(generateShuffleSequence(stepCount), 0);
  }

  function startRound() {
    selectingRef.current = false;
    setSelectedCup(null);
    setRevealCup(null);
    setResultMessage(null);
    setHighlightedCups([]);
    setPhase("covering");
    scheduleTimeout(startShuffling, COVER_MS);
  }

  async function placeBetAndStart() {
    const requestId = ++requestIdRef.current;

    if (loggedIn) {
      try {
        const response = await fetch("/api/wallet/bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game: "skorapky", bet: BET }),
        });
        const data = (await response.json()) as { balance?: number; error?: string };
        if (requestIdRef.current !== requestId || !mountedRef.current) return;

        if (!response.ok || typeof data.balance !== "number") {
          placingBetRef.current = false;
          setPlacingBet(false);
          await refreshSession();
          if (response.status === 402) setShowCreditGate(true);
          return;
        }

        notifySessionChanged();
        placingBetRef.current = false;
        setPlacingBet(false);
        startRound();
      } catch {
        if (requestIdRef.current !== requestId || !mountedRef.current) return;
        placingBetRef.current = false;
        setPlacingBet(false);
      }
      return;
    }

    // Host: stejný lokální odečet jako SlotMachine.tsx (sdílené
    // storage.ts, ne paralelní wallet) — synchronní, ale requestId guard
    // zůstává i tady kvůli konzistenci s napojenou async větví výš.
    setPlayer((current) => {
      if (!current || requestIdRef.current !== requestId) return current;
      const updated: PlayerState = { ...current, credits: current.credits - BET };
      savePlayerState(updated);
      return updated;
    });
    placingBetRef.current = false;
    setPlacingBet(false);
    startRound();
  }

  function handlePlay() {
    if (placingBetRef.current || phase !== "idle" || !player || effectiveCredits === null) return;
    if (effectiveCredits < BET) {
      setShowCreditGate(true);
      return;
    }
    placingBetRef.current = true;
    setPlacingBet(true);
    playSfx("spin_start");
    void placeBetAndStart();
  }

  function handleSelectCup(cup: CupIndex) {
    if (phase !== "choosing" || selectingRef.current) return;
    selectingRef.current = true;
    setSelectedCup(cup);
    playSfx("ui_click");

    const reveal = pickRevealCup(cup);
    setRevealCup(reveal);

    scheduleTimeout(() => {
      setPhase("revealing");
      playSfx("spin_stop");
      scheduleTimeout(() => {
        setPhase("result");
        setResultMessage(pickRandomShellMessage());
        playSfx("lose");
      }, REVEAL_MS);
    }, CHOOSE_SUSPENSE_MS);
  }

  function handlePlayAgain() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    requestIdRef.current += 1;
    placingBetRef.current = false;
    selectingRef.current = false;
    setPlacingBet(false);
    setSelectedCup(null);
    setRevealCup(null);
    setResultMessage(null);
    setHighlightedCups([]);
    setBallPosition(pickRandomCup());
    setPhase("idle");
  }

  if (!mounted || !player) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-40 w-72 animate-pulse border border-gembl-line bg-gembl-paper-dark" />
      </div>
    );
  }

  const canPlay = phase === "idle" && !placingBet && effectiveCredits !== null && effectiveCredits >= BET;
  const raised = phase === "idle" || phase === "revealing" || phase === "result";
  const statusText = phase === "result" ? (resultMessage ?? "") : STATUS_TEXT[phase];

  return (
    <div className="gembl-scene flex min-h-screen flex-col overflow-hidden">
      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-8">
        {/* Horní lišta scény — jen návrat na titulní stranu kasina a brand;
            žádné běžné webové menu/patička (viz zadání samostatná hra). */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/casino"
            className="inline-flex min-h-[44px] items-center gap-2 border-2 border-gembl-ink bg-gembl-paper px-3 font-serif text-sm font-bold uppercase tracking-wide text-gembl-ink shadow-hard-sm transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ←
            </span>
            Zpět
          </Link>
          <span className="gembl-tag gembl-tag--accent">GEMBL.cz</span>
        </div>

        {/* Herní scéna — velký rámeček jako hrací stůl/deska, přes kterou se
            skládají herní prvky (obdoba artwork stage na /casino). */}
        <div className="mt-4 flex flex-1 items-center">
          <div className="w-full border-[3px] border-gembl-ink bg-gembl-paper-dark shadow-hard">
            {/* Název hry + krátká instrukce */}
            <div className="border-b-[3px] border-gembl-ink bg-gembl-red px-4 py-3 text-center">
              <h1 className="font-serif text-3xl font-black uppercase tracking-wide text-gembl-paper sm:text-4xl">Skořápky</h1>
              <p className="mt-1 font-serif text-xs italic text-gembl-paper sm:text-sm">Sleduj kuličku. Vyber kelímek. Prohraj poctivě.</p>
            </div>

            {/* Hrací plocha se třemi definovanými pozicemi pro kelímky */}
            <div className="gembl-table-surface m-3 px-3 py-6 sm:m-5 sm:px-6 sm:py-8">
              <p className="text-center font-serif text-base font-bold text-gembl-ink sm:text-lg">{statusText}</p>

              <div className="mt-8 flex items-end justify-center gap-5 sm:gap-12">
                {CUPS.map((position) => (
                  <Cup
                    key={position}
                    position={position}
                    raised={raised}
                    hasBall={
                      (phase === "idle" && position === ballPosition) ||
                      ((phase === "revealing" || phase === "result") && position === revealCup)
                    }
                    highlighted={phase === "shuffling" && highlightedCups.includes(position)}
                    selected={selectedCup === position}
                    selectable={phase === "choosing" && selectedCup === null}
                    onSelect={handleSelectCup}
                  />
                ))}
              </div>
            </div>

            {/* Ovládání + info o sázce/zůstatku */}
            <div className="border-t-[3px] border-gembl-ink px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col items-center gap-3">
                {phase === "idle" && (
                  <>
                    <button
                      type="button"
                      onClick={handlePlay}
                      disabled={!canPlay}
                      className="min-h-[52px] w-full max-w-xs border-2 border-gembl-ink bg-gembl-red px-6 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
                    >
                      {placingBet ? "ČEKEJ…" : "HRÁT"}
                    </button>
                    {effectiveCredits !== null && effectiveCredits < BET && (
                      <button
                        type="button"
                        onClick={() => setShowCreditGate(true)}
                        className="text-center text-sm font-semibold text-gembl-red underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
                      >
                        {loggedIn ? "Nemáš dost kreditů. Dobij G a hraj dál." : "Nemáš dost kreditů. Přihlas se a dobij G."}
                      </button>
                    )}
                  </>
                )}

                {phase === "result" && (
                  <button
                    type="button"
                    onClick={handlePlayAgain}
                    className="min-h-[52px] w-full max-w-xs border-2 border-gembl-ink bg-gembl-red px-6 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
                  >
                    HRÁT ZNOVU
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-gembl-muted">
                <span className="gembl-tag">
                  Sázka: <strong className="font-mono font-semibold text-gembl-ink">{BET} G</strong>
                </span>
                <span className="gembl-tag">
                  Zůstatek:{" "}
                  <strong className="font-mono font-semibold text-gembl-ink">{displayCredits.toLocaleString("cs-CZ")} G</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreditGate && <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/skorapky" />}
    </div>
  );
}
