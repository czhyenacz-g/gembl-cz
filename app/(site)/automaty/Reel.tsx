"use client";

import { SYMBOL_DISPLAY } from "../../../lib/casino/slot-engine";
import type { SlotSymbol } from "../../../lib/casino/types";

// Jeden válec — během roztočení ukazuje smyčku symbolů (viz .animate-reel-spin
// v globals.css), po doběhnutí skutečný výsledek. `symbol === null` je jen
// výchozí stav před prvním spinem. Komponenta se roztahuje do svého rodiče
// (h-full w-full) — rámeček/pozadí řeší artwork scény, ne tahle komponenta
// (viz zadání "nevytvářej přes připravené válce další HTML boxy"). Velikost
// symbolu se škáluje se scénou (clamp), bar/bar symbol menší jako dřív.
const SYMBOL_FONT = "clamp(1.4rem, 4.6vw, 4.5rem)";
const BAR_FONT = "clamp(0.8rem, 2.4vw, 2.4rem)";

export default function Reel({ symbol, spinning }: { symbol: SlotSymbol | null; spinning: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      {spinning ? (
        <div
          className="animate-reel-spin flex flex-col items-center"
          style={{ fontSize: SYMBOL_FONT, lineHeight: 1, gap: "0.25em" }}
        >
          <span>🍒</span>
          <span>🍋</span>
          <span className="text-gembl-red">7</span>
          <span>💎</span>
        </div>
      ) : (
        <span
          className={`font-mono font-bold ${
            symbol === "seven" || symbol === "diamond" ? "text-gembl-red" : "text-gembl-ink"
          }`}
          style={{ fontSize: symbol === "bar" ? BAR_FONT : SYMBOL_FONT, lineHeight: 1 }}
        >
          {symbol ? SYMBOL_DISPLAY[symbol] : "❔"}
        </span>
      )}
    </div>
  );
}
