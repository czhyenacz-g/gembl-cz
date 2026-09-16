# Audio assety — /casino, hry a obsahové stránky

Tenhle dokument eviduje licences audio souborů použitých v GEMBL.cz (hudba
na pozadí + SFX, viz `lib/audio/`). Cíl: do projektu se nikdy nedostane
audio s nejasnou nebo neověřenou licencí.

Architektura je popsaná v `lib/audio/AudioProvider.tsx` (jediný centrální
audio manager, `useAudio()` hook, mountnutý jednou v `app/(site)/layout.tsx`).
Playlist se určuje z aktuální route (`lib/audio/route-playlist.ts`), takže
přechod mezi herní a obsahovou stránkou hudbu přefaduje (fade-out → fade-in).
Registry: `lib/audio/tracks.ts` (hudba, per playlist) a `lib/audio/sfx.ts`
(efekty).

## Playlisty

| Playlist | Kde hraje | Charakter |
|---|---|---|
| `casino` | `/casino`, `/automaty`, `/skorapky`, `/losy` | energičtější 1930s swing „pod hrou“ |
| `universal` | `/profil`, `/zebricky`, `/jak-to-funguje` | pomalejší lounge/cabaret jako tichá kulisa |

Route, která v `route-playlist.ts` není (např. `/reset`), hraje ticho — to je
záměr, ne opomenutí.

## Jak přidat reálný soubor

### Hudba

1. Ulož MP3 do `public/audio/music/<soubor>.mp3`.
2. V `lib/audio/tracks.ts` přidej záznam do příslušného playlistu a doplň
   `title` / `author` / `source` / `license` / `attributionRequired`.
3. Nastav `placeholder: false` a doplň řádek do tabulky níž.

Konverze pro web (stejná pipeline pro všechny tracky):

```
ffmpeg -i <originál> -af loudnorm=I=-18:TP=-1.5:LRA=11 -ar 48000 -ac 2 \
  -c:a libmp3lame -b:a 128k public/audio/music/<výstup>.mp3
```

### SFX

1. Ulož krátké MP3 do `public/audio/sfx/<soubor>.mp3`.
2. V `lib/audio/sfx.ts` přidej/uprav záznam (`src`) a nastav
   `placeholder: false`.

Konverze pro web (mono, peak-normalizace; `loudnorm` je u souborů pod 3 s
nespolehlivý, proto se normalizuje na špičku):

```
ffmpeg -i <zdroj> -af "volume=<gain>dB" -ac 1 -ar 48000 \
  -c:a libmp3lame -b:a 128k public/audio/sfx/<výstup>.mp3
```

Chybějící soubor nic nerozbije — `AudioProvider.playSfx()` má `try/catch`
i `.catch()` na `el.play()`, takže se jen tiše nic nepřehraje (žádný pád
hry, žádný dopad na wallet/spin logiku).

## Styl

Original / royalty-free 1930s hot jazz, early swing, ragtime, vaudeville a
**mechanické retro kasino zvuky** (dřevo, kov, žetony, karty, papír).
**Nikdy**: synth/arcade beepy, digitální jackpoty, futuristické UI zvuky a
konkrétní melodie z existujících her/značek.

---

## Casino music (playlist `casino`)

| Track (id) | Titul | Autor (z názvu souboru) | Zdroj | Stav licence | Soubor | Duration | Bitrate | Sample rate |
|---|---|---|---|---|---|---|---|---|
| `retro-casino-01` | The Foot Tappers Club | Kaazoom | user-provided | ⚠️ **LICENSE NEEDS MANUAL VERIFICATION** | `public/audio/music/retro-casino-01.mp3` | 2:30 (149.9 s) | 128 kbps MP3 | 48 kHz stereo |
| `retro-casino-02` | Late Night Big Band Swing | NickPanek | user-provided | ⚠️ **LICENSE NEEDS MANUAL VERIFICATION** | `public/audio/music/retro-casino-02.mp3` | 1:33 (92.9 s) | 128 kbps MP3 | 48 kHz stereo |

## Universal / lounge music (playlist `universal`)

Nové tracky pro obsahové stránky (Profil / Žebříčky / Jak to funguje).
Zdrojové soubory nahrál ručně uživatel do `temp/audio/`, převedené stejnou
pipeline jako casino tracky (128 kbps, 48 kHz stereo, normalizace na
-18 LUFS integrated / -1.5 dBTP).

| Track (id) | Titul | Autor (z názvu souboru) | Zdroj | Stav licence | Soubor | Duration | Bitrate | Sample rate |
|---|---|---|---|---|---|---|---|---|
| `universal-lounge-01` | Swing Jazz Coffee Shop | Alex Morgan | user-provided | ⚠️ **LICENSE NEEDS MANUAL VERIFICATION** | `public/audio/music/universal-lounge-01.mp3` | 2:22 (142.1 s) | 128 kbps MP3 | 48 kHz stereo |
| `universal-lounge-02` | Swing Baby Swing (1930s Swing) | Kaazoom | user-provided | ⚠️ **LICENSE NEEDS MANUAL VERIFICATION** | `public/audio/music/universal-lounge-02.mp3` | 1:59 (118.9 s) | 128 kbps MP3 | 48 kHz stereo |

