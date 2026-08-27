import "server-only";
import { createRecord } from "../uca/records.ts";
import { uploadMedia } from "../uca/media.ts";
import type { UcaMedia } from "../uca/types.ts";

export type CommunitySubmissionInput = {
  collection: string;
  /** Cokoliv doménového (fish_slug, name, note, steam_id...) — tenhle helper neví nic o konkrétních polích. */
  data: Record<string, unknown>;
  media?: File;
};

export type CommunitySubmissionResult = {
  recordId: number;
  media: UcaMedia | null;
};

/**
 * Generic "frontend -> UCA record (status=pending) -> volitelné media"
 * flow — přesně opakující se pattern z komunitních formulářů (fish
 * suggestions, catches, item/boss/location suggestions v HowToFish).
 * Status je vždy `pending` (UCA to server-side vynucuje samo, i kdyby
 * `data` obsahovalo jiné pole se stejným názvem).
 *
 * Neřeší validaci konkrétních polí, rate limiting ani duplicate check —
 * to je vždy doménově specifické, viz CLAUDE.md pro doporučený vzor
 * (pure evaluate*.ts funkce před zavoláním tohohle helperu).
 */
export async function createCommunitySubmission(
  input: CommunitySubmissionInput
): Promise<CommunitySubmissionResult> {
  const { id: recordId } = await createRecord(input.collection, input.data);

  let media: UcaMedia | null = null;
  if (input.media) {
    media = await uploadMedia(input.media, recordId);
  }

  return { recordId, media };
}
