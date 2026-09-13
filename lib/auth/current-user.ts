import "server-only";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./session";

export type CurrentUser = { id: number; email: string; credits: number };

/** Vždy čte email/credits čerstvě z DB podle userId z cookie — cookie sama nikdy nenese stav, který by mohl zastarat. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const userId = verifySessionCookieValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) return null;

  const result = await sql<CurrentUser>`SELECT id, email, credits FROM users WHERE id = ${userId}`;
  return result.rows[0] ?? null;
}