Měření po normalizaci (žádný clipping, hlasitosti sladěné s casino tracky,
takže přechod mezi playlisty neudělá skok): `universal-lounge-01` mean
−20.2 dB / peak −7.6 dB, `universal-lounge-02` mean −19.9 dB / peak −8.2 dB
(casino tracky: −20.4 / −6.4 a −20.5 / −2.8).

### Originální (zdrojové) soubory v `temp/audio/` (negitované)

| Originál | Duration | Bitrate | Sample rate | Velikost |
|---|---|---|---|---|
| `kaazoom-the-foot-tappers-club-1930s-upbeat-swing-music-482680.mp3` | 2:30 (149.9 s) | 256 kbps MP3 CBR | 48 kHz stereo | 4.58 MB |
| `nickpanek-late-night-big-band-swing-jazz-instrumental-236168.mp3` | 1:33 (92.9 s) | 256 kbps MP3 CBR | 48 kHz stereo | 2.83 MB |
| `alex-morgan-swing-jazz-coffee-shop-568165.mp3` | 2:22 (142.0 s) | 256 kbps MP3 CBR | 48 kHz stereo | 4.34 MB |
| `kaazoom-swing-baby-swing-1930s-upbeat-swing-music-482670.mp3` | 1:59 (118.9 s) | 256 kbps MP3 CBR | 48 kHz stereo | 3.63 MB |

⚠️ **LICENSE NEEDS MANUAL VERIFICATION** — `author` je jen to, co je čitelné
z názvu souboru (typický formát exportu z Pixabay:
`<autor>-<název>-<pixabay-id>.mp3`), licenční text nebyl ověřen. V
`tracks.ts` proto zůstává `source: "user-provided"` /
`license: "unknown / verify manually"`.

---

## SFX

Všechny SFX níž **vygeneroval in-house** tento projekt přímo z ffmpeg
syntézy (šumové impulsy + filtrace + obálky — dřevo, kov, žetony, papír).
Nejsou to stažené vzorky, takže **žádná třetí strana a žádné licenční
riziko**; projekt je vlastní. Nejsou to ale audiofilní nahrávky — pokud bude
chtít uživatel realističtější, stačí soubor na stejné cestě nahradit
(délka/charakter by měly zůstat podobné, viz tabulka).

Formát: mono MP3 128 kbps, 48 kHz, peak-normalizované na **-3 dBFS**.
Většina efektů je one-shot (`playSfx`). Efekty označené `loop: true`
(`scratch`) se přehrávají přes `startSfxLoop`/`stopSfxLoop` — běží, dokud
trvá interakce, a musí to být **seamless smyčka** (konec crossfadovaný do
začátku, ať na loop pointu nevzniká mezera ani cvaknutí).
Jediná výjimka je `near_miss`: je to tónový sting (ne perkuse), takže byl
záměrně stažen o 4 dB (peak **-7.4 dBFS**) — s peak-normalizací by působil
řádově hlasitěji než ostatní efekty a přehlušoval hudbu.

| SFX id | Popis | Soubor | Duration | Velikost | Placeholder |
|---|---|---|---|---|---|
| `ui_click` | Dřevěné kliknutí tlačítka | `public/audio/sfx/ui-click.mp3` | 120 ms | 2.3 kB | false |
| `spin_start` | Zatažení páky (ráčna + kovový clack) | `public/audio/sfx/spin-start.mp3` | 480 ms | 8.1 kB | false |
| `reel_tick` | Cvaknutí válce (jemné) | `public/audio/sfx/reel-tick.mp3` | 96 ms | 2.0 kB | false |
| `spin_stop` | Těžší klak při zastavení válců | `public/audio/sfx/spin-stop.mp3` | 264 ms | 4.7 kB | false |
| `near_miss` | Cartoon „wah-wah“ pád (stažen o 4 dB, viz výš) | `public/audio/sfx/near-miss.mp3` | 888 ms | 14.6 kB | false |
| `lose` | Suché položení žetonu | `public/audio/sfx/lose.mp3` | 216 ms | 3.9 kB | false |
| `credit_added` | Hrst žetonů na stůl | `public/audio/sfx/credit-added.mp3` | 744 ms | 12.3 kB | false |
| `popup_open` | Opona/karta + krátký sting | `public/audio/sfx/popup-open.mp3` | 648 ms | 10.8 kB | false |
| `topup_open` | Pokladní zásuvka | `public/audio/sfx/topup-open.mp3` | 432 ms | 7.3 kB | false |
| `shell_shuffle` | Dřevěné posuny kelímků | `public/audio/sfx/shell-shuffle.mp3` | 528 ms | 8.9 kB | false |
| `scratch` | Stírání losu — **smyčka** (karton + náznak kovu) | `public/audio/sfx/scratch-loop.mp3` | 3.24 s | 52 kB | false (DOČASNÉ, viz níž) |
| `devil_laugh` | Ďábelský smích (později) | — (soubor záměrně není) | — | — | **true** |

