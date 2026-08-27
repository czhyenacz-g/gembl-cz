import type { LiveStream, Platform, ProviderResult } from "./types.ts";
import { getTwitchStreams } from "./twitch.ts";
import { getYouTubeStreams } from "./youtube.ts";
import { getKickStreams } from "./kick.ts";

export type { LiveStream, Platform, ProviderResult, ProviderStatus, StreamProvider } from "./types.ts";

export type AggregatedStreams = {
  streams: LiveStream[];
  totalViewers: number | null;
  failedPlatforms: Platform[];
  updatedAt: string;
};

const PLATFORMS: Platform[] = ["twitch", "youtube", "kick"];

/**
 * `query` je použit jako hledaný název hry/kategorie napříč všemi třemi
 * platformami — pro jemnější kontrolu volej jednotlivé providery
 * (getTwitchStreams/getYouTubeStreams/getKickStreams) přímo.
 */
export async function getLiveStreams(query: string): Promise<AggregatedStreams> {
  // Promise.allSettled — chyba jednoho providera (síť, expirované
  // credentials apod.) nesmí shodit ostatní ani celou stránku.
  const settled = await Promise.allSettled([
    getTwitchStreams(query),
    getYouTubeStreams(query),
    getKickStreams(query),
  ]);

  const results: ProviderResult[] = settled.map((result, i) =>
    result.status === "fulfilled" ? result.value : { platform: PLATFORMS[i], status: "error", streams: [] }
  );

  const byId = new Map<string, LiveStream>();
  for (const result of results) {
    for (const stream of result.streams) {
      byId.set(stream.id, stream);
    }
  }

  const streams = Array.from(byId.values()).sort((a, b) => {
    if (a.viewerCount === undefined && b.viewerCount === undefined) return 0;
    if (a.viewerCount === undefined) return 1;
    if (b.viewerCount === undefined) return -1;
    return b.viewerCount - a.viewerCount;
  });

  const knownViewerCounts = streams.map((s) => s.viewerCount).filter((v): v is number => typeof v === "number");
  const totalViewers = knownViewerCounts.length > 0 ? knownViewerCounts.reduce((sum, v) => sum + v, 0) : null;

  const failedPlatforms = results.filter((r) => r.status === "error").map((r) => r.platform);

  return {
    streams,
    totalViewers,
    failedPlatforms,
    updatedAt: new Date().toISOString(),
  };
}
