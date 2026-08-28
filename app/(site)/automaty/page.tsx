import type { Metadata } from "next";
import PromotionSlot from "../../components/promotions/PromotionSlot";
import SlotMachine from "./SlotMachine";

const PATHNAME = "/automaty";
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
        <h1 className="gembl-masthead inline-block text-3xl font-black sm:text-4xl">Automaty</h1>
        <p className="mt-3 text-gembl-muted">Tři válce, klasické symboly, žádná šance na výhru.</p>
      </div>

      <div className="mx-auto mt-8 max-w-xl px-4">
        <PromotionSlot placement="game_top" pathname={PATHNAME} />
      </div>

      <div className="mt-8">
        <SlotMachine />
      </div>

      <div className="mx-auto mt-8 max-w-xl px-4">
        <PromotionSlot placement="game_bottom" pathname={PATHNAME} />
      </div>

      {/* Kompaktní placement jen pro mobilní šířky — na desktopu ho
          nahrazuje game_bottom výš, ať se stejný obsah nezdvojuje. */}
      <div className="mx-auto mt-4 max-w-xl px-4 sm:hidden">
        <PromotionSlot placement="mobile_inline" pathname={PATHNAME} />
      </div>
    </div>
  );
}
