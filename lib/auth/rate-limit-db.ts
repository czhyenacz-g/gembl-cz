import "server-only";
import { sql } from "@vercel/postgres";

// Persistentní rate limit přes Postgres (ne in-memory, viz
// lib/analytics/rate-limit.ts) — nutné, protože magic-link endpoint běží
// na Vercelu/serverless, kde každý request může dopadnout na jinou
// instanci bez sdílené paměti. Kontrola i zápis "hitu" jsou JEDEN atomický
// SQL příkaz (CTE spočítá počet hitů v okně, INSERT proběhne jen když je
// pod limitem) — bezpečné i bez explicitní BEGIN/COMMIT transakce, protože
// je to jediný příkaz. Při vysoké souběžnosti může dojít k drobnému
// překročení limitu o pár requestů (Postgres v READ COMMITTED to úplně
// nevyloučí bez explicitního zámku) — pro abuse-prevention na tomhle
// endpointu je to přijatelný kompromis, ne finanční/bezpečnostní hranice.
export async function isRateLimitedPersistent(scope: string, key: string, limit: number, windowMinutes: number): Promise<boolean> {
  const result = await sql`
    WITH recent AS (
      SELECT count(*)::int AS cnt
      FROM rate_limit_hits
      WHERE scope = ${scope} AND key = ${key} AND created_at > now() - make_interval(mins => ${windowMinutes})
    )
    INSERT INTO rate_limit_hits (scope, key)
    SELECT ${scope}, ${key}
    FROM recent
    WHERE recent.cnt < ${limit}
    RETURNING id
  `;

  return result.rows.length === 0;
}
