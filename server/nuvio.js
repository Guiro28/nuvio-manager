import { assert } from "./core.js";

// Providers that share the Nuvio-fork Supabase backend and TV-login pairing
// flow. Tuvora is a GPL-3.0 fork of Nuvio adding IPTV and a sports guide; it
// runs the same API surface on its own Supabase project.
//
// The anonymous keys below are PUBLIC values shipped by each site's web app
// (not user credentials): they only grant anon-role access gated by row-level
// security, exactly like the key Nuvio embeds in its own login page.
export const PROVIDERS = {
  nuvio: {
    id: "nuvio",
    label: "Nuvio",
    backend: process.env.NUVIO_API_URL || "https://api.nuvio.tv",
    apiKey:
      process.env.NUVIO_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgxNTIxMzQ2LCJleHAiOjE5MzkyMDEzNDZ9.tmQaj682pwzehpqlgCDMnySOqiUvpgRbrE43T4VJpDI",
    loginUrl: process.env.NUVIO_LOGIN_URL || "https://nuvio.tv/tv-login",
    canBackup: true,
  },
  tuvora: {
    id: "tuvora",
    label: "Tuvora",
    backend:
      process.env.TUVORA_API_URL || "https://qsonncwknzdixurjyqap.supabase.co",
    // Public Supabase publishable key shipped by tuvora.co (new sb_publishable_
    // format, used as the anon apikey header — not a user credential).
    apiKey:
      process.env.TUVORA_ANON_KEY ||
      "sb_publishable_WNnOu03ivQUcqVCxoREBMA_L9sgl94X",
    loginUrl: process.env.TUVORA_LOGIN_URL || "https://tuvora.co/tv-login",
    // Tuvora exposes no sync_export_account_backup RPC.
    canBackup: false,
  },
};

export const providerOf = (id) => PROVIDERS[id] || PROVIDERS.nuvio;

// Back-compat single-provider exports (default to Nuvio).
export const backend = PROVIDERS.nuvio.backend;
export const apiKey = PROVIDERS.nuvio.apiKey;

