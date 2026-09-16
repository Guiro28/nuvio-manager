import test from "node:test";
import assert from "node:assert/strict";
import { enrichActivity } from "../server/tmdb.js";

const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

test("TMDB enriches duplicate IMDb series once and keeps French metadata", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), authorization: options.headers.Authorization });
    if (url.pathname.includes("/find/"))
      return response({
        movie_results: [],
        tv_results: [{
          id: 42,
          name: "Série française",
          original_name: "Original show",
          overview: "Résumé en français.",
          first_air_date: "2024-02-03",
          vote_average: 8.26,
          genre_ids: [18],
          poster_path: "/poster.jpg",
          backdrop_path: "/backdrop.jpg",
        }],
      });
    return response({ genres: [{ id: 18, name: "Drame" }] });
  };
  let saved = 0;
  const result = await enrichActivity(
    { items: [
      { content_id: "tt1234567", content_type: "series", episode: 1 },
      { content_id: "tt1234567", content_type: "series", episode: 2 },
    ] },
    { key: "header-token", cache: {}, persist: () => saved++, fetchImpl },
  );
  assert.equal(calls.filter((x) => x.url.includes("/find/")).length, 1);
  assert.equal(calls.filter((x) => x.url.includes("/genre/tv/list")).length, 1);
  assert.ok(calls.every((x) => x.authorization === "Bearer header-token"));
  assert.equal(result.items[0].metadata.title, "Série française");
  assert.equal(result.items[0].metadata.rating, 8.3);
  assert.deepEqual(result.items[0].metadata.genres, ["Drame"]);
  assert.equal(result.items[1].metadata.poster, "https://image.tmdb.org/t/p/w342/poster.jpg");
  assert.equal(saved, 1);
});

test("TMDB v3 keys stay server-side and cached values avoid new calls", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    if (url.pathname.includes("/find/"))
      return response({ movie_results: [{ id: 7, title: "Film", genre_ids: [] }], tv_results: [] });
    return response({ genres: [] });
  };
  const cache = {};
  const input = { items: [{ content_id: "tt7654321", content_type: "movie" }] };
  const first = await enrichActivity(input, { key: "0123456789abcdef0123456789abcdef", cache, fetchImpl });
  const count = urls.length;
  const second = await enrichActivity(input, { key: "0123456789abcdef0123456789abcdef", cache, fetchImpl });
  assert.ok(urls.every((url) => url.includes("api_key=0123456789abcdef0123456789abcdef")));
  assert.equal(urls.length, count);
  assert.equal(first.items[0].metadata.title, "Film");
  assert.equal(second.items[0].metadata.url, "https://www.themoviedb.org/movie/7");
  assert.equal(JSON.stringify(first).includes("0123456789abcdef"), false);
});

test("missing or invalid TMDB credentials never block Nuvio activity", async () => {
  const input = { items: [{ content_id: "tt1", content_type: "movie" }] };
  let called = false;
  const plain = await enrichActivity(input, { fetchImpl: async () => { called = true; } });
  assert.equal(called, false);
  assert.equal(plain.tmdb.configured, false);
  const invalid = await enrichActivity(input, {
    key: "invalid",
    fetchImpl: async () => response({}, 401),
  });
  assert.equal(invalid.tmdb.error, "Clé ou jeton TMDB invalide");
  assert.equal(invalid.items[0].metadata, null);
});
