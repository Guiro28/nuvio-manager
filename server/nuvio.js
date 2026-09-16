import { assert } from "./core.js";

// Public anonymous key shipped by nuvio.tv/account/login (not a user credential).
export const backend = process.env.NUVIO_API_URL || "https://api.nuvio.tv";
export const apiKey =
  process.env.NUVIO_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgxNTIxMzQ2LCJleHAiOjE5MzkyMDEzNDZ9.tmQaj682pwzehpqlgCDMnySOqiUvpgRbrE43T4VJpDI";
export async function call(route, body, token = apiKey, method = "POST") {
  const response = await fetch(backend + route, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(25000),
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Réponse Nuvio illisible");
  }
  assert(
    response.ok,
    data?.message ||
      data?.error_description ||
      data?.error ||
      `Nuvio : erreur ${response.status}`,
    response.status === 401 ? 401 : 502,
  );
  return data;
}
export const rpc = (name, body = {}, token) =>
  call("/rest/v1/rpc/" + name, body, token);

const avatarImageUrl = (storagePath) => {
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
  return `${backend.replace(/\/$/, "")}/storage/v1/object/public/avatars/${encodedPath}`;
};

export async function avatarCatalog(token) {
  const rows = await rpc("get_avatar_catalog", {}, token);
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: String(row.id || ""),
    displayName: String(row.display_name || row.displayName || "Avatar"),
    imageUrl: avatarImageUrl(row.storage_path || row.storagePath),
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

export async function profileList(token) {
  const [profiles, avatars] = await Promise.all([
    rpc("sync_pull_profiles", {}, token),
    avatarCatalog(token).catch(() => []),
  ]);
  return enrichProfileAvatars(profiles, avatars);
}

export async function profile(token, id) {
  const [rawProfiles, avatars] = await Promise.all([
    rpc("sync_pull_profiles", {}, token),
    avatarCatalog(token).catch(() => []),
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
    );
  const blob = async (platform) =>
    (
      await rpc(
        "sync_pull_profile_settings_blob",
        { p_profile_id: id, p_platform: platform },
        token,
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
