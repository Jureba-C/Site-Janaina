const db = require("./db");

const GRAPH_HOST = "https://graph.instagram.com";
const GRAPH_VERSION = "v25.0";

const REFRESH_THRESHOLD_MS = 45 * 24 * 60 * 60 * 1000;

const CACHE_TTL_MS = 60 * 60 * 1000;
const UNAVAILABLE_CACHE_TTL_MS = 5 * 60 * 1000;

let cache = { data: null, expiresAt: 0 };

function mockSquare(hex) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
const MOCK_HEXES = ["#F4B4CC", "#EA8FB4", "#DD6E9B", "#FAD3E1", "#C05480", "#FBDCE8"];

const MOCK_FEED = {
  available: true,
  username: "arte.canecasbsb",
  profilePictureUrl: mockSquare("#DD6E9B"),
  posts: MOCK_HEXES.map((hex, i) => ({
    id: `mock-${i}`,
    permalink: "https://www.instagram.com/arte.canecasbsb/",
    caption: `Post de exemplo ${i + 1}`,
    displayUrl: mockSquare(hex),
  })),
};

async function refreshLongLivedToken(currentToken) {
  const url = `${GRAPH_HOST}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(currentToken)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    throw new Error(data?.error?.message || `refresh_access_token respondeu ${res.status}`);
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

async function fetchProfile(token) {
  const url = `${GRAPH_HOST}/${GRAPH_VERSION}/me?fields=username,profile_picture_url&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    throw new Error(data?.error?.message || `/me respondeu ${res.status}`);
  }
  return data;
}

async function fetchRecentMedia(token, limit = 6) {
  const url = `${GRAPH_HOST}/${GRAPH_VERSION}/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=${limit}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    throw new Error(data?.error?.message || `/me/media respondeu ${res.status}`);
  }
  return data.data || [];
}

function mapMediaItem(item) {
  return {
    id: item.id,
    permalink: item.permalink,
    caption: item.caption || "",
    displayUrl: item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url,
  };
}

async function ensureFreshToken() {
  let stored = db.getInstagramToken();

  if (!stored) {
    const envToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!envToken) return null;
    stored = { accessToken: envToken, refreshedAt: Date.now() };
    db.saveInstagramToken(stored);
  }

  const age = Date.now() - stored.refreshedAt;
  if (age > REFRESH_THRESHOLD_MS) {
    try {
      const refreshed = await refreshLongLivedToken(stored.accessToken);
      stored = { accessToken: refreshed.accessToken, refreshedAt: Date.now() };
      db.saveInstagramToken(stored);
    } catch (err) {
      console.error("[instagram] falha ao renovar o token:", err.message);
    }
  }

  return stored.accessToken;
}

function buildUnavailable() {
  return { available: false };
}

function setCache(data, ttlMs) {
  cache = { data, expiresAt: Date.now() + ttlMs };
}

async function getInstagramFeed() {
  if (process.env.NODE_ENV !== "production" && process.env.INSTAGRAM_MOCK_FEED === "true") {
    return MOCK_FEED;
  }

  if (Date.now() < cache.expiresAt) {
    return cache.data;
  }

  try {
    const token = await ensureFreshToken();
    if (!token) {
      const result = buildUnavailable();
      setCache(result, UNAVAILABLE_CACHE_TTL_MS);
      return result;
    }

    const [profile, media] = await Promise.all([fetchProfile(token), fetchRecentMedia(token, 6)]);
    const result = {
      available: true,
      username: profile.username,
      profilePictureUrl: profile.profile_picture_url || "",
      posts: media.map(mapMediaItem),
    };
    setCache(result, CACHE_TTL_MS);
    return result;
  } catch (err) {
    console.error("[instagram] falha ao buscar feed:", err.message);
    const result = buildUnavailable();
    setCache(result, UNAVAILABLE_CACHE_TTL_MS);
    return result;
  }
}

function resetToken() {
  db.deleteInstagramToken();
  cache = { data: null, expiresAt: 0 };
}

async function testConnection() {
  try {
    const token = await ensureFreshToken();
    if (!token) {
      return { ok: false, error: "INSTAGRAM_ACCESS_TOKEN não está definido (nem no .env, nem salvo no banco)." };
    }
    const profile = await fetchProfile(token);
    return { ok: true, username: profile.username };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { getInstagramFeed, mapMediaItem, resetToken, testConnection };
