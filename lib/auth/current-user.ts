import "server-only";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./session";

export type CurrentUser = { id: number; email: string; credits: number; hasClaimedWelcomeBonus: boolean };

/** Vždy čte email/credits čerstvě z DB podle userId z cookie — cookie sama nikdy nenese stav, který by mohl zastarat. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const userId = verifySessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return null;

  const result = await sql<{ id: number; email: string; credits: number; welcome_bonus_granted_at: string | null }>`
    SELECT id, email, credits, welcome_bonus_granted_at FROM users WHERE id = ${userId}
  `;
  const row = result.rows[0];
  if (!row) return null;

  return { id: row.id, email: row.email, credits: row.credits, hasClaimedWelcomeBonus: row.welcome_bonus_granted_at !== null };
}
