"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CasinoSkin } from "../../../../lib/casino-skins/index.ts";
import StageBackground from "./StageBackground.tsx";

// Referenční canvas = skutečné rozměry background obrázku (skin.designWidth/
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
export default function CasinoStage({ skin, children }: { skin: CasinoSkin; children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    function measure(width: number) {
      if (width > 0) setScale(width / skin.designWidth);
    }

    measure(el.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) measure(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [skin.designWidth]);

  return (
    <div ref={wrapperRef} className="relative mx-auto w-full" style={{ maxWidth: 1800 }}>
      {scale === null ? (
        // První statický snímek pro SSR a stav, než se změří `scale` —
        // záměrně stejná URL jako první frame slideshow (`unoptimized`), ať
        // při hydrataci neproblikne prázdné pozadí (viz StageBackground.tsx).
        <Image
          src={skin.background.src}
          alt={skin.background.alt}
          width={skin.designWidth}
          height={skin.designHeight}
          priority
          unoptimized
          className="block h-auto w-full select-none"
        />
      ) : (
        <div className="relative overflow-hidden" style={{ height: skin.designHeight * scale }}>
          <div
            className="relative"
            style={{
              width: skin.designWidth,
              height: skin.designHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <StageBackground
              alt={skin.background.alt}
              frames={skin.background.frames ?? [skin.background.src]}
              width={skin.designWidth}
              height={skin.designHeight}
            />
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
