import { activityKinds } from "./activity.js";

// Local mirror of every profile's history (watched / progress / library) plus
// external events (Trakt / Simkl). Refreshed in the background every N minutes
// so stats and the history tab render instantly instead of hitting the Nuvio /
// Tuvora API on every view. It is a faithful MIRROR: a successful sync replaces
// a profile's rows wholesale, so deletions upstream propagate; a FAILED sync
// keeps the last good data (a network blip must not wipe the history).
//
// The store never filters: it keeps Nuvio/Tuvora AND Trakt/Simkl even when a
// profile unchecks its own history. That checkbox only hides sources at display
// time (handled by the stats route), so the data stays ready if re-enabled.

const PAGE_SIZE = 100;
// PostgREST caps responses at its server-side max-rows (1000 on the Nuvio API)
// regardless of ?limit, so Nuvio tables are paged with offset until exhausted.
const REST_PAGE = 1000;
const MAX_PAGES = 30; // safety ceiling: up to 30 000 rows per table/profile

const time = (value) => {
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Shape a stored profile into the dataset element summarizeStatistics expects.
export function datasetElement(stored) {
  const historySource = stored.providerId === "tuvora" ? "tuvora" : "nuvio";
  const events = (stored.watched || []).map((row) => ({
    source: historySource,
    contentId: String(row.content_id),
    title: String(row.title || ""),
    kind: row.episode == null ? "movie" : "episode",
    season: row.season,
    episode: row.episode,
    at: time(row.watched_at),
  }));
  events.push(...(stored.external || []));
  return {
    ref: stored.ref,
    accountName: stored.accountName,
    profileName: stored.profileName,
    avatarUrl: stored.avatarUrl,
    sources: [...new Set([historySource, ...(stored.external || []).map((r) => r.source)])],
    events,
    progress: (stored.progress || []).map((row) => ({
      contentId: String(row.content_id),
      season: row.season,
      episode: row.episode,
      position: Number(row.position || 0),
      duration: Number(row.duration || 0),
      at: time(row.last_watched),
    })),
  };
}

async function pool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current]);
    }
  });
  await Promise.all(runners);
}

