// Satirické hlášky po každém spinu — výhra je vždy 0 G (viz
// slot-engine.ts), tohle je jen komentář k tomu faktu. Náhodně
// střídané, žádná vazba na konkrétní symboly/výsledek.
export const RESULT_MESSAGES = [
  "Co jste čekal?",
  "Systém funguje správně.",
  "Těsně.",
  "Tentokrát to opravdu vypadalo nadějně.",
  "Kasino děkuje.",
  "Zkuste to znovu. Určitě to dopadne stejně.",
  "RTP: 0 %. Transparentnější už být nemůžeme.",
] as const;

export function pickRandomMessage(): string {
  return RESULT_MESSAGES[Math.floor(Math.random() * RESULT_MESSAGES.length)];
}
