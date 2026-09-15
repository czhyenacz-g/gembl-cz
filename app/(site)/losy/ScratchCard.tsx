"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CreditGateModal from "../../components/wallet/CreditGateModal";
import { notifySessionChanged, useSession } from "../../../lib/auth/use-session-client";
import { useAudio } from "../../../lib/audio/AudioProvider.tsx";
import { loadPlayerState, savePlayerState } from "../../../lib/casino/storage.ts";
import type { PlayerState } from "../../../lib/casino/types.ts";
import { generateScratchResult, SYMBOL_DISPLAY } from "../../../lib/losy/engine.ts";
import { pickScratchMessage } from "../../../lib/losy/messages.ts";
import type { ScratchResult, ScratchTicketPhase } from "../../../lib/losy/types.ts";
import { MIN_BET } from "../../config/site.ts";
import ScratchLayer from "./ScratchLayer.tsx";

// Cena losu pro MVP (viz zadání "10 G") — reuse MIN_BET ze sdíleného
// site configu (stejné jako /automaty a /skorapky), ne vlastní
// zadrátovaná konstanta.
const TICKET_PRICE = MIN_BET;

// Fade-out zbytku stírací vrstvy (viz ScratchLayer.tsx transition) +
// krátký delay se zobrazeným výsledkem PŘED přechodem do `result` (viz
// zadání "fade-out ~300-500 ms, pak krátký delay, pak result").
const REVEAL_FADE_MS = 400;
const REVEAL_RESULT_DELAY_MS = 400;

const STATUS_TEXT: Record<Exclude<ScratchTicketPhase, "result">, string> = {
  idle: "Setři si své štěstí.",
  purchasing: "Kupuji los…",
  scratching: "Stírej!",
  revealing: "Odkrývám…",
};

