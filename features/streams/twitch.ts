import type { LiveStream, ProviderResult } from "./types.ts";

// Oficiální Twitch Helix API + OAuth "client credentials" flow (app token,
// bez přihlášení uživatele). Dokumentace: https://dev.twitch.tv/docs/api/
// Ověřený, obecný vzor z HowToFish.cz — `query` (název hry) je teď
// parametr místo natvrdo zapsané konstanty.
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const GAMES_URL = "https://api.twitch.tv/helix/games";
const STREAMS_URL = "https://api.twitch.tv/helix/streams";

type TwitchStream = {
  id: string;
  user_login: string;
  user_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
};

async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, {
    method: "POST",
    // App token vydrží týdny — netřeba obnovovat stejně často jako data.
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function getGameId(token: string, clientId: string, gameName: string): Promise<string | null> {
  const params = new URLSearchParams({ name: gameName });
  const res = await fetch(`${GAMES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Twitch games lookup failed: ${res.status}`);
  }
  const data = (await res.json()) as { data: { id: string }[] };
  return data.data[0]?.id ?? null;
}

export async function getTwitchStreams(gameName: string): Promise<ProviderResult> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { platform: "twitch", status: "not-configured", streams: [] };
  }

  try {
    const token = await getAppToken(clientId, clientSecret);
    const gameId = await getGameId(token, clientId, gameName);
    if (!gameId) {
      return { platform: "twitch", status: "ok", streams: [] };
    }

    const params = new URLSearchParams({ game_id: gameId, first: "20" });
    const res = await fetch(`${STREAMS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      throw new Error(`Twitch streams request failed: ${res.status}`);
    }
    const data = (await res.json()) as { data: TwitchStream[] };

    const streams: LiveStream[] = data.data.map((s) => ({
      id: `twitch:${s.id}`,
      platform: "twitch",
      channelName: s.user_name,
      channelUrl: `https://www.twitch.tv/${s.user_login}`,
      title: s.title,
      streamUrl: `https://www.twitch.tv/${s.user_login}`,
      thumbnailUrl: s.thumbnail_url
        ? s.thumbnail_url.replace("{width}", "320").replace("{height}", "180")
        : undefined,
      viewerCount: s.viewer_count,
      language: s.language || undefined,
      startedAt: s.started_at || undefined,
    }));

    return { platform: "twitch", status: "ok", streams };
  } catch (error) {
    console.error("[streams] Twitch provider failed:", error);
    return { platform: "twitch", status: "error", streams: [] };
  }
}
