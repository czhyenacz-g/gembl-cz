"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import LoginModal from "../../../components/auth/LoginModal.tsx";
import TopUpModal from "../../../components/wallet/TopUpModal.tsx";
import WelcomePrizeModal from "../../../components/wallet/WelcomePrizeModal.tsx";
import { useSession } from "../../../../lib/auth/use-session-client.ts";
import type { CasinoSkin } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";
import { useWelcomePrizePopup } from "../../../../lib/onboarding/use-welcome-prize-popup.ts";
import AccountOverlay from "./AccountOverlay.tsx";
import CasinoStage from "./CasinoStage.tsx";
import MenuOverlay from "./MenuOverlay.tsx";
import SlotTeaser from "./SlotTeaser.tsx";
import StatsOverlay from "./StatsOverlay.tsx";

// Jeden sdílený "jaký wallet modal je otevřený" stav pro celou stage —
// AccountOverlay (ruční CTA) a welcome-prize popup (viz
// useWelcomePrizePopup) do něj jen zapisují přes callbacky, nikdy si
// nedrží vlastní paralelní modal stav (viz zadání "jeden zdroj pravdy").
// Díky tomu je vždy v DOM nejvýš jeden <LoginModal>/<TopUpModal>/
// <WelcomePrizeModal>. Žádný credit-gate tady — automat na /casino je jen
// vizuální teaser (viz SlotTeaser.tsx), nespíná se, takže tu není žádné
// "kolo", při kterém by mohl dojít kredit; skutečný credit-gate zůstává
// jen v SlotMachine.tsx na /automaty.
type StageModal = { kind: "none" } | { kind: "login" } | { kind: "topup" } | { kind: "welcome"; amountG: number };

// Skládá celý "classic" skin dohromady: background canvas (CasinoStage) +
// živé HTML overlaye napozicované podle skin.layout. Žádná herní/wallet/
// auth LOGIKA tady není (spin/wallet API zůstává v SlotMachine.tsx, login/
// topup v existujících modal komponentách) — jen kompozice + sdílený
// modal stav. "use client" kvůli useState/useSession zde přímo (dřív to
// řešil jen kvůli CasinoStage) — `promotionSlot` jako server komponenta
// v props funguje stejně jako dřív.
export default function ClassicCasinoStage({
  skin,
  promotionSlot,
}: {
  skin: CasinoSkin;
  promotionSlot?: ReactNode;
}) {
  const { session } = useSession();
  const loggedIn = session.status === "authenticated";
  const [modal, setModal] = useState<StageModal>({ kind: "none" });
  const welcomePrize = useWelcomePrizePopup();

  function closeModal() {
    setModal({ kind: "none" });
  }

  // Otevře welcome-prize popup, jakmile je částka známá — ale jen do
  // prázdna (nepřebije modal, který si právě otevřel/drží uživatel).
  useEffect(() => {
    if (welcomePrize.amountG === null) return;
    setModal((current) => (current.kind === "none" ? { kind: "welcome", amountG: welcomePrize.amountG! } : current));
  }, [welcomePrize.amountG]);

  function closeWelcomeModal() {
    welcomePrize.dismiss();
    closeModal();
  }

  return (
    <div>
      {/* H1 zůstává v DOM pro SEO/accessibility — vizuálně ho nahrazuje
          artwork ("AUTOMATY" / "Těsně vedle."), ať se titulek nezdvojuje. */}
      <h1 className="sr-only">Automaty — Těsně vedle.</h1>

      <CasinoStage skin={skin}>
        <Link
          href="/"
          style={rectStyle(skin.layout.logoHome)}
          aria-label="GEMBL.cz — domů"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
        />

        <MenuOverlay items={skin.layout.menu.items} rows={skin.layout.menu.rows} />
        <AccountOverlay
          layout={skin.layout.account}
          onRequestLogin={() => setModal({ kind: "login" })}
          onRequestTopUp={() => setModal({ kind: "topup" })}
        />
        <StatsOverlay layout={skin.layout.stats} />
        <SlotTeaser layout={skin.layout.slot} />
      </CasinoStage>

      {promotionSlot && <div className="mt-8">{promotionSlot}</div>}

      {modal.kind === "login" && <LoginModal onClose={closeModal} callbackUrl="/casino" />}
      {modal.kind === "topup" && <TopUpModal onClose={closeModal} />}
      {modal.kind === "welcome" && (
        <WelcomePrizeModal
          amountG={modal.amountG}
          loggedIn={loggedIn}
          onClose={closeWelcomeModal}
          onRequestLogin={() => setModal({ kind: "login" })}
        />
      )}
    </div>
  );
}
