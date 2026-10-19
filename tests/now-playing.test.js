import test from "node:test";
import assert from "node:assert/strict";
import { createNowPlaying, parseContent } from "../server/now-playing.js";

const MB = 1024 * 1024;

// Small harness: a fake relay session we mutate, a fake clock and a fake Nuvio
// progress table. tick() polls asynchronously, so each step awaits a flush.
function harness({ type = "movie", contentId = "tt1160419", firstRangeStart = 0, progress = [], watched = [] } = {}) {
  let clock = 1_000_000;
  const session = {
    id: "s1",
    accountId: "acc",
    profileId: 1,
    addonName: "Torrentio",
    addonLogo: "",
    mode: "direct",
    type,
    contentId,
    release: "Dune.Part.Two.2024.2160p.WEB-DL.DV.mkv",
    source: "[RD+] 4K",
    size: 18 * 1e9,
    total: 18 * 1e9,
    startedAt: clock,
    lastRequestAt: clock,
    lastByteAt: clock,
    lastCloseAt: 0,
    lastClientCloseAt: 0,
    requests: 1,
    openConns: 1,
    bytes: 50 * MB,
    firstRangeStart,
    rate: 40e6,
    series: [],
  };
  const tables = { progress, watched };
  const engine = createNowPlaying({
    liveSessions: () => [session],
    fetchRows: async (_account, _profile, kind) => tables[kind],
    now: () => clock,
  });
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  return {
    session,
    tables,
    engine,
    advance: async (ms) => {
      clock += ms;
      engine.tick();
      await flush();
      await flush();
    },
    now: () => clock,
    item: () => engine.list()[0],
  };
}

test("stream ids map to movies, episodes and anime", () => {
  assert.deepEqual(parseContent("movie", "tt1160419"), { kind: "movie", base: "tt1160419", season: null, episode: null });
  assert.deepEqual(parseContent("series", "tt0475784:1:6"), { kind: "episode", base: "tt0475784", season: 1, episode: 6 });
  assert.deepEqual(parseContent("series", "kitsu:42:6"), { kind: "episode", base: "kitsu:42", season: null, episode: 6 });
});

test("a silent buffer stays playing; a Nuvio push without a new request is a pause", async () => {
  const h = harness();
  await h.advance(5000);
  assert.equal(h.item().state, "playing");
  assert.equal(h.item().position, 5000);
  // 10 minutes without a single byte (big buffer) and no Nuvio event → playing.
  h.session.lastByteAt = h.now();
  await h.advance(10 * 60 * 1000);
  assert.equal(h.item().state, "playing");
  // The user pauses: Nuvio receives the exact position, no new range request.
  h.tables.progress = [{ content_id: "tt1160419", video_id: "tt1160419", position: 1_200_000, duration: 9_960_000, last_watched: h.now() + 1000 }];
  await h.advance(15000);
  const paused = h.item();
  assert.equal(paused.state, "paused");
  assert.equal(paused.position, 1_200_000);
  assert.equal(paused.exact, true);
  assert.equal(paused.duration, 9_960_000);
});

test("a Nuvio push with a new range request is a seek, not a pause", async () => {
  const h = harness();
  await h.advance(15000);
  h.session.requests++; // seek → the player re-requests the media
  h.session.lastRequestAt = h.now();
  h.tables.progress = [{ content_id: "tt1160419", position: 3_000_000, duration: 9_960_000, last_watched: h.now() }];
  await h.advance(15000);
  const item = h.item();
  assert.equal(item.state, "playing");
  assert.equal(item.exact, false);
  assert.ok(item.position >= 3_000_000);
});

test("bytes coming back after a quiet pause resume playback", async () => {
  const h = harness();
  await h.advance(15000);
  h.tables.progress = [{ content_id: "tt1160419", position: 600_000, duration: 9_960_000, last_watched: h.now() }];
  await h.advance(15000);
  assert.equal(h.item().state, "paused");
  await h.advance(25000); // quiet period, buffer full while paused
  h.session.bytes += 4 * MB; // playback drained the buffer, refill starts
  h.session.lastByteAt = h.now();
  await h.advance(5000);
  assert.equal(h.item().state, "playing");
});

test("the player hanging up is a stop after the grace window, completed at ≥ 90 %", async () => {
  const h = harness();
  await h.advance(15000);
  h.session.openConns = 0;
  h.session.lastClientCloseAt = h.now();
  h.session.lastCloseAt = h.now();
  await h.advance(5000);
  assert.equal(h.item().state, "playing"); // still inside the reconnection grace window
  h.tables.progress = [{ content_id: "tt1160419", position: 9_500_000, duration: 9_960_000, last_watched: h.now() }];
  await h.advance(15000);
  assert.equal(h.item().state, "completed");
  assert.equal(h.item().rate, 0);
});

test("a stop below 90 % confirmed by Nuvio's watched list is completed", async () => {
  const h = harness({ type: "series", contentId: "tt0475784:1:6" });
  await h.advance(15000);
  h.session.openConns = 0;
  h.session.lastClientCloseAt = h.now();
  h.tables.watched = [{ content_id: "tt0475784", season: 1, episode: 6, watched_at: new Date(h.now()).toISOString() }];
  await h.advance(20000);
  assert.equal(h.item().state, "completed");
  assert.equal(h.item().kind, "episode");
  assert.equal(h.item().season, 1);
});

test("a resumed playback takes its starting point from the saved progress", async () => {
  const h = harness({
    firstRangeStart: 6e9,
    progress: [{ content_id: "tt1160419", position: 3_600_000, duration: 9_960_000, last_watched: 500_000 }],
  });
  await h.advance(15000);
  const item = h.item();
  assert.equal(item.state, "playing");
  assert.equal(item.position, 3_600_000 + 15000);
});

test("a source cut is a stop only when the player never comes back", async () => {
  const h = harness();
  await h.advance(15000);
  h.session.openConns = 0;
  h.session.lastUpstreamFailAt = h.now();
  await h.advance(30000);
  assert.equal(h.item().state, "playing"); // the player usually reconnects quickly
  await h.advance(35000);
  assert.equal(h.item().state, "stopped");
});

test("a reconnect inside the grace window is not a stop", async () => {
  const h = harness();
  await h.advance(15000);
  h.session.openConns = 0;
  h.session.lastClientCloseAt = h.now();
  await h.advance(1000);
  h.session.openConns = 1;
  h.session.requests++;
  h.session.lastRequestAt = h.now();
  await h.advance(30000);
  assert.equal(h.item().state, "playing");
});