export async function call(
  route,
  body,
  token,
  method = "POST",
  providerId = "nuvio",
) {
  const provider = providerOf(providerId);
  assert(provider.apiKey, `Clé d’API ${provider.label} manquante`, 500);
  const response = await fetch(provider.backend + route, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(25000),
    headers: {
      apikey: provider.apiKey,
      Authorization: `Bearer ${token || provider.apiKey}`,
      "Content-Type": "application/json",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Réponse ${provider.label} illisible`);
  }
  assert(
    response.ok,
    data?.message ||
      data?.error_description ||
      data?.error ||
      `${provider.label} : erreur ${response.status}`,
    response.status === 401 ? 401 : 502,
  );
  return data;
}
export const rpc = (name, body = {}, token, providerId = "nuvio") =>
  call("/rest/v1/rpc/" + name, body, token, "POST", providerId);

const avatarImageUrl = (storagePath, backendUrl) => {
  const value = String(storagePath || "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch {}
  const encodedPath = value
    .replace(/^\/+/, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `${backendUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/${encodedPath}`;
};

export async function avatarCatalog(token, providerId = "nuvio") {
  const rows = await rpc("get_avatar_catalog", {}, token, providerId);
  const backendUrl = providerOf(providerId).backend;
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: String(row.id || ""),
    displayName: String(row.display_name || row.displayName || "Avatar"),
    imageUrl: avatarImageUrl(row.storage_path || row.storagePath, backendUrl),
    category: String(row.category || "other"),
    bgColor: row.bg_color || row.bgColor || null,
  })).filter((avatar) => avatar.id && avatar.imageUrl);
}

const enrichProfileAvatars = (profiles, avatars) => {
  const urls = new Map(avatars.map((avatar) => [avatar.id, avatar.imageUrl]));
  return profiles.map((item) => ({
    ...item,
    avatar_image_url: item.avatar_url || urls.get(item.avatar_id) || null,
  }));
};

export async function profileList(token, providerId = "nuvio") {
  const [profiles, avatars] = await Promise.all([
    rpc("sync_pull_profiles", {}, token, providerId),
    avatarCatalog(token, providerId).catch(() => []),
  ]);
  return enrichProfileAvatars(profiles, avatars);
}

export async function profile(token, id, providerId = "nuvio") {
  const [rawProfiles, avatars] = await Promise.all([
    rpc("sync_pull_profiles", {}, token, providerId),
    avatarCatalog(token, providerId).catch(() => []),
  ]);
  const profiles = enrichProfileAvatars(rawProfiles, avatars);
  const identity = profiles.find((p) => p.profile_index === id);
  assert(identity, "Profil introuvable", 404);
  const list = (table, profileId) =>
    call(
      `/rest/v1/${table}?user_id=eq.${encodeURIComponent(identity.user_id)}&profile_id=eq.${profileId}&order=sort_order.asc`,
      null,
      token,
      "GET",
      providerId,
    );
  const blob = async (platform) =>
    (
      await rpc(
        "sync_pull_profile_settings_blob",
        { p_profile_id: id, p_platform: platform },
        token,
        providerId,
      )
    )[0] || { settings_json: {}, updated_at: null };
  const [tv, mobile, addons, plugins] = await Promise.all([
    blob("tv"),
    blob("mobile"),
    list("addons", identity.uses_primary_addons ? 1 : id),
    list("plugins", identity.uses_primary_plugins ? 1 : id),
  ]);
  return { identity, avatars, tv, mobile, addons, plugins };
}

// Tuvora-specific: IPTV playlists (Xtream / M3U / Stalker) attached to a profile.
export async function iptvPlaylists(token, id, providerId) {
  const profiles = await rpc("sync_pull_profiles", {}, token, providerId);
  const identity = profiles.find((p) => p.profile_index === id);
  assert(identity, "Profil introuvable", 404);
  const rows = await call(
    `/rest/v1/iptv_playlists?user_id=eq.${encodeURIComponent(identity.user_id)}&profile_id=eq.${id}&order=sort_order.asc`,
    null,
    token,
    "GET",
    providerId,
  );
  return Array.isArray(rows) ? rows : [];
}

// Round-trip write: the caller sends back the full playlist rows (unknown
// columns preserved), mirroring how addons/plugins are pushed.
export async function pushIptvPlaylists(token, id, playlists, providerId) {
  return rpc(
    "sync_push_iptv_playlists",
    { p_profile_id: id, p_playlists: playlists },
    token,
    providerId,
  );
}

// Tuvora-specific: followed sports leagues + teams (Sports Centre).
export async function radarFollows(token, id, providerId) {
  const profiles = await rpc("sync_pull_profiles", {}, token, providerId);
  const identity = profiles.find((p) => p.profile_index === id);
  assert(identity, "Profil introuvable", 404);
  const listOf = (table) =>
    call(
      `/rest/v1/${table}?user_id=eq.${encodeURIComponent(identity.user_id)}&profile_id=eq.${id}&order=sort_order.asc`,
      null,
      token,
      "GET",
      providerId,
    ).catch(() => []);
  const [leagues, teams] = await Promise.all([
    listOf("radar_follows"),
    listOf("radar_team_follows"),
  ]);
  return {
    leagues: Array.isArray(leagues) ? leagues : [],
    teams: Array.isArray(teams) ? teams : [],
  };
}
export async function pushRadar(token, id, leagues, teams, providerId) {
  return rpc(
    "sync_push_radar",
    { p_profile_id: id, p_follows: leagues, p_teams: teams },
    token,
    providerId,
  );
}
// Search Tuvora's sports catalogue (leagues or teams) via the radar-fixtures
// edge function, to add follows by name.
export async function radarSearch(token, kind, query, providerId) {
  const key = kind === "team" ? "team_search" : "league_search";
  const data = await call(
    "/functions/v1/radar-fixtures",
    { [key]: query },
    token,
    "POST",
    providerId,
  );
  const rows = Array.isArray(data)
    ? data
    : data?.results || data?.leagues || data?.teams || data?.data || [];
  return Array.isArray(rows) ? rows : [];
}
