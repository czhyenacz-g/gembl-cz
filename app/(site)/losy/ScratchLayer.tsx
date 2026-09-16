"use client";

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useAudio } from "../../../lib/audio/AudioProvider.tsx";
import {
  isScratchThresholdReached,
  measureScratchedRatio,
  SYMBOL_CELLS,
  SYMBOL_REVEAL_RATIO,
} from "../../../lib/losy/scratch-sampling.ts";

// Interní rozlišení canvasu — pevné, škáluje se vizuálně přes CSS
// (w-full h-full na wrapperu), pointer souřadnice se přepočítávají podle
// poměru getBoundingClientRect() vs. canvas.width/height (viz
// getCanvasPoint), takže funguje na libovolné CSS šířce/mobilu beze
// změny týhle konstanty.
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 140;
const BRUSH_RADIUS = 18;
// Throttling (viz zadání "nedělej drahé pixelové vyhodnocení na každý
// pointermove") — sampling se spočítá jen na každý 4. pointermove, ne na
// každý; `measureScratchedRatio` sama navíc čte jen řídkou mřížku bodů,
// ne celý canvas (viz lib/losy/scratch-sampling.ts).
const PROGRESS_CHECK_EVERY_N_MOVES = 4;

// Scratch ZVUK (smyčka, viz lib/audio/sfx.ts `scratch`) — hraje jen po dobu
// REÁLNÉHO pohybu: pouhé držení tlačítka na ploše zvuk nespustí a po
// zastavení prstu/myši zvuk do ~150 ms dozní (žádné "hučení" naprázdno).
/** Minimální posun (v px canvasu) od posledního hlášení, aby šlo o skutečný pohyb. */
const SCRATCH_MOVE_MIN_PX = 4;
/** Jak dlouho po posledním pohybu ještě nechat zvuk běžet (pak fade-out). */
const SCRATCH_IDLE_MS = 150;

/**
 * Stírací vrstva jednoho losu — čistě prezentační canvas nad 3 symboly,
 * co kreslí rodič (ScratchCard.tsx). Nikdy nezná herní výsledek ani
 * wallet, jen hlásí `onThresholdReached()` PO PRVNÍ chvíli, kdy je
 * setřeno dost (`SCRATCH_THRESHOLD_RATIO`, viz scratch-sampling.ts) —
 * `thresholdReachedRef` to zaručí přesně jednou za instanci. Nová runda
 * = nová instance (viz `key={roundKey}` na volajícím), ne ruční reset
 * canvasu tady.
 *
 * Navíc hlásí `onSymbolRevealed(index)`, jakmile je některá ze tří třetin
 * (symbolů) setřená dost na to, aby byl symbol celý vidět — rodič na to
 * pouští čistě vizuální zoom-pop (ScratchCard.tsx). Herní logiku to
 * neovlivňuje (výsledek je daný už od nákupu losu).
 */
