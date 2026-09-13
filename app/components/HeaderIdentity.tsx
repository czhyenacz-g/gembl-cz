"use client";

import { useSession } from "../../lib/auth/use-session-client";

// Nahrazuje dřívější natvrdo napsaný "Smolar77" placeholder (žádný
// účet/auth systém tehdy neexistoval) — teď skutečný email přihlášeného
// uživatele, nebo nic, když nikdo přihlášený není.
export default function HeaderIdentity() {
  const { session } = useSession();
  if (session.status !== "authenticated") return null;

  return (
    <span className="hidden max-w-[10rem] truncate font-serif text-xs font-bold uppercase tracking-wide text-gembl-muted sm:inline">
      {session.email}
    </span>
  );
}
