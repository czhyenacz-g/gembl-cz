import type { MusicTrack } from "./types.ts";

// Playlist hrající na pozadí /casino stage (viz AudioProvider.tsx) —
// přehrává se popořadě, po skončení jedné skladby naskočí další (viz
// `handleTrackEnded`), po poslední se vrací na začátek.
//
// Všechny položky níž jsou zatím PLACEHOLDER (`placeholder: true`) — na
// `src` cestě zatím fyzicky NENÍ žádný soubor. AudioProvider s chybějícím/
// nenačitatelným souborem počítá (viz `handleTrackError`) a jen tiše
// přeskočí na další skladbu, nikdy nespadne ani nezasekne přehrávání.
//
// Až budou k dispozici legální (licenčně čisté) tracky ve stylu 1930s hot
// jazz / ragtime / vaudeville / cartoon casino vibe:
// 1. ulož MP3 do `public/audio/music/<soubor>.mp3`
// 2. doplň zde `author`/`source`/`license`/`attributionRequired`
// 3. nastav `placeholder: false`
// Viz docs/audio-assets.md pro přesný postup a kandidátní zdroje.
export const MUSIC_PLAYLIST: readonly MusicTrack[] = [
  {
    id: "hot-club-shuffle",
    title: "Hot Club Shuffle (placeholder)",
    src: "/audio/music/hot-club-shuffle.mp3",
    author: "TODO",
    source: "TODO",
    license: "TODO",
    attributionRequired: true,
    placeholder: true,
  },
  {
    id: "vaudeville-rag",
    title: "Vaudeville Rag (placeholder)",
    src: "/audio/music/vaudeville-rag.mp3",
    author: "TODO",
    source: "TODO",
    license: "TODO",
    attributionRequired: true,
    placeholder: true,
  },
  {
    id: "cabaret-swing",
    title: "Cabaret Swing (placeholder)",
    src: "/audio/music/cabaret-swing.mp3",
    author: "TODO",
    source: "TODO",
    license: "TODO",
    attributionRequired: true,
    placeholder: true,
  },
];
