import "server-only";
import { sql } from "@vercel/postgres";
import { normalizeEmail } from "./email";
import { generateToken, hashToken } from "./tokens";

export const MAGIC_LINK_TTL_MINUTES = 15;

export async function createMagicLinkToken(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000).toISOString();

  await sql`
    INSERT INTO magic_link_tokens (email, token_hash, expires_at)
    VALUES (${normalized}, ${tokenHash}, ${expiresAt})
  `;

  return token;
}

export type ConsumedMagicLink = { email: string };

/**
 * Ověří a ve stejném atomickém UPDATE token spotřebuje (`used_at IS NULL`
 * v podmínce) — druhé použití stejného odkazu (dvojklik, prefetch
 * e-mailovým klientem, replay) už žádný řádek nenajde.
 */
export async function consumeMagicLinkToken(rawToken: string): Promise<ConsumedMagicLink | null> {
  const tokenHash = hashToken(rawToken);

  const result = await sql<{ email: string }>`
    UPDATE magic_link_tokens
    SET used_at = now()
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
    RETURNING email
  `;

  const row = result.rows[0];
  return row ? { email: row.email } : null;
}
