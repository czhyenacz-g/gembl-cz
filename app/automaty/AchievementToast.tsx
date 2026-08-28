"use client";

import { useEffect, useState } from "react";

const VISIBLE_MS = 3500;

// Krátký toast, co po pár vteřinách sám zmizí — jednoduchý mount-based
// fade/slide (opacity + translate), žádná externí animační knihovna.
export default function AchievementToast({ title, onDismiss }: { title: string; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 10);
    const hideTimer = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    const dismissTimer = window.setTimeout(onDismiss, VISIBLE_MS + 300);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(dismissTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDismiss je stabilní callback z rodiče, jen jednou naplánovaný timeout
  }, []);

  return (
    <div
      role="status"
      className={`w-64 border-2 border-gembl-ink bg-gembl-paper px-4 py-3 shadow-hard-sm transition duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gembl-red">Achievement odemčen</p>
      <p className="mt-0.5 font-serif text-gembl-ink">{title}</p>
    </div>
  );
}
