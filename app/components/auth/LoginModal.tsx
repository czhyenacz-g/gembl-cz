"use client";

import { useState, type FormEvent } from "react";
import ModalShell from "../ModalShell";

// Jedna obrazovka pro login i registraci zároveň (viz zadání) — nový email
// založí účet automaticky při ověření magic linku, žádné oddělené
// "Registrace"/"Přihlášení"/"Zapomenuté heslo".
export default function LoginModal({
  onClose,
  callbackUrl,
  leadText,
}: {
  onClose: () => void;
  callbackUrl?: string;
  leadText?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackUrl }),
      });
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <ModalShell title="Přihlas se nebo si vytvoř účet" onClose={onClose}>
      {leadText && <p className="mb-3 text-sm font-semibold text-gembl-red">{leadText}</p>}

      {status !== "sent" && (
        <div className="mb-4 border-2 border-gembl-red bg-gembl-paper-dark p-3">
          <p className="font-serif text-sm font-black uppercase text-gembl-red">Dochází G?</p>
          <p className="mt-1 text-xs text-gembl-ink">Přihlas se pouze e-mailem a připíšeme ti 1 000 G zdarma.</p>
        </div>
      )}

      {status === "sent" ? (
        <p className="text-sm text-gembl-ink">
          Pokud je možné tento email použít, poslali jsme na něj přihlašovací odkaz. Zkontroluj schránku (i spam).
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-left text-xs font-semibold uppercase tracking-wide text-gembl-muted" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="moje@email.cz"
            className="border-2 border-gembl-ink bg-gembl-paper px-3 py-2 font-mono text-sm text-gembl-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
          />
          <button type="submit" disabled={status === "sending"} className="gembl-cta w-full disabled:opacity-60">
            {status === "sending" ? "Odesílám…" : "Poslat přihlašovací odkaz"}
          </button>
          <p className="text-xs text-gembl-muted">Pošleme ti jednorázový přihlašovací odkaz. Žádné heslo nepotřebuješ.</p>
          {status === "error" && <p className="text-xs font-semibold text-gembl-red">Něco se nepovedlo, zkus to prosím znovu.</p>}
        </form>
      )}
    </ModalShell>
  );
}
