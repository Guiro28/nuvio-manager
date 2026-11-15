import crypto from "node:crypto";

// Health of the library addons: every addon's manifest is fetched on a schedule
// along each path its profiles use — from the server (also what "Sans proxy" and
// "Proxy interne" profiles depend on) and through the external proxy when a
// profile uses it. A failure is confirmed by a quick second check before the
// addon is reported down, so a single blip never raises an alert. Also tracks
// manifest version / content changes and a 7-day availability ratio.
//
// probe(url, mode) resolves { ok, ms, status?, error?, manifest? } and never
// throws; getModes(item) lists the paths to check for a library item.

const DAY_MS = 864e5;
const KEEP_DAYS = 7;
export const RECENT_CHANGE_MS = KEEP_DAYS * DAY_MS;

// What the manifest exposes (not its cosmetic fields): a change here without a
// version bump means the addon was reconfigured or changed its offer.
export const manifestFingerprint = (manifest) =>
  crypto
    .createHash("sha1")
    .update(
      JSON.stringify([
        manifest?.id,
        [...(manifest?.types || [])].sort(),
        (manifest?.resources || []).map((r) => (typeof r === "string" ? r : r?.name)).sort(),
        (manifest?.catalogs || []).map((c) => `${c?.type}/${c?.id}`).sort(),
      ]),
    )
    .digest("hex")
    .slice(0, 16);

const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);

