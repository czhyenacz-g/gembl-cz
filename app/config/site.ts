export const SITE_NAME = "GEMBL.cz";
export const SITE_DOMAIN = "gembl.cz";
export const SITE_URL = `https://${SITE_DOMAIN}`;

export const SITE_TITLE = "GEMBL.cz – jediné kasino, kde předem víš, jak to dopadne";

export const SITE_DESCRIPTION =
  "Satirické online kasino s virtuálními kredity. Výhra není možná. Ano, vážně. Žádné skutečné peníze, žádná platební brána — jen zábava.";

export const TAGLINE = "Jediné kasino, kde předem víš, jak to dopadne.";
export const SUBTAGLINE = "Výhra není možná. Ano, vážně.";

// Žádné skutečné peníze/platby/gambling licence — viz CLAUDE.md a
// /jak-to-funguje. Tenhle disclaimer se zobrazuje na /o-projektu a
// v patičce, ať je hned jasné, že jde o satiru/hru, ne o skutečné
// hazardní hraní.
export const DISCLAIMER =
  "GEMBL.cz je satirický zábavní projekt. Nejde o skutečné hazardní hraní, nepoužívají se skutečné peníze a nelze získat žádnou reálnou výhru.";

export const NAV_LINKS = [
  { href: "/automaty", label: "Automaty" },
  { href: "/hry", label: "Hry" },
  { href: "/jak-to-funguje", label: "Jak to funguje" },
  { href: "/o-projektu", label: "O projektu" },
] as const;

export const STARTING_CREDITS = 1000;
export const SPIN_COST = 10;
