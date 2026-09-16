import type { MusicPlaylistId, MusicTrack } from "./types.ts";

// Hudební playlisty podle typu stránky (viz lib/audio/route-playlist.ts,
// který přiřazuje route → playlist, a AudioProvider.tsx, který podle toho
// pouští/přepíná hudbu). Dva samostatné světy schválně:
//
// - `casino` = herní stránky (/casino, /automaty, /skorapky, /losy) —
//   energičtější 1930s swing, hraje "pod" hrou.
// - `universal` = informační/uživatelské stránky (/profil, /zebricky,
//   /jak-to-funguje) — pomalejší lounge/cabaret atmosféra, hudba je tam jen
//   tichá kulisa, ne hybatel.
//
// Všechny tracky jsou REÁLNÉ produkční soubory (`placeholder: false`) —
// ručně nahrané uživatelem do `temp/audio/`, převedené pro web (128 kbps
// MP3, 48 kHz, stereo, loudness-normalizované na -18 LUFS) a uložené do
// `public/audio/music/`. Licence NENÍ potvrzená (viz `license` níž a
// docs/audio-assets.md) — `author` je odvozený jen z názvu původního
// souboru (typický formát exportu z Pixabay: "<autor>-<název>-<id>.mp3"),
// ale samotný zdroj/licenční text nebyl ověřen, proto `source`/`license`
// zůstávají na bezpečných "needs verification" hodnotách místo domyšlené
// licence (viz zadání "nevymýšlej autora/licenci").
export const MUSIC_PLAYLISTS: Record<MusicPlaylistId, readonly MusicTrack[]> = {
  casino: [
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
  ],
  universal: [
    {
      id: "universal-lounge-01",
      title: "Swing Jazz Coffee Shop",
      src: "/audio/music/universal-lounge-01.mp3",
      author: "Alex Morgan",
      source: "user-provided",
      license: "unknown / verify manually",
      attributionRequired: true,
      placeholder: false,
    },
    {
      id: "universal-lounge-02",
      title: "Swing Baby Swing (1930s Swing)",
      src: "/audio/music/universal-lounge-02.mp3",
      author: "Kaazoom",
      source: "user-provided",
      license: "unknown / verify manually",
      attributionRequired: true,
      placeholder: false,
    },
  ],
};
