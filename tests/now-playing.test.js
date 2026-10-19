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
    rangeLog: [{ at: clock, start: firstRangeStart }],
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

test("a resume that reads the header first starts at the saved position, not 0", async () => {
  // Nuvio saved 1 h of a 2 h 46 film; the player reads the header (offset 0),
  // the index at the very end, then jumps ~36 % into the file.
  const h = harness({
    progress: [{ content_id: "tt1160419", position: 3_600_000, duration: 9_960_000, last_watched: 500_000 }],
  });
  const total = h.session.total;
  h.session.rangeLog.push({ at: h.now() + 300, start: total - 2e6 }); // index read at the end
  h.session.rangeLog.push({ at: h.now() + 1500, start: Math.round(total * 0.3614) }); // jump
  h.session.requests += 2;
  await h.advance(15000);
  const item = h.item();
  assert.equal(item.state, "playing");
  assert.equal(item.position, 3_600_000 + 15000 - 1500);
});

test("without saved progress a resume jump is placed from the byte offset", async () => {
  const h = harness();
  const total = h.session.total;
  h.session.rangeLog.push({ at: h.now() + 1000, start: Math.round(total * 0.5) });
  await h.advance(5000);
  assert.equal(h.item().position, null); // duration not known yet
  // First Nuvio push (a pause) gives the duration and the exact position.
  h.tables.progress = [{ content_id: "tt1160419", position: 5_000_000, duration: 9_960_000, last_watched: h.now() }];
  await h.advance(15000);
  assert.equal(h.item().state, "paused");
  assert.equal(h.item().position, 5_000_000);
});

test("the same stream reopened after a stop comes back to playing at the exit position", async () => {
  const h = harness();
  await h.advance(15000);
  h.session.openConns = 0;
  h.session.lastClientCloseAt = h.now();
  h.session.lastCloseAt = h.now();
  h.tables.progress = [{ content_id: "tt1160419", position: 2_400_000, duration: 9_960_000, last_watched: h.now() }];
  await h.advance(20000);
  assert.equal(h.item().state, "stopped");
  assert.equal(h.item().position, 2_400_000);
  // Two minutes later Nuvio reuses the last link: same session, new request.
  await h.advance(120000);
  h.session.openConns = 1;
  h.session.requests++;
  h.session.lastRequestAt = h.now();
  h.session.rangeLog.push({ at: h.now(), start: 0 }); // header first
  await h.advance(10000);
  const item = h.item();
  assert.equal(item.state, "playing");
  assert.equal(item.position, 2_400_000 + 10000);
});

test("a completed title reopened from the start plays from 0", async () => {
  const h = harness();
  await h.advance(15000);
  h.session.openConns = 0;
  h.session.lastClientCloseAt = h.now();
  h.tables.progress = [{ content_id: "tt1160419", position: 9_700_000, duration: 9_960_000, last_watched: h.now() }];
  await h.advance(20000);
  assert.equal(h.item().state, "completed");
  await h.advance(60000);
  h.session.openConns = 1;
  h.session.requests++;
  h.session.lastRequestAt = h.now();
  await h.advance(5000);
  assert.equal(h.item().state, "playing");
  assert.equal(h.item().position, 5000);
});

test("an old link without its title is identified from Nuvio's progress and resumes there", async () => {
  // Link reused after a restart: the relay doesn't know the title.
  const h = harness({
    type: "",
    contentId: "",
    progress: [
      { content_id: "tt0111161", video_id: "tt0111161", position: 1_000_000, duration: 8_520_000, last_watched: 400_000 },
      { content_id: "tt1160419", video_id: "tt1160419", position: 3_600_000, duration: 9_960_000, last_watched: 500_000 },
      { content_id: "tt0903747", video_id: "tt0903747:5:14", season: 5, episode: 14, position: 2_000_000, duration: 2_820_000, last_watched: 600_000 },
    ],
  });
  h.session.rangeLog.push({ at: h.now() + 1200, start: Math.round(h.session.total * 0.362) });
  await h.advance(5000);
  const item = h.item();
  assert.equal(item.contentId, "tt1160419");
  assert.equal(item.kind, "movie");
  assert.equal(item.position, 3_600_000 + 5000 - 1200);
  assert.equal(item.duration, 9_960_000);
});

test("no guessed 0 before Nuvio answers; a start over is 0", async () => {
  const h = harness({
    progress: [{ content_id: "tt1160419", position: 3_600_000, duration: 9_960_000, last_watched: 500_000 }],
  });
  assert.equal(h.item().position, null); // nothing known yet
  await h.advance(5000);
  assert.equal(h.item().position, 3_600_000 + 5000); // provisional: Nuvio resumes here
  await h.advance(20000); // no jump into the file after 20 s → started over from 0
  assert.equal(h.item().position, 25000);
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
