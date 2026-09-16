"use client";

import { useEffect, useState } from "react";
import type { ArtworkStatus } from "./use-artwork-ready.ts";

// Doba, po kterou loader po načtení ještě mizí (fade out), než se odmountuje.
export const LOADER_FADE_MS = 320;

// Retro "loading cover" artwork stageu — překryje celou scénu (včetně
// artworku), takže overlaye pod ním nejsou vidět ani klikatelné, a zmizí až
// po skutečném načtení backgroundu (viz use-artwork-ready.ts). Žádný moderní
// spinner — jen papírový rámeček, logo a tři pulzující tečky (CSS animace,
// viz .animate-loader-dot v app/globals.css).
//
// `failed` (background se nepodařilo načíst / vypršela pojistka) už overlaye
// nechává viditelné (viz volající) a místo loaderu ukáže nenápadný pruh
// s reloadem, ať stránka nezůstane mrtvá.
export default function ArtworkLoadingCover({ status, label }: { status: ArtworkStatus; label: string }) {
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    if (status !== "ready") return;
    const id = window.setTimeout(() => setUnmounted(true), LOADER_FADE_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  if (status === "failed") return <ArtworkLoadError />;
  if (unmounted) return null;

  return (
    <div
      role="status"
      className={`absolute inset-0 z-40 flex items-center justify-center bg-gembl-paper transition-opacity duration-300 ease-out ${
        status === "ready" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="gembl-block flex flex-col items-center gap-3 px-8 py-6 text-center shadow-hard">
        <span className="font-serif text-3xl font-black uppercase tracking-tight text-gembl-ink">
          GEMBL<span className="text-xl text-gembl-red">.cz</span>
        </span>

        <p className="gembl-tag text-gembl-muted">{label}</p>

        <div className="flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="animate-loader-dot h-2.5 w-2.5 border border-gembl-ink bg-gembl-red"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtworkLoadError() {
  return (
    <div role="alert" className="absolute inset-x-0 top-2 z-40 flex justify-center px-2">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-2 border-gembl-ink bg-gembl-red px-3 py-1.5 text-gembl-paper shadow-hard-sm">
        <span className="font-serif text-xs font-bold uppercase tracking-wide">Nepodařilo se načíst scénu.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-xs font-semibold uppercase tracking-wide underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  );
}
