import type { Metadata } from "next";
import { Suspense } from "react";
import PromotionSlot from "../../components/promotions/PromotionSlot";
import { SITE_DESCRIPTION, SITE_TITLE } from "../../config/site";
import { getActiveSkin } from "../../../lib/casino-skins/index.ts";
import CasinoViewSwitch from "./CasinoViewSwitch.tsx";
import CreditGateOnArrival from "./CreditGateOnArrival";
import LegacyCasinoLayout from "./LegacyCasinoLayout.tsx";
import PaymentStatusBanner from "./PaymentStatusBanner";
import ClassicCasinoStage from "./stage/ClassicCasinoStage.tsx";
import WelcomePrizeOnArrival from "./WelcomePrizeOnArrival.tsx";

const PATHNAME = "/casino";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/casino" },
};

export default function Home() {
  const skin = getActiveSkin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <Suspense fallback={null}>
        <PaymentStatusBanner />
      </Suspense>

      {/* Artwork stage (>= skin.minStageWidth, dnes 1100px) vs. současný
          poster-grid layout — přepíná se JS podle šířky viewportu
          (CasinoViewSwitch), NE čistým CSS `hidden`, protože obě větve
          obsahují komponenty s vedlejšími efekty při mountu (impression
          tracking v PromotionSlot, useSession() fetch) a smí být mountnutá
          vždy jen jedna z nich zároveň — viz komentář v CasinoViewSwitch.tsx.
          `CreditGateOnArrival`/`WelcomePrizeOnArrival` patří JEN do legacy
          větve — stage má rovnocenné funkce uvnitř svého centrálního
          modal stavu (viz creditGate prop a useWelcomePrizePopup v
          ClassicCasinoStage.tsx); kdyby běžely i pro stage, otevřely by se
          dva modaly zároveň (viz zadání "dvojí dialog"). */}
      <CasinoViewSwitch
        stage={
          <ClassicCasinoStage
            skin={skin}
            promotionSlot={<PromotionSlot placement="homepage_top" pathname={PATHNAME} />}
          />
        }
        legacy={
          <>
            <LegacyCasinoLayout pathname={PATHNAME} />
            <WelcomePrizeOnArrival />
            <CreditGateOnArrival />
          </>
        }
      />
    </div>
  );
}
