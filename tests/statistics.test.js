import test from "node:test";
import assert from "node:assert/strict";
import { summarizeStatistics } from "../server/statistics.js";

test("statistics compare profiles, sources, activity and shared titles", () => {
  const now = Date.UTC(2026, 8, 14, 12);
  const profiles = [
    {
      ref: "a:1", accountName: "Maison", profileName: "Alice", sources: ["nuvio", "trakt"],
      events: [
        { source: "nuvio", contentId: "tt1", title: "Film", kind: "movie", at: now - 1000 },
        { source: "trakt", contentId: "tt2", title: "Série", kind: "episode", season: 1, episode: 1, durationMinutes: 50, at: now - 2000 },
      ],
      progress: [{ contentId: "tt1", position: 7_200_000, duration: 7_200_000, at: now - 1000 }],
    },
    {
      ref: "a:2", accountName: "Maison", profileName: "Bob", sources: ["nuvio", "simkl"],
      events: [
        { source: "nuvio", contentId: "tt1", title: "Film", kind: "movie", at: now - 3000 },
        { source: "simkl", contentId: "tt3", title: "Anime", kind: "episode", season: 1, episode: 2, durationMinutes: 25, at: now - 4000 },
      ],
      progress: [],
    },
  ];
  const result = summarizeStatistics(profiles, 30, now);
  assert.deepEqual(result.totals, { profiles: 2, plays: 4, uniqueTitles: 3, trackedMinutes: 195 });
  assert.equal(result.profiles[0].movies, 1);
  assert.equal(result.profiles[0].episodes, 1);
  assert.deepEqual(result.overlap, [{ left: "a:1", right: "a:2", common: 1, similarity: 33 }]);
  assert.equal(result.top[0].contentId, "tt1");
  assert.equal(result.top[0].profiles, 2);
  assert.deepEqual(result.top[0].sources, ["nuvio"]);
  assert.deepEqual(result.top[0].profileDetails, [
    { ref: "a:1", profileName: "Alice", plays: 1 },
    { ref: "a:2", profileName: "Bob", plays: 1 },
  ]);
  assert.equal(result.rankings.watchedSeries[0].seasonCount, 1);
  assert.equal(result.rankings.watchedSeries[0].episodeCount, 1);
  assert.equal(result.recent[0].profileName, "Alice");
  assert.equal(result.timeline.at(-1).count, 4);
  assert.equal(result.timeline.at(-1).movies, 2);
  assert.equal(result.timeline.at(-1).series, 2);
  assert.equal(result.rankings.watchedMovies[0].contentId, "tt1");
  assert.equal(result.rankings.watchedSeries.length, 2);
  assert.deepEqual(result.sources.map((row) => row.source).sort(), ["nuvio", "simkl", "trakt"]);
});

test("statistics period excludes older events, accepts custom ranges and rejects invalid ones", () => {
  const now = Date.UTC(2026, 8, 14);
  const profile = { ref: "a:1", accountName: "A", profileName: "P", sources: ["nuvio"], events: [{ source: "nuvio", contentId: "old", kind: "movie", at: now - 31 * 86400000 }], progress: [] };
  assert.equal(summarizeStatistics([profile], 30, now).totals.plays, 0);
  assert.equal(summarizeStatistics([profile], 0, now).totals.plays, 1);
  // A custom day count is now valid; the 31-day-old event stays out of a 7-day window.
  assert.equal(summarizeStatistics([profile], 7, now).totals.plays, 0);
  assert.equal(summarizeStatistics([profile], 45, now).totals.plays, 1);
  // Non-integer, negative and out-of-range windows are still rejected.
  assert.throws(() => summarizeStatistics([], 1.5, now), /Période invalide/);
  assert.throws(() => summarizeStatistics([], -1, now), /Période invalide/);
  assert.throws(() => summarizeStatistics([], 5000, now), /Période invalide/);
});
