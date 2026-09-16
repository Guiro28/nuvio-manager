import test from "node:test";
import assert from "node:assert/strict";
import { startTrakt, pollTrakt, startSimkl, pollSimkl, traktHistory, simklHistory } from "../server/trackers.js";

const reply = (data, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(data),
  headers: new Headers(headers),
});

test("Trakt device flow creates a code and handles pending authorization", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url: String(url), body: options.body });
    return requests.length === 1
      ? reply({ device_code: "device", user_code: "CODE1234", verification_url: "https://trakt.tv/activate", interval: 5, expires_in: 600 })
      : reply({ error: "authorization_pending" }, 400);
  };
  const config = { clientId: "client", clientSecret: "secret" };
  const pairing = await startTrakt(config, fetchImpl);
  assert.equal(pairing.userCode, "CODE1234");
  assert.equal(JSON.parse(requests[0].body).client_id, "client");
  assert.equal((await pollTrakt(pairing, config, fetchImpl)).status, "pending");
});

test("Trakt history follows pagination and normalizes movies and episodes", async () => {
  let page = 0;
  const fetchImpl = async (url, options) => {
    page++;
    assert.equal(options.headers["trakt-api-key"], "client");
    return page === 1
      ? reply([{ watched_at: "2026-09-10T10:00:00Z", movie: { title: "Film", runtime: 110, ids: { imdb: "tt1" } } }], 200, { "x-pagination-page-count": "2" })
      : reply([{ watched_at: "2026-09-11T10:00:00Z", episode: { season: 2, number: 3, title: "Episode", runtime: 48 }, show: { title: "Série", ids: { imdb: "tt2" } } }], 200, { "x-pagination-page-count": "2" });
  };
  const result = await traktHistory({ accessToken: "token", refreshToken: "refresh", createdAt: Date.now(), expiresIn: 600000 }, { clientId: "client", clientSecret: "secret" }, fetchImpl);
  assert.equal(result.events.length, 2);
  assert.deepEqual(result.events.map((event) => [event.contentId, event.kind]), [["tt1", "movie"], ["tt2", "episode"]]);
  assert.equal(result.events[1].episode, 3);
  assert.deepEqual(result.events.map((event) => event.durationMinutes), [110, 48]);
});

test("Simkl PIN and history normalize detailed episode timestamps", async () => {
  let call = 0;
  const authFetch = async () => ++call === 1
    ? reply({ user_code: "12345", verification_url: "https://simkl.com/pin", expires_in: 600, interval: 5 })
    : reply({ result: "OK", access_token: "token" });
  const pairing = await startSimkl({ clientId: "client" }, authFetch);
  assert.equal((await pollSimkl(pairing, { clientId: "client" }, authFetch)).status, "connected");
  let historyCalls = 0;
  const historyFetch = async (url, options) => {
    historyCalls++;
    assert.equal(options.headers["simkl-api-key"], "client");
    assert.equal(url.searchParams.get("client_id"), "client");
    assert.equal(url.searchParams.get("include_all_episodes"), "yes");
    if (url.pathname.endsWith("/movies")) return reply({ movies: [
      { status: "completed", last_watched: "2026-09-01T00:00:00Z", movie: { title: "Film", runtime: "120 min", ids: { imdb: "tt10" } } },
      { status: "plantowatch", movie: { title: "Plus tard", ids: { imdb: "tt11" } } },
    ] });
    if (url.pathname.endsWith("/shows")) return reply({ shows: [
      { status: "completed", show: { title: "Série", runtime: 46, ids: { imdb: "tt20" } }, seasons: [{ number: 1, episodes: [{ number: 2, watched_at: "2026-09-02T00:00:00Z" }] }] },
    ] });
    return reply({ anime: [] });
  };
  const result = await simklHistory({ accessToken: "token" }, { clientId: "client" }, historyFetch);
  assert.equal(historyCalls, 3);
  assert.equal(result.events.length, 2);
  assert.equal(result.events[1].contentId, "tt20");
  assert.equal(result.events[1].episode, 2);
  assert.deepEqual(result.events.map((event) => event.durationMinutes), [120, 46]);
});