## Kde se které SFX hraje

| Event | SFX | Kde |
|---|---|---|
| Klik na VSADIT (automaty) | `ui_click` + `spin_start` | `SlotMachine.tsx` (handleSpin) |
| ± sázka (automaty) | `ui_click` | `SlotMachine.tsx` (tlačítka −/+) |
| Během točení válců | `reel_tick` (max ~5× za spin) | `SlotMachine.tsx` (efekt na `spinning`) |
| Zastavení válců | `spin_stop` | `SlotMachine.tsx` (finishSpinAnimation) |
| Výsledek „těsně vedle“ | `near_miss` | `SlotMachine.tsx` (classifySpinResult) |
| Běžná prohra | `lose` | `SlotMachine.tsx` (classifySpinResult) |
| Klik na HRÁT (skořápky) | `ui_click` | `ShellGame.tsx` (handlePlay) |
| Začátek míchání | `shell_shuffle` | `ShellGame.tsx` (startShuffling) |
| Klik na kelímek | `ui_click` | `ShellGame.tsx` (handleSelectCup) |
| Reveal kuličky | `spin_stop` | `ShellGame.tsx` (handleSelectCup) |
| Prohra (skořápky) | `lose` | `ShellGame.tsx` (handleSelectCup) |
| Koupě losu | `ui_click` | `ScratchCard.tsx` (handleBuy) |
| Stírání losu (jen při skutečném pohybu) | `scratch` (smyčka, `startSfxLoop`/`stopSfxLoop`) | `ScratchLayer.tsx` |
| Dokončení odhalení | `spin_stop` | `ScratchCard.tsx` (handleThresholdReached) |
| Prohra (losy) | `lose` | `ScratchCard.tsx` (handleThresholdReached) |
| Otevření welcome popupu | `popup_open` | `WelcomePrizeModal.tsx` (mount) |
| Vyzvednutí výhry | `ui_click` (klik) + `credit_added` (po úspěchu) | `WelcomePrizeModal.tsx` |
| Otevření dobití | `topup_open` | `TopUpModal.tsx` (mount) |
| Login/topup CTA | `ui_click` | `AccountOverlay.tsx`, `AccountPanel.tsx`, `LoginModal.tsx` |

## Co ještě chybí dodat ručně

1. **`devil_laugh`** — asset záměrně není (registrovaný placeholder, nikde
   se nevolá). Až bude nahrávka, stačí ji položit do
   `public/audio/sfx/devil-laugh.mp3` a v `sfx.ts` přepnout
   `placeholder: false`.
2. **Ověření licencí u hudby** — u všech 4 tracků (2× casino, 2× universal)
   je licence neověřená; dohledat a potvrdit licenční text (pravděpodobně
   Pixabay Content License) a přepsat `source` / `license` /
   `attributionRequired` v `tracks.ts` + tabulky výš.
3. Volitelně: realističtější SFX nahrávky místo generovaných (viz úvod
   sekce SFX) — stačí nahradit soubory na stejných cestách.
4. **`scratch` je označený jako DOČASNÝ** — je to in-house syntéza (karton
   + velmi tichý náznak kovu; středové pásmo 300–2500 Hz dominuje −22 dB,
   výšky 5–9 kHz jsou −38 dB, takže žádný hys), ne skutečná nahrávka
   škrábání. Amplituda je NEPRAVIDELNÁ obálka z pomalého šumu (žádné
   periodické tremolo — první verze s tremolem zněla jako vrtačka). Až bude kvalitnější
   reálný sample (krátký, bez ticha na konci, ideálně 1,5–2,5 s smyčka),
   stačí ho položit jako **`public/audio/sfx/scratch-loop.mp3`** (mono,
   48 kHz, peak ≈ −3 dBFS, konec crossfadovaný do začátku) — kód se měnit
   nemusí, cesta i `loop: true` v `lib/audio/sfx.ts` už jsou nastavené.

## Checklist před přidáním nového souboru

- [ ] Licence je jednoznačně identifikovaná (ne „asi volné“, ale ověřený text)
- [ ] `author`/`source`/`license`/`attributionRequired` vyplněné v `tracks.ts`/`sfx.ts`
- [ ] Pokud `attributionRequired: true`, attribution text je evidovaný a zobrazený tam, kde to licence vyžaduje
- [ ] Soubor je rozumně komprimovaný (MP3, ne desítky MB — viz zadání „výkon“)
- [ ] `placeholder: false` nastaveno v registry
