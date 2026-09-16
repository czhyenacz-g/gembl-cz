"use client";

import { useEffect, useState } from "react";

// Dokud není hlavní artwork stageu SKUTEČNĚ načtený, overlaye se nesmí
// ukázat (jinak na pomalém připojení probliknou texty/tlačítka na prázdném
// pozadí — viz zadání). Detekce je proto založená na reálném `onload`
// obrázku, ne na timeoutu (timeout je jen záchranná brzda níž).
//
// Používá to jak herní stage (app/components/stage/ArtworkStage.tsx), tak
// samostatné herní scény (app/components/stage/ArtworkScene.tsx) — jedno
// společné místo, žádný loader per stránka.
export type ArtworkStatus = "loading" | "ready" | "failed";

// Pojistka, aby loader nezůstal viset navždy (rozbitý/404 asset, zaseknutá
// síť). NENÍ to hlavní mechanismus — normálně stav přepne `onload`.
const SAFETY_TIMEOUT_MS = 9000;

/** `src: null` = žádný background k čekání (např. embedded režim) → hned `ready`. */
export function useArtworkReady(src: string | null): ArtworkStatus {
  const [status, setStatus] = useState<ArtworkStatus>(src ? "loading" : "ready");

  useEffect(() => {
    if (!src) {
      setStatus("ready");
      return;
    }

    setStatus("loading");

    const image = new window.Image();
    let cancelled = false;

    function settle(next: ArtworkStatus) {
      if (!cancelled) setStatus(next);
    }

    image.onload = () => settle("ready");
    image.onerror = () => settle("failed");
    image.src = src;

    // Už zcacheovaný obrázek: `complete` je true hned po přiřazení `src`,
    // takže se stav přepne synchronně a loader se vůbec nevykreslí
    // (žádné zbytečné bliknutí ani timeout — viz zadání "cached asset").
    if (image.complete) settle(image.naturalWidth > 0 ? "ready" : "failed");

    const safety = window.setTimeout(() => settle("failed"), SAFETY_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  return status;
}
