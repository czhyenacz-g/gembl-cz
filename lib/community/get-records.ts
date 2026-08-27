import "server-only";
import { getRecords } from "../uca/records.ts";
import type { UcaRecord } from "../uca/types.ts";

/** Veřejné, schválené záznamy dané collection. */
export async function getApprovedRecords(collection: string, revalidateSeconds?: number): Promise<UcaRecord[]> {
  return getRecords(collection, { status: "approved", revalidateSeconds });
}

/**
 * Jen pending záznamy AKTUÁLNĚ přihlášeného (resp. identifikovaného)
 * uživatele — server-side filtr přímo na UCA (`status=pending` +
 * `filter[ownerKey]=ownerValue`), nikdy se nestahují cizí pending
 * záznamy do browseru jen proto, aby se pak filtrovaly v Reactu.
 *
 * `ownerKey` je typicky "steam_id" nebo podobný identifikátor vlastníka
 * — tenhle helper o tom nic neví, jen předává filtr dál do UCA.
 */
export async function getOwnPendingRecords(
  collection: string,
  ownerKey: string,
  ownerValue: string
): Promise<UcaRecord[]> {
  return getRecords(collection, { status: "pending", filter: { [ownerKey]: ownerValue } });
}
