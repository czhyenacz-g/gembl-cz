import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Podepsaná (HMAC-SHA256), NE šifrovaná session cookie — payload je jen
// `userId.exp`, žádná citlivá data přímo v cookie. Aktuální e-mail/balance
// se vždy dočítají z DB podle `userId` (viz current-user.ts), ne z cookie
// samotné — stejný ověřený vzor jako features/steam-auth/README.md.
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dní

export const SESSION_COOKIE_NAME = "gembl_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET není nastavený.");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionCookieValue(userId: number): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Vrátí `userId` z platné, neexpirované, správně podepsané cookie — jinak `null`. */
export function verifySessionCookieValue(value: string | undefined | null): number | null {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [userIdRaw, expiresAtRaw, signature] = parts;

  const expected = sign(`${userIdRaw}.${expiresAtRaw}`);
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const userId = Number(userIdRaw);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  return userId;
}
