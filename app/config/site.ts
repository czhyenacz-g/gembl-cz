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
// se zobrazuje na /o-projektu a v patičce, ať je hned jasné, že jde o
// satiru/hru, ne o skutečné hazardní hraní, a že G nemají peněžní hodnotu.
export const DISCLAIMER =
  "GEMBL.cz je satirický zábavní projekt. Nejde o skutečné hazardní hraní — výhra není možná a nelze získat žádnou reálnou cenu. G jsou herní kredity, které lze dokoupit za reálné peníze, ale nemají peněžní hodnotu a nelze je vybrat ani směnit za peníze nebo věcné ceny.";

export const NAV_LINKS = [
  { href: "/automaty", label: "Automaty" },
  { href: "/hry", label: "Hry" },
  { href: "/jak-to-funguje", label: "Jak to funguje" },
  { href: "/o-projektu", label: "O projektu" },
] as const;

export const STARTING_CREDITS = 1000;
export const SPIN_COST = 10;
