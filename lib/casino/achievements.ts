import type { PlayerState } from "./types.ts";

export type Achievement = {
  id: string;
  title: string;
  condition: (state: PlayerState) => boolean;
};

// Podmínky se vyhodnocují nad AKTUÁLNÍM (po spinu přepočítaným) stavem —
// pořadí v poli je jen zobrazovací, ne vynucené pořadí odemykání (klidně
// můžou padnout dva achievementy najednou, viz checkNewAchievements).
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: "first-loss", title: "První prohra", condition: (s) => s.totalSpins >= 1 },
  { id: "wagered-100", title: "100 G v tahu", condition: (s) => s.totalWagered >= 100 },
  { id: "spins-50", title: "50 spinů", condition: (s) => s.totalSpins >= 50 },
  { id: "wagered-500", title: "500 G v tahu", condition: (s) => s.totalWagered >= 500 },
  { id: "professional-loser", title: "Profesionální smolař", condition: (s) => s.totalSpins >= 100 },
];

/** Achievementy, které tenhle stav splňuje, ale ještě nejsou v `unlockedAchievements` — čistá funkce, žádný side-effect. */
export function checkNewAchievements(state: PlayerState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !state.unlockedAchievements.includes(a.id) && a.condition(state));
}
