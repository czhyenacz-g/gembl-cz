import Link from "next/link";
import type { ReactNode } from "react";
import type { UniversalStage } from "../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../lib/casino-skins/rect-style.ts";
import ArtworkStage from "./ArtworkStage.tsx";

// Společný "univerzální" obsahový stage pro /profil, /zebricky a
// /jak-to-funguje — jeden artwork (classicSkin.universal) + dvě živé HTML
// zóny:
//  1) klikací plocha přes vytištěný box "← ZPĚT" (text je součást artworku),
//  2) světlý centrální panel, do kterého se overlayuje route-specific obsah
//     (H1 + subtitle + content + volitelné actions).
//
// Scaling je STEJNÝ jako na /casino (ArtworkStage → transform: scale podle
// šířky wrapperu), takže zóny se zadávají v designových px skinu a nemusí
// se přepočítávat. Stejná komponenta se používá pro všechny 3 stránky, aby
// se wrapper neimplementoval třikrát.
export default function UniversalContentStage({
  stage,
  title,
  subtitle,
  actions,
  children,
}: {
  stage: UniversalStage;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ArtworkStage canvas={stage} loadingLabel="Připravujeme stůl…">
      {/* Zpět — deterministický link na /casino (ne history.back(), které by
          mohlo skončit mimo GEMBL). Text/šipka jsou vytištěné v artworku,
          takže overlay je jen průhledná klikací plocha + focus ring. */}
      <Link
        href="/casino"
        style={rectStyle(stage.layout.back)}
        aria-label="Zpět do kasina"
        className="block rounded-[var(--gembl-radius)] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
      />

      {/* Papírový panel = jediná obsahová plocha. H1 je živé HTML (kvůli
          SEO/accessibility — v artworku route-specific nadpis není) a obsah
          se scrolluje POUZE tady uvnitř panelu, kdyby se nevešel. */}
      <div style={rectStyle(stage.layout.panel)} className="flex flex-col overflow-hidden px-8 py-6 text-gembl-ink">
        <h1 className="gembl-masthead inline-block shrink-0 text-3xl font-black">{title}</h1>
        {subtitle && <p className="mt-2 shrink-0 text-base italic text-gembl-muted">{subtitle}</p>}

        <div className="gembl-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-3">{children}</div>

        {actions && (
          <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3 border-t border-gembl-ink pt-3">{actions}</div>
        )}
      </div>
    </ArtworkStage>
  );
}
