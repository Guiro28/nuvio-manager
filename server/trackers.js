import { assert } from "./core.js";

const TRAKT = "https://api.trakt.tv";
const SIMKL = "https://api.simkl.com";
const requestJson = async (url, options = {}, fetchImpl = fetch) => {
  const response = await fetchImpl(url, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    ...options,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { response, data };
};
const jsonHeaders = { "Content-Type": "application/json", Accept: "application/json" };

export async function startTrakt(config, fetchImpl = fetch) {
  assert(config?.clientId && config?.clientSecret, "Configure d’abord l’application Trakt dans Paramètres");
  const { response, data } = await requestJson(`${TRAKT}/oauth/device/code`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ client_id: config.clientId }),
  }, fetchImpl);
  assert(response.ok && data?.device_code && data?.user_code, "Impossible de créer le code Trakt", 502);
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url || "https://trakt.tv/activate",
    interval: Math.max(Number(data.interval || 5), 5),
    expiresAt: Date.now() + Number(data.expires_in || 600) * 1000,
  };
}

export async function pollTrakt(pairing, config, fetchImpl = fetch) {
  assert(pairing?.expiresAt > Date.now(), "Code Trakt expiré", 410);
  const { response, data } = await requestJson(`${TRAKT}/oauth/device/token`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      code: pairing.deviceCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  }, fetchImpl);
  if (response.status === 400) return { status: "pending" };
  if (response.status === 429) return { status: "pending", interval: pairing.interval + 5 };
  assert(response.status !== 410, "Code Trakt expiré", 410);
  assert(response.status !== 418, "Autorisation Trakt refusée", 403);
  assert(response.ok && data?.access_token, "Connexion Trakt impossible", 502);
  return {
    status: "connected",
    connection: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      createdAt: Number(data.created_at || Math.floor(Date.now() / 1000)) * 1000,
      expiresIn: Number(data.expires_in || 604800) * 1000,
      connectedAt: Date.now(),
    },
  };
}

export async function startSimkl(config, fetchImpl = fetch) {
  assert(config?.clientId, "Configure d’abord l’application Simkl dans Paramètres");
  const url = new URL(`${SIMKL}/oauth/pin`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", "urn:ietf:wg:oauth:2.0:oob");
  const { response, data } = await requestJson(url, { headers: { Accept: "application/json" } }, fetchImpl);
  assert(response.ok && data?.user_code, "Impossible de créer le code Simkl", 502);
  return {
    userCode: data.user_code,
    verificationUrl: data.verification_url || "https://simkl.com/pin",
    interval: Math.max(Number(data.interval || 5), 5),
    expiresAt: Date.now() + Number(data.expires_in || 900) * 1000,
  };
}

export async function pollSimkl(pairing, config, fetchImpl = fetch) {
  assert(pairing?.expiresAt > Date.now(), "Code Simkl expiré", 410);
  const url = new URL(`${SIMKL}/oauth/pin/${encodeURIComponent(pairing.userCode)}`);
  url.searchParams.set("client_id", config.clientId);
  const { response, data } = await requestJson(url, { headers: { Accept: "application/json" } }, fetchImpl);
  assert(response.ok, "Connexion Simkl impossible", 502);
  if (data?.result !== "OK" || !data?.access_token) return { status: "pending" };
  return {
    status: "connected",
    connection: { accessToken: data.access_token, connectedAt: Date.now() },
  };
}

const traktHeaders = (config, token) => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
  "trakt-api-key": config.clientId,
  "trakt-api-version": "2",
});

async function refreshTrakt(connection, config, fetchImpl) {
  if (connection.createdAt + connection.expiresIn > Date.now() + 60000)
    return connection;
  assert(connection.refreshToken, "Le compte Trakt doit être reconnecté", 401);
  const { response, data } = await requestJson(`${TRAKT}/oauth/token`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      refresh_token: connection.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
      grant_type: "refresh_token",
    }),
  }, fetchImpl);
  assert(response.ok && data?.access_token, "Le compte Trakt doit être reconnecté", 401);
  return {
    ...connection,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || connection.refreshToken,
    createdAt: Number(data.created_at || Math.floor(Date.now() / 1000)) * 1000,
    expiresIn: Number(data.expires_in || 604800) * 1000,
  };
}

