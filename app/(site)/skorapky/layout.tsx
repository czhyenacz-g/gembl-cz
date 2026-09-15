import type { ReactNode } from "react";
import AudioToggle from "../../components/audio/AudioToggle.tsx";
import AudioProvider from "../../../lib/audio/AudioProvider.tsx";

// Stejný vzor jako app/(site)/casino/layout.tsx — reuse existujícího
// audio manageru (viz zadání "nevytvářej nový audio manager"), jen
// mountnutý pro tenhle segment: AudioProvider (+ mute toggle) žije s
// příchodem/odchodem z /skorapky, hudba/SFX se tak samy zastaví při
// navigaci pryč, beze změny AudioProvider.tsx samotného.
export default function SkorapkyLayout({ children }: { children: ReactNode }) {
  return (
    <AudioProvider>
      {children}
      <AudioToggle />
    </AudioProvider>
  );
}
