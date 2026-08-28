import type { Metadata } from "next";
import Link from "next/link";
import GlobalStatsLine from "../../components/GlobalStatsLine";
import PromotionSlot from "../../components/promotions/PromotionSlot";
import { SITE_DESCRIPTION, SITE_TITLE, SUBTAGLINE, TAGLINE } from "../../config/site";

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

export default function Home() {
  return (
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="gembl-masthead inline-block font-serif text-4xl font-black sm:text-6xl">
          <span className="text-gembl-ink">GEMBL</span>
          <span className="text-gembl-red">.cz</span>
        </h1>
        <p className="mt-6 font-serif text-xl font-bold text-gembl-ink sm:text-2xl">{TAGLINE}</p>
        <p className="mt-2 font-semibold uppercase tracking-wide text-gembl-red">{SUBTAGLINE}</p>

        <p className="mx-auto mt-8 max-w-lg text-gembl-muted">
          Dostaneš virtuální kredity. Můžeš je prohrát. Vyhrát nemůžeš.
        </p>

        <Link
          href="/automaty"
          className="mt-8 inline-flex min-h-[52px] items-center justify-center border-2 border-gembl-ink bg-gembl-red px-8 py-3 font-serif text-lg font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
        >
          JDU PROHRÁT
        </Link>

        <div className="mt-6">
          <GlobalStatsLine />
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-2xl">
        <PromotionSlot placement="homepage_top" pathname={PATHNAME} />
      </div>

      <div className="mx-auto mt-12 max-w-2xl">
        <h2 className="gembl-section-heading text-center text-2xl font-bold text-gembl-ink">Naše férové podmínky</h2>
        <dl className="gembl-block mt-6 divide-y divide-gembl-ink">
          {FAIR_TERMS.map((term) => (
            <div key={term.label} className="flex items-center justify-between px-5 py-3 text-sm sm:text-base">
              <dt className="text-gembl-muted">{term.label}</dt>
              <dd className="font-mono font-semibold text-gembl-ink">{term.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto mt-12 max-w-2xl">
        <PromotionSlot placement="homepage_middle" pathname={PATHNAME} />
      </div>
    </div>
  );
}
