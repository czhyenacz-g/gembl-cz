"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { notifySessionChanged } from "../../../lib/auth/use-session-client";

// Stripe redirect NENÍ důkaz zaplacení — G se připisují jen přes ověřený
// webhook, který může dorazit o chvíli později než tenhle redirect (viz
// zadání). Řešení je záměrně jednoduché: pár pokusů o přenačtení balance
// v krátkých odstupech (notifySessionChanged přinutí každou mountnutou
// useSession() instanci se přenačíst), ne nekonečný polling ani realtime
// infrastruktura.
const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

export default function PaymentStatusBanner() {
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const login = searchParams.get("login");
  const [attemptsDone, setAttemptsDone] = useState(0);

  useEffect(() => {
    if (payment !== "success") return;
    let cancelled = false;
    let count = 0;

    function poll() {
      if (cancelled || count >= POLL_ATTEMPTS) return;
      count += 1;
      notifySessionChanged();
      setAttemptsDone(count);
      window.setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [payment]);

  if (payment === "success") {
    return (
      <div className="gembl-block mb-6 p-4 text-sm text-gembl-ink">
        <p className="font-semibold">Platba proběhla. Kredit se připisuje.</p>
        {attemptsDone >= POLL_ATTEMPTS && (
          <p className="mt-1 text-xs text-gembl-muted">Platba byla přijata. Pokud se kredit ještě nezobrazil, obnov stránku.</p>
        )}
      </div>
    );
  }

  if (payment === "cancelled") {
    return (
      <div className="gembl-block mb-6 p-4 text-sm text-gembl-ink">
        <p>Platba byla zrušena. Kredit nebyl navýšen.</p>
      </div>
    );
  }

  if (login === "invalid") {
    return (
      <div className="gembl-block mb-6 p-4 text-sm text-gembl-ink">
        <p>Přihlašovací odkaz je neplatný nebo už vypršel. Vyžádej si prosím nový.</p>
      </div>
    );
  }

  return null;
}
