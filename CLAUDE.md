# Starter — instrukce pro Claude

Tento repozitář je šablona pro rychlé zakládání nových Next.js projektů.
Hynek řekne název a nápad → Claude udělá vše ostatní.

---

## Platforma: Universal Content API (UCA) — čti jako první

Existuje sdílený backend **Universal Content API** (`https://content-api.darbujan.com`,
zdroj: `universalContentApi`), postavený přesně pro tenhle účel: dát každému
projektu založenému z tohoto starteru content/data vrstvu (records + media),
komunitní submissions, assety a promo bloky — bez toho, aby si každý projekt
musel stavět vlastní backend/DB.

**Než začneš implementovat nový backend, databázi nebo storage vrstvu,
nejdřív ověř, jestli to už neumí Universal Content API.** Model je jednoduchý:
`Project` → `Collection` (libovolný název, např. `assets`, `promotions`,
`fish-suggestions`) → `Record` (`status: pending|approved|rejected` +
libovolný `data` JSON) → volitelný `Media` navázaný na record. Token je vždy
server-only a scoped na jeden projekt (projekt se odvozuje z tokenu, ne
z URL) — nikdy ho neposílej do klienta.

### Co starter už obsahuje (znovupoužitelné moduly)

| Modul | Kde | Co dělá |
|---|---|---|
| UCA klient | `lib/uca/{client,records,media,types}.ts` | Obecný `getRecords`/`getRecord`/`createRecord`/`uploadMedia` nad libovolnou collection. Server-only (`import "server-only"`). |
| Project config | `app/config/project.ts` | Čistě informativní `projectConfig` — slug/name/domain + `features` přepínače (nic runtime nekontrolují, jen dokumentují, co projekt používá). |
| Assets | `lib/assets/get-assets.ts` | `getAssets()`, `getLatestAsset()`, `getAssetsByTag(tag)` nad UCA collection `assets`. Jen čtení — assety se nahrávají ručně přes UCA admin. |
| Promotions | `lib/promotions/{types,match-route,pick-promotion,get-promotions}.ts` | Banner/seller promo bloky cílené na route (`page_pattern`: `/x` přesně, `/x/*` podstrom, `*` vše), priorita exact > wildcard > global, weighted-random výběr. `getActivePromotionForRoute(placement, pathname)`. |
| AdSlot | `components/promotions/AdSlot.tsx` | Server komponenta, vybere promotion server-side, veškerý vzhled deleguje volajícímu přes `render` prop. Nikde není zapnutá automaticky. |
| Community submissions | `lib/community/{create-submission,get-records}.ts` | `createCommunitySubmission({ collection, data, media })` pro vzor formulář → pending record → volitelný upload. `getApprovedRecords`/`getOwnPendingRecords`. |
| Analytics (first-party) | `lib/analytics/{track-event,anonymous-id,rate-limit}.ts` | Základní stavební kameny pro first-party event log nad UCA (collection `analytics_events`) — bez Google Analytics/Meta Pixel/fingerprintingu. `trackEvent()` je fail-open zápis, `getOrCreateAnonymousId()` je SSR-safe localStorage UUID, `isRateLimited()` je in-memory limiter pro ingest endpoint. Záměrně bez hardcoded whitelistu eventů/tvaru metadata a bez `/api/events` route — to je vždy projekt-specifické, viz referenční implementace v HowToFish.cz (`lib/analytics/`, `app/api/events/route.ts`). |
| Streams | `features/streams/{types,twitch,youtube,kick,index}.ts` | `getLiveStreams(query)` agreguje Twitch/YouTube/Kick, chybějící env = daná platforma se tiše přeskočí (`status: "not-configured"`), chyba jedné nesrazí ostatní. |
| Feedback | `components/FeedbackCallout.tsx` | Jednoduché `<FeedbackCallout email title message />`, bez auth-gatingu. |
| Steam auth | `features/steam-auth/README.md` | **Pouze dokumentace, žádný kód** — vyžaduje vlastní DB, viz níže. |

### Jak zapínat/vypínat features

`app/config/project.ts` je jediné místo, kde je na první pohled vidět, co
projekt používá — `projectConfig.features.*` ale sám o sobě nic nezapíná,
je to jen čitelný přehled pro tebe i pro budoucí Claude Code session. Zapnutí
featury reálně znamená: nastavit potřebné env proměnné a začít modul
importovat/používat ve stránkách. Nezapomeň si přepínač i reálně nastavit na
`true`, ať zůstane pravdivý.

