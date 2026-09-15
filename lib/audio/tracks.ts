import type { MusicTrack } from "./types.ts";

// Playlist hrající na pozadí /casino stage — viz AudioProvider.tsx pro
// přehrávací logiku (náhodný výběr při startu, náhodný výběr dalšího
// tracku po doznění aktuálního, bez bezprostředního opakování stejné
// skladby při 2+ aktivních tracích, krátký fade při přechodu).
//
// Oba tracky níž jsou REÁLNÉ produkční soubory (`placeholder: false`) —
// ručně nahrané uživatelem do `temp/audio/`, převedené pro web (128 kbps
// MP3, 48 kHz, stereo, loudness-normalizované) a uložené do
// `public/audio/music/`. Licence NENÍ potvrzená (viz `license` níž a
// docs/audio-assets.md) — `author` je odvozený jen z názvu původního
// souboru (typický formát exportu z Pixabay: "<autor>-<název>-<id>.mp3"),
// ale samotný zdroj/licenční text nebyl ověřen, proto `source`/`license`
// zůstávají na bezpečných "needs verification" hodnotách místo domyšlené
// licence (viz zadání "nevymýšlej autora/licenci").
export const MUSIC_PLAYLIST: readonly MusicTrack[] = [
  {
    id: "retro-casino-01",
    title: "The Foot Tappers Club",
    src: "/audio/music/retro-casino-01.mp3",
    author: "Kaazoom",
    source: "user-provided",
    license: "unknown / verify manually",
    attributionRequired: true,
    placeholder: false,
  },
  {
    id: "retro-casino-02",
    title: "Late Night Big Band Swing",
    src: "/audio/music/retro-casino-02.mp3",
    author: "NickPanek",
    source: "user-provided",
    license: "unknown / verify manually",
    attributionRequired: true,
    placeholder: false,
  },
];
