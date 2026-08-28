"use client";

import { SYMBOL_DISPLAY } from "../../../lib/casino/slot-engine";
import type { SlotSymbol } from "../../../lib/casino/types";

// Jeden válec — během roztočení ukazuje rozmazanou smyčku symbolů (viz
// .animate-reel-spin v globals.css), po doběhnutí vykreslí skutečný
// výsledek. `symbol === null` je jen výchozí stav před prvním spinem.
export default function Reel({ symbol, spinning }: { symbol: SlotSymbol | null; spinning: boolean }) {
  return (
    <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden border-2 border-gembl-ink bg-gembl-paper shadow-hard-sm sm:h-28 sm:w-24">
      {spinning ? (
        <div className="animate-reel-spin flex flex-col items-center gap-4 text-4xl sm:text-5xl">
          <span>🍒</span>
          <span>🍋</span>
          <span className="text-gembl-red">7</span>
          <span>💎</span>
        </div>
      ) : (
        <span
          className={`font-mono text-4xl font-bold sm:text-5xl ${
            symbol === "seven" || symbol === "diamond" ? "text-gembl-red" : "text-gembl-ink"
          } ${symbol === "bar" ? "text-2xl sm:text-3xl" : ""}`}
        >
          {symbol ? SYMBOL_DISPLAY[symbol] : "❔"}
        </span>
      )}
    </div>
  );
}
