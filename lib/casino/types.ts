// Datový model hráčova postupu — čistě klientský (localStorage) v MVP,
// ale tvarovaný tak, aby ho šlo později 1:1 nahradit záznamem z
// backendu/API (stejné pole, jen jiný zdroj pravdy). Žádné skutečné
// peníze nikde — `credits` jsou vždy virtuální "G".
export type PlayerState = {
  credits: number;
  totalSpins: number;
  totalWagered: number;
  totalWon: number;
  unlockedAchievements: string[];
  createdAt: string;
};

export type SlotSymbol = "cherry" | "lemon" | "seven" | "diamond" | "bar";

// `payout` je vždy 0 — typ to vynucuje na úrovni literálu, ne jen
// runtime hodnotou (viz slot-engine.ts, klíčový princip celé hry).
// `message` se vybírá zvlášť (viz messages.ts) — spin() sám o sobě
// neřeší text, jen reely/výhru.
export type SpinResult = {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  isTripleMatch: boolean;
  payout: 0;
};
