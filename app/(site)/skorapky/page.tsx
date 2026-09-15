import type { Metadata } from "next";
import ShellGame from "./ShellGame.tsx";

const TITLE = "Skořápky";
const DESCRIPTION = "Tři kelímky, jedna kulička, nulová šance. Sázka 10 G, výhra je vždy 0 G.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/skorapky" },
  openGraph: {
    images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}&sub=${encodeURIComponent("Výhra je vždy 0 G")}`, width: 1200, height: 630 }],
  },
};

// /skorapky je samostatná herní obrazovka (viz zadání) — žádné běžné
// menu/patička nad ní (řeší SiteChrome.tsx) a žádný obsahový wrapper tady:
// celou scénu včetně vlastního min-h-screen si skládá ShellGame.tsx.
export default function SkorapkyPage() {
  return <ShellGame />;
}
