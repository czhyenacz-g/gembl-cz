import type { Metadata } from "next";
import SlotMachine from "./SlotMachine";

const TITLE = "Automaty";
const DESCRIPTION =
  "Klasický jednoruký bandita se 3 válci. Spin stojí 10 G, výhra je vždy 0 G — RTP 0 %, transparentněji už to nejde.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/automaty" },
  openGraph: {
    images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}&sub=${encodeURIComponent("RTP 0 %")}`, width: 1200, height: 630 }],
  },
};

// /automaty je samostatná herní obrazovka (viz zadání) — žádné běžné
// menu/patička (řeší SiteChrome.tsx) a žádný obsahový wrapper tady: celou
// scénu včetně vlastního min-h-screen si skládá SlotMachine.tsx.
export default function AutomatyPage() {
  return <SlotMachine />;
}
