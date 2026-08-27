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

export default function AutomatyPage() {
  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif text-3xl font-extrabold text-white sm:text-4xl">Automaty</h1>
        <p className="mt-3 text-gray-400">Tři válce, klasické symboly, žádná šance na výhru.</p>
      </div>

      <div className="mt-8">
        <SlotMachine />
      </div>
    </div>
  );
}
