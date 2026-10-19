// "Lecture en cours": live playback state built from two sources only.
//
// - The relay (integrated proxy) sees the media bytes of every proxied stream:
//   a session starts with the first real /play transfer, bytes keep flowing while
//   the player fills its buffer, and the player hangs up when it leaves.
// - Nuvio's cloud progress (watch_progress) is pushed by the app right away on
//   pause, seek, player exit and completion — never periodically during playback.
//
// Rules (see the study in the project history):
// - No Nuvio event since the start → still playing, even with no bytes for
//   minutes (the player is draining a large buffer).
// - Nuvio update + a new range request since the previous poll → seek, still
//   playing. Nuvio update without a new request → paused at that exact position.
// - After a pause: bytes coming back after a quiet period, a long continuous flow
//   or a new request → playing again (detection can lag behind the real resume).
// - The player hung up and did not reconnect within a grace window → stopped
//   (completed when Nuvio shows ≥ 90 % or marks the title watched).
// - The source dropped the transfer and the player did not reconnect within 60 s
//   → stopped. Safety nets: no bytes for 15 min while "playing", or paused for
//   3 h → stopped.
//
// Nuvio is only queried for profiles that have a live session (every 15 s), plus
// confirmation reads right after a stop. Positions are in milliseconds.

const TICK_MS = 5000;
const POLL_MS = 15000;
const STOP_GRACE_MS = 15000;
const UPSTREAM_FAIL_MS = 60000;
const CONFIRM_DELAYS_MS = [0, 15000];
const LOST_PLAYING_MS = 15 * 60 * 1000;
const LOST_PAUSED_MS = 3 * 3600 * 1000;
const SHOW_STOPPED_MS = 5 * 60 * 1000;
const RESUME_QUIET_MS = 20000;
const RESUME_BYTES = 1024 * 1024;
const RESUME_FLOW_MS = 90000;
const RESUME_FLOW_BYTES = 8 * 1024 * 1024;
const COMPLETE_RATIO = 0.9;
const FRESH_START_BYTES = 5 * 1024 * 1024;