export function createHistoryStore({
  load,
  save,
  getAccounts,
  getToken,
  getProfiles,
  rpc,
  call,
  externalHistory,
  getIntervalMinutes,
  isEnabled,
  onSync, // optional: called (non-blocking) after each successful full sync
  concurrency = 6,
  log = console,
}) {
  const store = load() || { version: 1, profiles: {}, lastFullSync: 0 };
  if (!store.profiles) store.profiles = {};
  let running = null;
  let timer = null;

  async function fetchKind(kind, token, identity, providerId) {
    const cfg = activityKinds[kind];
    if (providerId === "tuvora") {
      // Tuvora's sync_get_all_* RPCs return every row (no cap).
      const all = await rpc(cfg.rpc, { p_profile_id: identity.profile_index }, token, providerId);
      return Array.isArray(all) ? all : [];
    }
    const out = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = new URLSearchParams({
        user_id: "eq." + identity.user_id,
        profile_id: "eq." + identity.profile_index,
        select: cfg.columns,
        order: cfg.order,
        limit: String(REST_PAGE),
        offset: String(page * REST_PAGE),
      });
      const rows = await call("/rest/v1/" + cfg.table + "?" + query, null, token, "GET", providerId);
      if (!Array.isArray(rows) || rows.length === 0) break;
      out.push(...rows);
      if (rows.length < REST_PAGE) break;
    }
    return out;
  }

  async function fetchProfile(account, identity) {
    const token = await getToken(account);
    const providerId = account.provider;
    const [watched, progress, library, external] = await Promise.all([
      fetchKind("watched", token, identity, providerId),
      fetchKind("progress", token, identity, providerId),
      fetchKind("library", token, identity, providerId),
      externalHistory ? externalHistory(account.id, identity.profile_index) : [],
    ]);
    return {
      ref: `${account.id}:${identity.profile_index}`,
      accountId: account.id,
      providerId,
      accountName: account.name || account.email,
      profileName: identity.name || `Profil ${identity.profile_index}`,
      avatarUrl: identity.avatar_image_url || identity.avatar_url || null,
      userId: identity.user_id,
      watched,
      progress,
      library,
      external: Array.isArray(external) ? external : [],
      lastSync: Date.now(),
      lastError: "",
    };
  }

  async function run() {
    const accounts = getAccounts();
    const tasks = [];
    const enumerated = new Set(); // accounts whose profile list we could read
    const existing = new Set(); // refs that still exist upstream (enumerated)
    for (const account of accounts) {
      try {
        const token = await getToken(account);
        const identities = await getProfiles(token, account.provider);
        enumerated.add(account.id);
        for (const identity of identities) {
          existing.add(`${account.id}:${identity.profile_index}`);
          tasks.push({ account, identity });
        }
      } catch (error) {
        log.error?.(`[history] profils ${account.email || account.id} :`, error.message);
      }
    }

    await pool(tasks, concurrency, async ({ account, identity }) => {
      const ref = `${account.id}:${identity.profile_index}`;
      try {
        store.profiles[ref] = await fetchProfile(account, identity);
      } catch (error) {
        // Keep the last good data; only record the error.
        const prev = store.profiles[ref];
        if (prev) {
          prev.lastError = error.message;
        } else {
          store.profiles[ref] = {
            ref,
            accountId: account.id,
            providerId: account.provider,
            accountName: account.name || account.email,
            profileName: identity.name || `Profil ${identity.profile_index}`,
            avatarUrl: identity.avatar_image_url || identity.avatar_url || null,
            watched: [],
            progress: [],
            library: [],
            external: [],
            lastSync: 0,
            lastError: error.message,
          };
        }
        log.error?.(`[history] ${ref} :`, error.message);
      }
    });

    // Prune: drop refs whose account is gone, or whose profile disappeared from
    // an account we successfully enumerated (deletion propagates). Leave refs of
    // accounts we could not reach this cycle untouched.
    const currentAccounts = new Set(accounts.map((a) => a.id));
    for (const ref of Object.keys(store.profiles)) {
      const accId = store.profiles[ref].accountId;
      if (!currentAccounts.has(accId)) delete store.profiles[ref];
      else if (enumerated.has(accId) && !existing.has(ref)) delete store.profiles[ref];
    }

    store.lastFullSync = Date.now();
    save(store);

    // Warm derived caches (e.g. TMDB metadata) in the background so stats render
    // instantly. Non-blocking: never let it hold up or fail the sync.
    if (onSync) Promise.resolve(onSync(store)).catch((error) => log.error?.("[history] onSync :", error.message));
  }

  // One sync at a time; callers awaiting during a run share the in-flight one.
  function syncAll({ force = false } = {}) {
    if (running) return running;
    if (!force && !isEnabled()) return Promise.resolve();
    running = run()
      .catch((error) => log.error?.("[history] sync :", error.message))
      .finally(() => {
        running = null;
      });
    return running;
  }

  async function syncProfile(ref) {
    const [accountId, profileIndex] = ref.split(":");
    const account = getAccounts().find((a) => a.id === accountId);
    if (!account) return;
    const token = await getToken(account);
    const identities = await getProfiles(token, account.provider);
    const identity = identities.find((i) => i.profile_index === Number(profileIndex));
    if (!identity) {
      delete store.profiles[ref];
      save(store);
      return;
    }
    try {
      store.profiles[ref] = await fetchProfile(account, identity);
    } catch (error) {
      const prev = store.profiles[ref];
      if (prev) prev.lastError = error.message;
      throw error;
    }
    save(store);
  }

  // Dataset for the stats route (unfiltered; the route applies display filters).
  function getDataset(accounts) {
    const ids = new Set(accounts.map((a) => a.id));
    return Object.values(store.profiles)
      .filter((p) => ids.has(p.accountId) && p.lastSync)
      .map(datasetElement);
  }

  function hasData(accounts) {
    const ids = new Set(accounts.map((a) => a.id));
    return Object.values(store.profiles).some((p) => ids.has(p.accountId) && p.lastSync);
  }

  // History-tab page for one profile/kind, or null if that profile isn't stored.
  function getActivity(ref, kind, page) {
    if (!activityKinds[kind] || !Number.isInteger(page) || page < 1) return null;
    const stored = store.profiles[ref];
    if (!stored || !stored.lastSync) return null;
    const cfg = activityKinds[kind];
    const rows = [...(stored[kind] || [])].sort(
      (a, b) =>
        time(b?.[cfg.date]) - time(a?.[cfg.date]) ||
        String(a?.id ?? "").localeCompare(String(b?.id ?? "")),
    );
    const offset = (page - 1) * PAGE_SIZE;
    const slice = rows.slice(offset, offset + PAGE_SIZE + 1);
    return {
      kind,
      page,
      pageSize: PAGE_SIZE,
      hasMore: slice.length > PAGE_SIZE,
      items: slice.slice(0, PAGE_SIZE),
    };
  }

  function pruneAccount(accountId) {
    let changed = false;
    for (const ref of Object.keys(store.profiles))
      if (store.profiles[ref].accountId === accountId) {
        delete store.profiles[ref];
        changed = true;
      }
    if (changed) save(store);
  }

  function status() {
    return {
      enabled: isEnabled(),
      intervalMinutes: getIntervalMinutes(),
      lastFullSync: store.lastFullSync || 0,
      running: Boolean(running),
      profiles: Object.values(store.profiles).map((p) => ({
        ref: p.ref,
        profileName: p.profileName,
        accountName: p.accountName,
        lastSync: p.lastSync || 0,
        lastError: p.lastError || "",
        counts: {
          watched: p.watched?.length || 0,
          progress: p.progress?.length || 0,
          library: p.library?.length || 0,
          external: p.external?.length || 0,
        },
      })),
    };
  }

  function schedule() {
    if (timer) clearInterval(timer);
    const minutes = Math.max(1, Number(getIntervalMinutes()) || 30);
    timer = setInterval(() => {
      if (isEnabled()) syncAll();
    }, minutes * 60 * 1000);
    if (timer.unref) timer.unref();
  }

  function start() {
    schedule();
    if (isEnabled()) syncAll(); // initial fill (non-blocking)
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    start,
    stop,
    reschedule: schedule,
    syncAll,
    syncProfile,
    getDataset,
    hasData,
    getActivity,
    pruneAccount,
    status,
  };
}
