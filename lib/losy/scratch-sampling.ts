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

/** Podíl (0-1) vzorkovaných bodů, co jsou už setřené. */
export function measureScratchedRatio(width: number, height: number, readAlpha: PixelAlphaReader): number {
  if (width <= 0 || height <= 0) return 0;

  let cleared = 0;
  for (let row = 0; row < SAMPLE_ROWS; row++) {
    for (let col = 0; col < SAMPLE_COLS; col++) {
      const x = Math.min(width - 1, Math.floor(((col + 0.5) / SAMPLE_COLS) * width));
      const y = Math.min(height - 1, Math.floor(((row + 0.5) / SAMPLE_ROWS) * height));
      if (readAlpha(x, y) < CLEARED_ALPHA_THRESHOLD) cleared++;
    }
  }
  return cleared / (SAMPLE_COLS * SAMPLE_ROWS);
}

export function isScratchThresholdReached(ratio: number): boolean {
  return ratio >= SCRATCH_THRESHOLD_RATIO;
}
