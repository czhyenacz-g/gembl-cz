"use client";

import LoginModal from "../auth/LoginModal";
import TopUpModal from "./TopUpModal";

// Jeden gate pro "nedostatek kreditů" se dvěma obsahy podle stavu
// přihlášení (viz zadání sekce 9) — nepřihlášený dostane výzvu k
// přihlášení, přihlášený rovnou nabídku balíčků.
export default function CreditGateModal({
  loggedIn,
  onClose,
  callbackUrl,
}: {
  loggedIn: boolean;
  onClose: () => void;
  callbackUrl?: string;
}) {
  if (!loggedIn) {
    return <LoginModal onClose={onClose} callbackUrl={callbackUrl} leadText="Přihlas se a pokračuj ve hře." />;
  }
  return <TopUpModal onClose={onClose} leadText="Došel ti kredit. Dobij G a hraj dál." />;
}
