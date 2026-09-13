import { BET_STEP, MAX_BET, MIN_BET } from "../../app/config/site.ts";

// Jediné místo, kde se validuje výše sázky — použité jak na klientu
// (SlotMachine.tsx, jen pro UI clamp), tak hlavně server-side
// (app/api/wallet/spin/route.ts), kde je to jediná obrana proti klientem
// podvržené sázce mimo povolený rozsah (viz zadání "Nespoléhej pouze na
// disabled tlačítka v UI").
export function isValidBet(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_BET && value <= MAX_BET && value % BET_STEP === 0;
}

/** Nejvyšší sázka, kterou si hráč s daným zůstatkem může dovolit (zaokrouhleno dolů na násobek BET_STEP, max MAX_BET). */
export function maxAffordableBet(balance: number): number {
  return Math.min(MAX_BET, Math.floor(balance / BET_STEP) * BET_STEP);
}
