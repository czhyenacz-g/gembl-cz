import type { ReactNode } from "react";
import AudioToggle from "../../components/audio/AudioToggle.tsx";
import AudioProvider from "../../../lib/audio/AudioProvider.tsx";

// Stejný vzor jako app/(site)/casino/layout.tsx a app/(site)/skorapky/layout.tsx
// — reuse existujícího audio manageru (viz zadání "nepřidávej nový audio
// manager"), jen mountnutý pro tenhle segment.
export default function LosyLayout({ children }: { children: ReactNode }) {
  return (
    <AudioProvider>
      {children}
      <AudioToggle />
    </AudioProvider>
  );
}
