import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// "Vyhrál jsi X G zdarma" onboarding popup (viz app/(site)/casino/stage/
// WelcomePrizeOverlay a zadání) — základní částka je náhodná, 100-400 G po
// 100 (jediné místo, kde je tenhle rozsah definovaný — viz zadání
// "nevkládej čísla po komponentách"), vylosovaná JEDNOU na návštěvníka a
// uložená v podepsané (HMAC-SHA256) cookie, stejný vzor jako
// lib/auth/session.ts (payload.exp.signature). Na rozdíl od session
// cookie NENÍ httpOnly-only důvod k odlišení: obsahuje stejně netriviální
// payload, ale prefix "wp1." v podepisovaném řetězci (viz sign()) cookie
// doménově odděluje od session cookie, aby jedna nemohla být omylem/
// útokem zaměněná za druhou, i kdyby obě používaly stejný SESSION_SECRET.
//
// Snížení z dřívějšího rozsahu 200-800 G — `verifyPendingPrizeCookieValue`
// níž ověřuje i platně podepsanou cookie proti TÉHLE množině, takže starší
// (500-800 G) pending cookie z předchozí verze automaticky přestane
// procházet (vrátí se `null`) a `resolveBaseAmountG` pak vylosuje novou
// platnou hodnotu — žádná ruční migrace/sanitizace navíc není potřeba.
export const WELCOME_PRIZE_AMOUNTS_G = [100, 200, 300, 400] as const;
export type WelcomePrizeAmount = (typeof WELCOME_PRIZE_AMOUNTS_G)[number];

// Přihlášením/registrací (viz zadání "2x navýšení, nekomunikovat natvrdo")
// se zobrazená částka násobí tímhle číslem — jediné místo, kde je
// multiplikátor zadrátovaný, ať se nerozjede mezi verify route a UI textem.
export const WELCOME_PRIZE_LOGIN_MULTIPLIER = 2;

export const PENDING_PRIZE_COOKIE_NAME = "gembl_pending_prize";
const PENDING_PRIZE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dní — ať vydrží i "zavřel popup, vrátil se později"
export const PENDING_PRIZE_COOKIE_MAX_AGE_SECONDS = PENDING_PRIZE_TTL_SECONDS;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET není nastavený.");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(`wp1.${payload}`).digest("base64url");
}

/** Náhodná základní výhra z povolené množiny — `random` injectable (viz lib/casino/slot-engine.ts `spin`), ať jde deterministicky testovat. */
export function pickRandomPrizeAmount(random: () => number = Math.random): WelcomePrizeAmount {
  const index = Math.floor(random() * WELCOME_PRIZE_AMOUNTS_G.length);
  return WELCOME_PRIZE_AMOUNTS_G[index];
}

export function createPendingPrizeCookieValue(amountG: number): string {
  const expiresAt = Date.now() + PENDING_PRIZE_TTL_SECONDS * 1000;
  const payload = `${amountG}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Vrátí částku z platné, neexpirované, správně podepsané cookie — jinak
 * `null`. I platně podepsaná cookie se navíc ověří proti
 * WELCOME_PRIZE_AMOUNTS_G (defense-in-depth): kdyby kdykoli vznikl bug,
 * který dovolí podepsat libovolné číslo, aplikace ho tady stejně odmítne.
 */
export function verifyPendingPrizeCookieValue(value: string | undefined | null): number | null {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [amountRaw, expiresAtRaw, signature] = parts;

  const expected = sign(`${amountRaw}.${expiresAtRaw}`);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const amount = Number(amountRaw);
  if (!WELCOME_PRIZE_AMOUNTS_G.includes(amount as WelcomePrizeAmount)) return null;

  return amount;
}

/**
 * Základní částka, ze které se počítá přihlašovací bonus (×
 * WELCOME_PRIZE_LOGIN_MULTIPLIER) — z platné pending-prize cookie, nebo
 * (chybějící/expirovaná/neplatná cookie, např. starý magic-link bez
 * asociované výhry) čerstvě vylosovaná náhradní hodnota. Nikdy nevyhodí,
 * nikdy nespoléhá na cokoli poslané klientem mimo podepsanou cookie.
 */
export function resolveBaseAmountG(pendingPrizeG: number | null): number {
  return pendingPrizeG ?? pickRandomPrizeAmount();
}
