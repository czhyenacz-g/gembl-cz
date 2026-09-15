"use client";

import type { CupIndex } from "../../../lib/skorapky/types.ts";

const CUP_LABELS: Record<CupIndex, string> = { 0: "levý", 1: "prostřední", 2: "pravý" };

// Jeden kelímek na svém vyznačeném místě stolu (overlay nad artworkem).
// Velikosti jsou v % rodičovského slotu, takže se škálují spolu se scénou
// (žádné pevné px, žádné JS přepočty) a drží na vytištěných elipsách na
// libovolné šířce. Vždy `<button>` (keyboard-accessible), mimo `choosing`
// jen `disabled`, ať zůstane stabilní DOM strom a nativní focus/tab.
// Kulička leží na "zemi" slotu, kelímek se nad ní jen posouvá nahoru/dolů
// (`raised`), fyzicky se nikdy nepřehazuje (viz zadání).
//
// Pozn.: vodorovné centrování je přes `left` v % (ne `-translate-x`), aby
// ho nepřebila `animate-shell-shake` (ta nastavuje `transform` a jinak by
// kelímek během míchání uskočil do strany).
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
    <div className="relative h-full w-full">
      <div
        aria-hidden="true"
        className={`absolute left-[38%] top-[62%] aspect-square w-[24%] -translate-y-1/2 rounded-full border-2 border-gembl-ink bg-amber-400 shadow-hard-sm transition-opacity duration-200 ${
          hasBall ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        disabled={!selectable}
        onClick={() => onSelect(position)}
        aria-label={selectable ? `Vybrat ${CUP_LABELS[position]} kelímek` : `${CUP_LABELS[position]} kelímek`}
        className={`absolute bottom-0 left-[11%] h-[75%] w-[78%] rounded-t-full border-2 border-gembl-ink bg-gembl-ink shadow-hard-sm transition-transform duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red disabled:cursor-not-allowed ${
          raised ? "-translate-y-[85%]" : "translate-y-0"
        } ${highlighted ? "animate-shell-shake ring-4 ring-gembl-red" : ""} ${selected ? "ring-4 ring-amber-400" : ""}`}
      >
        <span aria-hidden="true" className="absolute inset-x-[10%] bottom-[8%] h-[9%] rounded-full bg-gembl-red" />
      </button>
    </div>
  );
}
