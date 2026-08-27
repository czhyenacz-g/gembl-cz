import type { Metadata } from "next";
import Link from "next/link";
import GlobalStatsLine from "./components/GlobalStatsLine";
import PromotionSlot from "./components/promotions/PromotionSlot";
import { SITE_DESCRIPTION, SITE_TITLE, SUBTAGLINE, TAGLINE } from "./config/site";

const PATHNAME = "/";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
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
        <h1 className="font-serif text-4xl font-extrabold sm:text-6xl">
          <span className="text-neon-pink text-glow-pink">GEMBL</span>
          <span className="text-neon-cyan">.cz</span>
        </h1>
        <p className="mt-6 font-serif text-xl font-semibold text-white sm:text-2xl">{TAGLINE}</p>
        <p className="mt-2 text-neon-gold">{SUBTAGLINE}</p>

        <p className="mx-auto mt-8 max-w-lg text-gray-400">
          Dostaneš virtuální kredity. Můžeš je prohrát. Vyhrát nemůžeš.
        </p>

        <Link
          href="/automaty"
          className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-lg bg-neon-pink px-8 py-3 font-serif text-lg font-bold text-white shadow-glow-pink transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
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
        <h2 className="text-center font-serif text-2xl font-bold text-neon-cyan">Naše férové podmínky</h2>
        <dl className="mt-6 divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5">
          {FAIR_TERMS.map((term) => (
            <div key={term.label} className="flex items-center justify-between px-5 py-3 text-sm sm:text-base">
              <dt className="text-gray-400">{term.label}</dt>
              <dd className="font-serif font-semibold text-white">{term.value}</dd>
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
