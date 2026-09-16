"use client";

import Link from "next/link";
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
import ArtworkScene from "../../components/stage/ArtworkScene.tsx";
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

// Nová herní scéna = jeden artwork (public/skins/losy/losy.webp). Overlay
// prvky se pozicují v % vůči tomuto canvasu, takže drží na obrázku na
// libovolné šířce bez jakýchkoli JS přepočtů (čisté CSS). Hodnoty jsou
// měřené z artworku a dají se tady snadno doladit.
const SCENE_WIDTH = 1536;
const SCENE_HEIGHT = 1024;
// Připravená světlá plocha uprostřed artworku — sem patří samotný los.
const CARD_RECT = { left: 27, top: 33, width: 46, height: 35 };
// Vytištěné "← ZPĚT" a logo GEMBL.CZ v horních rozích.
const BACK_RECT = { left: 9.4, top: 1.9, width: 12, height: 6 };
const LOGO_RECT = { left: 81, top: 1.9, width: 14.7, height: 5.5 };

function pct(rect: { left: number; top: number; width: number; height: number }) {
  return { left: `${rect.left}%`, top: `${rect.top}%`, width: `${rect.width}%`, height: `${rect.height}%` };
}

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
  const statusText = phase === "result" ? (resultMessage ?? "") : STATUS_TEXT[phase];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gembl-paper p-2 sm:p-4">
      {/* Název je součástí artworku (viz zadání "neduplikuj text z obrázku") —
          h1 zůstává jen pro SEO/accessibility, vizuálně skrytý. */}
      <h1 className="sr-only">Online losy</h1>

      <ArtworkScene
        src="/skins/losy/losy.webp"
        alt="Online losy — hrací stůl se stíracím losem"
        width={SCENE_WIDTH}
        height={SCENE_HEIGHT}
        loadingLabel="Připravujeme losy…"
        className="relative mx-auto w-full max-w-[1600px] select-none"
      >

        {/* Zpět — klikací overlay nad vytištěným "← ZPĚT". */}
        <Link
          href="/casino"
          aria-label="Zpět do kasina"
          className="absolute z-10 rounded-[var(--gembl-radius)] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
          style={pct(BACK_RECT)}
        />

        {/* Logo GEMBL.CZ — klikací stejně jako logo v headeru. */}
        <Link
          href="/casino"
          aria-label="GEMBL.cz — kasino"
          className="absolute z-10 rounded-[var(--gembl-radius)] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
          style={pct(LOGO_RECT)}
        />

        {/* Samotný los — přesně do připravené světlé plochy uprostřed; žádný
            vlastní rámeček/panel (ten už má artwork). */}
        <div className="absolute z-10 overflow-hidden" style={pct(CARD_RECT)}>
          <div className="flex h-full items-center justify-center gap-[8%] text-[clamp(2rem,4.5vw,4rem)]">
            {ticketResult?.symbols.map((symbol, index) => (
              <span key={index}>{SYMBOL_DISPLAY[symbol]}</span>
            ))}
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

        {/* Stav / hláška hry */}
        <p
          className="absolute z-10 border-2 border-gembl-ink bg-gembl-paper px-3 py-1 text-center font-serif text-xs font-bold text-gembl-ink shadow-hard-sm sm:text-base"
          style={{ left: "50%", top: "74%", maxWidth: "72%", transform: "translate(-50%, -50%)" }}
        >
          {statusText}
          {phase === "scratching" && (
            <span className="mt-0.5 block text-[0.6rem] font-normal text-gembl-muted sm:text-xs">
              Přejeď myší nebo prstem přes los.
            </span>
          )}
        </p>

        {/* Ovládání + cena/zůstatek */}
        <div className="absolute left-1/2 top-[88%] z-10 flex w-[92%] -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-2 sm:top-[80%] sm:gap-3">
          <span className="gembl-tag text-[0.65rem] sm:text-sm">
            Cena: <strong className="font-mono font-semibold text-gembl-ink">{TICKET_PRICE} G</strong>
          </span>

          {phase === "idle" && (
            <button
              type="button"
              onClick={handleBuy}
              disabled={!canBuy}
              className="min-h-[40px] border-2 border-gembl-ink bg-gembl-red px-[clamp(0.9rem,2vw,1.5rem)] py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper sm:text-lg"
            >
              KOUPIT LOS
            </button>
          )}

          {phase === "purchasing" && (
            <button
              type="button"
              disabled
              className="min-h-[40px] border-2 border-gembl-ink bg-gembl-red px-[clamp(0.9rem,2vw,1.5rem)] py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper opacity-40 shadow-hard sm:text-lg"
            >
              KUPUJI…
            </button>
          )}

          {phase === "result" && (
            <button
              type="button"
              onClick={handleBuyAnother}
              className="min-h-[40px] border-2 border-gembl-ink bg-gembl-red px-[clamp(0.9rem,2vw,1.5rem)] py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper sm:text-lg"
            >
              KOUPIT DALŠÍ LOS
            </button>
          )}

          <span className="gembl-tag text-[0.65rem] sm:text-sm">
            Zůstatek:{" "}
            <strong className="font-mono font-semibold text-gembl-ink">{displayCredits.toLocaleString("cs-CZ")} G</strong>
          </span>

          {phase === "idle" && effectiveCredits !== null && effectiveCredits < TICKET_PRICE && (
            <button
              type="button"
              onClick={() => setShowCreditGate(true)}
              className="gembl-tag text-[0.65rem] font-semibold text-gembl-red sm:text-sm"
            >
              {loggedIn ? "Nemáš dost kreditů. Dobij G." : "Nemáš dost kreditů. Přihlas se a dobij G."}
            </button>
          )}
        </div>
      </ArtworkScene>

      {showCreditGate && <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/losy" />}
    </div>
  );
}
