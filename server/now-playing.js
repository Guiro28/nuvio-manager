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
// - After a pause: a paused player never reloads once its buffer is full, so any
//   burst of bytes after a silence (or a new request) means playback resumed.
//   Nuvio pushes nothing on resume and the player only reloads once its buffer
//   drained, so the resume time is moved back by this player's usual silence
//   between bursts while it was playing.
// - The player hung up and did not reconnect within a grace window → stopped
//   (completed when Nuvio shows ≥ 90 % or marks the title watched). A source cut
//   is not a stop: the player reconnects when it needs data.
// - Safety nets: no bytes for 15 min while "playing", or paused for 3 h → stopped.
//
// Nuvio is only queried for profiles that have a live session (every 15 s), plus
// confirmation reads right after a stop. Positions are in milliseconds.

const TICK_MS = 5000;
const POLL_MS = 15000;
const STOP_GRACE_MS = 15000;
const CONFIRM_DELAYS_MS = [0, 15000];
const LOST_PLAYING_MS = 15 * 60 * 1000;
const LOST_PAUSED_MS = 3 * 3600 * 1000;
const SHOW_STOPPED_MS = 5 * 60 * 1000;
// Silences used to learn the player's buffer-drain time: only those during
// steady playback (not the initial buffering), the last few, median.
const DRAIN_SKIP_START_MS = 30000;
const DRAIN_SAMPLES = 5;
const COMPLETE_RATIO = 0.9;
// No Nuvio answer this long after the start (network, unknown title): assume 0.
const START_GUESS_MS = 20000;
// Inferring the title of a link that doesn't carry it: the saved progress
// position must match the jump offset within 3 % of the duration.
const INFER_MATCH_RATIO = 0.03;
// Start of a playback: players first read the file header (offset 0) and the
// index at the very end (MKV cues / MP4 moov), then jump to the resume point.
// A request inside the file during the first 90 s is that jump.
const START_WINDOW_MS = 90000;
const JUMP_MIN_RATIO = 0.01;
const JUMP_MAX_RATIO = 0.98;
// Saved progress and byte offset agree within 10 % of the duration → trust the
// exact saved position.
const RESUME_MATCH_RATIO = 0.1;

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
      // The start position stays unknown until placeStart settles it (Nuvio's
      // saved progress and/or the jump into the file) — never a guessed 0.
      track = {
        state: "playing",
        anchorPos: null,
        anchorAt: s.startedAt,
        content: null, // { type, id } inferred from Nuvio for links without one
        nuvioChecked: false, // Nuvio progress read at least once for this playback
        offsetRatio: null, // byte offset of the resume jump / file size
        startFrom: s.startedAt, // start window: [startFrom, startUntil]
        startUntil: s.startedAt + START_WINDOW_MS,
        saved: null, // Nuvio progress saved before this playback { position, duration }
        eventSeen: false, // a Nuvio push happened during this playback
        fromNuvio: false,
        duration: 0,
        baselineDone: false,
        nuvioLastWatched: 0,
        polledAt: 0,
        pollRequests: s.requests,
        pausedAt: 0,
        pausedRequests: 0,
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
    // Resumed playback without saved progress: place it from the byte offset
    // once the duration is known (first Nuvio push).
    if (anchor == null && track.duration > 0 && track.offsetRatio != null) anchor = track.offsetRatio * track.duration;
    const anchorAt = track.anchorAt;
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

  // How long this player stays silent between two bursts while playing — the
  // time it takes to drain its buffer down to its reload threshold (median of
  // the last silences of steady playback before the pause, 0 if none seen).
  const drainTime = (s, track) => {
    const silences = (s.gaps || [])
      .filter((g) => g.start >= s.startedAt + DRAIN_SKIP_START_MS && g.end <= track.pausedAt)
      .slice(-DRAIN_SAMPLES)
      .map((g) => g.end - g.start)
      .sort((a, b) => a - b);
    return silences.length ? silences[Math.floor(silences.length / 2)] : 0;
  };

  // Playback resumed; seenAt = when the relay saw the player reload. The player
  // only reloads once its buffer drained, so the real resume was about one usual
  // silence earlier (never before the pause).
  const resume = (track, s, reason, seenAt) => {
    track.state = "playing";
    track.anchorAt = Math.max(track.pausedAt, Math.min(now(), seenAt) - drainTime(s, track));
    log?.debug?.("lecture", "reprise détectée", { session: s.id, reason });
  };

  // Where did this playback start? Until Nuvio reports an event, the latest jump
  // into the file during the start window is the resume point: its exact
  // position comes from the progress Nuvio saved before (when the byte offset
  // agrees), else from the offset itself.
  const placeStart = (s, track, t) => {
    if (track.eventSeen || t > track.startUntil) return;
    const jump = s.total > 0
      ? [...(s.rangeLog || [])]
        .reverse()
        .find((r) => r.at >= track.startFrom && r.start / s.total > JUMP_MIN_RATIO && r.start / s.total < JUMP_MAX_RATIO)
      : null;
    // Re-evaluated every tick of the window (idempotent): the saved progress may
    // only arrive with the first Nuvio read, after the jump was seen.
    if (!jump) {
      // No jump (yet): once Nuvio has answered, an unfinished saved progress is
      // where Nuvio resumes (a later jump confirms it); none means a start at 0.
      // Without any Nuvio answer after a while, fall back to 0 as well.
      // A resume jumps within seconds, so no jump after a while means the
      // playback really started from 0 ("start over").
      if (track.nuvioChecked || t - track.startFrom >= START_GUESS_MS) {
        const resumed = Boolean(track.saved) && t - track.startFrom < START_GUESS_MS;
        track.anchorPos = resumed ? track.saved.position : 0;
        track.anchorAt = track.startFrom;
        track.fromNuvio = resumed;
      }
      return;
    }
    const ratio = jump.start / s.total;
    const duration = track.duration || track.saved?.duration || 0;
    const byOffset = duration > 0 ? ratio * duration : null;
    const saved = track.saved;
    const useSaved = Boolean(saved) && (byOffset == null || Math.abs(byOffset - saved.position) <= RESUME_MATCH_RATIO * duration);
    track.anchorPos = useSaved ? saved.position : byOffset;
    track.offsetRatio = ratio;
    track.anchorAt = jump.at;
    track.fromNuvio = useSaved;
  };

  // The same stream opened again after a stop (Nuvio reuses the last link): a
  // new playback of this session, resuming where Nuvio saved it on exit — or from
  // the start after a completed one, unless a jump into the file says otherwise.
  const revive = (s, track) => {
    const completed = track.state === "completed";
    track.saved = !completed && track.anchorPos != null ? { position: track.anchorPos, duration: track.duration } : null;
    track.state = "playing";
    track.anchorPos = completed ? 0 : track.anchorPos;
    track.anchorAt = s.lastRequestAt;
    track.offsetRatio = null;
    track.startFrom = s.lastRequestAt;
    track.startUntil = s.lastRequestAt + START_WINDOW_MS;
    track.eventSeen = false;
    track.fromNuvio = false;
    track.stoppedAt = 0;
    track.stopReason = "";
    track.confirmAt = [];
    track.pollRequests = s.requests;
    track.polledAt = 0;
    log?.info?.("lecture", "lecture reprise", { session: s.id, ref: `${s.accountId}:${s.profileId}` });
  };

  // Relay-only transitions (no network).
  const step = (s, track) => {
    const t = now();
    if ((track.state === "stopped" || track.state === "completed") && s.lastRequestAt > track.stoppedAt + 1000)
      revive(s, track);
    if (track.state === "playing") placeStart(s, track, t);
    if (track.state === "playing" || track.state === "paused") {
      if (
        s.openConns === 0 &&
        s.lastClientCloseAt &&
        s.lastClientCloseAt >= s.lastRequestAt &&
        t - s.lastClientCloseAt >= STOP_GRACE_MS
      )
        return stop(track, s, s.lastClientCloseAt, "closed");
      if (track.state === "playing" && t - Math.max(s.lastByteAt, s.lastRequestAt) >= LOST_PLAYING_MS)
        return stop(track, s, Math.max(s.lastByteAt, s.lastRequestAt), "lost");
      if (track.state === "paused" && t - track.pausedAt >= LOST_PAUSED_MS)
        return stop(track, s, t, "lost");
    }
    if (track.state === "paused") {
      // The player re-requested the media, or reloaded after a silence: a
      // paused player does neither once its buffer is full.
      if (s.requests > track.pausedRequests) return resume(track, s, "request", s.lastRequestAt);
      const reload = (s.gaps || []).find((g) => g.end > track.pausedAt);
      if (reload) return resume(track, s, "bytes", reload.end);
    }
  };

  // What is being played: from the relay (stream list or the /play link itself),
  // else inferred from Nuvio for an old link that carries no title.
  const contentOf = (s, track) =>
    s.contentId ? { type: s.type, id: s.contentId } : track.content;

  // Old /play links (minted before they carried the title, e.g. reused by Nuvio
  // after a restart): the title is the profile's unfinished progress whose saved
  // position matches the resume jump into the file.
  const inferContent = (s, track, rows) => {
    if (track.offsetRatio == null) placeStart(s, track, now());
    const ratio = track.offsetRatio;
    if (ratio == null) return;
    const pick = (rows || [])
      .filter((row) => {
        const duration = Number(row.duration) || 0;
        const position = Number(row.position) || 0;
        return duration > 0 &&
          position / duration < COMPLETE_RATIO &&
          time(row.last_watched) < s.startedAt - 5000 &&
          Math.abs(position / duration - ratio) <= INFER_MATCH_RATIO;
      })
      .sort((a, b) => time(b.last_watched) - time(a.last_watched))[0];
    if (!pick) return;
    track.content = {
      type: pick.content_type === "movie" ? "movie" : "series",
      id: String(pick.video_id || pick.content_id),
    };
    log?.debug?.("lecture", "titre déduit de la progression Nuvio", { session: s.id, content: track.content.id });
  };

  // Apply one Nuvio progress read to a session.
  const applyProgress = (s, track, rows) => {
    const t = now();
    const previousPoll = track.polledAt;
    track.polledAt = t;
    const newRequests = s.requests - track.pollRequests;
    track.pollRequests = s.requests;
    track.nuvioChecked = true;
    if (!contentOf(s, track)) inferContent(s, track, rows);
    const current = contentOf(s, track);
    const row = current
      ? latestMatch(rows, { contentId: current.id }, parseContent(current.type, current.id), "last_watched")
      : null;
    if (!row) return placeStart(s, track, t);
    const lastWatched = time(row.last_watched);
    const position = Number(row.position) || 0;
    const duration = Number(row.duration) || 0;
    if (duration > 0) track.duration = duration;
    if (!track.baselineDone) {
      track.baselineDone = true;
      // Progress saved before this session = the resume point, not an event.
      // A title left near its end restarts from 0 in Nuvio, so it isn't one.
      if (lastWatched < s.startedAt - 5000) {
        track.nuvioLastWatched = lastWatched;
        if (!(duration > 0 && position / duration >= COMPLETE_RATIO)) track.saved = { position, duration };
        return placeStart(s, track, t);
      }
    }
    if (lastWatched <= track.nuvioLastWatched) return;
    track.nuvioLastWatched = lastWatched;
    track.eventSeen = true;
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
    track.pausedRequests = s.requests;
    log?.debug?.("lecture", "pause détectée", { session: s.id, position });
  };

  const checkCompleted = (s, track, watchedRows) => {
    if (track.state !== "stopped") return;
    const pos = track.anchorPos;
    if (track.duration > 0 && pos != null && pos / track.duration >= COMPLETE_RATIO) {
      track.state = "completed";
      return;
    }
    const current = contentOf(s, track);
    if (!current || !watchedRows) return;
    const row = latestMatch(watchedRows, { contentId: current.id }, parseContent(current.type, current.id), "watched_at");
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
      const current = contentOf(s, track);
      const content = current ? parseContent(current.type, current.id) : parseContent("", "");
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
