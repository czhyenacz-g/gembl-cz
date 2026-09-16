import Link from "next/link";
import type { ReactNode } from "react";
import { getActiveSkin } from "../../../lib/casino-skins/index.ts";
import StageViewSwitch from "./StageViewSwitch.tsx";
import UniversalContentStage from "./UniversalContentStage.tsx";

// Jednotný shell pro informační/uživatelské stránky (Profil / Žebříčky /
// Jak to funguje). Stránky samy dodají jen title/subtitle/obsah/actions,
// takže se stejný wrapper neimplementuje třikrát.
//
// Desktop: artwork stage (classicSkin.universal) s živými overlaye, takže
// globální header/footer by byly duplicitní — skrývá je SiteChrome.tsx přes
// stejný breakpoint (skin.minStageWidth). Mobile/úzký viewport: obsah se
// vykreslí jako běžná stránka (StageViewSwitch mountuje vždy jen jednu
// větev). `legacyBack` přidá do mobilní varianty vlastní šipku zpět — používá
// ji /jak-to-funguje, která je bez chrome i na mobilu (STANDALONE_ROUTES).
export default function ContentPage({
  title,
  subtitle,
  actions,
  legacyBack = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  legacyBack?: boolean;
  children: ReactNode;
}) {
  const stage = getActiveSkin().universal;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <StageViewSwitch
        stage={
          <UniversalContentStage stage={stage} title={title} subtitle={subtitle} actions={actions}>
            {children}
          </UniversalContentStage>
        }
        legacy={
          <div className="mx-auto max-w-2xl py-8 text-gembl-ink">
            {legacyBack && (
              <Link
                href="/casino"
                aria-label="Zpět do kasina"
                className="gembl-tag inline-flex items-center gap-1 transition hover:bg-gembl-paper-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
              >
                ← ZPĚT
              </Link>
            )}

            <h1 className={`gembl-masthead inline-block text-3xl font-black sm:text-4xl ${legacyBack ? "mt-6" : ""}`}>
              {title}
            </h1>
            {subtitle && <p className="mt-4 text-lg text-gembl-muted">{subtitle}</p>}

            <div className="mt-8">{children}</div>

            {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        }
      />
    </div>
  );
}
