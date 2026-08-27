import "server-only";
import { createRecord } from "../uca/records.ts";

// Generický first-party event log nad libovolnou UCA collection (výchozí
// "analytics_events") — žádný pevný seznam eventů ani tvar metadata tady
// není zadrátovaný, to je vždy doménově specifické (viz HowToFish.cz
// referenční implementace: whitelist eventů, sanitizace metadata per-event,
// anonymous_id v localStorage, /api/events ingest endpoint s rate limitem).
// Tenhle helper řeší jen samotný zápis — fail-open, nikdy nesmí shodit
// volající akci (login, upload, uložení skóre, ...).

export type TrackEventInput = {
  event: string;
  steamId?: string | null;
  anonymousId?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
  collection?: string;
};

export async function trackEvent(input: TrackEventInput): Promise<void> {
  const data = {
    event: input.event,
    steam_id: input.steamId ?? null,
    anonymous_id: input.anonymousId ?? null,
    path: input.path ?? null,
    metadata: input.metadata ?? {},
  };

  try {
    await createRecord(input.collection ?? "analytics_events", data);
  } catch (error) {
    console.error(`trackEvent("${input.event}") selhal:`, error instanceof Error ? error.message : error);
  }
}
