// Satirické hlášky po prohře — hráč v týhle hře prohraje vždy (viz
// lib/skorapky/engine.ts pickRevealCup), stejný vzor jako
// lib/casino/messages.ts pro /automaty, jen samostatný config pro
// Skořápky (viz zadání "drž hlášky v samostatném configu").
export const SHELL_RESULT_MESSAGES = [
  "Snad příště.",
  "Tak blízko.",
  "Těsně vedle.",
  "Byla hned vedle.",
  "Skoro.",
  "Příště určitě. Asi.",
  "Čert měl zase štěstí.",
  "Výborná volba. Jen špatný kelímek.",
  "To bolelo.",
  "Vedle. Jako vždycky.",
] as const;

export function pickRandomShellMessage(random: () => number = Math.random): string {
  return SHELL_RESULT_MESSAGES[Math.floor(random() * SHELL_RESULT_MESSAGES.length)];
}
