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
  revalidateSeconds?: number;
};

export async function getRecords(collection: string, options: GetRecordsOptions = {}): Promise<UcaRecord[]> {
  const query = new URLSearchParams();
  if (options.status) query.set("status", options.status);
  if (options.perPage) query.set("per_page", String(options.perPage));
  if (options.filter) {
    for (const [key, value] of Object.entries(options.filter)) {
      query.set(`filter[${key}]`, value);
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await ucaJsonRequest<UcaPaginatedResponse<UcaRecord>>(recordsPath(collection, suffix), {
    method: "GET",
    revalidateSeconds: options.revalidateSeconds,
  });
  return response.data;
}

export async function getRecord(collection: string, id: number): Promise<UcaRecord> {
  const response = await ucaJsonRequest<{ data: UcaRecord }>(recordsPath(collection, `/${id}`), { method: "GET" });
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
