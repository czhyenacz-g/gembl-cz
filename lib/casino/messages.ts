// Satirické hlášky po každém spinu — výhra je vždy 0 G (viz
// slot-engine.ts), tohle je jen komentář k tomu faktu. Náhodně
// střídané, žádná vazba na konkrétní symboly/výsledek. Sjednoceno s
// hlavním claimem /casino stránky ("Těsně vedle.", viz artwork
// public/skins/classic/casino-desktop.webp) — všechny hlášky jedou na
// stejné "skoro, ale ne" notě.
export const RESULT_MESSAGES = [
  "Skoro. Jako vždycky.",
  "Tak blízko. Tak marně.",
  "Chyběl jen jeden symbol. Zase.",
  "Skoro jsi vyhrál. ... Samozřejmě že ne.",
  "Výhra byla blízko. Ne dost.",
  "Neštěstí ve hře, štěstí v lásce.",
  "Štěstí přeje připraveným. Tobě ne.",
  "Ještě jeden spin a určitě... ne.",
  "Prohra je taky výsledek.",
] as const;

export function pickRandomMessage(): string {
  return RESULT_MESSAGES[Math.floor(Math.random() * RESULT_MESSAGES.length)];
}
