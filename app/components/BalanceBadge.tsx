"use client";

import { useSyncExternalStore } from "react";
import { loadPlayerState, subscribePlayerState } from "../../lib/casino/storage";

// Malý odznak v headeru se zůstatkem — globální (root layout), zatímco
// hra běží na /automaty, takže si nemůžou předávat stav přes props.
// useSyncExternalStore nad localStorage pub/sub (viz storage.ts) —
// odznak se sám přepočítá při KAŽDÉ změně zůstatku, ať k ní dojde
// kdekoli. `getServerSnapshot` vrací null (server nikdy nezná
// localStorage), takže se badge neukáže dřív, než je hydratovaný.
export default function BalanceBadge() {
  const credits = useSyncExternalStore(
    subscribePlayerState,
    () => loadPlayerState().credits,
    () => null
  );

  if (credits === null) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-neon-gold/40 bg-neon-gold/10 px-3 py-1 text-sm font-semibold text-neon-gold">
      {credits.toLocaleString("cs-CZ")} G
    </span>
  );
}
