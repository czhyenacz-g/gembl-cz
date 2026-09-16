"use client";

import { useEffect, useState } from "react";
import LoginModal from "../../components/auth/LoginModal";
import TopUpModal from "../../components/wallet/TopUpModal";
import { useSession } from "../../../lib/auth/use-session-client";
import { loadPlayerState } from "../../../lib/casino/storage";
import type { PlayerState } from "../../../lib/casino/types";

// Profil zobrazuje POUZE data, která už v projektu reálně existují —
// serverová session (useSession: e-mail, zůstatek, nárokovaný uvítací bonus)
// + lokální postup hráče (storage.ts: první hra, spiny, protočeno, vyhráno,
// achievementy). Žádný nickname ani historie transakcí v backendu nejsou,
// takže se nevymýšlejí — historie zůstává jen jako disabled CTA (stejně
// jako v AccountPanel.tsx).
function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("cs-CZ");
}

/** CTA v patičce panelu — reuse existujících modálů (žádný nový modal systém). */
export function ProfilActions() {
  const { session } = useSession();
  const [modal, setModal] = useState<"none" | "login" | "topup">("none");
  const loggedIn = session.status === "authenticated";

  return (
    <>
      {loggedIn ? (
        <button type="button" className="gembl-cta" onClick={() => setModal("topup")}>
          Dobít kredit
        </button>
      ) : (
        <button type="button" className="gembl-cta" onClick={() => setModal("login")}>
          Získat až 800 G
        </button>
      )}
      <button type="button" className="gembl-cta gembl-cta--disabled" disabled>
        Historie transakcí
      </button>

      {modal === "login" && <LoginModal onClose={() => setModal("none")} callbackUrl="/profil" />}
      {modal === "topup" && <TopUpModal onClose={() => setModal("none")} />}
    </>
  );
}

export default function ProfilPanel() {
  const { session } = useSession();
  // localStorage se čte až po mountu (server o něm neví) — stejný vzor jako
  // BalanceBadge/SlotMachine, ať nevznikne hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);

  useEffect(() => {
    setPlayer(loadPlayerState());
    setMounted(true);
  }, []);

  if (!mounted || !player) {
    return <div className="h-24 animate-pulse border border-gembl-line bg-gembl-paper-dark" />;
  }

  const loggedIn = session.status === "authenticated";
  // Přihlášený: zůstatek je serverová pravda; host: lokální storage (stejné
  // pravidlo jako BalanceBadge/AccountPanel).
  const credits = loggedIn ? session.credits : player.credits;
  const netLoss = player.totalWagered - player.totalWon;

  return (
    <dl className="gembl-block">
      <ProfilRow label="Stav účtu" value={loggedIn ? "Přihlášený" : "Host (postup jen v tomhle prohlížeči)"} />
      {loggedIn && <ProfilRow label="E-mail" value={session.email} />}
      <ProfilRow label="Zůstatek" value={`${credits.toLocaleString("cs-CZ")} G`} mono />
      {loggedIn && <ProfilRow label="Uvítací bonus" value={session.hasClaimedWelcomeBonus ? "Nárokován" : "Zatím nenárokován"} />}
      <ProfilRow label="První hra" value={formatDate(player.createdAt)} />
      <ProfilRow label="Odehraných spinů" value={player.totalSpins.toLocaleString("cs-CZ")} mono />
      <ProfilRow label="Protočeno" value={`${player.totalWagered.toLocaleString("cs-CZ")} G`} mono />
      <ProfilRow label="Vyhráno" value={`${player.totalWon.toLocaleString("cs-CZ")} G`} mono />
      <ProfilRow label="Čistá ztráta" value={`${netLoss.toLocaleString("cs-CZ")} G`} mono />
      <ProfilRow label="Odemčené achievementy" value={player.unlockedAchievements.length.toLocaleString("cs-CZ")} mono />
    </dl>
  );
}

function ProfilRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="gembl-table-row">
      <dt className="text-gembl-muted">{label}</dt>
      <dd className={`text-right font-semibold text-gembl-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
