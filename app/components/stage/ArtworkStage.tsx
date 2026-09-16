"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { StageCanvas } from "../../../lib/casino-skins/index.ts";
import StageBackground from "./StageBackground.tsx";

// Referenční canvas = skutečné rozměry background obrázku (canvas.designWidth/
// designHeight). Jediný scaling mechanismus v celé stage vrstvě: změř
// dostupnou šířku wrapperu, dopočítej `scale`, aplikuj `transform: scale()`
// s `transform-origin: top left` na box s přesně designovými rozměry —
// všechny overlay děti uvnitř pak používají syrové designové px (viz
// rectStyle) a scalují se spolu s pozadím automaticky, žádné ruční
// přepočítávání procent. `overflow: hidden` + explicitní výška wrapperu
// (designHeight * scale) garantuje, že nic nepřeteče mimo background při
// změně šířky viewportu.
//
// Dokud není `scale` změřený (první frame SSR/hydratace), vykreslí se jen
// samotný background jako běžný responzivní obrázek (w-full h-auto) BEZ
// overlay dětí — je to rychlejší než čekat, a hlavně to zabrání krátkému
// probliknutí špatně napozicovaných klikacích prvků, než se scale spočítá.
// `useLayoutEffect` (ne `useEffect`) měření provede ještě před prvním
// vykreslením prohlížečem, takže na klientské navigaci (Link) k probliknutí
// prakticky nedochází.
//
// Komponenta je záměrně obecná (`StageCanvas`): používá ji herní stage na
// /casino (classicSkin) i společný obsahový stage informačních stránek
// (classicSkin.universal) — viz app/components/stage/UniversalContentStage.tsx.
export default function ArtworkStage({ canvas, children }: { canvas: StageCanvas; children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function measure(width: number) {
      if (width > 0) setScale(width / canvas.designWidth);
    }

    measure(el.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) measure(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [canvas.designWidth]);

  return (
    <div ref={wrapperRef} className="relative mx-auto w-full" style={{ maxWidth: 1800 }}>
      {scale === null ? (
        // První statický snímek pro SSR a stav, než se změří `scale` —
        // záměrně stejná URL jako první frame slideshow (`unoptimized`), ať
        // při hydrataci neproblikne prázdné pozadí (viz StageBackground.tsx).
        <Image
          src={canvas.background.src}
          alt={canvas.background.alt}
          width={canvas.designWidth}
          height={canvas.designHeight}
          priority
          unoptimized
          className="block h-auto w-full select-none"
        />
      ) : (
        <div className="relative overflow-hidden" style={{ height: canvas.designHeight * scale }}>
          <div
            className="relative"
            style={{
              width: canvas.designWidth,
              height: canvas.designHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <StageBackground
              alt={canvas.background.alt}
              frames={canvas.background.frames ?? [canvas.background.src]}
              width={canvas.designWidth}
              height={canvas.designHeight}
            />
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
