# Steam auth — integrační vzor (zatím jen dokumentace, ne kód)

Steam login je v HowToFish.cz ověřený a funguje dobře, ale **záměrně se
nepřenáší jako hotový modul** — vyžaduje vlastní databázi (Postgres) pro
uložení uživatelů (`steam_id`, `nickname`, `avatar_url`, `is_blocked`), a
starter má zůstat bez DB závislosti (viz `CLAUDE.md`, sekce "Co starter
záměrně NEobsahuje"). Přidávat DB jen kvůli přihlášení by byl přesně ten
druh komplikace, které se starter má vyhýbat.

Pokud projekt Steam login opravdu potřebuje, tohle je ověřený postup:

## 1. Steam OpenID login (bez API klíče na samotné přihlášení)
- `GET /api/auth/steam/login?returnTo=...` přesměruje na
  `https://steamcommunity.com/openid/login` (standardní OpenID 2.0
  parametry, `openid.return_to` = váš callback).
- `sanitizeReturnTo()` — `returnTo` musí být relativní cesta v rámci
  webu (`/...`), nikdy cizí URL (ochrana proti open-redirectu).

## 2. Callback + ověření
- `GET /api/auth/steam/callback` ověří `openid.*` parametry zpět vůči
  Steamu (`openid.mode=check_authentication`), vytáhne SteamID64
  z `openid.claimed_id`.
- Nickname/avatar se dotáhnou přes `ISteamUser/GetPlayerSummaries/v2/`
  (potřebuje `STEAM_API_KEY`) — volitelné, přihlášení funguje i bez toho
  (fallback nickname).

## 3. Session
- Podepsaná (HMAC-SHA256), NE šifrovaná cookie — payload jen `{ steamId,
  exp }`, žádná citlivá data přímo v cookie.
- Aktuální nickname/avatar/is_blocked se vždy dočítají z DB podle
  `steamId` z cookie, ne z cookie samotné — cookie tak nemůže nést
  zastaralý stav (např. blokace).

## 4. DB
- Jedna tabulka `users` (`steam_id`, `nickname`, `avatar_url`,
  `is_blocked`) — např. Neon Postgres přes Vercel Marketplace integraci.
- Upsert při každém přihlášení (`ON CONFLICT DO UPDATE` na `nickname`/
  `avatar_url`, **nikdy** na `is_blocked` — to se mění jen ručně/adminem).

## Env proměnné
```
STEAM_API_KEY=
STEAM_RETURN_URL=
SESSION_SECRET=
DATABASE_URL=
```

## Kdy do toho jít
Jen když projekt reálně potřebuje uživatelské účty (komunitní submissions
s autorstvím, moderace, apod.). Pro jednoduché projekty bez uživatelského
obsahu tenhle modul nepřidávej — `projectConfig.features.steamAuth`
nech `false`.