export default function ScratchLayer({
  active,
  fading,
  onThresholdReached,
  onSymbolRevealed,
}: {
  active: boolean;
  fading: boolean;
  onThresholdReached: () => void;
  onSymbolRevealed?: (index: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPointerDownRef = useRef(false);
  const moveCountRef = useRef(0);
  const thresholdReachedRef = useRef(false);
  const revealedSymbolsRef = useRef<Set<number>>(new Set());
  // Scratch smyčka — `scratchPlayingRef` říká, jestli zrovna běží (ať se
  // start/stop nevolá zbytečně na každý pointermove).
  const scratchPlayingRef = useRef(false);
  const scratchIdleTimeoutRef = useRef<number | null>(null);
  const lastReportedPointRef = useRef<{ x: number; y: number } | null>(null);
  const { startSfxLoop, stopSfxLoop } = useAudio();

  // `active` čtou pointer handlery přes ref (ne přímo prop), ať zůstanou
  // konzistentní i uprostřed gesta (setPointerCapture), když `active`
  // sklopí rodič na false těsně po zásahu threshold (viz zadání
  // "disable další scratching" hned po dosažení prahu).
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Zastaví scratch zvuk okamžitě (žádné doznívání naprázdno) — volá se při
  // puštění tlačítka, opuštění plochy, dokončení losu i na unmountu.
  const stopScratchSound = useCallback(() => {
    if (scratchIdleTimeoutRef.current !== null) {
      window.clearTimeout(scratchIdleTimeoutRef.current);
      scratchIdleTimeoutRef.current = null;
    }
    if (!scratchPlayingRef.current) return;
    scratchPlayingRef.current = false;
    stopSfxLoop("scratch");
  }, [stopSfxLoop]);

  // Dokud se reálně hýbe, smyčka běží a po každém hlášení se restartuje
  // "idle" časovač; teprve když se ~150 ms nic nestane, zvuk dozní.
  const reportScratchActivity = useCallback(() => {
    if (!scratchPlayingRef.current) {
      scratchPlayingRef.current = true;
      startSfxLoop("scratch");
    }
    if (scratchIdleTimeoutRef.current !== null) window.clearTimeout(scratchIdleTimeoutRef.current);
    scratchIdleTimeoutRef.current = window.setTimeout(() => {
      scratchIdleTimeoutRef.current = null;
      scratchPlayingRef.current = false;
      stopSfxLoop("scratch");
    }, SCRATCH_IDLE_MS);
  }, [startSfxLoop, stopSfxLoop]);

  // Dokončení losu (rodič sklopí `active`) → zvuk musí hned skončit, aby se
  // nepřekrýval s navazujícím spin_stop / lose efektem.
  useEffect(() => {
    if (!active) stopScratchSound();
  }, [active, stopScratchSound]);

  // Unmount (nová runda / odchod ze stránky) → taky utnout.
  useEffect(() => stopScratchSound, [stopScratchSound]);

  // Namaluje neprůhlednou stírací vrstvu jednou při mountu — placeholder
  // vzhled (gradient + text), finální artwork přijde později (viz zadání
  // "neřeš finální artwork").
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.globalCompositeOperation = "source-over";
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#ddd6c7");
    gradient.addColorStop(0.5, "#b7ad99");
    gradient.addColorStop(1, "#ddd6c7");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#6c665d";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SETŘI!", canvas.width / 2, canvas.height / 2);
  }, []);

  function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function scratchAt(x: number, y: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // "destination-out" = maže, co už je namalované, místo aby přes to
    // kreslilo novou barvu (viz zadání) — pod tím prosvitnou symboly.
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  function checkProgress() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || thresholdReachedRef.current) return;
    const readAlpha = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];

    // Nejdřív "pop" pro jednotlivé symboly (každý jen jednou), pak globální
    // threshold, který spustí reveal celého losu.
    if (onSymbolRevealed) {
      SYMBOL_CELLS.forEach((cell, index) => {
        if (revealedSymbolsRef.current.has(index)) return;
        if (measureScratchedRatio(canvas.width, canvas.height, readAlpha, cell) >= SYMBOL_REVEAL_RATIO) {
          revealedSymbolsRef.current.add(index);
          onSymbolRevealed(index);
        }
      });
    }

    const ratio = measureScratchedRatio(canvas.width, canvas.height, readAlpha);
    if (isScratchThresholdReached(ratio)) {
      thresholdReachedRef.current = true;
      onThresholdReached();
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!activeRef.current) return;
    isPointerDownRef.current = true;
    // První pohyb po stisknutí vždy hlásí aktivitu (i kdyby navazoval na
    // předchozí tah) — zvuk ale sám o sobě nespouští, ten čeká na pohyb.
    lastReportedPointRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    if (point) scratchAt(point.x, point.y);
    checkProgress();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!activeRef.current || !isPointerDownRef.current) return;
    const point = getCanvasPoint(event);
    if (!point) return;
    scratchAt(point.x, point.y);

    // Skutečný pohyb? Měří se vzdálenost od POSLEDNÍHO HLÁŠENÍ, takže i
    // pomalé tažení (několik malých kroků) se nakonec nasčítá a zvuk spustí.
    const last = lastReportedPointRef.current;
    const movedFar = !last || Math.hypot(point.x - last.x, point.y - last.y) >= SCRATCH_MOVE_MIN_PX;
    if (movedFar) {
      lastReportedPointRef.current = point;
      reportScratchActivity();
    }

    moveCountRef.current += 1;
    if (moveCountRef.current % PROGRESS_CHECK_EVERY_N_MOVES === 0) checkProgress();
  }

  function handlePointerUp() {
    isPointerDownRef.current = false;
    lastReportedPointRef.current = null;
    stopScratchSound();
    checkProgress();
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      aria-hidden="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-[400ms] ease-out ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      } ${active ? "cursor-pointer" : "cursor-default"}`}
    />
  );
}
