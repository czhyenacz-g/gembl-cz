"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import LoginModal from "../../../components/auth/LoginModal.tsx";
import CreditGateModal from "../../../components/wallet/CreditGateModal.tsx";
import TopUpModal from "../../../components/wallet/TopUpModal.tsx";
import { useSession } from "../../../../lib/auth/use-session-client.ts";
import type { CasinoSkin } from "../../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../../lib/casino-skins/rect-style.ts";
import SlotMachine from "../../automaty/SlotMachine.tsx";
import AccountOverlay from "./AccountOverlay.tsx";
import CasinoStage from "./CasinoStage.tsx";
import MenuOverlay from "./MenuOverlay.tsx";
import StatsOverlay from "./StatsOverlay.tsx";

// Jeden sdílený "jaký wallet modal je otevřený" stav pro celou stage —
// AccountOverlay (ruční CTA) i SlotMachine embedded (automatický
// credit-gate při příchodu s 0 G / po doprotočení kreditu) do něj jen
// zapisují přes callbacky, nikdy si nedrží vlastní paralelní modal stav
// (viz zadání "jeden zdroj pravdy"). Díky tomu je vždy v DOM nejvýš jeden
// <LoginModal>/<TopUpModal>/<CreditGateModal>.
type StageModal = { kind: "none" } | { kind: "login" } | { kind: "topup" } | { kind: "credit-gate" };

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

  function closeModal() {
    setModal({ kind: "none" });
  }

  // Stabilní identita (useCallback, prázdné deps — `setModal` je useState
  // setter, vždy stabilní): SlotMachine tenhle callback dává do deps pole
  // svého auto-trigger efektu (viz SlotMachine.tsx), takže musí mít napříč
  // rendery stejnou referenci, jinak by se efekt zbytečně přeregistrovával
  // při každém otevření/zavření libovolného modalu na stage.
  const handleCreditGateChange = useCallback((open: boolean) => {
    setModal(open ? { kind: "credit-gate" } : { kind: "none" });
  }, []);

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
        <SlotMachine
          embedded
          layout={skin.layout.slot}
          creditGate={{ open: modal.kind === "credit-gate", onOpenChange: handleCreditGateChange }}
        />
      </CasinoStage>

      {promotionSlot && <div className="mt-8">{promotionSlot}</div>}

      {modal.kind === "login" && <LoginModal onClose={closeModal} callbackUrl="/casino" />}
      {modal.kind === "topup" && <TopUpModal onClose={closeModal} />}
      {modal.kind === "credit-gate" && <CreditGateModal loggedIn={loggedIn} onClose={closeModal} callbackUrl="/casino" />}
    </div>
  );
}
