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

// /losy je samostatná herní obrazovka (viz zadání) — žádné běžné
// menu/patička (řeší SiteChrome.tsx) a žádný obsahový wrapper tady: celou
// scénu včetně vlastního min-h-screen si skládá ScratchCard.tsx.
export default function LosyPage() {
  return <ScratchCard />;
}
