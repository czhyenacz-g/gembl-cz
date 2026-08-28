import type { Metadata } from "next";
import Link from "next/link";
import ArtworkPlaceholder from "../../components/ArtworkPlaceholder";
import GlobalStatsLine from "../../components/GlobalStatsLine";
import PromotionSlot from "../../components/promotions/PromotionSlot";
import { SITE_DESCRIPTION, SITE_TITLE } from "../../config/site";
import AccountPanel from "./AccountPanel";
import LeftSidebar from "./LeftSidebar";
import RightSidebarPanels from "./RightSidebarPanels";

const PATHNAME = "/casino";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/casino" },
};

const FAIR_TERMS = [
  { label: "RTP", value: "0 %" },
  { label: "Maximální výhra", value: "0 G" },
  { label: "Pravděpodobnost prohry", value: "100 %" },
  { label: "Malé písmo", value: "Žádné" },
  { label: "Falešné naděje", value: "Žádné" },
] as const;

const HERO_BULLETS = ["Hraj s virtuálními kredity", "Výhra není možná", "Vždycky skoro"] as const;

const HOW_IT_WORKS = [
  { title: "Dostaneš kredity", subtitle: "za registraci" },
  { title: "Hraj automaty", subtitle: "a sleduj, jak mizí" },
  { title: "Vždycky skoro", subtitle: "výhra je vždycky těsně vedle" },
] as const;

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="gembl-page-grid">
        <LeftSidebar />

        <div className="gembl-sidebar">
          <AccountPanel />
        </div>

        <main className="gembl-content-panel min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="gembl-poster-heading text-4xl text-gembl-ink sm:text-5xl">Automaty</h1>
              <p className="mt-1 font-serif text-2xl italic text-gembl-red sm:text-3xl">Vždycky skoro.</p>
            </div>
            <ArtworkPlaceholder
              label="Cartoon slot"
              aspectRatio="1 / 1"
              className="hidden w-24 shrink-0 sm:flex md:w-28"
            />
          </div>

          {/* Hero: hlavní herní blok — vlevo artwork (dokud není finální
              ilustrace automatu, viz zadání "nedělej kvůli tomuto kroku
              velký refactor"), vpravo copy + CTA na skutečnou hru. */}
          <div className="gembl-panel mt-8 grid grid-cols-1 gap-0 md:grid-cols-2">
            <div className="gembl-panel-body">
              <ArtworkPlaceholder label="Slot machine artwork" aspectRatio="4 / 3" />
            </div>

            <div className="gembl-panel-body flex flex-col justify-center border-t border-gembl-ink md:border-l md:border-t-0">
              <p className="gembl-poster-heading text-2xl text-gembl-ink sm:text-3xl">
                Zatoč si a uvidíš,
                <br />
                <span className="text-gembl-red">co tě čeká.</span>
              </p>

              <ul className="mt-5 flex flex-col gap-2">
                {HERO_BULLETS.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gembl-ink">
                    <span className="gembl-icon-glyph" aria-hidden="true">
                      •
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <Link href="/automaty" className="gembl-cta mt-6 self-start">
                Roztočit automat
              </Link>

              <div className="mt-4">
                <GlobalStatsLine />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <PromotionSlot placement="homepage_top" pathname={PATHNAME} />
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section>
              <h2 className="gembl-section-heading text-xl text-gembl-ink">Naše férové podmínky</h2>
              <div className="gembl-block mt-4">
                {FAIR_TERMS.map((term) => (
                  <div key={term.label} className="gembl-table-row">
                    <span className="text-gembl-muted">{term.label}</span>
                    <span className="font-mono font-semibold text-gembl-ink">{term.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="gembl-section-heading text-xl text-gembl-ink">Jak to u nás funguje</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {HOW_IT_WORKS.map((step) => (
                  <div key={step.title}>
                    <ArtworkPlaceholder label="Ilustrace" aspectRatio="1 / 1" />
                    <p className="mt-2 font-serif text-sm font-bold uppercase text-gembl-ink">{step.title}</p>
                    <p className="text-xs text-gembl-muted">{step.subtitle}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-12">
            <PromotionSlot placement="homepage_middle" pathname={PATHNAME} />
          </div>
        </main>

        <RightSidebarPanels />
      </div>
    </div>
  );
}
