import AudioToggle from "../components/audio/AudioToggle.tsx";
import AudioProvider from "../../lib/audio/AudioProvider.tsx";
import SiteChrome from "../components/SiteChrome";

// Audio vrstva je mountnutá JEDNOU tady pro celý web (dřív ji měl každý
// herní segment zvlášť ve svém layoutu) — AudioProvider si playlist určuje
// sám z aktuální route (viz lib/audio/route-playlist.ts), takže navigace
// mezi herními a obsahovými stránkami jen přefaduje hudbu (fade-out staré,
// fade-in nové) místo aby se provider unmountoval a hudba usekla. Druhý
// AudioProvider nikde není — všechny stránky čtou stejný useAudio() kontext.
//
// Route bez playlistu (např. /reset) prostě hraje ticho; toggle zůstává
// viditelný všude, protože je to jediné globální audio ovládání (viz
// AudioToggle.tsx) a jeho stav je per-prohlížeč, ne per-route.
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AudioProvider>
      <SiteChrome>{children}</SiteChrome>
      <AudioToggle />
    </AudioProvider>
  );
}
