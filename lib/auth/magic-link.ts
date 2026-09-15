import "server-only";
import { sql } from "@vercel/postgres";
import { normalizeEmail } from "./email.ts";
import { generateToken, hashToken } from "./tokens.ts";

export const MAGIC_LINK_TTL_MINUTES = 15;

/**
 * `pendingPrizeG` je volitelná základní částka welcome-prize popupu (viz
 * lib/onboarding/welcome-prize.ts) — volající (POST /api/auth/magic-link)
 * ji čte VÝHRADNĚ z podepsané cookie požadavku, nikdy z těla requestu, ať
 * ji nejde podvrhnout. `null`/vynechané, když návštěvník žádnou pending
 * výhru neměl (např. cookie expirovala nebo ji nikdy neměl).
 */
export async function createMagicLinkToken(email: string, pendingPrizeG: number | null = null): Promise<string> {
  const normalized = normalizeEmail(email);
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000).toISOString();

  await sql`
    INSERT INTO magic_link_tokens (email, token_hash, expires_at, pending_prize_g)
    VALUES (${normalized}, ${tokenHash}, ${expiresAt}, ${pendingPrizeG})
  `;

  return token;
}

export type ConsumedMagicLink = { email: string; pendingPrizeG: number | null };

/**
 * Ověří a ve stejném atomickém UPDATE token spotřebuje (`used_at IS NULL`
 * v podmínce) — druhé použití stejného odkazu (dvojklik, prefetch
 * e-mailovým klientem, replay) už žádný řádek nenajde. Vrací i
 * `pendingPrizeG` uložený V OKAMŽIKU VYŽÁDÁNÍ tokenu (viz
 * createMagicLinkToken) — funguje i pro verify request z jiného
 * zařízení, než kde byla cookie nastavená.
 */
export async function consumeMagicLinkToken(rawToken: string): Promise<ConsumedMagicLink | null> {
  const tokenHash = hashToken(rawToken);

  const result = await sql<{ email: string; pending_prize_g: number | null }>`
    UPDATE magic_link_tokens
    SET used_at = now()
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
    RETURNING email, pending_prize_g
  `;

  const row = result.rows[0];
  return row ? { email: row.email, pendingPrizeG: row.pending_prize_g } : null;
}
