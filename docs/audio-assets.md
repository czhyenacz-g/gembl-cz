# Audio assety — /casino

Tenhle dokument eviduje licence audio souborů použitých v casino
experience (hudba na pozadí + SFX, viz `lib/audio/`). Cíl: do projektu se
nikdy nedostane audio s nejasnou nebo neověřenou licencí.

Architektura je popsaná v `lib/audio/AudioProvider.tsx` (jediný centrální
audio manager, `useAudio()` hook). Registry jsou v `lib/audio/tracks.ts`
(hudba) a `lib/audio/sfx.ts` (efekty) — obě zatím obsahují jen
**placeholder** záznamy (`placeholder: true`), protože v repu zatím nejsou
žádné reálné audio soubory.

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

| Track (id) | Titul | Autor | Zdroj | Licence | Attribution required | Soubor | Stav |
|---|---|---|---|---|---|---|---|
| `hot-club-shuffle` | Hot Club Shuffle | TODO | TODO | TODO | TODO | `public/audio/music/hot-club-shuffle.mp3` | placeholder — soubor chybí |
| `vaudeville-rag` | Vaudeville Rag | TODO | TODO | TODO | TODO | `public/audio/music/vaudeville-rag.mp3` | placeholder — soubor chybí |
| `cabaret-swing` | Cabaret Swing | TODO | TODO | TODO | TODO | `public/audio/music/cabaret-swing.mp3` | placeholder — soubor chybí |

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
