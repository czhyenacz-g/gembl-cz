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
    <span className="inline-flex items-center gap-1 border-2 border-gembl-ink bg-gembl-paper px-3 py-1 font-mono text-sm font-semibold text-gembl-ink">
      {credits.toLocaleString("cs-CZ")} G
    </span>
  );
}
