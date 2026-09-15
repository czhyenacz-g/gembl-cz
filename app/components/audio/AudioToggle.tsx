"use client";

import { useAudio } from "../../../lib/audio/AudioProvider.tsx";

// Jediné audio ovládání v v1 (viz zadání "nechci velký settings panel") —
// malé nenápadné tlačítko, fixní pozice nad celou stránkou /casino (viz
// app/(site)/casino/layout.tsx). Záměrně MIMO skin.layout rect systém
// (viz zadání "neměnit skin architekturu, stage coordinates") — funguje
// stejně na stage i legacy/mobile variantě, protože obě žijí pod stejným
// layoutem.
export default function AudioToggle() {
  const { muted, toggleMuted, ready } = useAudio();

  // Dokud se preference nenačtou z localStorage, tlačítko se neukazuje —
  // ať nebliká mezi dvěma stavy hned po příchodu na stránku.
  if (!ready) return null;

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={muted ? "Zapnout zvuk" : "Vypnout zvuk"}
      title={muted ? "Zvuk vypnut" : "Zvuk zapnut"}
      className="fixed bottom-4 right-4 z-[70] flex h-10 w-10 items-center justify-center border-2 border-gembl-ink bg-gembl-paper font-serif text-lg text-gembl-ink shadow-hard-sm transition hover:bg-gembl-paper-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
    >
      <span aria-hidden="true" className={muted ? "text-gembl-muted line-through opacity-70" : "text-gembl-red"}>
        ♫
      </span>
    </button>
  );
}
