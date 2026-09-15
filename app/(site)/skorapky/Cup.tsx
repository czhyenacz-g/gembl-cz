"use client";

import type { CupIndex } from "../../../lib/skorapky/types.ts";

const CUP_LABELS: Record<CupIndex, string> = { 0: "levý", 1: "prostřední", 2: "pravý" };

// Jeden kelímek — vždy `<button>` (viz zadání "kelímky musí být button
// nebo jinak keyboard-accessible"), i mimo `choosing` (jen `disabled`,
// ať zůstane konzistentní DOM strom a nativní focus/tab chování). Kulička
// je samostatný element "na zemi" slotu — kelímek se nad ní jen posouvá
// nahoru/dolů (`raised`), fyzicky se nikdy nepřehazuje (viz zadání).
export default function Cup({
  position,
  raised,
  hasBall,
  highlighted,
  selected,
  selectable,
  onSelect,
}: {
  position: CupIndex;
  raised: boolean;
  hasBall: boolean;
  highlighted: boolean;
  selected: boolean;
  selectable: boolean;
  onSelect: (position: CupIndex) => void;
}) {
  return (
    <div className="relative flex h-28 w-20 items-end justify-center sm:h-32 sm:w-24">
      <div
        aria-hidden="true"
        className={`absolute bottom-1 h-6 w-6 rounded-full border-2 border-amber-700 bg-amber-400 shadow-hard-sm transition-opacity duration-200 sm:h-7 sm:w-7 ${
          hasBall ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        disabled={!selectable}
        onClick={() => onSelect(position)}
        aria-label={selectable ? `Vybrat ${CUP_LABELS[position]} kelímek` : `${CUP_LABELS[position]} kelímek`}
        className={`relative h-20 w-20 rounded-t-[36px] border-2 border-gembl-ink bg-gembl-ink shadow-hard-sm transition-transform duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red disabled:cursor-not-allowed sm:h-24 sm:w-24 ${
          raised ? "-translate-y-9 sm:-translate-y-11" : "translate-y-0"
        } ${highlighted ? "animate-shell-shake ring-4 ring-gembl-red" : ""} ${selected ? "ring-4 ring-amber-400" : ""}`}
      />
    </div>
  );
}
