export const SITE_NAME = "GEMBL.cz";
export const SITE_DOMAIN = "gembl.cz";
export const SITE_URL = `https://${SITE_DOMAIN}`;

export const SITE_TITLE = "GEMBL.cz – jediné kasino, kde předem víš, jak to dopadne";

export const SITE_DESCRIPTION =
  "Satirické online kasino s virtuálními kredity. Výhra není možná. Ano, vážně. Kredity lze dokoupit, ale nemají peněžní hodnotu a nejde je vybrat.";

export const TAGLINE = "Jediné kasino, kde předem víš, jak to dopadne.";
export const SUBTAGLINE = "Výhra není možná. Ano, vážně.";

// Žádný gambling v pravém slova smyslu — výhra zůstává navždy nemožná
// (RTP 0 %, payout vždy 0, viz lib/casino/slot-engine.ts), i když si G
// teď lze dokoupit za reálné peníze (viz lib/wallet/). Tenhle disclaimer
// se zobrazuje na /jak-to-funguje (sekce "Důležité upozornění") a v patičce,
// ať je hned jasné, že jde o satiru/hru, ne o skutečné hazardní hraní, a že
// G nemají peněžní hodnotu.
export const DISCLAIMER =
  "GEMBL.cz je satirický zábavní projekt. Nejde o skutečné hazardní hraní — výhra není možná a nelze získat žádnou reálnou cenu. G jsou herní kredity, které lze dokoupit za reálné peníze, ale nemají peněžní hodnotu a nelze je vybrat ani směnit za peníze nebo věcné ceny.";

// /hry a /o-projektu byly zrušené (obsah /o-projektu se přesunul jako další
// sekce na /jak-to-funguje), takže v menu zůstávají jen živé stránky.
export const NAV_LINKS = [
  { href: "/automaty", label: "Automaty" },
  { href: "/jak-to-funguje", label: "Jak to funguje" },
] as const;

// Anonymní/nový hráč (bez přihlášení) startuje na 100 G — přihlášením
// (magic-link, viz lib/auth/) dostane navíc jednorázový uvítací bonus
// (2× vylosovaná welcome-prize částka, viz lib/onboarding/welcome-prize.ts
// a app/api/auth/verify/route.ts), to je záměrně samostatná, vyšší hodnota,
// ne totéž číslo.
export const STARTING_CREDITS = 100;

// Nastavitelná sázka na jeden spin (viz app/(site)/automaty/SlotMachine.tsx
// + lib/wallet/bet.ts) — nahrazuje dřívější pevných 10 G.
export const MIN_BET = 10;
export const MAX_BET = 100;
export const BET_STEP = 10;
