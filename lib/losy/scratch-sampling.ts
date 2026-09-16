// Odhad, kolik procent stírací vrstvy je pryč — čistá logika oddělená od
// ScratchLayer.tsx (canvas/DOM), ať jde unit-testovat bez skutečného
// canvasu (viz zadání "nedělej drahé pixelové vyhodnocení na každý
// pointermove, použij throttling nebo rozumný sampling"). Místo
// `getImageData` nad celým canvasem (drahé) se čte jen řídká mřížka
// vzorků (SAMPLE_COLS × SAMPLE_ROWS bodů) — volající (ScratchLayer.tsx)
// navíc volá tuhle funkci jen jednou za pár pointermove eventů, ne na
// každý (throttling), viz komentář tam.

export const SCRATCH_THRESHOLD_RATIO = 0.6;

const SAMPLE_COLS = 12;
const SAMPLE_ROWS = 8;
/** Alpha 0-255 pod touto hranicí = bod považovaný za "setřený" (prakticky průhledný, ne nutně přesně 0 kvůli antialiasingu štětce). */
const CLEARED_ALPHA_THRESHOLD = 10;

/** Vrátí alpha kanál (0-255) pixelu na (x, y) — v produkci `ctx.getImageData(x, y, 1, 1).data[3]`, ve testech libovolná fake funkce. */
export type PixelAlphaReader = (x: number, y: number) => number;

/** Obdélník ve zlomcích canvasu (0-1) — `{left:0,top:0,width:1,height:1}` = celý canvas. */
export type CanvasFractionRect = { left: number; top: number; width: number; height: number };

const FULL_CANVAS: CanvasFractionRect = { left: 0, top: 0, width: 1, height: 1 };

/**
 * Podíl (0-1) vzorkovaných bodů, co jsou už setřené — volitelně jen
 * v zadaném obdélníku (ve zlomcích canvasu), což používá ScratchLayer.tsx
 * pro detekci "tenhle symbol je odhalený" (třetiny šířky = tři symboly losu).
 */
export function measureScratchedRatio(
  width: number,
  height: number,
  readAlpha: PixelAlphaReader,
  rect: CanvasFractionRect = FULL_CANVAS
): number {
  if (width <= 0 || height <= 0) return 0;
  if (rect.width <= 0 || rect.height <= 0) return 0;

  const x0 = Math.max(0, Math.floor(rect.left * width));
  const y0 = Math.max(0, Math.floor(rect.top * height));
  const x1 = Math.min(width, Math.ceil((rect.left + rect.width) * width));
  const y1 = Math.min(height, Math.ceil((rect.top + rect.height) * height));
  if (x1 <= x0 || y1 <= y0) return 0;

  let cleared = 0;
  for (let row = 0; row < SAMPLE_ROWS; row++) {
    for (let col = 0; col < SAMPLE_COLS; col++) {
      const x = Math.min(x1 - 1, Math.floor(x0 + ((col + 0.5) / SAMPLE_COLS) * (x1 - x0)));
      const y = Math.min(y1 - 1, Math.floor(y0 + ((row + 0.5) / SAMPLE_ROWS) * (y1 - y0)));
      if (readAlpha(x, y) < CLEARED_ALPHA_THRESHOLD) cleared++;
    }
  }
  return cleared / (SAMPLE_COLS * SAMPLE_ROWS);
}

/**
 * Tři svislé třetiny stírací plochy = tři symboly losu (ScratchCard.tsx je
 * skládá do řady přes celou šířku). Používá se pro "pop" efekt ve chvíli,
 * kdy je konkrétní symbol setřený dost na to, aby byl celý vidět.
 */
export const SYMBOL_CELLS: readonly CanvasFractionRect[] = [
  { left: 0, top: 0, width: 1 / 3, height: 1 },
  { left: 1 / 3, top: 0, width: 1 / 3, height: 1 },
  { left: 2 / 3, top: 0, width: 1 / 3, height: 1 },
];

/** Od kolika setřených vzorků v buňce považujeme symbol za "celý viditelný" (pop efekt). */
export const SYMBOL_REVEAL_RATIO = 0.75;

export function isScratchThresholdReached(ratio: number): boolean {
  return ratio >= SCRATCH_THRESHOLD_RATIO;
}
