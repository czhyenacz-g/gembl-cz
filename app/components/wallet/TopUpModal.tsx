"use client";

import { useState } from "react";
import { CREDIT_PACKAGES } from "../../../lib/wallet/packages";
import ModalShell from "../ModalShell";

export default function TopUpModal({ onClose, leadText }: { onClose: () => void; leadText?: string }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(packageId: string) {
    if (loadingId) return;
    setLoadingId(packageId);
    setError(null);
    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "checkout_failed");
      window.location.href = data.url;
    } catch {
      setError("Platbu se nepodařilo spustit, zkus to prosím znovu.");
      setLoadingId(null);
    }
  }

  return (
    <ModalShell title="Došel ti kredit?" onClose={onClose}>
      {leadText && <p className="mb-2 text-sm font-semibold text-gembl-red">{leadText}</p>}
      <p className="text-sm text-gembl-ink">Dobij G a hraj dál.</p>

      <div className="mt-4 flex flex-col gap-2">
        {CREDIT_PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => handleBuy(pkg.id)}
            disabled={loadingId !== null}
            className="gembl-cta gembl-cta--secondary flex w-full items-center justify-between px-4 disabled:opacity-50"
          >
            <span>{pkg.credits.toLocaleString("cs-CZ")} G</span>
            <span>{pkg.priceCzk.toLocaleString("cs-CZ")} Kč</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-gembl-muted">1 Kč = 1 G</p>
      <p className="mt-3 text-[11px] text-gembl-muted">
        G jsou digitální herní kredity používané pouze v GEMBL.cz. Nelze je vybrat, převést na peníze ani směnit za
        peněžní či věcné ceny.
      </p>
      {error && <p className="mt-3 text-xs font-semibold text-gembl-red">{error}</p>}
    </ModalShell>
  );
}
