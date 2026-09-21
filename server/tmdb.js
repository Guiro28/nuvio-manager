import { assert } from "./core.js";

const API = "https://api.themoviedb.org/3";
const IMAGES = "https://image.tmdb.org/t/p";
const WEEK = 7 * 24 * 60 * 60 * 1000;
const MONTH = 30 * 24 * 60 * 60 * 1000;

function auth(key, url) {
  const value = String(key || "").trim();
  assert(value, "Aucune clé TMDB configurée");
  if (/^[a-f0-9]{32}$/i.test(value)) url.searchParams.set("api_key", value);
  else return { Authorization: `Bearer ${value}` };
  return {};
}

async function request(path, key, fetchImpl) {
  const url = new URL(API + path);
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", ...auth(key, url) },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = new Error(
      response.status === 401 || response.status === 403
        ? "Clé ou jeton TMDB invalide"
        : `TMDB indisponible (erreur ${response.status})`,
    );
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function genreMap(type, key, cache, fetchImpl, language) {
  const genreKey = `${language}:${type}`;
  const cached = cache.genres?.[genreKey];
  if (cached?.expiresAt > Date.now()) return cached.values;
  const data = await request(`/genre/${type}/list?language=${encodeURIComponent(language)}`, key, fetchImpl);
  const values = Object.fromEntries(
    (data.genres || []).map((genre) => [genre.id, genre.name]),
  );
  cache.genres ??= {};
  cache.genres[genreKey] = { expiresAt: Date.now() + MONTH, values };
  return values;
}

function selectResult(data, contentType) {
  const expected = contentType === "movie" ? data.movie_results : data.tv_results;
  return expected?.[0] || data.movie_results?.[0] || data.tv_results?.[0] || null;
}

async function lookup(row, key, cache, fetchImpl, language) {
  if (!/^tt\d+$/i.test(row.content_id || "")) return null;
  const cacheKey = `${language}:${row.content_type}:${row.content_id.toLowerCase()}`;
  const cached = cache.entries?.[cacheKey];
  if (cached?.expiresAt > Date.now()) return cached.value;
  const data = await request(
    `/find/${encodeURIComponent(row.content_id)}?external_source=imdb_id&language=${encodeURIComponent(language)}`,
    key,
    fetchImpl,
  );
  const result = selectResult(data, row.content_type);
  let value = null;
  if (result) {
    const type = result.media_type === "movie" || result.title ? "movie" : "tv";
    const genres = await genreMap(type, key, cache, fetchImpl, language);
    value = {
      id: result.id,
      type,
      title: result.title || result.name || result.original_title || result.original_name,
      originalTitle: result.original_title || result.original_name || "",
      overview: result.overview || "",
      year: String(result.release_date || result.first_air_date || "").slice(0, 4),
      rating: Number.isFinite(result.vote_average)
        ? Math.round(result.vote_average * 10) / 10
        : null,
      genres: (result.genre_ids || []).map((id) => genres[id]).filter(Boolean),
      poster: result.poster_path ? `${IMAGES}/w342${result.poster_path}` : null,
      backdrop: result.backdrop_path ? `${IMAGES}/w780${result.backdrop_path}` : null,
      url: `https://www.themoviedb.org/${type === "movie" ? "movie" : "tv"}/${result.id}`,
    };
  }
  cache.entries ??= {};
  cache.entries[cacheKey] = {
    expiresAt: Date.now() + (value ? WEEK : 24 * 60 * 60 * 1000),
    value,
  };
  return value;
}

export async function enrichActivity(
  result,
  { key, cache = {}, persist = () => {}, fetchImpl = fetch, language = "fr-FR" } = {},
) {
  if (!String(key || "").trim())
    return { ...result, tmdb: { configured: false }, items: result.items };
  cache.version ??= 1;
  cache.entries ??= {};
  const unique = [
    ...new Map(
      result.items.map((row) => [
        `${row.content_type}:${row.content_id}`,
        row,
      ]),
    ).values(),
  ];
  const found = new Map();
  let cursor = 0,
    fatal;
  async function worker() {
    while (!fatal && cursor < unique.length) {
      const row = unique[cursor++];
      try {
        found.set(
          `${row.content_type}:${row.content_id}`,
          await lookup(row, key, cache, fetchImpl, language),
        );
      } catch (error) {
        fatal = error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, unique.length) }, worker));
  if (!fatal) persist(cache);
  return {
    ...result,
    tmdb: fatal
      ? { configured: true, error: fatal.message }
      : { configured: true, enriched: [...found.values()].filter(Boolean).length },
    items: result.items.map((row) => ({
      ...row,
      metadata: found.get(`${row.content_type}:${row.content_id}`) || null,
    })),
  };
}
