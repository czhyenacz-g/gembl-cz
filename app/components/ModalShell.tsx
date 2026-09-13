"use client";

import type { MouseEvent, ReactNode } from "react";

// Sdílený overlay pro LoginModal/TopUpModal — žádná nová vizuální
// abstrakce navíc, jen existující gembl-block/shadow-hard styl (viz
// CLAUDE.md konvence) v podobě modalu. Klik na backdrop zavře, klik uvnitř
// panelu ne (stopPropagation).
export default function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  function stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
    >
      <div className="gembl-block w-full max-w-sm p-6 text-center shadow-hard" onClick={stopPropagation}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-lg font-bold uppercase text-gembl-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Zavřít" className="text-gembl-muted transition hover:text-gembl-red">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
