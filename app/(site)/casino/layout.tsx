import type { ReactNode } from "react";
import AudioToggle from "../../components/audio/AudioToggle.tsx";
import AudioProvider from "../../../lib/audio/AudioProvider.tsx";

// Audio vrstva (hudba na pozadí + SFX, viz lib/audio/) žije jen v tomhle
// segmentu — AudioProvider se mountne s příchodem na /casino a unmountne
// s odchodem, takže hudba se sama zastaví při navigaci pryč (viz zadání
// "po odchodu z /casino hudbu zastav"), bez ruční route-watching logiky.
// SlotMachine.tsx/WelcomePrizeModal.tsx čtou stejný useAudio() hook i na
// /automaty (mimo tenhle layout) — tam dostanou no-op fallback z
// AudioProvider.tsx, žádné zvuky tam v v1 nehrají, ale nic nespadne.
export default function CasinoLayout({ children }: { children: ReactNode }) {
  return (
    <AudioProvider>
      {children}
      <AudioToggle />
    </AudioProvider>
  );
}
