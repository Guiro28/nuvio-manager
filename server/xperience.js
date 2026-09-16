import { assert } from "./core.js";
import fs from "node:fs";

export const XPERIENCE_AVATARS_URL = "https://xperience-app.com/api/avatars";
const cacheDuration = 5 * 60 * 1000;
let cache;
let fallbackCache;

const cleanUrl = (value) => {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.hostname !== "cdn.xperience-app.com")
      return null;
    return url.href;
  } catch {
    return null;
  }
};

export function normalizeXperienceAvatars(payload) {
  const rows = Array.isArray(payload?.avatars) ? payload.avatars : [];
  return rows
    .slice(0, 5000)
    .map((row, index) => ({
      id: String(row?.id || row?.slug || `avatar-${index}`),
      name: String(row?.name || row?.slug || "Avatar").slice(0, 160),
      url: cleanUrl(row?.url),
      category: String(row?.category || "Sans catégorie").trim().slice(0, 100) || "Sans catégorie",
      source: String(row?.source || "xperience").slice(0, 80),
      sortOrder: Number.isFinite(Number(row?.sort_order)) ? Number(row.sort_order) : index,
    }))
    .filter((avatar) => avatar.url)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

const catalogueResult = (avatars, extra = {}) => ({
  avatars,
  categories: [...new Set(avatars.map((avatar) => avatar.category))]
    .sort((left, right) => left.localeCompare(right, "fr", { numeric: true, sensitivity: "base" })),
  sourceUrl: "https://xperience-app.com/avatars",
  ...extra,
});

const fallbackCatalogue = () => {
  if (!fallbackCache) {
    const payload = JSON.parse(
      fs.readFileSync(new URL("./xperience-avatars.json", import.meta.url), "utf8"),
    );
    const avatars = normalizeXperienceAvatars(payload);
    assert(avatars.length, "Le catalogue Xperience de secours est vide", 502);
    fallbackCache = catalogueResult(avatars, {
      fetchedAt: null,
      stale: true,
      fallback: true,
    });
  }
  return fallbackCache;
};

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export async function getXperienceAvatars(fetchImpl = fetch, now = Date.now()) {
  if (cache?.expiresAt > now) return { ...cache.value, cached: true };
  try {
    let payload,
      lastError;
    for (const delay of [0, 300, 900]) {
      if (delay) await wait(delay);
      try {
        const response = await fetchImpl(XPERIENCE_AVATARS_URL, {
          headers: { Accept: "application/json", "User-Agent": "Nuvio-Manager/0.1" },
          redirect: "error",
          signal: AbortSignal.timeout(25000),
        });
        assert(response.ok, `Xperience : erreur ${response.status}`, 502);
        payload = await response.json();
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!payload) throw lastError || new Error("Xperience est indisponible");
    const avatars = normalizeXperienceAvatars(payload);
    assert(avatars.length, "Le catalogue Xperience est vide", 502);
    const value = catalogueResult(avatars, {
      fetchedAt: new Date(now).toISOString(),
      stale: false,
      fallback: false,
    });
    cache = { value, expiresAt: now + cacheDuration };
    return value;
  } catch (error) {
    if (cache?.value) return { ...cache.value, stale: true, cached: true };
    return fallbackCatalogue();
  }
}
