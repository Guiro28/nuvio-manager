import { assert } from "./core.js";

const DAY = 24 * 60 * 60 * 1000;
const time = (value) => {
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const key = (row) =>
  [row.contentId, row.season ?? "", row.episode ?? ""].join(":");

export function summarizeStatistics(profiles, days = 30, now = Date.now()) {
  assert(Number.isInteger(days) && days >= 0 && days <= 3650, "Période invalide");
  const since = days ? now - days * DAY : 0;
  const summaries = profiles.map((profile) => {
    const events = profile.events.filter((event) => event.at >= since);
    const progress = profile.progress.filter((item) => item.at >= since);
    const unique = new Set(events.map((event) => event.contentId));
    const completedKeys = new Set(events.map(key));
    const trackedMs = progress
      .filter((item) => completedKeys.has(key(item)) || item.position > 0)
      .reduce(
        (sum, item) => sum + Math.min(item.duration || item.position, item.position || item.duration),
        0,
      );
    const externalMinutes = events
      .filter((event) => event.source === "trakt" || event.source === "simkl")
      .reduce((sum, event) => {
        const reported = Number(event.durationMinutes);
        const estimated = event.kind === "movie" ? 100 : 45;
        return sum + (Number.isFinite(reported) && reported > 0 ? reported : estimated);
      }, 0);
    return {
      ref: profile.ref,
      accountName: profile.accountName,
      profileName: profile.profileName,
      avatarUrl: profile.avatarUrl || null,
      sources: profile.sources,
      plays: events.length,
      uniqueTitles: unique.size,
      movies: events.filter((event) => event.kind === "movie").length,
      episodes: events.filter((event) => event.kind === "episode").length,
      trackedMinutes: Math.round(trackedMs / 60000 + externalMinutes),
      lastActivity: Math.max(0, ...events.map((event) => event.at)),
      contentIds: [...unique],
    };
  });
  const allEvents = profiles
    .flatMap((profile) =>
      profile.events
        .filter((event) => event.at >= since)
        .map((event) => ({
          ...event,
          ref: profile.ref,
          profileName: profile.profileName,
        })),
    )
    .sort((a, b) => b.at - a.at);
  const timeline = [];
  // No fixed cap: honour the requested window, and for "all history" span back to
  // the earliest event. A 10-year ceiling just guards against stray timestamps.
  let earliest = now;
  for (const event of allEvents) if (event.at < earliest) earliest = event.at;
  const timelineDays = days
    ? Math.min(days, 3650)
    : Math.max(1, Math.min(3650, Math.ceil((now - earliest) / DAY) + 1));
  for (let offset = timelineDays - 1; offset >= 0; offset--) {
    const start = new Date(now - offset * DAY);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + DAY;
    const dayEvents = allEvents.filter((event) => event.at >= start && event.at < end);
    const perProfile = new Map();
    for (const event of dayEvents) perProfile.set(event.ref, (perProfile.get(event.ref) || 0) + 1);
    timeline.push({
      date: start.toISOString().slice(0, 10),
      count: dayEvents.length,
      movies: dayEvents.filter((event) => event.kind === "movie").length,
      series: dayEvents.filter((event) => event.kind === "episode").length,
      profiles: [...perProfile.entries()]
        .map(([ref, count]) => ({ ref, count }))
        .sort((a, b) => b.count - a.count),
    });
  }
  const popularity = new Map();
  for (const event of allEvents) {
    const id = event.contentId;
    const item = popularity.get(id) || {
      contentId: id,
      title: event.title || id,
      kind: event.kind,
      plays: 0,
      profiles: new Set(),
      profileDetails: new Map(),
      sources: new Set(),
      episodes: new Set(),
      seasons: new Set(),
      lastActivity: 0,
    };
    item.plays++;
    item.profiles.add(event.ref);
    item.sources.add(event.source);
    const profileDetail = item.profileDetails.get(event.ref) || {
      ref: event.ref,
      profileName: event.profileName,
      plays: 0,
    };
    profileDetail.plays++;
    item.profileDetails.set(event.ref, profileDetail);
    if (event.kind === "episode") {
      item.episodes.add(`${event.season ?? ""}:${event.episode ?? ""}`);
      if (event.season != null) item.seasons.add(event.season);
    }
    item.lastActivity = Math.max(item.lastActivity, event.at);
    if (event.title && item.title === id) item.title = event.title;
    popularity.set(id, item);
  }
  const rankedContent = [...popularity.values()]
    .map((item) => ({
      contentId: item.contentId,
      title: item.title,
      kind: item.kind,
      plays: item.plays,
      profiles: item.profiles.size,
      profileDetails: [...item.profileDetails.values()].sort((a, b) => b.plays - a.plays),
      sources: [...item.sources],
      episodeCount: item.episodes.size,
      seasonCount: item.seasons.size,
      lastActivity: item.lastActivity,
    }))
    .sort((a, b) => b.plays - a.plays || b.profiles - a.profiles || b.lastActivity - a.lastActivity);
  const top = rankedContent.slice(0, 12);
  const watched = (kind) => rankedContent.filter((item) => item.kind === kind).slice(0, 5);
  const popular = (kind) => rankedContent
    .filter((item) => item.kind === kind)
    .sort((a, b) => b.profiles - a.profiles || b.plays - a.plays || b.lastActivity - a.lastActivity)
    .slice(0, 5);
  const sourceMap = new Map();
  for (const event of allEvents) {
    const row = sourceMap.get(event.source) || {
      source: event.source,
      plays: 0,
      movies: 0,
      series: 0,
      profiles: new Set(),
    };
    row.plays++;
    row[event.kind === "movie" ? "movies" : "series"]++;
    row.profiles.add(event.ref);
    sourceMap.set(event.source, row);
  }
  const overlap = summaries.flatMap((left, index) =>
    summaries.slice(index + 1).map((right) => {
      const a = new Set(left.contentIds),
        b = new Set(right.contentIds);
      const common = [...a].filter((id) => b.has(id)).length;
      const union = new Set([...a, ...b]).size;
      return {
        left: left.ref,
        right: right.ref,
        common,
        similarity: union ? Math.round((common / union) * 100) : 0,
      };
    }),
  );
  for (const summary of summaries) delete summary.contentIds;
  return {
    generatedAt: now,
    days,
    totals: {
      profiles: summaries.length,
      plays: allEvents.length,
      uniqueTitles: new Set(allEvents.map((event) => event.contentId)).size,
      trackedMinutes: summaries.reduce((sum, row) => sum + row.trackedMinutes, 0),
    },
    profiles: summaries,
    timeline,
    top,
    rankings: {
      watchedSeries: watched("episode"),
      popularSeries: popular("episode"),
      watchedMovies: watched("movie"),
      popularMovies: popular("movie"),
    },
    sources: [...sourceMap.values()]
      .map((row) => ({ ...row, profiles: row.profiles.size }))
      .sort((a, b) => b.plays - a.plays),
    overlap,
    recent: allEvents.slice(0, 50),
  };
}

export async function collectNuvioStatistics(accounts, { getToken, rpc, externalHistory, getProfiles }) {
  const profiles = [];
  for (const account of accounts) {
    const access = await getToken(account);
    const identities = getProfiles
      ? await getProfiles(access)
      : await rpc("sync_pull_profiles", {}, access);
    for (const identity of identities) {
      const profileId = identity.profile_index;
      const [watched, progress, external] = await Promise.all([
        rpc(
          "sync_pull_watched_items",
          { p_profile_id: profileId, p_page: 1, p_page_size: 5000 },
          access,
        ),
        rpc(
          "sync_pull_watch_progress",
          { p_profile_id: profileId, p_since_last_watched: null, p_limit: 5000 },
          access,
        ),
        externalHistory ? externalHistory(account.id, profileId) : [],
      ]);
      const events = watched.map((row) => ({
        source: "nuvio",
        contentId: String(row.content_id),
        title: String(row.title || ""),
        kind: row.episode == null ? "movie" : "episode",
        season: row.season,
        episode: row.episode,
        at: time(row.watched_at),
      }));
      events.push(...(external || []));
      profiles.push({
        ref: `${account.id}:${profileId}`,
        accountName: account.name || account.email,
        profileName: identity.name || `Profil ${profileId}`,
        avatarUrl: identity.avatar_image_url || identity.avatar_url || null,
        sources: [...new Set(["nuvio", ...(external || []).map((row) => row.source)])],
        events,
        progress: progress.map((row) => ({
          contentId: String(row.content_id),
          season: row.season,
          episode: row.episode,
          position: Number(row.position || 0),
          duration: Number(row.duration || 0),
          at: time(row.last_watched),
        })),
      });
    }
  }
  return profiles;
}