const time = (value) => {
  const number = Number(value);
  if (Number.isFinite(number) && number > 0) return number;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Stremio ids: movie "tt123", episode "tt123:1:6" / "tmdb:42:1:6", anime "kitsu:42:6".
export function parseContent(type, id) {
  const value = String(id || "");
  const parts = value.split(":");
  const numeric = (v) => /^\d+$/.test(v ?? "");
  if (type === "movie" || parts.length === 1) return { kind: "movie", base: value, season: null, episode: null };
  if (parts[0] === "kitsu" && parts.length >= 3 && numeric(parts.at(-1)))
    return { kind: "episode", base: parts.slice(0, -1).join(":"), season: null, episode: Number(parts.at(-1)) };
  if (parts.length >= 3 && numeric(parts.at(-1)) && numeric(parts.at(-2)))
    return {
      kind: "episode",
      base: parts.slice(0, -2).join(":"),
      season: Number(parts.at(-2)),
      episode: Number(parts.at(-1)),
    };
  return { kind: type === "series" ? "episode" : "movie", base: value, season: null, episode: null };
}

const matches = (row, session, content) =>
  (row.video_id && String(row.video_id) === session.contentId) ||
  (String(row.content_id) === content.base &&
    (content.kind === "movie" ||
      (content.season == null || Number(row.season) === content.season) &&
        Number(row.episode) === content.episode));

const latestMatch = (rows, session, content, field) =>
  (rows || [])
    .filter((row) => matches(row, session, content))
    .sort((a, b) => time(b[field]) - time(a[field]))[0] || null;

export function createNowPlaying({ liveSessions, fetchRows, log, now = () => Date.now() }) {
  const tracks = new Map(); // session id -> track
  const inFlight = new Set(); // refs being polled
  let timer = null;

  const ensureTrack = (s) => {
    let track = tracks.get(s.id);
    if (!track) {
      // A playback starting at the head of the file starts at 0; a resume
      // (range far into the file) gets its anchor from Nuvio's saved progress.
      const fresh = (s.firstRangeStart || 0) <= FRESH_START_BYTES ||
        (s.total > 0 && s.firstRangeStart / s.total < 0.01);
      track = {
        state: "playing",
        anchorPos: fresh ? 0 : null,
        anchorAt: s.startedAt,
        fromNuvio: false,
        duration: 0,
        baselineDone: false,
        nuvioLastWatched: 0,
        polledAt: 0,
        pollRequests: s.requests,
        pausedAt: 0,
        pausedBytes: 0,
        pausedRequests: 0,
        quietBytes: null,
        stoppedAt: 0,
        stopReason: "",
        confirmAt: [],
      };
      tracks.set(s.id, track);
    }
    return track;
  };

  const positionAt = (track, s, at) => {
    let anchor = track.anchorPos;
    let anchorAt = track.anchorAt;
    // Resumed playback without saved progress: place it from the byte offset
    // once the duration is known (first Nuvio push).
    if (anchor == null && track.duration > 0 && s.total > 0 && s.firstRangeStart > 0) {
      anchor = (s.firstRangeStart / s.total) * track.duration;
      anchorAt = s.startedAt;
    }
    if (anchor == null) return null;
    const position = anchor + (track.state === "playing" ? Math.max(0, at - anchorAt) : 0);
    return Math.round(track.duration > 0 ? Math.min(position, track.duration) : position);
  };

  const stop = (track, s, at, reason) => {
    const position = positionAt(track, s, at);
    if (position != null) track.anchorPos = position;
    track.anchorAt = at;
    track.state = "stopped";
    track.stoppedAt = at;
    track.stopReason = reason;
    const t = now();
    track.confirmAt = CONFIRM_DELAYS_MS.map((delay) => t + delay);
    log?.info?.("lecture", "lecture arrêtée", { session: s.id, reason, ref: `${s.accountId}:${s.profileId}` });
  };

  const resume = (track, s, reason) => {
    track.state = "playing";
    track.anchorAt = now();
    track.quietBytes = null;
    log?.debug?.("lecture", "reprise détectée", { session: s.id, reason });
  };

  // Relay-only transitions (no network).
  const step = (s, track) => {
    const t = now();
    if (track.state === "playing" || track.state === "paused") {
      if (
        s.openConns === 0 &&
        s.lastClientCloseAt &&
        s.lastClientCloseAt >= s.lastRequestAt &&
        t - s.lastClientCloseAt >= STOP_GRACE_MS
      )
        return stop(track, s, s.lastClientCloseAt, "closed");
      // The source dropped the transfer and the player never came back.
      if (
        s.openConns === 0 &&
        s.lastUpstreamFailAt &&
        s.lastUpstreamFailAt >= s.lastRequestAt &&
        t - s.lastUpstreamFailAt >= UPSTREAM_FAIL_MS
      )
        return stop(track, s, s.lastUpstreamFailAt, "upstream");
      if (track.state === "playing" && t - Math.max(s.lastByteAt, s.lastRequestAt) >= LOST_PLAYING_MS)
        return stop(track, s, Math.max(s.lastByteAt, s.lastRequestAt), "lost");
      if (track.state === "paused" && t - track.pausedAt >= LOST_PAUSED_MS)
        return stop(track, s, t, "lost");
    }
    if (track.state === "paused") {
      if (s.requests > track.pausedRequests) return resume(track, s, "request");
      if (t - s.lastByteAt >= RESUME_QUIET_MS) track.quietBytes ??= s.bytes;
      if (track.quietBytes != null && s.bytes - track.quietBytes >= RESUME_BYTES) return resume(track, s, "bytes");
      if (
        track.quietBytes == null &&
        t - track.pausedAt >= RESUME_FLOW_MS &&
        s.bytes - track.pausedBytes >= RESUME_FLOW_BYTES &&
        t - s.lastByteAt < TICK_MS
      )
        return resume(track, s, "flow");
    }
  };

  // Apply one Nuvio progress read to a session.
  const applyProgress = (s, track, rows) => {
    const t = now();
    const previousPoll = track.polledAt;
    track.polledAt = t;
    const newRequests = s.requests - track.pollRequests;
    track.pollRequests = s.requests;
    if (!s.contentId) return;
    const content = parseContent(s.type, s.contentId);
    const row = latestMatch(rows, s, content, "last_watched");
    if (!row) return;
    const lastWatched = time(row.last_watched);
    const position = Number(row.position) || 0;
    const duration = Number(row.duration) || 0;
    if (duration > 0) track.duration = duration;
    if (!track.baselineDone) {
      track.baselineDone = true;
      // Progress saved before this session = the resume point, not an event.
      if (lastWatched < s.startedAt - 5000) {
        track.nuvioLastWatched = lastWatched;
        if (track.anchorPos == null) {
          track.anchorPos = position;
          track.anchorAt = s.startedAt;
          track.fromNuvio = true;
        }
        return;
      }
    }
    if (lastWatched <= track.nuvioLastWatched) return;
    track.nuvioLastWatched = lastWatched;
    // The push happened between the previous poll and now; the device clock is
    // trusted only inside that window.
    const at = Math.min(t, Math.max(previousPoll || s.startedAt, lastWatched));
    track.anchorPos = position;
    track.anchorAt = track.state === "stopped" || track.state === "completed" ? track.stoppedAt : at;
    track.fromNuvio = true;
    if (track.state === "stopped" || track.state === "completed") return;
    if (newRequests > 0) {
      track.state = "playing"; // seek: the player re-requested the media
      return;
    }
    track.state = "paused";
    track.pausedAt = at;
    track.pausedBytes = s.bytes;
    track.pausedRequests = s.requests;
    track.quietBytes = null;
    log?.debug?.("lecture", "pause détectée", { session: s.id, position });
  };

  const checkCompleted = (s, track, watchedRows) => {
    if (track.state !== "stopped") return;
    const pos = track.anchorPos;
    if (track.duration > 0 && pos != null && pos / track.duration >= COMPLETE_RATIO) {
      track.state = "completed";
      return;
    }
    if (!s.contentId || !watchedRows) return;
    const content = parseContent(s.type, s.contentId);
    const row = latestMatch(watchedRows, s, content, "watched_at");
    if (row && time(row.watched_at) >= s.startedAt - 60000) track.state = "completed";
  };

  async function poll(ref, accountId, profileId, entries) {
    if (inFlight.has(ref)) return;
    inFlight.add(ref);
    try {
      const rows = await fetchRows(accountId, profileId, "progress");
      for (const { s, track } of entries) applyProgress(s, track, rows);
      const stopped = entries.filter(({ track }) => track.state === "stopped");
      if (stopped.length) {
        let watched = null;
        try {
          watched = await fetchRows(accountId, profileId, "watched");
        } catch {}
        for (const { s, track } of stopped) checkCompleted(s, track, watched);
      }
    } catch (error) {
      log?.debug?.("lecture", "lecture de la progression Nuvio échouée", { ref, error: error.message });
    } finally {
      inFlight.delete(ref);
    }
  }

  function tick() {
    const t = now();
    const list = liveSessions();
    const live = new Set(list.map((s) => s.id));
    for (const id of tracks.keys()) if (!live.has(id)) tracks.delete(id);
    const due = new Map(); // ref -> { accountId, profileId, entries }
    for (const s of list) {
      const track = ensureTrack(s);
      step(s, track);
      let isDue = false;
      if (track.state === "playing" || track.state === "paused") isDue = t - track.polledAt >= POLL_MS;
      else if (track.state === "stopped" && track.confirmAt.length && track.confirmAt[0] <= t) {
        track.confirmAt.shift();
        isDue = true;
      }
      if (!isDue) continue;
      const ref = `${s.accountId}:${s.profileId}`;
      if (!due.has(ref)) due.set(ref, { accountId: s.accountId, profileId: s.profileId, entries: [] });
      due.get(ref).entries.push({ s, track });
    }
    for (const [ref, job] of due) poll(ref, job.accountId, job.profileId, job.entries);
  }

  function list() {
    const t = now();
    const sessions = liveSessions();
    const items = [];
    for (const s of sessions) {
      const track = ensureTrack(s);
      const ended = track.state === "stopped" || track.state === "completed";
      if (ended && t - track.stoppedAt > SHOW_STOPPED_MS) continue;
      // A newer playback on the same profile replaces an ended one.
      if (
        ended &&
        sessions.some(
          (other) => other !== s && other.accountId === s.accountId && other.profileId === s.profileId && other.startedAt > s.startedAt,
        )
      )
        continue;
      const content = parseContent(s.type, s.contentId);
      items.push({
        id: s.id,
        ref: `${s.accountId}:${s.profileId}`,
        accountId: s.accountId,
        profileId: s.profileId,
        addonName: s.addonName,
        addonLogo: s.addonLogo,
        mode: s.mode,
        kind: content.kind,
        contentId: content.base,
        season: content.season,
        episode: content.episode,
        release: s.release,
        source: s.source,
        size: s.size || s.total || 0,
        state: track.state,
        exact: track.fromNuvio && track.state !== "playing",
        position: positionAt(track, s, ended ? track.stoppedAt : t),
        duration: track.duration || 0,
        startedAt: s.startedAt,
        stoppedAt: track.stoppedAt || 0,
        rate: ended ? 0 : s.rate,
        transferred: s.bytes,
        series: s.series,
      });
    }
    const rank = { playing: 0, paused: 1, stopped: 2, completed: 2 };
    return items.sort((a, b) => rank[a.state] - rank[b.state] || b.startedAt - a.startedAt);
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(tick, TICK_MS);
      timer.unref?.();
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    tick,
    list,
  };
}
