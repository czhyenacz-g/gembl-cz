# Starter — kuchařka pro nový projekt

Krátký postup, ne manuál. Detaily o jednotlivých modulech viz `CLAUDE.md`.

## 1. Zkopíruj starter
```bash
cp -r ~/PhpstormProjects/starter ~/PhpstormProjects/PROJEKT_NAZEV
cd ~/PhpstormProjects/PROJEKT_NAZEV
rm -rf .git node_modules .next
```

## 2. Uprav project config
`app/config/project.ts` — nastav `slug`/`name`/`domain` a zapni jen ty
`features`, které projekt skutečně používá (žádný z nich nic sám o sobě
nezapíná/nevypíná v kódu — je to jen čitelný přehled pro tebe i Claude Code).

Nahraď i zbylé `PROJECT_*` placeholdery v `app/layout.tsx`, `app/page.tsx`,
`app/api/og/route.tsx`, `package.json`.

## 3. Založ projekt v UCA
V `universalContentApi` Filament adminu:
- vytvoř `Project` (stejný `slug` jako v `app/config/project.ts`),
- vytvoř `ApiToken` se scopy, které potřebuješ (typicky `records:read`,
  `records:create`, `media:upload`),
- collections (`assets`, `promotions`, vlastní komunitní typy) se
  zakládají samy při prvním zápisu / nebo ručně v adminu — žádná
  migrace v UCA není potřeba.

## 4. Nastav env
```bash
cp .env.example .env.local
```
Vyplň aspoň `UCA_BASE_URL`, `UCA_PROJECT_SLUG`, `UCA_API_TOKEN`. Zbytek
jen pokud danou feature používáš.

## 5. Zapni features, které potřebuješ

**Assets** (`lib/assets/`) — vlastní obrázky/soubory nahrané přes UCA
admin. `getLatestAsset()`, `getAssets()`, `getAssetsByTag(tag)`. Typicky
pro: "vezmi poslední nahraný screenshot a použij ho jako pozadí/podklad".

**Promotions** (`lib/promotions/`) — banner/seller promo bloky cílené na
konkrétní route (`page_pattern`: přesná cesta, `/x/*` podstrom, nebo `*`
vše), s weighted-random výběrem při víc kandidátech na stejnou route.
`getActivePromotionForRoute(placement, pathname)` vybírá server-side —
browser nikdy nedostane celý seznam kandidátů. `components/promotions/
AdSlot.tsx` je připravený render-prop wrapper (žádný vlastní vzhled).

**Steam auth** — NENÍ implementováno (vyžaduje DB). Viz
`features/steam-auth/README.md` pro ověřený integrační postup, až ho
budeš skutečně potřebovat.

**Streams** (`features/streams/`) — Twitch/YouTube/Kick "kdo právě
streamuje [hru/kategorii]". `getLiveStreams(query)` agreguje všechny tři,
chybějící env proměnné = daná platforma se tiše přeskočí, chyba jednoho
providera nesrazí ostatní.

**Community submissions** (`lib/community/`) — `createCommunitySubmission
({ collection, data, media })` pro opakující se pattern "formulář →
UCA record (status pending) → volitelný upload". `getApprovedRecords`/
`getOwnPendingRecords` pro veřejný seznam + soukromý pending seznam
vlastníka (server-side filtr, nikdy client-side).

**Feedback** (`components/FeedbackCallout.tsx`) — jednoduché `<FeedbackCallout
email="..." title="..." message="..." />`, žádná auth-gating logika
(starter defaultně nemá auth).

## 6. Deploy
```bash
git init && git add . && git commit -m "init"
gh repo create czhyenacz-g/PROJEKT_NAZEV --public --source=. --push
vercel --prod   # nebo auto-deploy z GitHubu, pokud je Vercel napojený
```

Nezapomeň env proměnné nastavit i ve Vercelu (Project Settings → Environment
Variables), ne jen lokálně v `.env.local`.