export async function traktHistory(connection, config, fetchImpl = fetch) {
  const fresh = await refreshTrakt(connection, config, fetchImpl);
  const events = [];
  for (let page = 1; page <= 50; page++) {
    const url = new URL(`${TRAKT}/sync/history`);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", "100");
    url.searchParams.set("extended", "full");
    const { response, data } = await requestJson(url, { headers: traktHeaders(config, fresh.accessToken) }, fetchImpl);
    assert(response.ok && Array.isArray(data), "Historique Trakt indisponible", response.status === 401 ? 401 : 502);
    for (const item of data) {
      const movie = item.movie,
        episode = item.episode,
        show = item.show;
      const ids = movie?.ids || show?.ids || episode?.ids || {};
      events.push({
        source: "trakt",
        contentId: String(ids.imdb || `trakt:${ids.trakt || item.id}`),
        title: String(movie?.title || show?.title || episode?.title || ""),
        kind: movie ? "movie" : "episode",
        season: episode?.season ?? null,
        episode: episode?.number ?? null,
        durationMinutes: runtimeMinutes(
          movie?.runtime,
          episode?.runtime,
          show?.runtime,
        ),
        at: Date.parse(item.watched_at) || 0,
      });
    }
    const pages = Number(response.headers.get("x-pagination-page-count") || 0);
    if (!data.length || (pages && page >= pages) || (!pages && data.length < 100)) break;
  }
  return { events, connection: fresh };
}

const simklHeaders = (config, token) => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
  "simkl-api-key": config.clientId,
});

const runtimeMinutes = (...values) => {
  for (const value of values) {
    const match = String(value ?? "").match(/\d+(?:[.,]\d+)?/);
    const minutes = match ? Number(match[0].replace(",", ".")) : 0;
    if (Number.isFinite(minutes) && minutes > 0 && minutes <= 24 * 60)
      return Math.round(minutes);
  }
  return 0;
};

const trackerIds = (media) => {
  const ids = media?.ids || {};
  return [...new Set([
    ids.imdb && String(ids.imdb),
    ids.trakt && `trakt:${ids.trakt}`,
    ids.simkl && `simkl:${ids.simkl}`,
    ids.simkl_id && `simkl:${ids.simkl_id}`,
    ids.tmdb && `tmdb:${ids.tmdb}`,
    ids.tvdb && `tvdb:${ids.tvdb}`,
  ].filter(Boolean))];
};

const playbackItem = (row) => {
  const movie = row?.movie,
    episode = row?.episode,
    show = row?.show || row?.anime,
    media = movie || show || episode || {};
  return {
    contentIds: trackerIds(media),
    title: String(movie?.title || show?.title || episode?.title || ""),
    kind: movie ? "movie" : "episode",
    season: episode?.season ?? episode?.tvdb_season ?? null,
    episode: episode?.number ?? episode?.episode ?? episode?.tvdb_number ?? null,
  };
};

export async function traktNowPlaying(connection, config, fetchImpl = fetch) {
  const fresh = await refreshTrakt(connection, config, fetchImpl);
  const headers = traktHeaders(config, fresh.accessToken);
  let slug = fresh.userSlug;
  if (!slug) {
    const settingsResult = await requestJson(`${TRAKT}/users/settings`, { headers }, fetchImpl);
    assert(settingsResult.response.ok, "Statut Trakt indisponible", settingsResult.response.status === 401 ? 401 : 502);
    const user = settingsResult.data?.user || {};
    slug = user.ids?.slug || user.username;
  }
  assert(slug, "Profil Trakt introuvable", 502);
  const updatedConnection = fresh.userSlug === slug ? fresh : { ...fresh, userSlug: slug };
  const watchingResult = await requestJson(
    `${TRAKT}/users/${encodeURIComponent(slug)}/watching?extended=full`,
    { headers },
    fetchImpl,
  );
  if (watchingResult.response.status === 204 || !watchingResult.data)
    return { state: "inactive", item: null, connection: updatedConnection };
  assert(watchingResult.response.ok, "Statut Trakt indisponible", watchingResult.response.status === 401 ? 401 : 502);
  return {
    state: "playing",
    item: {
      ...playbackItem(watchingResult.data),
      startedAt: Date.parse(watchingResult.data.started_at) || 0,
      expiresAt: Date.parse(watchingResult.data.expires_at) || 0,
    },
    connection: updatedConnection,
  };
}