export function createAddonHealth({
  load,
  persist,
  getLibrary,
  getModes,
  probe,
  log,
  onChange = () => {},
  onVersion = () => {},
  onContent = () => {},
  afterRun = () => {},
  now = Date.now,
  getIntervalMinutes = () => 15,
  retryMs = 60e3,
  concurrency = 4,
}) {
  const stored = load() || {};
  const records = new Map(Object.entries(stored.items || {}));
  let lastRunAt = Number(stored.lastRunAt) || 0;
  let running = null;
  let timer = null;
  const retries = new Map(); // addon id -> pending confirmation timer

  const save = () => persist({ version: 1, lastRunAt, items: Object.fromEntries(records) });

  function recordAvailability(record, ok, at) {
    const days = record.days || {};
    const key = dayKey(at);
    const [good, total] = days[key] || [0, 0];
    days[key] = [good + (ok ? 1 : 0), total + 1];
    const oldest = dayKey(at - (KEEP_DAYS - 1) * DAY_MS);
    for (const k of Object.keys(days)) if (k < oldest) delete days[k];
    record.days = days;
  }

  // One addon, every path. `confirming` = second check after a first failure.
  async function checkOne(item, { confirming = false } = {}) {
    const modes = getModes(item);
    const results = await Promise.all(modes.map(async (mode) => [mode, await probe(item.url, mode)]));
    const at = now();
    const previous = records.get(item.id);
    // A new URL (reconfigured addon) starts a fresh history.
    const record = previous && previous.url === item.url ? previous : { url: item.url, status: "unknown", strikes: 0 };
    const paths = Object.fromEntries(results.map(([mode, r]) => [mode, { ok: r.ok, ms: r.ms, status: r.status || 0, error: r.ok ? "" : r.error || "Erreur" }]));
    const okCount = results.filter(([, r]) => r.ok).length;
    const outcome = okCount === results.length ? "ok" : okCount ? "partial" : "down";
    record.checkedAt = at;
    record.paths = paths;

    const manifest = results.find(([, r]) => r.ok && r.manifest)?.[1].manifest;
    if (manifest) {
      const version = typeof manifest.version === "string" ? manifest.version.slice(0, 40) : "";
      const fingerprint = manifestFingerprint(manifest);
      if (record.version !== undefined && version !== record.version) {
        record.previousVersion = record.version;
        record.versionChangedAt = at;
        onVersion({ item, previous: record.previousVersion, version });
      } else if (record.fingerprint && fingerprint !== record.fingerprint) {
        record.contentChangedAt = at;
        onContent({ item, version });
      }
      record.version = version;
      record.fingerprint = fingerprint;
    }

    const before = record.status;
    const failingSince = record.failingSince || 0; // kept for the recovery message
    if (outcome === "ok") {
      record.status = "ok";
      record.strikes = 0;
      record.failingSince = null;
      record.lastOkAt = at;
      recordAvailability(record, true, at);
    } else if (!confirming && record.strikes === 0 && before !== outcome) {
      // First failure: keep the current status, confirm shortly.
      record.strikes = 1;
      record.suspectSince = at;
      scheduleRetry(item.id);
    } else {
      record.failingSince = record.failingSince || record.suspectSince || at;
      record.status = outcome;
      record.strikes = (record.strikes || 0) + 1;
      recordAvailability(record, false, at);
    }
    records.set(item.id, record);

    if (before !== record.status) {
      const failed = Object.entries(paths).filter(([, p]) => !p.ok).map(([mode, p]) => `${mode}: ${p.error}`).join(" ; ");
      if (record.status === "ok" && before !== "unknown") log.info("health", "addon de nouveau joignable", { addon: item.name });
      else if (record.status !== "ok") log.warn("health", record.status === "down" ? "addon injoignable" : "addon injoignable par un chemin", { addon: item.name, error: failed });
      onChange({ item, before, after: record.status, record, failingSince: record.failingSince || failingSince });
    }
    return record;
  }

  function scheduleRetry(id) {
    clearTimeout(retries.get(id));
    const handle = setTimeout(async () => {
      retries.delete(id);
      const item = getLibrary().find((x) => x.id === id);
      if (!item) return;
      try {
        await checkOne(item, { confirming: true });
        save();
      } catch (error) {
        log.warn("health", "vérification échouée", { addon: item.name, error: error.message });
      }
    }, retryMs);
    handle.unref?.();
    retries.set(id, handle);
  }

  // Every library addon (a few at a time); forgets removed addons. `explicit`
  // (asked from the UI) reports failures right away, without confirmation.
  function checkAll({ explicit = false } = {}) {
    if (running) return running;
    running = (async () => {
      const library = getLibrary();
      const ids = new Set(library.map((x) => x.id));
      for (const id of records.keys()) if (!ids.has(id)) records.delete(id);
      const queue = [...library];
      await Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
          for (let item = queue.shift(); item; item = queue.shift()) {
            try {
              if (explicit) {
                clearTimeout(retries.get(item.id));
                retries.delete(item.id);
              }
              await checkOne(item, { confirming: explicit });
            } catch (error) {
              log.warn("health", "vérification échouée", { addon: item.name, error: error.message });
            }
          }
        }),
      );
      lastRunAt = now();
      save();
      try {
        await afterRun();
      } catch (error) {
        log.warn("health", "vérification complémentaire échouée", { error: error.message });
      }
    })().finally(() => {
      running = null;
    });
    return running;
  }

  async function check(id) {
    const item = getLibrary().find((x) => x.id === id);
    if (!item) return null;
    clearTimeout(retries.get(id));
    retries.delete(id);
    // Asked explicitly: a failure is reported right away, no confirmation delay.
    const record = await checkOne(item, { confirming: true });
    save();
    return record;
  }

  const availability = (record) => {
    const [good, total] = Object.values(record.days || {}).reduce(([g, t], [a, b]) => [g + a, t + b], [0, 0]);
    return total ? Math.round((good / total) * 1000) / 10 : null;
  };
  const view = (record) => ({
    status: record.status,
    checkedAt: record.checkedAt || 0,
    lastOkAt: record.lastOkAt || 0,
    failingSince: record.failingSince || 0,
    paths: record.paths || {},
    version: record.version || "",
    previousVersion: record.previousVersion || "",
    versionChangedAt: record.versionChangedAt || 0,
    contentChangedAt: record.contentChangedAt || 0,
    availability: availability(record),
  });

  function snapshot() {
    const items = {};
    for (const item of getLibrary()) {
      const record = records.get(item.id);
      items[item.id] = record && record.url === item.url ? view(record) : null;
    }
    return { intervalMinutes: getIntervalMinutes(), lastRunAt, running: Boolean(running), items };
  }

  let started = false;
  const schedule = (delayMs) => {
    clearTimeout(timer);
    timer = setTimeout(function tick() {
      checkAll().catch(() => {});
      timer = setTimeout(tick, getIntervalMinutes() * 60e3);
      timer.unref?.();
    }, delayMs);
    timer.unref?.();
  };
  function start(delayMs = 30e3) {
    started = true;
    schedule(delayMs);
  }
  // Interval changed in the settings: the next check follows the new interval
  // counted from the last run (at least 30 s from now).
  function reschedule() {
    if (started) schedule(Math.max(30e3, lastRunAt + getIntervalMinutes() * 60e3 - now()));
  }
  function stop() {
    started = false;
    clearTimeout(timer);
    for (const handle of retries.values()) clearTimeout(handle);
    retries.clear();
  }

  return { checkAll, check, snapshot, start, reschedule, stop };
}