### ENV proměnné

Viz `.env.example`. Minimum pro UCA: `UCA_BASE_URL`, `UCA_PROJECT_SLUG`,
`UCA_API_TOKEN`. Zbytek (`STEAM_*`, `TWITCH_*`, `YOUTUBE_API_KEY`, `KICK_*`)
jen pokud danou feature projekt opravdu používá.

### Steam auth — proč není implementovaný

Steam login vyžaduje vlastní databázi pro uživatele (nickname/avatar/
is_blocked) a starter má záměrně zůstat bez DB závislosti. `features/
steam-auth/README.md` popisuje ověřený integrační postup (OpenID login,
callback, HMAC session cookie, DB lookup) — implementuj ho až když ho
projekt reálně potřebuje, ne dopředu.

### Co NEkopírovat z jiných projektů bez potřeby

Konkrétní byznys logika, design a obsah (typy postav, herní entity,
affiliate kampaně, konkrétní texty) z jiných projektů (např. HowToFish.cz)
do starteru ani do nového projektu nepatří, pokud to nový projekt reálně
nepotřebuje. Starter dává infrastrukturu, ne vzhled ani obsah — viz
`docs/STARTER.md` pro rychlý postup založení nového projektu a krátký popis
každého modulu.

---

## Nastavení nového MacBooku (udělat jednou)

Bez těchto nástrojů Claude nemůže plně automatizovat zakládání projektů.
Projdi kroky v tomto pořadí.

### 1. Xcode Command Line Tools (git, make, atd.)
```bash
xcode-select --install
```

### 2. Homebrew (package manager)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Node.js (přes nvm — správa verzí)
```bash
brew install nvm
# přidej do ~/.zshrc:
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
# pak:
source ~/.zshrc
nvm install --lts
nvm use --lts
```

### 4. GitHub CLI
```bash
brew install gh
gh auth login
# → zvolí: GitHub.com → HTTPS → Login with a browser
```

### 5. Vercel CLI
```bash
npm i -g vercel
vercel login
# → přihlásí přes browser
```

### 6. SSH klíč pro GitHub (pro git push)
```bash
ssh-keygen -t ed25519 -C "tvuj@email.cz"
# Enter třikrát (výchozí cesta, bez hesla)
cat ~/.ssh/id_ed25519.pub
# zkopíruj výstup a přidej na github.com/settings/keys
```

### 7. Git konfigurace
```bash
git config --global user.name "darbujan"
git config --global user.email "tvuj@email.cz"
```

### 8. Vercel — napoj GitHub účet
Na vercel.com → Settings → Git → Connect GitHub účet `czhyenacz-g`.
Zaškrtni "Auto-deploy on push" pro všechna repozitáře.

### Ověření že vše funguje
```bash
node --version      # v20+
git --version       # 2.x
gh auth status      # Logged in to github.com
vercel whoami       # tvoje jméno na Vercel
```

---

## Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Vercel Analytics** (`@vercel/analytics`)
- **GoatCounter** (volitelně, nastavit v `app/config/analytics.ts`)
- Deploy: **Vercel** (auto-deploy z GitHubu na push do `main`)

---

## Tokeny (API přístupy)

Uloženy v `~/PhpstormProjects/starter/.tokens` — soubor není commitován (.gitignore).

Obsahuje:
- `GITHUB_TOKEN` — pro vytváření GitHub repozitářů přes API
- `VERCEL_TOKEN` — pro vytváření a deploy Vercel projektů přes API

Před každou akcí načti tokeny:
```bash
source ~/PhpstormProjects/starter/.tokens
```

---

## Jak založit nový projekt

### 1. Zkopíruj starter

```bash
cp -r ~/PhpstormProjects/starter ~/PhpstormProjects/PROJEKT_NAZEV
cd ~/PhpstormProjects/PROJEKT_NAZEV
rm -rf .git node_modules .next
```

### 2. Nahraď placeholdery

