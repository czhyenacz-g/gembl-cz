import "server-only";
import { recordsPath, ucaJsonRequest } from "./client.ts";
import type { UcaPaginatedResponse, UcaRecord, UcaRecordStatus } from "./types.ts";

// Obecné helpery nad libovolnou UCA collection — žádný projekt-specifický
// název pole/kolekce tady není zadrátovaný. `assets`/`promotions`/atd.
// jsou jen řetězce, které si volající předá.

export type GetRecordsOptions = {
  status?: UcaRecordStatus;
  /** Max 3 filtry, klíč jen [a-zA-Z0-9_], hodnota vždy exact-match — viz UCA docs/API.md. */
  filter?: Record<string, string>;
  perPage?: number;
  /** Jen pro getRecordsPage — UCA stránkuje standardně (?page=N), max per_page je 50 (server-side cap). */
  page?: number;
  revalidateSeconds?: number;
};

function buildQuery(options: GetRecordsOptions): string {
  const query = new URLSearchParams();
  if (options.status) query.set("status", options.status);
  if (options.perPage) query.set("per_page", String(options.perPage));
  if (options.page) query.set("page", String(options.page));
  if (options.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      query.set(`filter[${key}]`, value);
    }
  }
  return query.toString();
}

export async function getRecords(collection: string, options: GetRecordsOptions = {}): Promise<UcaRecord[]> {
  const suffix = buildQuery(options);
  const response = await ucaJsonRequest<UcaPaginatedResponse<UcaRecord>>(recordsPath(collection, suffix ? `?${suffix}` : ""), {
    method: "GET",
    revalidateSeconds: options.revalidateSeconds,
  });
  return response.data;
}

/**
 * Stejné jako getRecords, ale vrací celou stránkovanou odpověď (vč.
 * `meta.last_page`) — pro volající, kteří potřebují projít víc než
 * jednu stránku (např. sečíst všechny záznamy napříč stránkami).
 */
export async function getRecordsPage(collection: string, options: GetRecordsOptions = {}): Promise<UcaPaginatedResponse<UcaRecord>> {
  const suffix = buildQuery(options);
  return ucaJsonRequest<UcaPaginatedResponse<UcaRecord>>(recordsPath(collection, suffix ? `?${suffix}` : ""), {
    method: "GET",
    revalidateSeconds: options.revalidateSeconds,
  });
}

export async function getRecord(
  collection: string,
  id: number,
  options: Pick<GetRecordsOptions, "revalidateSeconds"> = {}
): Promise<UcaRecord> {
  const response = await ucaJsonRequest<{ data: UcaRecord }>(recordsPath(collection, `/${id}`), {
    method: "GET",
    revalidateSeconds: options.revalidateSeconds,
  });
  return response.data;
}

/**
 * Vytvoří record — UCA vždy server-side vynutí `status: pending`
 * bez ohledu na to, co pošleš (viz docs/API.md v universalContentApi),
 * takže se tu ani neposílá.
 */
export async function createRecord(collection: string, data: Record<string, unknown>): Promise<{ id: number }> {
  const response = await ucaJsonRequest<{ data: UcaRecord }>(recordsPath(collection), {
    method: "POST",
    body: { data },
  });
  return { id: response.data.id };
}
