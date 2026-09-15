# public/audio/music/

Sem patří reálné soubory hudby na pozadí `/casino` (viz `lib/audio/tracks.ts`
a `docs/audio-assets.md`). Prázdné dokud sem někdo ručně nevloží legálně
podložené MP3 soubory — do té doby zůstávají v `tracks.ts` jen placeholder
záznamy a AudioProvider hru nespustí (soubor prostě chybí, nic nespadne).