// Hlavní orchestrátor stíracích losů — jeden useState state machine (viz
// zadání "nepoužívej větší sadu nezávislých booleanů"), stejný vzor jako
// ShellGame.tsx (/skorapky): wallet jde přes STEJNOU serverovou logiku
// (generický POST /api/wallet/bet, game: "losy"), u hosta lokální odečet
// přes sdílené storage.ts. Canvas/stírání je čistě prezentační
// (ScratchLayer.tsx) — výsledek (2 stejné + 1 jiný, nebo 3 různé) je
// hotový HNED po nákupu (viz lib/losy/engine.ts), stírání ho jen odkrývá.
export default function ScratchCard() {
  const { session, refresh: refreshSession } = useSession();
  const { playSfx } = useAudio();

  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [phase, setPhase] = useState<ScratchTicketPhase>("idle");
  const [ticketResult, setTicketResult] = useState<ScratchResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [showCreditGate, setShowCreditGate] = useState(false);

  // Refy pro anti-race (stejný vzor jako ShellGame.tsx) — zapsané
  // okamžitě, ne až po re-renderu, takže spolehlivě zastaví i dva kliky
  // dřív, než React stihne přerenderovat.
  const timeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const purchasingRef = useRef(false);

  const loggedIn = session.status === "authenticated";
  const effectiveCredits = session.status === "authenticated" ? session.credits : player?.credits ?? null;
  const displayCredits = effectiveCredits ?? player?.credits ?? 0;

  useEffect(() => {
    mountedRef.current = true;
    setPlayer(loadPlayerState());
    setMounted(true);
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  // Stejný vzor jako SlotMachine.tsx/ShellGame.tsx: jakmile hráči
  // nezbývá ani cena losu, nabídne se credit-gate automaticky.
  useEffect(() => {
    if (effectiveCredits === null) return;
    if (effectiveCredits < TICKET_PRICE) setShowCreditGate(true);
  }, [effectiveCredits]);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      if (!mountedRef.current) return;
      fn();
    }, ms);
  }, []);

  function startScratching() {
    setTicketResult(generateScratchResult());
    setResultMessage(null);
    // Nový `key` = ScratchLayer se mountne jako ÚPLNĚ nová instance
    // (čerstvý canvas), ne ruční reset předchozího stavu.
    setRoundKey((key) => key + 1);
    setPhase("scratching");
  }

  async function purchaseAndStart() {
    const requestId = ++requestIdRef.current;

    if (loggedIn) {
      try {
        const response = await fetch("/api/wallet/bet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game: "losy", bet: TICKET_PRICE }),
        });
        const data = (await response.json()) as { balance?: number; error?: string };
        if (requestIdRef.current !== requestId || !mountedRef.current) return;

        if (!response.ok || typeof data.balance !== "number") {
          purchasingRef.current = false;
          setPhase("idle");
          await refreshSession();
          if (response.status === 402) setShowCreditGate(true);
          return;
        }

        notifySessionChanged();
        purchasingRef.current = false;
        startScratching();
      } catch {
        if (requestIdRef.current !== requestId || !mountedRef.current) return;
        purchasingRef.current = false;
        setPhase("idle");
      }
      return;
    }

    // Host: stejný lokální odečet jako SlotMachine.tsx/ShellGame.tsx
    // (sdílené storage.ts, ne paralelní wallet).
    setPlayer((current) => {
      if (!current || requestIdRef.current !== requestId) return current;
      const updated: PlayerState = { ...current, credits: current.credits - TICKET_PRICE };
      savePlayerState(updated);
      return updated;
    });
    purchasingRef.current = false;
    startScratching();
  }

  function handleBuy() {
    if (purchasingRef.current || phase !== "idle" || !player || effectiveCredits === null) return;
    if (effectiveCredits < TICKET_PRICE) {
      setShowCreditGate(true);
      return;
    }
    purchasingRef.current = true;
    setPhase("purchasing");
    playSfx("ui_click");
    void purchaseAndStart();
  }

  // Volá ScratchLayer PŘESNĚ jednou (viz ScratchLayer.tsx
  // thresholdReachedRef), jakmile je setřeno dost — `phase !== "scratching"`
  // guard navíc chrání proti pozdnímu volání po resetu/nové rundě.
  function handleThresholdReached() {
    if (phase !== "scratching") return;
    setPhase("revealing");
    playSfx("spin_stop");
    scheduleTimeout(() => {
      setPhase("result");
      if (ticketResult) setResultMessage(pickScratchMessage(ticketResult.matchType));
      playSfx("lose");
    }, REVEAL_FADE_MS + REVEAL_RESULT_DELAY_MS);
  }

  function handleBuyAnother() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    requestIdRef.current += 1;
    purchasingRef.current = false;
    setTicketResult(null);
    setResultMessage(null);
    setPhase("idle");
  }

  if (!mounted || !player) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-40 w-80 animate-pulse border border-gembl-line bg-gembl-paper-dark" />
      </div>
    );
  }

  const canBuy = phase === "idle" && effectiveCredits !== null && effectiveCredits >= TICKET_PRICE;
  const showTicket = phase === "scratching" || phase === "revealing" || phase === "result";
  const statusText = phase === "result" ? (resultMessage ?? "") : STATUS_TEXT[phase];

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="gembl-block p-6 shadow-hard sm:p-8">
        <div className="flex justify-center">
          {!showTicket ? (
            <div className="flex h-36 w-full max-w-sm items-center justify-center border-2 border-gembl-ink bg-gembl-paper-dark font-serif text-sm font-bold uppercase tracking-wide text-gembl-muted shadow-hard-sm">
              Zavřený los
            </div>
          ) : (
            <div className="relative h-36 w-full max-w-sm overflow-hidden border-2 border-gembl-ink bg-gembl-paper shadow-hard-sm">
              <div className="flex h-full items-center justify-center gap-6 text-4xl sm:text-5xl">
                {ticketResult?.symbols.map((symbol, index) => <span key={index}>{SYMBOL_DISPLAY[symbol]}</span>)}
              </div>
              {(phase === "scratching" || phase === "revealing") && (
                <ScratchLayer
                  key={roundKey}
                  active={phase === "scratching"}
                  fading={phase === "revealing"}
                  onThresholdReached={handleThresholdReached}
                />
              )}
            </div>
          )}
        </div>

        {phase === "scratching" && <p className="mt-3 text-center text-xs text-gembl-muted">Přejeď myší nebo prstem přes los.</p>}

        <div className="mt-6 min-h-[1.75rem] text-center">
          <p className="font-serif text-lg font-bold text-gembl-ink">{statusText}</p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {phase === "idle" && (
            <>
              <button
                type="button"
                onClick={handleBuy}
                disabled={!canBuy}
                className="min-h-[52px] w-full max-w-xs border-2 border-gembl-ink bg-gembl-red px-6 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
              >
                KOUPIT LOS
              </button>
              {effectiveCredits !== null && effectiveCredits < TICKET_PRICE && (
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

          {phase === "purchasing" && (
            <button
              type="button"
              disabled
              className="min-h-[52px] w-full max-w-xs border-2 border-gembl-ink bg-gembl-red px-6 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper opacity-40 shadow-hard"
            >
              KUPUJI…
            </button>
          )}

          {phase === "result" && (
            <button
              type="button"
              onClick={handleBuyAnother}
              className="min-h-[52px] w-full max-w-xs border-2 border-gembl-ink bg-gembl-red px-6 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
            >
              KOUPIT DALŠÍ LOS
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-6 text-sm text-gembl-muted">
          <span>
            Cena: <strong className="font-mono font-semibold text-gembl-ink">{TICKET_PRICE} G</strong>
          </span>
          <span>
            Zůstatek: <strong className="font-mono font-semibold text-gembl-ink">{displayCredits.toLocaleString("cs-CZ")} G</strong>
          </span>
        </div>
      </div>

      {showCreditGate && <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/losy" />}
    </div>
  );
}
