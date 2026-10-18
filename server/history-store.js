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

  // The per-profile addon list: cheap (one REST row set), fetched on every sync
  // regardless of the history toggle so the addon library knows which profiles
  // use each addon. A profile inheriting the primary profile's addons resolves
  // to profile 1's list (same rule the Nuvio/Tuvora backends apply).
  async function fetchAddons(token, identity, providerId) {
    const pid = identity.uses_primary_addons ? 1 : identity.profile_index;
    const query = new URLSearchParams({
      user_id: "eq." + identity.user_id,
      profile_id: "eq." + pid,
      select: "url,name,enabled,sort_order",
      order: "sort_order.asc",
    });
    const rows = await call("/rest/v1/addons?" + query, null, token, "GET", providerId);
    return Array.isArray(rows)
      ? rows.map((r) => ({ url: String(r.url || ""), name: String(r.name || ""), enabled: r.enabled !== false }))
      : [];
  }

  // A compact identity snapshot kept with each profile so the addon library can
  // render avatars without a second round-trip to the backend.
  const identitySnapshot = (identity) => ({
    name: identity.name || "",
    profile_index: identity.profile_index,
    avatar_color_hex: identity.avatar_color_hex || null,
    avatar_image_url: identity.avatar_image_url || null,
    avatar_url: identity.avatar_url || null,
  });

  // heavy = also refresh the watching history (watched/progress/library/external).
  // Light-only runs (history disabled) keep any previous heavy data untouched and
  // refresh just the addon list + identity.
  async function fetchProfile(account, identity, { heavy, prev } = {}) {
    const token = await getToken(account);
    const providerId = account.provider;
    const ref = `${account.id}:${identity.profile_index}`;
    const base = {
      ref,
      accountId: account.id,
      providerId,
      accountName: account.name || account.email,
      profileName: identity.name || `Profil ${identity.profile_index}`,
      avatarUrl: identity.avatar_image_url || identity.avatar_url || null,
      userId: identity.user_id,
      identity: identitySnapshot(identity),
      lastError: "",
    };
    const addons = await fetchAddons(token, identity, providerId);
    base.addons = addons;
    base.addonsSync = Date.now();
    if (!heavy) {
      // Preserve the last-good history; only the addon map was refreshed.
      return {
        ...base,
        watched: prev?.watched || [],
        progress: prev?.progress || [],
        library: prev?.library || [],
        external: prev?.external || [],
        lastSync: prev?.lastSync || 0,
      };
    }
    const [watched, progress, library, external] = await Promise.all([
      fetchKind("watched", token, identity, providerId),
      fetchKind("progress", token, identity, providerId),
      fetchKind("library", token, identity, providerId),
      externalHistory ? externalHistory(account.id, identity.profile_index) : [],
    ]);
    return {
      ...base,
      watched,
      progress,
      library,
      external: Array.isArray(external) ? external : [],
      lastSync: Date.now(),
    };
  }

  async function run({ heavy } = {}) {
    const startedAt = Date.now();
    const accounts = getAccounts();
    log.info?.(`synchronisation démarrée`, { heavy: Boolean(heavy), accounts: accounts.length });
    const tasks = [];
    let failures = 0;
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
        failures++;
        log.error?.(`énumération des profils échouée`, { account: account.email || account.id, error: error.message });
      }
    }

    await pool(tasks, concurrency, async ({ account, identity }) => {
      const ref = `${account.id}:${identity.profile_index}`;
      const prev = store.profiles[ref];
      try {
        store.profiles[ref] = await fetchProfile(account, identity, { heavy, prev });
      } catch (error) {
        // Keep the last good data; only record the error.
        failures++;
        log.debug?.(`profil non synchronisé`, { ref, error: error.message });
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
            identity: identitySnapshot(identity),
            addons: [],
            addonsSync: 0,
            watched: [],
            progress: [],
            library: [],
            external: [],
            lastSync: 0,
            lastError: error.message,
          };
        }
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

    if (heavy) store.lastFullSync = Date.now();
    save(store);

    log.info?.(`synchronisation terminée`, {
      heavy: Boolean(heavy),
      profiles: tasks.length,
      stored: Object.keys(store.profiles).length,
      failures,
      ms: Date.now() - startedAt,
    });

    // Warm derived caches (e.g. TMDB metadata) in the background so stats render
    // instantly. Non-blocking: never let it hold up or fail the sync. Only after a
    // heavy run, since light runs leave the history untouched.
    if (heavy && onSync) Promise.resolve(onSync(store)).catch((error) => log.error?.(`pré-chauffage TMDB échoué`, { error: error.message }));
  }

  // One sync at a time; callers awaiting during a run share the in-flight one.
  // The addon map is always refreshed; the watching history only when the feature
  // is enabled (or explicitly forced), so disabling history still keeps the addon
  // library current without paying for the heavy history fetch.
  function syncAll({ force = false } = {}) {
    if (running) return running;
    const heavy = force || isEnabled();
    running = run({ heavy })
      .catch((error) => log.error?.(`synchronisation échouée`, { error: error.message }))
      .finally(() => {
        running = null;
      });
    return running;
  }

  async function syncProfile(ref, { heavy = true } = {}) {
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
      store.profiles[ref] = await fetchProfile(account, identity, { heavy, prev: store.profiles[ref] });
    } catch (error) {
      const prev = store.profiles[ref];
      if (prev) prev.lastError = error.message;
      throw error;
    }
    save(store);
  }

  // Light refresh of one profile's addon map (no history fetch). Used right after
  // the manager rewrites a profile's addons so the library reflects it at once.
  function refreshAddons(ref) {
    return syncProfile(ref, { heavy: false }).catch((error) => {
      log.error?.(`rafraîchissement des addons échoué`, { ref, error: error.message });
    });
  }

  // Per-profile installed addons for the library's "who uses this addon" view.
  // Returns only profiles whose addon map has been fetched at least once.
  function getAddonUsage(accounts) {
    const ids = new Set(accounts.map((a) => a.id));
    return Object.values(store.profiles)
      .filter((p) => ids.has(p.accountId) && p.addonsSync)
      .map((p) => ({
        ref: p.ref,
        accountId: p.accountId,
        providerId: p.providerId,
        accountName: p.accountName,
        profileIndex: p.identity?.profile_index ?? Number(p.ref.split(":")[1]),
        profileName: p.profileName,
        identity: p.identity || { name: p.profileName, avatar_url: p.avatarUrl },
        addons: p.addons || [],
        addonsSync: p.addonsSync || 0,
      }));
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

  // Light display lookup for logs/UI: the stored names of a mirrored profile by
  // its "accountId:profileId" ref, or null when it has not been mirrored yet.
  function profileLabel(ref) {
    const p = store.profiles[String(ref)];
    return p ? { profileName: p.profileName || "", accountName: p.accountName || "" } : null;
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
    // Always tick: syncAll refreshes the addon map every cycle and only pays for
    // the heavy history fetch when the feature is enabled.
    timer = setInterval(() => syncAll(), minutes * 60 * 1000);
    if (timer.unref) timer.unref();
  }

  function start() {
    schedule();
    syncAll(); // initial fill (non-blocking); addon map even if history is off
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
    refreshAddons,
    getDataset,
    hasData,
    getActivity,
    getAddonUsage,
    pruneAccount,
    profileLabel,
    status,
  };
}
