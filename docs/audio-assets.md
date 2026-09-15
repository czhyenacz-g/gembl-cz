# Audio assety — /casino

Tenhle dokument eviduje licence audio souborů použitých v casino
experience (hudba na pozadí + SFX, viz `lib/audio/`). Cíl: do projektu se
nikdy nedostane audio s nejasnou nebo neověřenou licencí.

Architektura je popsaná v `lib/audio/AudioProvider.tsx` (jediný centrální
audio manager, `useAudio()` hook). Registry jsou v `lib/audio/tracks.ts`
(hudba) a `lib/audio/sfx.ts` (efekty). Hudební playlist (`lib/audio/tracks.ts`)
má od teď 2 REÁLNÉ produkční tracky (`placeholder: false`, viz "Evidence
tracků" níž) — jejich **licence ale zatím není potvrzená**, viz sloupec
"Stav licence". SFX registry (`lib/audio/sfx.ts`) zůstává zatím čistě
**placeholder** (`placeholder: true`), protože v repu nejsou žádné reálné
SFX soubory.

## Jak přidat reálný soubor

### Hudba (background playlist)

1. Ulož MP3 do `public/audio/music/<soubor>.mp3` (viz `public/audio/music/README.md`).
2. V `lib/audio/tracks.ts` najdi odpovídající záznam (nebo přidej nový) a doplň:
   - `title` — skutečný název skladby
   - `author` — autor/interpret přesně tak, jak to licence vyžaduje
   - `source` — odkud skladba pochází (knihovna/archiv/URL)
   - `license` — přesný název licence (např. `CC BY 4.0`, `CC0`, `Public Domain`)
   - `attributionRequired` — `true`/`false` podle licence
3. Nastav `placeholder: false`.
4. Doplň řádek do tabulky "Evidence tracků" níž.

### SFX

1. Ulož MP3 do `public/audio/sfx/<soubor>.mp3` (viz `public/audio/sfx/README.md`).
2. V `lib/audio/sfx.ts` uprav `src` na skutečnou cestu a nastav `placeholder: false`.
3. Krátké, jemné zvuky — žádné hlasité/agresivní efekty (viz zadání).

## Styl hudby (pro výběr/skladbu tracků)

Original / royalty-free, ve stylu: 1930s hot jazz, early swing, ragtime,
vaudeville/cabaret, vintage cartoon casino vibe. **Nikdy nekopírovat**
konkrétní soundtracky nebo melodie z existujících her/značek.

## Evidence tracků

Oba soubory nahrál ručně uživatel do `temp/audio/` (mimo git, zdrojové
originály tam zůstávají jako záloha) a byly převedené pro web (viz
"Převod" níž). Původní název souboru odpovídá typickému exportu z
Pixabay (`<autor>-<název>-<pixabay-id>.mp3`), ale **licenční text nebyl
ověřen** — `author` níž je jen to, co je čitelné z názvu souboru, ne
potvrzená licenční informace.

| Track (id) | Titul | Autor (z názvu souboru) | Zdroj | Stav licence | Soubor | Duration | Bitrate | Sample rate |
|---|---|---|---|---|---|---|---|---|
| `retro-casino-01` | The Foot Tappers Club | Kaazoom | user-provided | ⚠️ **LICENSE NEEDS MANUAL VERIFICATION** | `public/audio/music/retro-casino-01.mp3` | 2:30 (149.9 s) | 128 kbps MP3 | 48 kHz stereo |
| `retro-casino-02` | Late Night Big Band Swing | NickPanek | user-provided | ⚠️ **LICENSE NEEDS MANUAL VERIFICATION** | `public/audio/music/retro-casino-02.mp3` | 1:33 (92.9 s) | 128 kbps MP3 | 48 kHz stereo |

**Originální (zdrojové) soubory** — zatím ponechané v `temp/audio/` (negitované, mimo `public/`), pro referenci/re-konverzi:

| Originál | Duration | Bitrate | Sample rate | Velikost |
|---|---|---|---|---|
| `kaazoom-the-foot-tappers-club-1930s-upbeat-swing-music-482680.mp3` | 2:30 (149.9 s) | 256 kbps MP3 CBR | 48 kHz stereo | 4.58 MB |
| `nickpanek-late-night-big-band-swing-jazz-instrumental-236168.mp3` | 1:33 (92.9 s) | 256 kbps MP3 CBR | 48 kHz stereo | 2.83 MB |

**Převod pro web** (viz zadání "MP3, stereo, 44.1/48 kHz, ~128–160 kbps,
loudness normalizace"): `ffmpeg -i <original> -af loudnorm=I=-18:TP=-1.5:LRA=11
-ar 48000 -ac 2 -c:a libmp3lame -b:a 128k <output>` — jednoprůchodová EBU
R128 normalizace na -18 LUFS integrated / -1.5 dBTP true peak (bezpečná
rezerva proti clippingu), 128 kbps (spodní hranice zadaného rozsahu, hudba
je jen tichá kulisa), sample rate ponechaný na 48 kHz ze zdroje (žádný
zbytečný resample). Výsledek: `retro-casino-01.mp3` 2.29 MB (mean −20.4 dB,
peak −6.4 dB, bez clippingu), `retro-casino-02.mp3` 1.42 MB (mean −20.5 dB,
peak −2.8 dB, bez clippingu) — oba zdroje měly PŘED normalizací výrazně
odlišnou hlasitost (mean −10.8 dB vs. −17.2 dB), po loudnorm jsou
vyrovnané, takže přechod mezi nimi v playlistu nepůsobí jako skok hlasitosti.

⚠️ **LICENSE NEEDS MANUAL VERIFICATION** — dokud se u obou tracků ručně
nedohledá a nepotvrdí přesný licenční text (pravděpodobně Pixabay Content
License podle formátu názvu souboru, ale nebylo ověřeno), platí `source:
"user-provided"` / `license: "unknown / verify manually"` v `tracks.ts`.
Než se to potvrdí, nepoužívat tyto tracky mimo tenhle interní branch bez
vědomí, že licence je neověřená.

## Evidence SFX

| SFX id | Popis | Soubor | Stav |
|---|---|---|---|
| `ui_click` | Obecný UI klik | `public/audio/sfx/ui-click.mp3` | placeholder — registrováno, zatím nikde nevoláno |
| `spin_start` | Klik na "VSADIT" / start otočení | `public/audio/sfx/spin-start.mp3` | placeholder — soubor chybí (wired v SlotMachine.tsx) |
| `reel_tick` | Cvaknutí válce během animace | `public/audio/sfx/reel-tick.mp3` | placeholder — registrováno, zatím záměrně nevoláno (viz zadání "pokud by to bylo příliš hlučné, raději jen spin_start + spin_stop") |
| `spin_stop` | Zastavení válců | `public/audio/sfx/spin-stop.mp3` | placeholder — soubor chybí (wired v SlotMachine.tsx) |
| `near_miss` | Výsledek s částečnou shodou (nebo jackpot flash — výhra je v této hře vždy 0 G) | `public/audio/sfx/near-miss.mp3` | placeholder — soubor chybí (wired v SlotMachine.tsx) |
| `lose` | Výsledek bez jakékoli shody | `public/audio/sfx/lose.mp3` | placeholder — soubor chybí (wired v SlotMachine.tsx) |
| `credit_added` | Kredit připsán (claim welcome bonusu) | `public/audio/sfx/credit-added.mp3` | placeholder — soubor chybí (wired v WelcomePrizeModal.tsx) |
| `popup_open` | Otevření welcome-prize popupu | `public/audio/sfx/popup-open.mp3` | placeholder — soubor chybí (wired v WelcomePrizeModal.tsx) |
| `devil_laugh` | Později (viz zadání) | `public/audio/sfx/devil-laugh.mp3` | placeholder — registrováno, zatím nikde nevoláno |
| `topup_open` | Otevření dobití kreditu | `public/audio/sfx/topup-open.mp3` | placeholder — registrováno, zatím nikde nevoláno (TopUpModal je wallet/Stripe flow, viz "co neměnit") |

## Kandidátní zdroje (nestaženo, jen k prověření)

Žádný z těchto zdrojů nebyl stažen ani použit — je to jen výchozí bod pro
ruční hledání, **licenci vždy ověř u konkrétní skladby/souboru přímo u
zdroje** před stažením:

- **Library of Congress — National Jukebox** (`citizen-dj.labs.loc.gov/loc-jukebox-jazz`) —
  historické jazz/ragtime nahrávky, řada z nich Public Domain, ale ověřit
  status u každé nahrávky zvlášť (ne všechno v archivu je automaticky PD).
- **Public Domain Review — Jazz, Ragtime & Blues** (`publicdomainreview.org/collections/all/genre/jazz-ragtime-and-blues`) —
  kurátorovaná kolekce s odkazy na PD zdroje.
- **Internet Archive** (`archive.org`) — obrovská knihovna starých jazz
  nahrávek, ale licence se liší položku od položky — ověřit vždy u
  konkrétního uploadu.
- **Kevin MacLeod / incompetech.com** — celý katalog pod CC BY (vyžaduje
  attribution), obsahuje i ragtime/swing styl skladby — vhodné pro
  cartoon casino vibe, ale nutná attribution.
- **Pixabay Music** (`pixabay.com/music`) — royalty-free, vlastní licenční
  podmínky Pixabay (ne CC) — přečíst si aktuální licenční text před použitím.

## Checklist před přidáním nového souboru

- [ ] Licence je jednoznačně identifikovaná (ne "asi volné", ale ověřený text licence)
- [ ] `author`/`source`/`license`/`attributionRequired` vyplněné v `tracks.ts`/`sfx.ts`
- [ ] Pokud `attributionRequired: true`, attribution text je evidovaný (viz tabulka výš) a bude zobrazený tam, kde to licence vyžaduje
- [ ] Soubor je rozumně komprimovaný (MP3, ne desítky MB — viz zadání "výkon")
- [ ] `placeholder: false` nastaveno v registry
