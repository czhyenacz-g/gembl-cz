-- GEMBL.cz — účty a herní kredity (G).
-- Aplikuje se jednorázově přes scripts/apply-schema.mjs (žádný migration
-- framework, jen "CREATE TABLE/INDEX IF NOT EXISTS" — bezpečně opakovatelné),
-- stejný vzor jako howtofish-cz/db/schema.sql.

-- E-mail se vždy ukládá normalizovaný (trim + lowercase, viz
-- lib/auth/email.ts) — UNIQUE tady tedy zajišťuje case-insensitive identitu
-- bez závislosti na citext rozšíření.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  welcome_bonus_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Magic-link přihlašovací tokeny. Ukládá se jen SHA-256 hash tokenu, nikdy
-- token samotný (viz lib/auth/tokens.ts) — únik DB tak nikomu nedá platný
-- přihlašovací odkaz. `used_at` dělá token jednorázovým.
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS magic_link_tokens_email_idx ON magic_link_tokens (email);

-- Auditovatelná historie všech pohybů G. Jediné místo, kudy smí projít
-- změna zůstatku (viz lib/wallet/ledger.ts) — `balance_after` je vždy
-- zůstatek PO téhle transakci, dopočítaný atomicky ve stejné DB transakci
-- jako UPDATE users.credits.
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('WELCOME_BONUS', 'GAME_BET', 'GAME_RESULT', 'STRIPE_TOPUP', 'ADMIN_ADJUSTMENT')),
  amount_g INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  payment_amount_czk INTEGER,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions (user_id);

-- Idempotence Stripe webhooku: jedna Checkout Session smí připsat kredit
-- právě jednou. Partial index (ne obyčejný UNIQUE sloupec), protože ostatní
-- typy transakcí (WELCOME_BONUS, GAME_BET, ...) mají stripe_checkout_session_id
-- NULL a NULL hodnoty se v UNIQUE indexu navzájem nekonfliktují ani bez
-- WHERE podmínky, ale takhle je záměr v schématu čitelný napřímo.
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_stripe_session_key
  ON credit_transactions (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
