"use client";

import Image from "next/image";
import type { CupIndex } from "../../../lib/skorapky/types.ts";

const CUP_LABELS: Record<CupIndex, string> = { 0: "levý", 1: "prostřední", 2: "pravý" };

// Rozměry produkčních assetů (public/games/shells/*.webp) — slouží jen jako
// width/height pro next/image, aby prohlížeč znal poměr stran dopředu a nic
// neposkakovalo (žádný layout shift). Skutečnou velikost na scéně určuje CSS
// v % níž, obrázky se do ní jen vejdou (object-contain / w-full).
const CUP_ASSET = { src: "/games/shells/cup.webp", width: 320, height: 316 };
const BALL_ASSET = { src: "/games/shells/ball.webp", width: 128, height: 128 };

// Jeden kelímek na svém vyznačeném místě stolu (overlay nad artworkem).
//
// Model je záměrně "wrapper → obrázek": vnější elementy nesou herní
// pozici/stav/animaci, obrázky uvnitř jen renderují vzhled (žádný vlastní
// transform, který by přebil `raised`/`animate-shell-shake`). Kelímek má
// vlastní kreslený stín/odlesk v assetu, takže tu není žádný CSS
// box-shadow ani border/bg (dřív kreslily kelímek; teď by dělaly box okolo).
//
// Vodorovné centrování je přes `left` v % (ne `-translate-x`), aby ho
// nepřebila `animate-shell-shake` (ta nastavuje `transform` a jinak by
// kelímek během míchání uskočil do strany).
//
// Kulička je ve DOM před kelímkem a s nižším z-indexem, takže ji zavírající
// se kelímek skutečně překryje (během fade-outu i při dosednutí).
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
        className={`absolute left-1/2 top-[62%] z-0 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ${
          hasBall ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image
          src={BALL_ASSET.src}
          alt=""
          width={BALL_ASSET.width}
          height={BALL_ASSET.height}
          sizes="(max-width: 640px) 14px, 46px"
          loading="eager"
          className="block h-full w-full object-contain"
        />
      </div>

      <button
        type="button"
        disabled={!selectable}
        onClick={() => onSelect(position)}
        aria-label={selectable ? `Vybrat ${CUP_LABELS[position]} kelímek` : `${CUP_LABELS[position]} kelímek`}
        className={`absolute bottom-0 left-[11%] z-10 w-[78%] cursor-pointer rounded-t-full transition-transform duration-300 ease-out enabled:hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red disabled:cursor-not-allowed ${
          raised ? "-translate-y-[60%]" : "translate-y-0"
        } ${highlighted ? "animate-shell-shake ring-4 ring-gembl-red" : ""} ${selected ? "ring-4 ring-amber-400" : ""}`}
      >
        <Image
          src={CUP_ASSET.src}
          alt=""
          width={CUP_ASSET.width}
          height={CUP_ASSET.height}
          sizes="(max-width: 640px) 40px, 150px"
          loading="eager"
          className="block h-auto w-full"
        />
      </button>
    </div>
  );
}
