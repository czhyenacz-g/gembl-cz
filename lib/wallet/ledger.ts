import "server-only";
import { db } from "@vercel/postgres";

// Jediné místo, kudy smí projít změna users.credits (viz zadání "Balance
// nesmí jít pod nulu" + "Změna balance + vytvoření ledger záznamu musí
// proběhnout atomicky v DB transakci"). Každá funkce tady dělá přesně
// jednu logickou operaci: UPDATE users.credits + INSERT credit_transactions
// ve STEJNÉ Postgres transakci (BEGIN/COMMIT/ROLLBACK), nikdy odděleně.

export type TransactionType = "WELCOME_BONUS" | "GAME_BET" | "GAME_RESULT" | "STRIPE_TOPUP" | "ADMIN_ADJUSTMENT";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Nedostatek kreditů.");
    this.name = "InsufficientCreditsError";
  }
}

/** Postgres unique_violation, viz https://www.postgresql.org/docs/current/errcodes-appendix.html */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "23505";
}

/**
 * Připíše uvítací bonus přesně jednou za účet — idempotence je vynucená
 * DB podmínkou `welcome_bonus_granted_at IS NULL` přímo v UPDATE, ne jen
 * kontrolou na aplikační úrovni (bezpečné i při souběžných voláních).
 */
export async function grantWelcomeBonusOnce(userId: number, amountG: number): Promise<{ granted: boolean; balance: number }> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const updated = await client.query<{ credits: number }>(
      `UPDATE users
       SET credits = credits + $1, welcome_bonus_granted_at = now(), updated_at = now()
       WHERE id = $2 AND welcome_bonus_granted_at IS NULL
       RETURNING credits`,
      [amountG, userId]
    );

    if (updated.rows.length === 0) {
      await client.query("ROLLBACK");
      const current = await client.query<{ credits: number }>("SELECT credits FROM users WHERE id = $1", [userId]);
      return { granted: false, balance: current.rows[0]?.credits ?? 0 };
    }

    const balance = updated.rows[0].credits;
    await client.query(
      `INSERT INTO credit_transactions (user_id, type, amount_g, balance_after, description)
       VALUES ($1, 'WELCOME_BONUS', $2, $3, 'Uvítací bonus za založení účtu')`,
      [userId, amountG, balance]
    );

    await client.query("COMMIT");
    return { granted: true, balance };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Připíše G za zaplacenou Stripe Checkout Session. Idempotence je
 * vynucená UNIQUE indexem nad `stripe_checkout_session_id` (viz
 * db/schema.sql) — při duplicitním doručení webhooku INSERT selže na
 * unique_violation, transakce se vrátí zpět (i UPDATE credits) a funkce
 * vrátí `alreadyProcessed: true` bez druhého připsání.
 */
export async function applyStripeTopup(params: {
  userId: number;
  amountG: number;
  priceCzk: number;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  description: string;
}): Promise<{ alreadyProcessed: boolean; balance: number }> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const updated = await client.query<{ credits: number }>(
      `UPDATE users SET credits = credits + $1, updated_at = now() WHERE id = $2 RETURNING credits`,
      [params.amountG, params.userId]
    );
    if (updated.rows.length === 0) throw new Error(`applyStripeTopup: user ${params.userId} neexistuje`);
    const balance = updated.rows[0].credits;

    await client.query(
      `INSERT INTO credit_transactions
         (user_id, type, amount_g, balance_after, payment_amount_czk, stripe_checkout_session_id, stripe_payment_intent_id, description)
       VALUES ($1, 'STRIPE_TOPUP', $2, $3, $4, $5, $6, $7)`,
      [
        params.userId,
        params.amountG,
        balance,
        params.priceCzk,
        params.stripeCheckoutSessionId,
        params.stripePaymentIntentId,
        params.description,
      ]
    );

    await client.query("COMMIT");
    return { alreadyProcessed: false, balance };
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) {
      const existing = await client.query<{ balance_after: number }>(
        `SELECT balance_after FROM credit_transactions WHERE stripe_checkout_session_id = $1 AND type = 'STRIPE_TOPUP'`,
        [params.stripeCheckoutSessionId]
      );
      return { alreadyProcessed: true, balance: existing.rows[0]?.balance_after ?? 0 };
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Odečte G za herní sázku (spin). `WHERE credits >= $1` dělá kontrolu
 * dostatku kreditů atomickou součástí stejného UPDATE — nemůže dojít k
 * negativnímu zůstatku ani při souběžných požadavcích ze stejného účtu.
 */
export async function spendCredits(userId: number, amountG: number, description?: string): Promise<{ balance: number }> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const updated = await client.query<{ credits: number }>(
      `UPDATE users SET credits = credits - $1, updated_at = now() WHERE id = $2 AND credits >= $1 RETURNING credits`,
      [amountG, userId]
    );

    if (updated.rows.length === 0) {
      await client.query("ROLLBACK");
      throw new InsufficientCreditsError();
    }

    const balance = updated.rows[0].credits;
    await client.query(
      `INSERT INTO credit_transactions (user_id, type, amount_g, balance_after, description)
       VALUES ($1, 'GAME_BET', $2, $3, $4)`,
      [userId, -amountG, balance, description ?? null]
    );

    await client.query("COMMIT");
    return { balance };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
