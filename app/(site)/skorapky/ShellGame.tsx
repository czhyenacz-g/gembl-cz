"use client";

import Image from "next/image";
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

// Nová herní scéna = jeden artwork (public/skins/skorapky/skorapky.webp).
// Overlay prvky se pozicují v % vůči tomuhle canvasu, takže drží na obrázku
// na libovolné šířce bez jakýchkoli JS přepočtů (čisté CSS). Hodnoty jsou
// měřené z artworku a dají se tady snadno doladit.
const SCENE_WIDTH = 1672;
const SCENE_HEIGHT = 941;
// Středy tří vytištěných elips na stole — vizuální kotvy pro kelímky.
const SLOT_X: Record<CupIndex, number> = { 0: 33.2, 1: 49.94, 2: 66.99 };
const SLOT_Y = 70.35;

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
    <div className="flex min-h-screen w-full items-center justify-center bg-gembl-paper p-2 sm:p-4">
      {/* Název je součástí artworku (viz zadání "neduplikuj text z obrázku") —
          h1 zůstává jen pro SEO/accessibility, vizuálně skrytý. */}
      <h1 className="sr-only">Skořápky</h1>

      <div
        className="relative mx-auto w-full max-w-[1600px] select-none"
        style={{ aspectRatio: `${SCENE_WIDTH} / ${SCENE_HEIGHT}` }}
      >
        <Image
          src="/skins/skorapky/skorapky.webp"
          alt="Skořápky — hrací stůl se třemi vyznačenými místy pro kelímky"
          width={SCENE_WIDTH}
          height={SCENE_HEIGHT}
          priority
          className="absolute inset-0 h-full w-full object-contain"
        />

        {/* Zpět — reálný klikací overlay přesně nad vytištěnou šipkou. */}
        <Link
          href="/casino"
          aria-label="Zpět do kasina"
          className="absolute z-10 rounded-[var(--gembl-radius)] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
          style={{ left: "1.6%", top: "2.3%", width: "8.6%", height: "7.8%" }}
        />

        {/* Stav / hláška hry */}
        <p
          className="absolute z-10 border-2 border-gembl-ink bg-gembl-paper px-3 py-1 text-center font-serif text-xs font-bold text-gembl-ink shadow-hard-sm sm:text-base"
          style={{ left: "50%", top: "46%", maxWidth: "64%", transform: "translate(-50%, -50%)" }}
        >
          {statusText}
        </p>

        {/* Tři kelímky na vyznačených elipsách stolu */}
        {CUPS.map((position) => (
          <div
            key={position}
            className="absolute z-10"
            style={{
              left: `${SLOT_X[position]}%`,
              top: `${SLOT_Y}%`,
              width: "12%",
              height: "15%",
              transform: "translate(-50%, -60%)",
            }}
          >
            <Cup
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
          </div>
        ))}

        {/* Ovládání + sázka/zůstatek — jeden řádek dole (na mobilu se tak
            nepřekryje se zvednutými kelímky; na desktopu je posunutý výš,
            ať neleží přes spodní titulek artworku). */}
        <div className="absolute left-1/2 top-[84%] z-10 flex w-[92%] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="gembl-tag text-[0.65rem] sm:text-sm">
            Sázka: <strong className="font-mono font-semibold text-gembl-ink">{BET} G</strong>
          </span>

          {phase === "idle" && (
            <button
              type="button"
              onClick={handlePlay}
              disabled={!canPlay}
              className="min-h-[40px] border-2 border-gembl-ink bg-gembl-red px-[clamp(0.9rem,2vw,1.5rem)] py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper sm:text-lg"
            >
              {placingBet ? "ČEKEJ…" : "HRÁT"}
            </button>
          )}

          {phase === "result" && (
            <button
              type="button"
              onClick={handlePlayAgain}
              className="min-h-[40px] border-2 border-gembl-ink bg-gembl-red px-[clamp(0.9rem,2vw,1.5rem)] py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper sm:text-lg"
            >
              HRÁT ZNOVU
            </button>
          )}

          <span className="gembl-tag text-[0.65rem] sm:text-sm">
            Zůstatek: <strong className="font-mono font-semibold text-gembl-ink">{displayCredits.toLocaleString("cs-CZ")} G</strong>
          </span>

          {phase === "idle" && effectiveCredits !== null && effectiveCredits < BET && (
            <button
              type="button"
              onClick={() => setShowCreditGate(true)}
              className="gembl-tag text-[0.65rem] font-semibold text-gembl-red sm:text-sm"
            >
              {loggedIn ? "Nemáš dost kreditů. Dobij G." : "Nemáš dost kreditů. Přihlas se a dobij G."}
            </button>
          )}
        </div>
      </div>

      {showCreditGate && <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/skorapky" />}
    </div>
  );
}
