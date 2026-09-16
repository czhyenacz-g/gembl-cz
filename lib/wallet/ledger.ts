import "server-only";
import { db, sql } from "@vercel/postgres";

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
 * Najde nebo založí uživatele podle e-mailu A ve STEJNÉ DB transakci mu
 * (pokud ještě nemá) atomicky připíše uvítací bonus + ledger záznam — viz
 * zadání "vytvoření uživatele + připsání G + ledger proveď atomicky".
 *
 * Idempotence bonusu stojí na dvou nezávislých vrstvách:
 * 1) `UPDATE ... WHERE welcome_bonus_granted_at IS NULL` — řádkový zámek
 *    Postgresu nad `users` sám o sobě serializuje souběžná volání pro
 *    stejného uživatele (druhé volání uvidí už nastavený sloupec a nic
 *    nezapíše), takže tohle jde bezpečně volat souběžně (např. dva různé
 *    magic-linky pro stejný e-mail otevřené skoro najednou).
 * 2) Partial UNIQUE index `credit_transactions_one_welcome_bonus_per_user`
 *    (viz db/schema.sql) jako defense-in-depth na úrovni schématu — kdyby
 *    kdykoli v budoucnu jiný kód obešel (1), INSERT do ledgeru selže na
 *    unique_violation a transakce se celá vrátí zpět.
 */
/**
 * Jen čtení (žádný zápis): má tenhle e-mail už udělený uvítací bonus?
 *
 * Bonus je jednorázový na účet (viz findOrCreateUserAndGrantWelcomeBonus),
 * takže podle tohohle příznaku se pozná, jestli vracejícímu se hráči
 * přihlášením ještě něco reálně přijde — používá to magic-link route pro
 * volbu textu e-mailu (neslibovat výhru, která se už neudělí). Čistě
 * informativní dotaz, nikdy sám nic nemění.
 */
export async function hasWelcomeBonus(email: string): Promise<boolean> {
  const result = await sql<{ has_bonus: boolean }>`
    SELECT welcome_bonus_granted_at IS NOT NULL AS has_bonus
    FROM users
    WHERE email = ${email}
  `;
  return result.rows[0]?.has_bonus === true;
}

export async function findOrCreateUserAndGrantWelcomeBonus(
  email: string,
  amountG: number
): Promise<{ userId: number; granted: boolean; balance: number }> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // `DO UPDATE` (místo `DO NOTHING`) jen proto, aby `RETURNING id`
    // fungovalo i při konfliktu (existující účet).
    const userResult = await client.query<{ id: number }>(
      `INSERT INTO users (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [email]
    );
    const userId = userResult.rows[0].id;

    const updated = await client.query<{ credits: number }>(
      `UPDATE users
       SET credits = credits + $1, welcome_bonus_granted_at = now(), updated_at = now()
       WHERE id = $2 AND welcome_bonus_granted_at IS NULL
       RETURNING credits`,
      [amountG, userId]
    );

    let granted = false;
    let balance: number;

    if (updated.rows.length > 0) {
      balance = updated.rows[0].credits;
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, amount_g, balance_after, description)
         VALUES ($1, 'WELCOME_BONUS', $2, $3, 'Uvítací bonus za založení účtu')`,
        [userId, amountG, balance]
      );
      granted = true;
    } else {
      const current = await client.query<{ credits: number }>("SELECT credits FROM users WHERE id = $1", [userId]);
      balance = current.rows[0]?.credits ?? 0;
    }

    await client.query("COMMIT");
    return { userId, granted, balance };
  } catch (error) {
    await client.query("ROLLBACK");
    if (isUniqueViolation(error)) {
      // Partial unique index odchytil souběh, který guard v (1) výše
      // nestihl (nemělo by k tomu nikdy dojít, ale je to poslední pojistka) —
      // bonus evidentně právě připsal jiný souběžný request.
      const fallback = await db.connect();
      try {
        const current = await fallback.query<{ id: number; credits: number }>("SELECT id, credits FROM users WHERE email = $1", [
          email,
        ]);
        const row = current.rows[0];
        return { userId: row?.id ?? 0, granted: false, balance: row?.credits ?? 0 };
      } finally {
        fallback.release();
      }
    }
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