export async function simklPlayback(connection, config, fetchImpl = fetch) {
  assert(config?.clientId, "Application Simkl non configurée", 400);
  const url = new URL(`${SIMKL}/sync/playback`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("app-name", "nuvio-manager");
  url.searchParams.set("app-version", "0.1.0");
  const { response, data } = await requestJson(
    url,
    { headers: simklHeaders(config, connection.accessToken) },
    fetchImpl,
  );
  const detail = data?.error_description || data?.message || data?.error;
  assert(
    response.ok && Array.isArray(data),
    `Progression Simkl indisponible${detail ? ` : ${detail}` : ` (HTTP ${response.status})`}`,
    response.status === 401 ? 401 : response.status === 429 ? 429 : 502,
  );
  return data.map((row) => ({
    ...playbackItem(row),
    state: row.paused_at ? "paused" : "playing",
    progress: Number(row.progress || 0),
    at: Date.parse(row.paused_at || row.watched_at) || 0,
  }));
}

function simklEvents(rows, sourceType) {
  const events = [];
  for (const item of rows || []) {
    const media = item.movie || item.show || item.anime || item;
    const ids = media.ids || item.ids || {};
    const contentId = String(ids.imdb || `simkl:${ids.simkl || ids.simkl_id || "unknown"}`);
    const lastWatched = Date.parse(
      item.last_watched_at || item.last_watched || item.watched_at || item.completed_at,
    ) || 0;
    if (sourceType === "movies") {
      if (item.status === "completed" || lastWatched)
        events.push({ source: "simkl", contentId, title: String(media.title || ""), kind: "movie", season: null, episode: null, durationMinutes: runtimeMinutes(media.runtime, media.duration, item.runtime, item.duration), at: lastWatched });
      continue;
    }
    let detailed = false;
    for (const season of item.seasons || media.seasons || [])
      for (const episode of season.episodes || []) {
        const at = Date.parse(episode.watched_at || episode.last_watched_at);
        if (!at) continue;
        detailed = true;
        events.push({ source: "simkl", contentId, title: String(media.title || ""), kind: "episode", season: season.number ?? season.season, episode: episode.number ?? episode.episode, durationMinutes: runtimeMinutes(episode.runtime, episode.duration, media.runtime, media.duration, item.runtime, item.duration), at });
      }
    if (!detailed && lastWatched && item.status !== "plantowatch")
      events.push({ source: "simkl", contentId, title: String(media.title || ""), kind: "episode", season: null, episode: null, durationMinutes: runtimeMinutes(media.runtime, media.duration, item.runtime, item.duration), at: lastWatched });
  }
  return events.filter((event) => event.at > 0);
}

export async function simklHistory(connection, config, fetchImpl = fetch) {
  const events = [];
  for (const type of ["movies", "shows", "anime"]) {
    const url = new URL(`${SIMKL}/sync/all-items/${type}`);
    url.searchParams.set("extended", "full");
    url.searchParams.set("episode_watched_at", "yes");
    url.searchParams.set("include_all_episodes", "yes");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("app-name", "nuvio-manager");
    url.searchParams.set("app-version", "0.1.0");
    const { response, data } = await requestJson(
      url,
      { headers: simklHeaders(config, connection.accessToken) },
      fetchImpl,
    );
    const rows = Array.isArray(data) ? data : data?.[type];
    const detail = data?.error_description || data?.message || data?.error;
    assert(
      response.ok && Array.isArray(rows),
      `Historique Simkl indisponible${detail ? ` : ${detail}` : ` (HTTP ${response.status})`}`,
      response.status === 401 ? 401 : response.status === 429 ? 429 : 502,
    );
    events.push(...simklEvents(rows, type));
  }
  return { events, connection };
}