V celém projektu vyhledej a nahraď:
- `PROJECT_NAME` → název projektu (např. "Kolik piv to je?")
- `PROJECT_DESCRIPTION` → jeden řádek co to dělá
- `PROJECT_DOMAIN` → doména (např. `kolikpiv.cz`) nebo zatím `TODO`

Soubory kde se placeholdery vyskytují:
- `app/layout.tsx` — metadata (title, description, OG)
- `app/page.tsx` — hlavní stránka
- `app/api/og/route.tsx` — OG image
- `package.json` — `"name"` pole

### 3. Inicializuj Git a pushnui na GitHub

```bash
git init
git add .
git commit -m "init"
# Vytvoř repo na github.com/czhyenacz-g (nebo přes gh CLI):
gh repo create czhyenacz-g/PROJEKT_NAZEV --public --source=. --push
```

Pokud `gh` není nainstalované:
```bash
brew install gh
gh auth login
```

### 4. Napoj Vercel

Buď automaticky (pokud je Vercel napojený na GitHub org) — stačí push.

Nebo manuálně:
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 5. Nainstaluj závislosti a spusť lokálně

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Struktura projektu

```
app/
  layout.tsx          # Root layout, metadata, analytics
  page.tsx            # Hlavní stránka
  globals.css         # Tailwind direktivy
  config/
    analytics.ts      # GoatCounter kód
  api/
    og/
      route.tsx       # Dynamický OG image endpoint
```

---

## Povolení: konverze obrázků do WebP

Nástroj `cwebp` (a obdobné čistě lokální konverzní nástroje) smí Claude používat bez ptaní
na povolení ve všech projektech založených z tohoto starteru — včetně kopírování/přesouvání
zdrojových i výstupních souborů obrázků v rámci `public/`. Jde jen o lokální konverzi
souborů v repu, ne o destruktivní ani sdílenou akci, proto nepotřebuje explicitní souhlas
pokaždé znovu.

---

## Konvence

- **Tmavý theme**: `bg-gray-900 text-white` na body (v layout.tsx)
- **Max šířka obsahu**: `max-w-md` nebo `max-w-lg` + `mx-auto`
- **Barvy**: amber pro akcenty (`text-amber-400`, `bg-amber-600`)
- **Jazyk**: česky, neformální tón
- **Komponenty**: pokud je stránka interaktivní, přidej `"use client"` komponentu do `app/components/`
- **Sdílení**: OG image přes `/api/og` s query params (`title`, `sub`, vlastní)

---

## E-mail (Zoho Mail)

Pro každou novou doménu se nastavuje přesměrování e-mailu přes **Zoho Mail** (bezplatný plán, vlastní doména).

### Postup
1. Přihlas se na [zoho.com/mail](https://www.zoho.com/mail/) (účet Hynek)
2. Přidej doménu: Settings → Domains → Add Domain → zadej `DOMENA.cz`
3. Ověř doménu přidáním TXT záznamu do DNS (Zoho zobrazí přesnou hodnotu)
4. Nastav MX záznamy dle instrukcí Zoho (obvykle `mx.zoho.eu`)
5. Vytvoř aliasy / přesměrování: Settings → Email Forwarding → přidej `info@DOMENA.cz` → přesměruj na `redakce@sokujiciodhaleni.cz`

### Checklist pro e-mail
- [ ] Doména přidána a ověřena v Zoho Mail
- [ ] MX záznamy nastaveny v DNS
- [ ] Přesměrování `info@DOMENA.cz → redakce@sokujiciodhaleni.cz` funguje

---

## Checklist pro nový projekt

- [ ] Nahrazeny všechny `PROJECT_*` placeholdery
- [ ] `package.json` má správné `"name"`
- [ ] `npm install` proběhl
- [ ] `npm run dev` funguje na localhost:3000
- [ ] Git repo vytvořeno a pushnuté
- [ ] Vercel nasadil — URL funguje
- [ ] OG image funguje: `https://DOMENA/api/og?title=Test`
- [ ] E-mail přesměrování přes Zoho Mail nastaveno

---

## Vzorový projekt

Referenční implementace: `~/PhpstormProjects/kolikpiv.cz/kolikpiv/`

Obsahuje příklady:
- Kalkulačka s výsledkem a sdílením
- Dynamický OG image s parametry
- Share text s URL params
- GoatCounter + Vercel Analytics
- QR kód generování
- LocalStorage pro uložení nastavení
