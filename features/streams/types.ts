export type Platform = "twitch" | "youtube" | "kick";

export type LiveStream = {
  id: string;
  platform: Platform;
  channelName: string;
  channelUrl: string;
  title: string;
  streamUrl: string;
  thumbnailUrl?: string;
  viewerCount?: number;
  language?: string;
  startedAt?: string;
};

export type ProviderStatus = "ok" | "not-configured" | "error";

export type ProviderResult = {
  platform: Platform;
  status: ProviderStatus;
  streams: LiveStream[];
};

/** Jeden provider = jedna platforma, `query` je typicky název hry/kategorie/kanálu. */
export interface StreamProvider {
  getLiveStreams(query: string): Promise<ProviderResult>;
}
