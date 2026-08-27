import type { LiveStream, ProviderResult } from "./types.ts";

// Oficiální Kick Public API (docs.kick.com) + OAuth 2.1 "client_credentials"
// app token (bez přihlášení uživatele, viz docs.kick.com/getting-started
// /generating-tokens-oauth2-flow). Livestreams/categories endpointy:
// docs.kick.com/apis/livestreams a docs.kick.com/apis/categories.
const TOKEN_URL = "https://id.kick.com/oauth/token";
const CATEGORIES_URL = "https://api.kick.com/public/v2/categories";
const LIVESTREAMS_URL = "https://api.kick.com/public/v2/livestreams";

type KickCategory = { id: number; name: string };

type KickLivestream = {
  id: string;
  title: string;
  started_at: string;
  thumbnail: string;
  language_code: string;
  viewer_count: number;
  broadcaster_user: { username: string };
  channel: { slug: string };
};

async function getAppToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Kick token request failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function getCategoryId(token: string, categoryName: string): Promise<number | null> {
  const params = new URLSearchParams({ name: categoryName, limit: "5" });
  const res = await fetch(`${CATEGORIES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Kick categories lookup failed: ${res.status}`);
  }
  const data = (await res.json()) as { data: KickCategory[] };
  return data.data[0]?.id ?? null;
}

export async function getKickStreams(categoryName: string): Promise<ProviderResult> {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { platform: "kick", status: "not-configured", streams: [] };
  }

  try {
    const token = await getAppToken(clientId, clientSecret);
    const categoryId = await getCategoryId(token, categoryName);
    if (!categoryId) {
      return { platform: "kick", status: "ok", streams: [] };
    }

    const params = new URLSearchParams({ limit: "100" });
    params.append("category_id", String(categoryId));
    const res = await fetch(`${LIVESTREAMS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      throw new Error(`Kick livestreams request failed: ${res.status}`);
    }
    const data = (await res.json()) as { data: KickLivestream[] };

    const streams: LiveStream[] = data.data.map((s) => ({
      id: `kick:${s.id}`,
      platform: "kick",
      channelName: s.broadcaster_user.username,
      channelUrl: `https://kick.com/${s.channel.slug}`,
      title: s.title,
      streamUrl: `https://kick.com/${s.channel.slug}`,
      thumbnailUrl: s.thumbnail || undefined,
      // Kick vrací 0, pokud streamer sdílení počtu diváků vypnul — takové
      // číslo bereme jako neznámé, ne jako "nikdo nekouká".
      viewerCount: s.viewer_count > 0 ? s.viewer_count : undefined,
      language: s.language_code || undefined,
      startedAt: s.started_at || undefined,
    }));

    return { platform: "kick", status: "ok", streams };
  } catch (error) {
    console.error("[streams] Kick provider failed:", error);
    return { platform: "kick", status: "error", streams: [] };
  }
}
