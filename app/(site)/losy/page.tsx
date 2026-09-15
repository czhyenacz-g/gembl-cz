import type { Metadata } from "next";
import ScratchCard from "./ScratchCard.tsx";

const TITLE = "Online losy";
const DESCRIPTION = "Stírací los za 10 G. Setři tři symboly. Výhra je vždy 0 G.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/losy" },
  openGraph: {
    images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}&sub=${encodeURIComponent("Výhra je vždy 0 G")}`, width: 1200, height: 630 }],
  },
};

export default function LosyPage() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">Online losy</h1>
        <p className="mt-3 text-gembl-muted">Setři si své štěstí. Výhra je vždy 0 G.</p>
      </div>

      <div className="mt-8">
        <ScratchCard />
      </div>
    </div>
  );
}
