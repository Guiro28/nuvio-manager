import { hashPassword, verifyPassword } from "./panel-auth.js";
import { activity } from "./activity.js";
import { enrichActivity } from "./tmdb.js";
import { collectNuvioStatistics, summarizeStatistics } from "./statistics.js";
import { createHistoryStore } from "./history-store.js";
import { getXperienceAvatars } from "./xperience.js";
import { readManifestLogo } from "./manifest.js";
import { createIntegratedProxy, normalizeProxyUrl, proxySummary } from "./integrated-proxy.js";
import {
  startTrakt,
  pollTrakt,
  startSimkl,
  pollSimkl,
  traktHistory,
  simklHistory,
} from "./trackers.js";
import http from "node:http";
import { isIP } from "node:net";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  assert,
  clean,
  clone,
  hash,
  changes,
  copyPaths,
  vault,
} from "./core.js";
import { call, rpc, profile, profileList, backend, providerOf, PROVIDERS, iptvPlaylists, pushIptvPlaylists, radarFollows, pushRadar, radarSearch, collections, pushCollections, homeCatalogSettings, pushHomeCatalogSettings, catalogSources } from "./nuvio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3100);

// ── Reverse proxy / external auth (Traefik ForwardAuth + oauth2-proxy…) ─────
// The manager can run behind a proxy that authenticates requests and injects an
// identity header. Only requests arriving from a trusted proxy address are
// believed, so X-Forwarded-* / X-Auth-Request-* cannot be spoofed from outside.
//   TRUST_PROXY_IPS : comma-separated IPs/CIDRs allowed to set those headers
//                     (default: loopback + private ranges, i.e. a Docker net).
//   AUTH_PROXY      : trust the proxy identity header as the dashboard admin.
//                     Same as the "external authentication" option chosen in the
//                     first-run wizard / Settings (panel.authProxy); when set, the
//                     environment wins and locks the UI toggle.
//   SESSION_SAMESITE: Lax|Strict|None for the nm_session cookie (default Lax so
//                     an OAuth redirect round-trip keeps the cookie).
//   SESSION_DOMAIN  : optional Domain attribute for that cookie.
//   RELAY_PORT      : optional second listener serving only the public /relay/**
//                     addon proxy, exposable without the upstream auth proxy.
const DEFAULT_TRUST_PROXY_IPS =
  "127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16,fc00::/7,fe80::/10";
const ipv4ToBytes = (ip) => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip));
  if (!m) return null;
  const bytes = m.slice(1).map(Number);
  return bytes.every((n) => n >= 0 && n <= 255) ? bytes : null;
};
const ipv6ToBytes = (ip) => {
  let value = String(ip).toLowerCase();
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (dotted) {
    const v4 = ipv4ToBytes(dotted[1]);
    if (!v4) return null;
    const high = ((v4[0] << 8) | v4[1]).toString(16);
    const low = ((v4[2] << 8) | v4[3]).toString(16);
    value = value.slice(0, value.length - dotted[1].length) + `${high}:${low}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const groups = (part) => (part ? part.split(":") : []);
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  if ([...head, ...tail].some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const full = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (full.length !== 8) return null;
  const bytes = [];
  for (const g of full) {
    const n = parseInt(g, 16);
    bytes.push((n >> 8) & 255, n & 255);
  }
  return bytes;
};
const ipToBytes = (ip) => {
  const str = String(ip);
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(str);
  const candidate = mapped ? mapped[1] : str;
  const family = isIP(candidate);
  if (family === 4) return { family: 4, bytes: ipv4ToBytes(candidate) };
  if (family === 6) return { family: 6, bytes: ipv6ToBytes(candidate) };
  return { family: 0, bytes: null };
};
const parseTrustProxyIps = (value) =>
  String(value || "")
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((item) => {
      const [addr, bitsRaw] = item.split("/");
      const parsed = ipToBytes(addr);
      if (!parsed.bytes) return null;
      const max = parsed.family === 4 ? 32 : 128;
      const bits = bitsRaw === undefined || bitsRaw === "" ? max : Number(bitsRaw);
      if (!Number.isInteger(bits) || bits < 0 || bits > max) return null;
      return { family: parsed.family, bytes: parsed.bytes, bits };
    })
    .filter(Boolean);
const matchPrefix = (a, b, bits) => {
  const fullBytes = bits >> 3;
  for (let i = 0; i < fullBytes; i++) if (a[i] !== b[i]) return false;
  const rem = bits & 7;
  if (!rem) return true;
  const mask = (0xff << (8 - rem)) & 0xff;
  return (a[fullBytes] & mask) === (b[fullBytes] & mask);
};
const trustProxyIps = parseTrustProxyIps(
  process.env.TRUST_PROXY_IPS !== undefined
    ? process.env.TRUST_PROXY_IPS
    : DEFAULT_TRUST_PROXY_IPS,
);
const isTrustedProxy = (req) => {
  const parsed = ipToBytes(req.socket?.remoteAddress || "");
  if (!parsed.bytes) return false;
  return trustProxyIps.some(
    (entry) =>
      entry.family === parsed.family &&
      matchPrefix(parsed.bytes, entry.bytes, entry.bits),
  );
};
const proxyIdentity = (req) =>
  String(
    req.headers["x-auth-request-user"] ||
      req.headers["x-auth-request-email"] ||
      req.headers["x-forwarded-user"] ||
      "",
  ).trim();
// External authentication can be enabled either by the environment (AUTH_PROXY,
// which locks the setting) or by the dashboard itself (panel.authProxy, chosen in
// the first-run wizard or in Settings).
const authProxyEnabled = () =>
  /^(1|true|yes|on)$/i.test(String(process.env.AUTH_PROXY || "")) ||
  panel.authProxy === true;
// Deriving the public origin from X-Forwarded-* is only safe when the operator
// explicitly declared a reverse proxy (either a trust list or AUTH_PROXY);
// otherwise the secure default (PUBLIC_URL, else localhost) is kept.
const forwardedHeadersTrusted = () =>
  process.env.TRUST_PROXY_IPS !== undefined || authProxyEnabled();
const SESSION_SAMESITE = (() => {
  const value = String(process.env.SESSION_SAMESITE || "lax").toLowerCase();
  if (!["lax", "strict", "none"].includes(value)) {
    console.error(`SESSION_SAMESITE ignoré (valeur invalide) : ${value}`);
    return "Lax";
  }
  return value[0].toUpperCase() + value.slice(1);
})();
const SESSION_DOMAIN = String(process.env.SESSION_DOMAIN || "").trim();

const db = vault(process.env.DATA_DIR || path.join(root, "data"));

// Build/version info shown in the sidebar. CI injects GIT_SHA / BUILD_NUMBER /
// BUILD_DATE at image build time; empty locally (the UI then shows "dev").
const APP_REPO_URL = "https://github.com/Guiro28/nuvio-manager";
const APP_VERSION = {
  version: (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version || "";
    } catch {
      return "";
    }
  })(),
  build: process.env.BUILD_NUMBER || "",
  sha: process.env.GIT_SHA || "",
  date: process.env.BUILD_DATE || "",
  repoUrl: APP_REPO_URL,
};
const state = db.read("state", { accounts: [], library: [], backups: [] });
const save = () => db.write("state", state);
const panel = db.read("panel-settings", {});
const storedSessions = db.read("sessions", { version: 1, entries: {} });
// Session value: { exp, role: "admin"|"nuvio", account: accountId|null }.
// Old numeric-only entries (previous format) are dropped, forcing a re-login.
const sessions = new Map(
  Object.entries(storedSessions.entries || {}).filter(
    ([sid, s]) =>
      /^[a-f0-9]{64}$/.test(sid) &&
      s && typeof s === "object" &&
      Number.isFinite(s.exp) && s.exp > Date.now(),
  ),
);
const tmdbCache = db.read("tmdb-cache", { version: 1, entries: {}, genres: {} });
const trackerCache = db.read("tracker-cache", { entries: {} });
const authEnabled = () => Boolean(panel.admin);
const setupRequired = () => !panel.admin;
const adminName = () => panel.admin?.username || "";
const validPassword = value => verifyPassword(value, panel.admin);
// When login is disabled (behind an external OAuth), the manager performs no
// auth of its own and treats every request as the admin.
const loginDisabled = () => panel.loginDisabled === true;
let adminFromEnv = false; // admin set via ADMIN_* env -> hide the admin editor
let loginManagedByEnv = false; // DISABLE_LOGIN env present -> lock the UI toggle
let authProxyManagedByEnv = false; // AUTH_PROXY env present -> lock the UI toggle
const pairings = new Map(),
  plans = new Map(),
  locks = new Set(),
  refreshing = new Map();
const statisticsCache = new Map();
const trackerPairings = new Map();
function normalizePublicUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw Object.assign(new Error("Adresse publique invalide"), { status: 400 });
  }
  assert(["http:", "https:"].includes(url.protocol) && url.hostname, "Adresse publique HTTP/HTTPS requise");
  assert(!url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "L’adresse publique ne doit contenir ni identifiants, ni chemin, ni paramètres");
  return url.origin;
}
const publicOrigin = () => panel.publicUrl || `http://localhost:${port}`;
// Public origin for a specific request. PUBLIC_URL always wins; otherwise, when
// the request comes from a trusted reverse proxy, it's derived from the
// X-Forwarded-* headers so the host/origin guards work without PUBLIC_URL.
function originFor(req) {
  if (panel.publicUrl) return panel.publicUrl;
  if (req && forwardedHeadersTrusted() && isTrustedProxy(req)) {
    const proto = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    const fwdHost = String(req.headers["x-forwarded-host"] || "")
      .split(",")[0]
      .trim();
    const reqHost = String(req.headers.host || "").trim();
    const hostValue = fwdHost || reqHost;
    if ((proto === "http" || proto === "https") && hostValue) {
      try {
        return new URL(`${proto}://${hostValue}`).origin;
      } catch {
        /* fall through to localhost */
      }
    }
  }
  return `http://localhost:${port}`;
}
const secureFor = (req) => originFor(req).startsWith("https:");
function sessionCookie(req, sid, maxAge) {
  const parts = [
    `nm_session=${sid}`,
    "HttpOnly",
    `SameSite=${SESSION_SAMESITE}`,
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  if (SESSION_DOMAIN) parts.push(`Domain=${SESSION_DOMAIN}`);
  if (SESSION_SAMESITE === "None" || secureFor(req)) parts.push("Secure");
  return parts.join("; ");
}
const effectiveProxyUrl = () => panel.proxyUrl !== undefined
  ? panel.proxyUrl
  : "";
const addonProxy = createIntegratedProxy({
  state,
  save,
  getOrigin: publicOrigin,
  getProxyUrl: effectiveProxyUrl,
});
const saveSessions = () =>
  db.write("sessions", {
    version: 1,
    entries: Object.fromEntries(sessions),
  });
const issueSession = (res, req, role = "admin", account = null) => {
  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, { exp: Date.now() + 8 * 3600 * 1000, role, account });
  saveSessions();
  res.setHeader("Set-Cookie", sessionCookie(req, sid, 28800));
  return sid;
};
const equal = (a, b) => {
  const aa = Buffer.from(String(a)),
    bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
const json = (res, data, status = 200) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
};
async function body(req, limit = 2_000_000) {
  let size = 0,
    parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    assert(size <= limit, "Requête trop volumineuse", 413);
    parts.push(chunk);
  }
  try {
    return clean(JSON.parse(Buffer.concat(parts).toString() || "{}"));
  } catch (e) {
    throw Object.assign(new Error("JSON invalide : " + e.message), {
      status: 400,
    });
  }
}
function account(id) {
  const found = state.accounts.find((a) => a.id === id);
  assert(found, "Compte introuvable", 404);
  return found;
}
// Tuvora's write RPCs expect an origin client id; Nuvio's do not.
const TUVORA_ORIGIN = "nuvio-web";
const isTuvora = (a) => providerOf(a.provider).id === "tuvora";
const originId = (a) => (isTuvora(a) ? { p_origin_client_id: TUVORA_ORIGIN } : {});
// Tuvora has no sync_patch_profile; mirror its web app by rewriting the whole
// profiles array through sync_push_profiles.
async function patchProfileRow(a, t, profileId, patch) {
  const rows = await rpc("sync_pull_profiles", {}, t, a.provider);
  const profiles = rows.map((row) => {
    const base = {
      profile_index: row.profile_index,
      name: row.name,
      avatar_color_hex: row.avatar_color_hex,
      uses_primary_addons: row.uses_primary_addons,
      uses_primary_plugins: row.uses_primary_plugins,
      avatar_id: row.avatar_id,
      avatar_url: row.avatar_url,
    };
    return row.profile_index === profileId ? { ...base, ...patch } : base;
  });
  return rpc(
    "sync_push_profiles",
    { p_client_max_profiles: Math.max(profiles.length, 6), p_profiles: profiles, ...originId(a) },
    t,
    a.provider,
  );
}
const connectionRef = (accountId, profileId) => `${accountId}:${profileId}`;
// UI language (from the X-Lang header) mapped to a TMDB locale.
const TMDB_LOCALES = { fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT" };
const requestLang = (req) => {
  const code = String(req.headers["x-lang"] || "").toLowerCase().slice(0, 2);
  return TMDB_LOCALES[code] ? code : "fr";
};
const trackerConfig = (service) => panel.trackerApps?.[service] || {};
const savePanel = () => db.write("panel-settings", panel);

// Bootstrap configuration from environment variables (compose-friendly). When
// set, these win over stored values and let the manager come up fully configured
// without the first-run setup screen — handy behind an external OAuth proxy.
//   ADMIN_USERNAME + ADMIN_PASSWORD : create/sync the local admin (password ≥ 12).
//   PUBLIC_URL                      : public HTTPS origin used for addon URLs.
function applyEnvConfig() {
  let changed = false;
  if (process.env.PUBLIC_URL) {
    try {
      const origin = normalizePublicUrl(process.env.PUBLIC_URL);
      if (panel.publicUrl !== origin) {
        panel.publicUrl = origin;
        changed = true;
      }
    } catch {
      console.error("PUBLIC_URL ignorée (adresse invalide) :", process.env.PUBLIC_URL);
    }
  }
  const user = String(process.env.ADMIN_USERNAME || "").trim();
  const pass = String(process.env.ADMIN_PASSWORD || "");
  if (user && pass) {
    if (pass.length < 12) {
      console.error("ADMIN_PASSWORD ignoré : 12 caractères minimum requis.");
    } else {
      adminFromEnv = true;
      if (
        !panel.admin ||
        panel.admin.username !== user.slice(0, 80) ||
        !verifyPassword(pass, panel.admin)
      ) {
        panel.admin = { ...hashPassword(pass), username: user.slice(0, 80) };
        changed = true;
        console.log(`Administrateur « ${user.slice(0, 80)} » configuré depuis l’environnement.`);
      }
    }
  }
  if (process.env.DISABLE_LOGIN !== undefined) {
    loginManagedByEnv = true;
    const want = /^(1|true|yes|on)$/i.test(process.env.DISABLE_LOGIN);
    if (panel.loginDisabled !== want) {
      panel.loginDisabled = want;
      changed = true;
    }
    if (want) console.log("Page de connexion désactivée (DISABLE_LOGIN).");
  }
  if (process.env.AUTH_PROXY !== undefined) {
    authProxyManagedByEnv = true;
    const want = /^(1|true|yes|on)$/i.test(process.env.AUTH_PROXY);
    if (panel.authProxy !== want) {
      panel.authProxy = want;
      changed = true;
    }
  }
  if (changed) savePanel();
}
applyEnvConfig();

// After each history sync, warm the TMDB cache for every title in the store so
// stats (any period / profile selection) never wait on TMDB. Default locale
// (fr-FR); other UI languages warm on first view as before. Non-blocking, capped
// concurrency inside enrichActivity (5).
async function prewarmTmdb() {
  if (!panel.tmdbKey) return;
  const items = [
    ...new Map(
      historyStore
        .getDataset(state.accounts)
        .flatMap((profile) => profile.events)
        .map((event) => {
          const contentType = event.kind === "movie" ? "movie" : "series";
          return [
            `${contentType}:${event.contentId}`,
            { content_id: event.contentId, content_type: contentType },
          ];
        }),
    ).values(),
  ];
  if (!items.length) return;
  // Chunk so the cache is persisted incrementally: a transient TMDB error loses
  // at most one chunk's progress, not the whole run (enrichActivity persists once
  // per call). Cached titles are cheap (no network), so this is near-free when warm.
  const CHUNK = 300;
  for (let start = 0; start < items.length; start += CHUNK) {
    await enrichActivity(
      { items: items.slice(start, start + CHUNK) },
      {
        key: panel.tmdbKey,
        cache: tmdbCache,
        persist: (value) => db.write("tmdb-cache", value),
        language: TMDB_LOCALES.fr,
      },
    );
  }
}

// Background mirror of every profile's history; stats and the history tab read
// from it so they render instantly regardless of how many profiles exist.
const historyStore = createHistoryStore({
  load: () => db.read("history-store", { version: 1, profiles: {}, lastFullSync: 0 }),
  save: (value) => db.write("history-store", value),
  getAccounts: () => state.accounts,
  getToken: token,
  getProfiles: profileList,
  rpc,
  call,
  externalHistory,
  getIntervalMinutes: () => Number(panel.historySyncMinutes) || 30,
  isEnabled: () => panel.historySyncEnabled !== false,
  onSync: prewarmTmdb,
});
// Background sampling of process CPU% and RSS, kept as a 1-week history in the
// data volume for the home-page chart. A single sampler owns the cpuUsage delta
// so nothing else has to recompute it.
const METRICS_SAMPLE_MS = 15_000,
  METRICS_STEP_MS = 60_000, // 1-minute history resolution
  METRICS_KEEP_MS = 7 * 24 * 60 * 60 * 1000,
  METRICS_PERSIST_MS = 5 * 60_000;
let metricsHistory = db.read("metrics", []);
if (!Array.isArray(metricsHistory)) metricsHistory = [];
let latestSample = { cpu: 0, rss: process.memoryUsage().rss };
let sampleLastCpu = process.cpuUsage(),
  sampleLastAt = Date.now(),
  lastHistoryAt = metricsHistory.at(-1)?.t || 0,
  lastMetricsPersist = Date.now();
function sampleMetrics() {
  const now = Date.now(),
    current = process.cpuUsage(),
    elapsedMs = now - sampleLastAt || 1,
    cpuMs = (current.user - sampleLastCpu.user + current.system - sampleLastCpu.system) / 1000,
    cores = os.cpus().length || 1;
  sampleLastCpu = current;
  sampleLastAt = now;
  const cpu = Math.max(0, Math.min(100, (cpuMs / (elapsedMs * cores)) * 100)),
    rss = process.memoryUsage().rss;
  latestSample = { cpu, rss };
  if (now - lastHistoryAt >= METRICS_STEP_MS) {
    metricsHistory.push({ t: now, cpu: Math.round(cpu * 10) / 10, rss });
    lastHistoryAt = now;
    const cutoff = now - METRICS_KEEP_MS;
    while (metricsHistory.length && metricsHistory[0].t < cutoff) metricsHistory.shift();
    if (now - lastMetricsPersist >= METRICS_PERSIST_MS) {
      db.write("metrics", metricsHistory);
      lastMetricsPersist = now;
    }
  }
}
setInterval(sampleMetrics, METRICS_SAMPLE_MS).unref?.();
// CPU/RAM series for a window (seconds), down-sampled to at most 180 points.
function metricsSeries(periodSeconds) {
  const period = Math.max(3600, Math.min(METRICS_KEEP_MS / 1000, Number(periodSeconds) || 86400)) * 1000,
    now = Date.now(),
    from = now - period,
    points = metricsHistory.filter((p) => p.t >= from);
  const MAX = 180;
  if (points.length <= MAX) return points;
  const bucketMs = period / MAX,
    buckets = new Map();
  for (const p of points) {
    const key = Math.floor((p.t - from) / bucketMs),
      acc = buckets.get(key) || { t: 0, cpu: 0, rss: 0, n: 0 };
    acc.t += p.t;
    acc.cpu += p.cpu;
    acc.rss += p.rss;
    acc.n += 1;
    buckets.set(key, acc);
  }
  return [...buckets.values()]
    .map((a) => ({ t: Math.round(a.t / a.n), cpu: a.cpu / a.n, rss: Math.round(a.rss / a.n) }))
    .sort((x, y) => x.t - y.t);
}
// Total profiles across accounts, cached because it needs Nuvio calls and the
// home page polls frequently.
let profilesCount = { at: 0, value: 0 };
async function totalProfiles() {
  if (Date.now() - profilesCount.at < 60000) return profilesCount.value;
  let total = 0;
  for (const a of state.accounts) {
    try {
      total += (await profileList(await token(a), a.provider)).length;
    } catch {}
  }
  profilesCount = { at: Date.now(), value: total };
  return total;
}
async function overview() {
  const mem = process.memoryUsage(),
    totalMem = os.totalmem(),
    freeMem = os.freemem(),
    connections = Object.values(panel.connections || {});
  return {
    accounts: state.accounts.length,
    profiles: await totalProfiles(),
    libraryAddons: state.library.length,
    proxyAddons:
      (state.proxyAddons?.length || 0) +
      (state.proxyGrants?.filter((g) => !g.revoked).length || 0),
    trakt: connections.filter((c) => c?.trakt).length,
    simkl: connections.filter((c) => c?.simkl).length,
    backups: state.backups.length,
    tmdbConfigured: Boolean(panel.tmdbKey),
    proxyExternal: { configured: Boolean(panel.proxyUrl) },
    memory: { rss: mem.rss, used: totalMem - freeMem, total: totalMem },
    cpu: { percent: latestSample.cpu, cores: os.cpus().length },
    uptime: process.uptime(),
    bandwidth: addonProxy.metrics(),
  };
}
async function assertProfile(accountId, profileId) {
  const selected = account(accountId),
    access = await token(selected),
    rows = await rpc("sync_pull_profiles", {}, access, selected.provider);
  assert(rows.some((row) => row.profile_index === profileId), "Profil introuvable", 404);
  return selected;
}
async function externalHistory(accountId, profileId) {
  const ref = connectionRef(accountId, profileId),
    connections = panel.connections?.[ref] || {},
    output = [];
  for (const service of ["trakt", "simkl"]) {
    const connection = connections[service];
    if (!connection) continue;
    const cacheKey = `${ref}:${service}`,
      cached = trackerCache.entries?.[cacheKey];
    if (cached?.expiresAt > Date.now()) {
      output.push(...cached.events);
      continue;
    }
    try {
      const result = service === "trakt"
        ? await traktHistory(connection, trackerConfig(service))
        : await simklHistory(connection, trackerConfig(service));
      connections[service] = { ...result.connection, lastSync: Date.now(), lastError: "" };
      trackerCache.entries ??= {};
      trackerCache.entries[cacheKey] = {
        expiresAt: Date.now() + 30 * 60 * 1000,
        events: result.events,
      };
      db.write("tracker-cache", trackerCache);
      savePanel();
      output.push(...result.events);
    } catch (error) {
      connection.lastError = error.message;
      savePanel();
    }
  }
  return output;
}
async function token(a) {
  if (a.expires > Date.now() + 60000) return a.access;
  if (!refreshing.has(a.id))
    refreshing.set(
      a.id,
      (async () => {
        const t = await call(
          "/auth/v1/token?grant_type=refresh_token",
          { refresh_token: a.refresh },
          undefined,
          "POST",
          a.provider,
        );
        a.access = t.access_token;
        a.refresh = t.refresh_token;
        a.expires = Date.now() + t.expires_in * 1000;
        save();
        return a.access;
      })().finally(() => refreshing.delete(a.id)),
    );
  return refreshing.get(a.id);
}
async function addSession(t, providerId = "nuvio") {
  const info = await call("/auth/v1/user", null, t.access_token, "GET", providerId);
  let a = state.accounts.find((a) => a.id === info.id);
  if (!a) {
    a = { id: info.id };
    state.accounts.push(a);
  }
  Object.assign(a, {
    email: info.email,
    provider: providerOf(providerId).id,
    access: t.access_token,
    refresh: t.refresh_token,
    expires: Date.now() + t.expires_in * 1000,
  });
  save();
  return { id: a.id, email: a.email };
}
const MAX_BACKUPS_PER_ACCOUNT = 3;
const validateBackupSnapshot = (snapshot) => {
  assert(snapshot && typeof snapshot === "object" && !Array.isArray(snapshot), "Fichier de sauvegarde Nuvio invalide");
  assert(snapshot.format === "nuvio_account_backup", "Format de sauvegarde Nuvio incompatible");
  assert(Number(snapshot.version) === 1, "Version de sauvegarde Nuvio incompatible");
  assert(snapshot.data && typeof snapshot.data === "object" && !Array.isArray(snapshot.data), "Données de sauvegarde Nuvio invalides");
  return snapshot;
};
function pruneBackups(accountId) {
  const expired = state.backups.filter((item) => item.accountId === accountId).slice(MAX_BACKUPS_PER_ACCOUNT);
  if (expired.length) {
    const ids = new Set(expired.map((item) => item.id));
    state.backups = state.backups.filter((item) => !ids.has(item.id));
  }
  return expired;
}
function persistBackups(expired = []) {
  save();
  expired.forEach((item) => db.remove("backup-" + item.id));
}
async function backup(a, reason) {
  // Some providers (Tuvora) have no export RPC; skip the safety snapshot rather
  // than failing the edit that triggered it.
  if (!providerOf(a.provider).canBackup) return null;
  const snapshot = await rpc("sync_export_account_backup", {}, await token(a), a.provider);
  const id = crypto.randomUUID();
  db.write("backup-" + id, snapshot);
  state.backups.unshift({
    id,
    accountId: a.id,
    email: a.email,
    at: new Date().toISOString(),
    reason,
  });
  persistBackups(pruneBackups(a.id));
  return id;
}
{
  const expired = [...new Set(state.backups.map((item) => item.accountId).filter(Boolean))]
    .flatMap((accountId) => pruneBackups(accountId));
  if (expired.length) persistBackups(expired);
}
// Fallback restore for hosted instances that deny sync_restore_account_backup:
// re-push the synced settings from the snapshot via the per-item RPCs. Restores
// addons, plugins, TV/Mobile settings, home catalogs and collections for every
// profile; leaves identity, library and watch history untouched.
async function restoreViaPush(a, snapshot) {
  const t = await token(a);
  const data = snapshot?.data || {};
  const restored = { addons: 0, plugins: 0, settings: 0, catalogs: 0, collections: 0 };
  const errors = [];
  const groupByProfile = (rows) => {
    const map = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      const pid = Number(row.profile_id);
      if (!Number.isFinite(pid)) continue;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(row);
    }
    return map;
  };
  const asList = (rows) =>
    [...rows]
      .sort((x, y) => (x.sort_order || 0) - (y.sort_order || 0))
      .map((r, i) => ({ url: r.url, name: String(r.name || ""), enabled: r.enabled !== false, sort_order: i }));
  const run = async (label, fn) => {
    try {
      await fn();
      return true;
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
      return false;
    }
  };
  for (const [pid, rows] of groupByProfile(data.addons))
    if (await run(`addons/profil ${pid}`, () => rpc("sync_push_addons", { p_profile_id: pid, p_addons: asList(rows) }, t, a.provider))) restored.addons++;
  for (const [pid, rows] of groupByProfile(data.plugins))
    if (await run(`plugins/profil ${pid}`, () => rpc("sync_push_plugins", { p_profile_id: pid, p_plugins: asList(rows) }, t, a.provider))) restored.plugins++;
  for (const row of Array.isArray(data.collections) ? data.collections : [])
    if (await run(`collections/profil ${row.profile_id}`, () => rpc("sync_push_collections", { p_profile_id: Number(row.profile_id), p_collections_json: row.collections_json || [] }, t, a.provider))) restored.collections++;
  for (const row of Array.isArray(data.home_catalog_settings) ? data.home_catalog_settings : [])
    if (await run(`catalogues/profil ${row.profile_id}`, () => rpc("sync_push_home_catalog_settings", { p_profile_id: Number(row.profile_id), p_platform: row.platform || "home_catalog_shared", p_settings_json: row.settings_json || { items: [] } }, t, a.provider))) restored.catalogs++;
  for (const row of Array.isArray(data.profile_settings_blobs) ? data.profile_settings_blobs : [])
    if (
      await run(`paramètres ${row.platform}/profil ${row.profile_id}`, async () => {
        const current = (await rpc("sync_pull_profile_settings_blob", { p_profile_id: Number(row.profile_id), p_platform: row.platform }, t, a.provider))[0];
        await rpc(
          "sync_push_profile_settings_blob_guarded",
          { p_profile_id: Number(row.profile_id), p_platform: row.platform, p_settings_json: row.settings_json, p_expected_updated_at: current?.updated_at || null },
          t,
          a.provider,
        );
      })
    )
      restored.settings++;
  return { restored, errors };
}
function normalizeUrl(value) {
  const u = new URL(String(value || "").replace(/^stremio:\/\//i, "https://"));
  assert(
    ["http:", "https:"].includes(u.protocol) && !u.username && !u.password,
    "URL HTTP/HTTPS requise, sans identifiants HTTP",
  );
  return u.href;
}
async function installation(item, mode, ctx) {
  if (mode === "none") return item.url;
  assert(["direct", "warp"].includes(mode), "Mode proxy invalide");
  const addon = await addonProxy.register(item, mode, ctx);
  return `${publicOrigin()}/relay/${mode}/${addon.id}/manifest.json`;
}
// Clone helper: give the target profile its own relay grants. Each proxied addon
// copied from the source is re-minted so the target gets a unique, revocable URL
// (deleting the source never breaks the clone). Non-relay URLs pass through.
async function remapRelayAddons(rows, ctx) {
  const out = [];
  for (const row of rows) {
    const ref = addonProxy.describe(row.url);
    if (ref) {
      const url = await installation(
        { url: ref.manifestUrl, name: row.name, logo: ref.logo },
        ref.mode,
        ctx,
      );
      out.push({ ...row, url });
    } else out.push(row);
  }
  return out;
}
// Merge-dedup key: two relay URLs for the same upstream addon+mode collapse to
// one even though their tokens differ per profile.
const addonUpstreamKey = (url) => {
  const ref = addonProxy.describe(url);
  return ref ? `${ref.mode}|${ref.manifestUrl}` : url;
};
const writableList = (rows) =>
  rows.map((r, i) => ({
    url: normalizeUrl(r.url),
    name: String(r.name || ""),
    enabled: r.enabled !== false,
    sort_order: i,
    ...(r.repo_type ? { repo_type: r.repo_type } : {}),
  }));
function desiredParts(current, desired) {
  const result = {};
  for (const part of ["tv", "mobile", "addons", "plugins"])
    if (Object.hasOwn(desired, part)) {
      if (part === "tv" || part === "mobile") {
        assert(
          desired[part] &&
            typeof desired[part] === "object" &&
            !Array.isArray(desired[part]),
          "Paramètres attendus sous forme d’objet",
        );
        result[part] = clean(desired[part]);
      } else {
        assert(Array.isArray(desired[part]), "Liste attendue");
        assert(
          !current.identity[
            part === "addons" ? "uses_primary_addons" : "uses_primary_plugins"
          ],
          `Ce profil hérite des ${part} du profil principal. Désactive cet héritage avant de modifier sa liste.`,
        );
        result[part] = writableList(desired[part]);
      }
    }
  return result;
}
function snapshotParts(current, keys) {
  return Object.fromEntries(
    keys.map((k) => [
      k,
      k === "tv" || k === "mobile"
        ? current[k].settings_json
        : writableList(current[k]),
    ]),
  );
}
const attempts = new Map();

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  try {
    const url = new URL(req.url, "http://localhost");
    // Only media and manifest routes are public; management endpoints remain private.
    if (await addonProxy.handle(req, res, url)) return;
    if (url.pathname.startsWith("/api/")) {
      if (!["GET", "HEAD"].includes(req.method)) {
        assert(
          req.headers["content-type"]?.startsWith("application/json"),
          "Content-Type JSON requis",
          415,
        );
        const allowed = new Set([
          originFor(req),
          `http://localhost:${port}`,
          `http://127.0.0.1:${port}`,
        ]);
        if (url.pathname === "/api/setup" && req.headers.host) {
          allowed.add(`http://${req.headers.host}`);
          allowed.add(`https://${req.headers.host}`);
        }
        assert(
          !req.headers.origin || allowed.has(req.headers.origin),
          "Origine non autorisée",
          403,
        );
        assert(
          req.headers["sec-fetch-site"] !== "cross-site",
          "Requête intersite refusée",
          403,
        );
      }
      // The request's public host (PUBLIC_URL, or X-Forwarded-Host via a trusted
      // proxy) is trusted; localhost covers direct access.
      const allowedHosts = new Set([
        new URL(originFor(req)).host.toLowerCase(),
        `localhost:${port}`,
        `127.0.0.1:${port}`,
      ]);
      // Honor X-Forwarded-Host so the manager works behind a reverse proxy /
      // external OAuth: a match only ever passes for an explicitly allowed host.
      const reqHost = String(req.headers.host || "").toLowerCase();
      const fwdHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim().toLowerCase();
      const hostAllowed = allowedHosts.has(reqHost) || (fwdHost && allowedHosts.has(fwdHost));
      if (port !== 0 && url.pathname !== "/api/setup")
        assert(hostAllowed, "Hôte non autorisé", 403);
      if (url.pathname === "/api/version") return json(res, APP_VERSION);
      if (url.pathname === "/api/setup") {
        if (req.method === "GET") return json(res, { required: setupRequired(), publicUrlRequired: !panel.publicUrl, loginDisabled: loginDisabled(), authProxy: authProxyEnabled(), authProxyManaged: authProxyManagedByEnv });
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(setupRequired() || !panel.publicUrl, "La configuration initiale est déjà terminée", 409);
        const b = await body(req),
          ip = req.socket.remoteAddress,
          recent = attempts.get(ip) || [],
          active = recent.filter((time) => Date.now() - time < 60000);
        assert(active.length < 10, "Réessaie dans une minute", 429);
        active.push(Date.now());
        attempts.set(ip, active);
        const createAdmin = setupRequired();
        if (createAdmin) {
          assert(typeof b.username === "string" && b.username.trim().length > 0 && b.username.trim().length <= 80, "Nom d’utilisateur requis (80 caractères maximum)");
          assert(typeof b.password === "string" && b.password.length >= 12 && b.password.length <= 1024, "Le mot de passe doit contenir au moins 12 caractères");
          panel.admin = { ...hashPassword(b.password), username: b.username.trim() };
        }
        if (b.authProxy !== undefined) {
          assert(typeof b.authProxy === "boolean", "Valeur d’authentification externe invalide", 400);
          if (!authProxyManagedByEnv) panel.authProxy = b.authProxy;
        }
        panel.publicUrl = normalizePublicUrl(b.publicUrl);
        savePanel();
        if (createAdmin) issueSession(res, req);
        return json(res, { ok: true, requiresLogin: !createAdmin });
      }
      if (url.pathname === "/api/login") {
        const b = await body(req),
          ip = req.socket.remoteAddress,
          recent = attempts.get(ip) || [];
        const active = recent.filter((t) => Date.now() - t < 60000);
        assert(active.length < 10, "Réessaie dans une minute", 429);
        active.push(Date.now());
        attempts.set(ip, active);
        assert(
          authEnabled() && equal(b.user, adminName()) && validPassword(b.password),
          "Identifiants incorrects",
          401,
        );
        issueSession(res, req, "admin");
        return json(res, { ok: true });
      }
      if (url.pathname === "/api/login/nuvio") {
        assert(!setupRequired(), "Configuration initiale requise", 428);
        const b = await body(req),
          ip = req.socket.remoteAddress,
          recent = (attempts.get(ip) || []).filter((t) => Date.now() - t < 60000);
        assert(recent.length < 10, "Réessaie dans une minute", 429);
        recent.push(Date.now());
        attempts.set(ip, recent);
        const email = String(b.email || "").trim(),
          password = String(b.password || "");
        assert(email && password, "Email et mot de passe requis", 400);
        // The account must already be connected by an admin; its provider tells
        // us which backend (Nuvio or Tuvora) to verify the password against.
        const candidates = state.accounts.filter(
          (a) => a.email && a.email.toLowerCase() === email.toLowerCase(),
        );
        assert(
          candidates.length,
          "Ce compte n’a pas accès à ce dashboard. Demande à l’administrateur de l’ajouter.",
          403,
        );
        let acc = null,
          data = null;
        for (const candidate of candidates) {
          try {
            const attempt = await call(
              "/auth/v1/token?grant_type=password",
              { email, password },
              undefined,
              "POST",
              candidate.provider,
            );
            if (attempt?.user?.id === candidate.id) {
              acc = candidate;
              data = attempt;
              break;
            }
          } catch {
            /* wrong password on this provider, try the next match */
          }
        }
        if (!acc) throw Object.assign(new Error("Identifiants incorrects"), { status: 401 });
        if (data.access_token) {
          acc.access = data.access_token;
          acc.refresh = data.refresh_token || acc.refresh;
          acc.expires = Date.now() + (Number(data.expires_in) || 3600) * 1000;
          save();
        }
        issueSession(res, req, "nuvio", acc.id);
        return json(res, { ok: true });
      }
      const sid = req.headers.cookie?.match(
        /(?:^|; )nm_session=([a-f0-9]+)/,
      )?.[1];
      const session = sessions.get(sid);
      if (session && session.exp <= Date.now()) {
        sessions.delete(sid);
        saveSessions();
      }
      // Hybrid auth: when the request carries an identity from a trusted auth
      // proxy, it is the admin without a local session (no double login). Any
      // other request falls back to the manager's own session/login.
      const proxyAdmin =
        authProxyEnabled() && isTrustedProxy(req) && Boolean(proxyIdentity(req));
      if (!loginDisabled() && !proxyAdmin) {
        assert(!setupRequired(), "Configuration initiale requise", 428);
        assert(authEnabled() && session && session.exp > Date.now(), "Connexion au dashboard requise", 401);
      }
      const viewer = (!loginDisabled() && !proxyAdmin && session?.role === "nuvio")
        ? { role: "nuvio", account: session.account }
        : { role: "admin", account: null };
      const uiLang = requestLang(req);
      const tmdbLanguage = TMDB_LOCALES[uiLang];
      const b = req.method === "GET"
        ? {}
        : await body(req, url.pathname === "/api/backup/restore-file" ? 25_000_000 : 2_000_000);
      const route = url.pathname;
      // Authorization. Admin has full access; a Nuvio viewer is confined to its
      // own account and cannot reach admin-only routes. A Nuvio account can be
      // promoted to admin (panel.adminAccounts) and then has no restriction, but
      // only the local account may edit the local credentials.
      const isLocalAdmin = viewer.role === "admin";
      const adminAccountIds = Array.isArray(panel.adminAccounts) ? panel.adminAccounts : [];
      const isAdmin = isLocalAdmin || (viewer.role === "nuvio" && adminAccountIds.includes(viewer.account));
      const ADMIN_ONLY = new Set([
        "/api/settings", "/api/settings/tmdb", "/api/settings/proxy", "/api/settings/public-url",
        "/api/settings/proxy/test", "/api/settings/admin", "/api/settings/admins", "/api/settings/trackers",
        "/api/settings/history", "/api/history/status", "/api/history/sync",
        "/api/settings/login",
        "/api/overview", "/api/metrics/history",
        "/api/pair/start", "/api/pair/poll",
        "/api/accounts/rename", "/api/accounts/remove", "/api/accounts/connect",
        "/api/library/save", "/api/library/refresh-logos", "/api/library/remove",
        "/api/backup/create", "/api/backup/delete", "/api/backup/restore",
        "/api/backup/restore-file", "/api/backup/download",
      ]);
      if (ADMIN_ONLY.has(route)) assert(isAdmin, "Accès réservé à l’administrateur", 403);
      if (!isAdmin) {
        const refAccount = b?.accountId ?? url.searchParams.get("accountId");
        if (refAccount != null && refAccount !== "") assert(refAccount === viewer.account, "Accès refusé à ce compte", 403);
        if (b?.source?.accountId) assert(b.source.accountId === viewer.account, "Accès refusé", 403);
        assert(!b?.assignment, "Accès réservé à l’administrateur", 403);
      }
      if (route === "/api/settings") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        let externalProxy;
        try {
          externalProxy = {
            ...proxySummary(effectiveProxyUrl()),
            source: panel.proxyUrl !== undefined ? "dashboard" : "environment",
            valid: true,
          };
        } catch (error) {
          externalProxy = {
            configured: Boolean(effectiveProxyUrl()),
            display: "Configuration invalide",
            type: "",
            source: panel.proxyUrl !== undefined ? "dashboard" : "environment",
            valid: false,
            error: error.message,
          };
        }
        return json(res, {
          username: adminName(),
          authEnabled: authEnabled(),
          publicUrl: publicOrigin(),
          tmdbConfigured: Boolean(panel.tmdbKey),
          externalProxy,
          isLocalAdmin,
          adminManaged: adminFromEnv,
          loginDisabled: loginDisabled(),
          loginManaged: loginManagedByEnv,
          authProxy: authProxyEnabled(),
          authProxyManaged: authProxyManagedByEnv,
          adminAccounts: adminAccountIds,
          accounts: state.accounts.map(({ id, email, name }) => ({ id, email, name: name || email })),
          trackers: {
            trakt: {
              configured: Boolean(panel.trackerApps?.trakt?.clientId && panel.trackerApps?.trakt?.clientSecret),
              clientId: panel.trackerApps?.trakt?.clientId || "",
            },
            simkl: {
              configured: Boolean(panel.trackerApps?.simkl?.clientId),
              clientId: panel.trackerApps?.simkl?.clientId || "",
            },
          },
          history: {
            enabled: panel.historySyncEnabled !== false,
            intervalMinutes: Number(panel.historySyncMinutes) || 30,
            lastFullSync: historyStore.status().lastFullSync,
          },
        });
      }
      if (route === "/api/settings/history") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        if (typeof b.enabled === "boolean") panel.historySyncEnabled = b.enabled;
        if (b.intervalMinutes !== undefined) {
          const minutes = Number(b.intervalMinutes);
          assert(Number.isInteger(minutes) && minutes >= 5 && minutes <= 1440, "Intervalle entre 5 et 1440 minutes");
          panel.historySyncMinutes = minutes;
        }
        savePanel();
        historyStore.reschedule();
        return json(res, { ok: true, enabled: panel.historySyncEnabled !== false, intervalMinutes: Number(panel.historySyncMinutes) || 30 });
      }
      if (route === "/api/history/status") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        return json(res, historyStore.status());
      }
      if (route === "/api/history/sync") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        await historyStore.syncAll({ force: true });
        statisticsCache.clear();
        return json(res, historyStore.status());
      }
      if (route === "/api/settings/login") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(!loginManagedByEnv, "La page de connexion est gérée par l’environnement (DISABLE_LOGIN).", 409);
        assert(typeof b.disabled === "boolean", "Valeur attendue", 400);
        panel.loginDisabled = b.disabled;
        savePanel();
        return json(res, { ok: true, loginDisabled: panel.loginDisabled });
      }
      if (route === "/api/settings/auth-proxy") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(!authProxyManagedByEnv, "L’authentification externe est gérée par l’environnement (AUTH_PROXY).", 409);
        assert(typeof b.enabled === "boolean", "Valeur attendue", 400);
        panel.authProxy = b.enabled;
        savePanel();
        return json(res, { ok: true, authProxy: authProxyEnabled() });
      }
      if (route === "/api/settings/tmdb") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(typeof b.key === "string" && b.key.length <= 4096, "Clé invalide");
        const next = {...panel, tmdbKey: b.key.trim()};
        db.write("panel-settings", next); Object.assign(panel,next);
        return json(res, {ok:true});
      }
      if (route === "/api/settings/proxy") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(typeof b.url === "string", "URL du proxy requise");
        panel.proxyUrl = normalizeProxyUrl(b.url);
        savePanel();
        return json(res, { ok: true, ...proxySummary(panel.proxyUrl) });
      }
      if (route === "/api/settings/public-url") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(typeof b.url === "string", "Adresse publique requise");
        panel.publicUrl = normalizePublicUrl(b.url);
        savePanel();
        return json(res, { ok: true, url: panel.publicUrl });
      }
      if (route === "/api/settings/proxy/test") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const candidate = typeof b.url === "string" && b.url.trim()
          ? normalizeProxyUrl(b.url)
          : effectiveProxyUrl();
        assert(candidate, "Aucun proxy externe n’est configuré");
        return json(res, await addonProxy.test("warp", candidate));
      }
      if (route === "/api/settings/admins") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const target = state.accounts.find((a) => a.id === b.accountId);
        assert(target, "Compte introuvable", 404);
        const set = new Set(adminAccountIds);
        if (b.admin) set.add(target.id);
        else set.delete(target.id);
        panel.adminAccounts = [...set];
        savePanel();
        return json(res, { ok: true, adminAccounts: panel.adminAccounts });
      }
      if (route === "/api/settings/admin") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(!adminFromEnv, "L’administrateur est géré par l’environnement (compose).", 409);
        assert(isLocalAdmin, "Seul le compte local peut modifier ses identifiants", 403);
        const ip = req.socket.remoteAddress, active = (attempts.get(ip) || []).filter(t=>Date.now()-t<60000);
        assert(active.length < 10, "Réessaie dans une minute", 429);
        active.push(Date.now()); attempts.set(ip,active);
        assert(validPassword(b.currentPassword), "Mot de passe actuel incorrect", 403);
        assert(typeof b.username === "string" && b.username.trim().length > 0 && b.username.trim().length <= 80, "Nom d’utilisateur requis (80 caractères maximum)");
        assert(typeof b.newPassword === "string" && b.newPassword.length <= 1024, "Mot de passe invalide");
        assert(b.newPassword === "" || b.newPassword.length >= 12, "Le nouveau mot de passe doit contenir au moins 12 caractères");
        const record = b.newPassword ? hashPassword(b.newPassword) : panel.admin;
        const next = {...panel,admin:{salt:record.salt,hash:record.hash,username:b.username.trim()}};
        db.write("panel-settings",next); Object.assign(panel,next);
        sessions.clear();
        issueSession(res, req);
        return json(res,{ok:true});
      }
      if (route === "/api/settings/trackers") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        for (const value of [b.traktClientId, b.traktClientSecret, b.simklClientId])
          assert(typeof value === "string" && value.length <= 4096, "Identifiant d’application invalide");
        panel.trackerApps = {
          trakt: {
            clientId: b.traktClientId.trim(),
            clientSecret: b.traktClientSecret.trim() || panel.trackerApps?.trakt?.clientSecret || "",
          },
          simkl: { clientId: b.simklClientId.trim() },
        };
        trackerCache.entries = {};
        db.write("tracker-cache", trackerCache);
        statisticsCache.clear();
        savePanel();
        return json(res, { ok: true });
      }
      if (route === "/api/overview") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        return json(res, await overview());
      }
      if (route === "/api/metrics/history") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        return json(res, {
          series: metricsSeries(url.searchParams.get("period")),
          current: latestSample,
        });
      }
      if (route === "/api/state")
        return json(res, {
          viewer: { role: viewer.role, account: viewer.account, isAdmin },
          accounts: state.accounts
            .filter((a) => isAdmin || a.id === viewer.account)
            .map(({ id, email, name, provider }) => ({ id, email, name: name || email, provider: providerOf(provider).id })),
          library: isAdmin ? state.library : [],
          backups: isAdmin ? state.backups : [],
          backend,
        });
      if (route === "/api/logout") {
        sessions.delete(sid);
        saveSessions();
        res.setHeader("Set-Cookie", sessionCookie(req, "", 0));
        return json(res, { ok: true });
      }
      if (route === "/api/pair/start") {
        const provider = providerOf(b.provider);
        const nonce = crypto.randomBytes(24).toString("hex");
        const result = (
          await rpc(
            "start_tv_login_session",
            {
              p_device_nonce: nonce,
              p_redirect_base_url: provider.loginUrl,
              p_device_name: "Nuvio Manager",
            },
            undefined,
            provider.id,
          )
        )[0];
        const id = crypto.randomUUID();
        pairings.set(id, { ...result, nonce, provider: provider.id });
        return json(res, { id, ...result });
      }
      if (route === "/api/pair/poll") {
        const p = pairings.get(b.id);
        assert(p && Date.parse(p.expires_at) > Date.now(), "Code expiré");
        assert(!p.busy, "Vérification déjà en cours", 409);
        p.busy = true;
        try {
          const result = (
            await rpc(
              "poll_tv_login_session",
              {
                p_code: p.code,
                p_device_nonce: p.nonce,
              },
              undefined,
              p.provider,
            )
          )[0];
          if (result.status !== "approved")
            return json(res, { status: result.status });
          const t = await call(
            "/functions/v1/tv-logins-exchange",
            {
              code: p.code,
              device_nonce: p.nonce,
            },
            undefined,
            "POST",
            p.provider,
          );
          const a = await addSession(t, p.provider);
          pairings.delete(b.id);
          return json(res, { status: "connected", account: a });
        } finally {
          p.busy = false;
        }
      }
      if (route === "/api/accounts/connect") {
        // Password connect for providers whose device-login flow the dashboard
        // cannot drive as anon (Tuvora). The password is exchanged for tokens
        // and never stored — only the resulting refresh token is kept.
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const providerId = providerOf(b.provider).id;
        const email = String(b.email || "").trim(),
          password = String(b.password || "");
        assert(email && password, "Email et mot de passe requis", 400);
        let data;
        try {
          data = await call(
            "/auth/v1/token?grant_type=password",
            { email, password },
            undefined,
            "POST",
            providerId,
          );
        } catch {
          throw Object.assign(new Error("Identifiants incorrects"), { status: 401 });
        }
        assert(data?.access_token, "Identifiants incorrects", 401);
        const connected = await addSession(data, providerId);
        return json(res, { status: "connected", account: connected });
      }
      if (route === "/api/accounts/rename") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const a = account(b.accountId);
        assert(typeof b.name === "string", "Nom invalide");
        const name = b.name.trim();
        assert(name.length <= 80, "Le nom est limité à 80 caractères");
        if (name) a.name = name;
        else delete a.name;
        save();
        return json(res, { id: a.id, email: a.email, name: a.name || a.email });
      }
      if (route === "/api/accounts/remove") {
        const a = account(b.accountId);
        state.accounts = state.accounts.filter((x) => x !== a);
        // Kill every relay link of this account so already-saved proxy URLs stop
        // working as soon as it leaves the manager.
        addonProxy.revokeAccount(a.id);
        historyStore.pruneAccount(a.id);
        const prefix = `${a.id}:`;
        if (Array.isArray(panel.adminAccounts))
          panel.adminAccounts = panel.adminAccounts.filter((id) => id !== a.id);
        for (const ref of Object.keys(panel.connections || {}))
          if (ref.startsWith(prefix)) delete panel.connections[ref];
        for (const ref of Object.keys(panel.statsNuvioDisabled || {}))
          if (ref.startsWith(prefix)) delete panel.statsNuvioDisabled[ref];
        for (const ref of Object.keys(trackerCache.entries || {}))
          if (ref.startsWith(prefix)) delete trackerCache.entries[ref];
        save();
        savePanel();
        db.write("tracker-cache", trackerCache);
        statisticsCache.clear();
        return json(res, { ok: true });
      }
      if (route === "/api/profiles") {
        const a = account(url.searchParams.get("accountId"));
        return json(res, await profileList(await token(a), a.provider));
      }
      if (route === "/api/xperience-avatars") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        return json(res, await getXperienceAvatars());
      }
      if (route === "/api/activity") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const activityAccount = account(url.searchParams.get("accountId"));
        const profileId = Number(url.searchParams.get("profileId"));
        const kind = url.searchParams.get("kind");
        const page = Number(url.searchParams.get("page") || 1);
        const ref = `${activityAccount.id}:${profileId}`;
        // Served from the local mirror; a manual refresh re-syncs just this
        // profile first, and a not-yet-synced profile falls back to a live read.
        if (url.searchParams.has("refresh")) await historyStore.syncProfile(ref);
        let result = historyStore.getActivity(ref, kind, page);
        if (!result)
          result = await activity(await token(activityAccount), profileId, kind, page, activityAccount.provider);
        return json(res, await enrichActivity(result, {
          key: panel.tmdbKey,
          cache: tmdbCache,
          persist: (value) => db.write("tmdb-cache", value),
          language: tmdbLanguage,
        }));
      }
      if (route === "/api/iptv") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const a = account(url.searchParams.get("accountId"));
        assert(providerOf(a.provider).id === "tuvora", "Réservé aux comptes Tuvora", 400);
        const playlists = await iptvPlaylists(await token(a), Number(url.searchParams.get("profileId")), a.provider);
        return json(res, { playlists });
      }
      if (route === "/api/iptv/save") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const a = account(b.accountId);
        assert(providerOf(a.provider).id === "tuvora", "Réservé aux comptes Tuvora", 400);
        assert(Array.isArray(b.playlists), "Liste de playlists invalide", 400);
        let backupId = null;
        try {
          backupId = await backup(a, "Modification des playlists IPTV");
        } catch {
          /* Tuvora may not expose the backup RPC; the save still proceeds. */
        }
        const result = await pushIptvPlaylists(await token(a), Number(b.profileId), b.playlists, a.provider);
        statisticsCache.clear();
        return json(res, { ok: true, result, backupId });
      }
      if (route === "/api/sports") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const a = account(url.searchParams.get("accountId"));
        assert(providerOf(a.provider).id === "tuvora", "Réservé aux comptes Tuvora", 400);
        const data = await radarFollows(await token(a), Number(url.searchParams.get("profileId")), a.provider);
        return json(res, data);
      }
      if (route === "/api/sports/save") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const a = account(b.accountId);
        assert(providerOf(a.provider).id === "tuvora", "Réservé aux comptes Tuvora", 400);
        assert(Array.isArray(b.leagues) && Array.isArray(b.teams), "Sélection sport invalide", 400);
        const profileId = Number(b.profileId);
        // p_prefs is required by the RPC but not editable here: round-trip the
        // current radar_prefs rows so saving follows never wipes preferences.
        const current = await radarFollows(await token(a), profileId, a.provider);
        const result = await pushRadar(
          await token(a),
          profileId,
          b.leagues,
          b.teams,
          current.prefs,
          a.provider,
        );
        return json(res, { ok: true, result });
      }
      if (route === "/api/sports/search") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const a = account(url.searchParams.get("accountId"));
        assert(providerOf(a.provider).id === "tuvora", "Réservé aux comptes Tuvora", 400);
        const kind = url.searchParams.get("kind") === "team" ? "team" : "league";
        const query = String(url.searchParams.get("q") || "").trim();
        if (query.length < 2) return json(res, { results: [] });
        const results = await radarSearch(await token(a), kind, query, a.provider);
        return json(res, { results });
      }
      if (route === "/api/collections") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const a = account(url.searchParams.get("accountId"));
        const profileId = Number(url.searchParams.get("profileId"));
        await assertProfile(a.id, profileId);
        const access = await token(a);
        const [home, cols, catalogs] = await Promise.all([
          homeCatalogSettings(access, profileId, a.provider),
          collections(access, profileId, a.provider),
          catalogSources(access, profileId, a.provider).catch(() => []),
        ]);
        // If the profile never organized its home, the remote items are empty.
        // We do NOT fabricate a default order: the user must set it from the app
        // or the official site. The empty list is surfaced as-is to the client.
        return json(res, { provider: providerOf(a.provider).id, home, collections: cols, catalogs });
      }
      if (route === "/api/collections/save") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const a = account(b.accountId);
        const profileId = Number(b.profileId);
        await assertProfile(a.id, profileId);
        assert(Array.isArray(b.collections), "Liste de collections invalide", 400);
        let backupId = null;
        try {
          backupId = await backup(a, "Modification des collections");
        } catch {
          /* Tuvora may not expose the backup RPC; the save still proceeds. */
        }
        const result = await pushCollections(await token(a), profileId, b.collections, a.provider, originId(a));
        statisticsCache.clear();
        return json(res, { ok: true, result, backupId });
      }
      if (route === "/api/catalogs/save") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const a = account(b.accountId);
        const profileId = Number(b.profileId);
        await assertProfile(a.id, profileId);
        assert(b.settings && Array.isArray(b.settings.items), "Réglages de catalogues invalides", 400);
        const settingsJson = {
          hide_unreleased_content: Boolean(b.settings.hide_unreleased_content),
          items: b.settings.items,
        };
        const result = await pushHomeCatalogSettings(await token(a), profileId, settingsJson, a.provider, originId(a));
        return json(res, { ok: true, result });
      }
      if (route === "/api/statistics") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const days = Number(url.searchParams.get("days") ?? 30);
        assert(Number.isInteger(days) && days >= 0 && days <= 3650, "Période invalide");
        const requestedProfiles = [...new Set(
          (url.searchParams.get("profiles") || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        )].sort();
        const statsAccounts = isAdmin ? state.accounts : state.accounts.filter((a) => a.id === viewer.account);
        const cacheKey = `stats-v8:${uiLang}:${viewer.account || "admin"}:${days}:${requestedProfiles.join(",")}`;
        const cached = statisticsCache.get(cacheKey);
        if (!url.searchParams.has("refresh") && cached?.expiresAt > Date.now())
          return json(res, cached.value);
        // Serve from the local mirror. A manual refresh forces a sync first; the
        // very first load (empty store) falls back to a live collect.
        if (url.searchParams.has("refresh") && isAdmin) await historyStore.syncAll({ force: true });
        let dataset = historyStore.getDataset(statsAccounts);
        if (!dataset.length && !historyStore.hasData(statsAccounts))
          dataset = await collectNuvioStatistics(statsAccounts, {
            getToken: token,
            rpc,
            externalHistory,
            getProfiles: profileList,
          });
        // Profiles that opted out of their own app history (Nuvio or Tuvora)
        // keep only Trakt/Simkl.
        const nuvioDisabled = panel.statsNuvioDisabled || {};
        const ownHistory = (source) => source === "nuvio" || source === "tuvora";
        for (const profile of dataset) {
          if (!nuvioDisabled[profile.ref]) continue;
          profile.events = profile.events.filter((event) => !ownHistory(event.source));
          profile.progress = [];
          profile.sources = profile.sources.filter((source) => !ownHistory(source));
        }
        const availableProfiles = dataset.map((profile) => ({
          ref: profile.ref,
          accountName: profile.accountName,
          profileName: profile.profileName,
        }));
        const selected = requestedProfiles.length
          ? dataset.filter((profile) => requestedProfiles.includes(profile.ref))
          : dataset;
        const result = summarizeStatistics(selected, days);
        result.availableProfiles = availableProfiles;
        const rankedItems = Object.values(result.rankings || {}).flat();
        const timelineItems = (result.timeline || []).flatMap((day) => day.items || []);
        const metadataItems = [
          ...new Map(
            [...result.top, ...rankedItems, ...result.recent, ...timelineItems].map((item) => {
              const contentType = item.kind === "movie" ? "movie" : "series";
              return [
                `${contentType}:${item.contentId}`,
                { content_id: item.contentId, content_type: contentType },
              ];
            }),
          ).values(),
        ];
        const enriched = await enrichActivity(
          {
            items: metadataItems,
          },
          {
            key: panel.tmdbKey,
            cache: tmdbCache,
            persist: (value) => db.write("tmdb-cache", value),
            language: tmdbLanguage,
          },
        );
        const metadata = new Map(
          enriched.items.map((item) => [
            `${item.content_type}:${item.content_id}`,
            item.metadata,
          ]),
        );
        result.top = result.top.map((item) => ({
          ...item,
          metadata: metadata.get(`${item.kind === "movie" ? "movie" : "series"}:${item.contentId}`) || null,
        }));
        result.recent = result.recent.map((item) => ({
          ...item,
          metadata: metadata.get(`${item.kind === "movie" ? "movie" : "series"}:${item.contentId}`) || null,
        }));
        result.rankings = Object.fromEntries(
          Object.entries(result.rankings || {}).map(([name, items]) => [
            name,
            items.map((item) => ({
              ...item,
              metadata: metadata.get(`${item.kind === "movie" ? "movie" : "series"}:${item.contentId}`) || null,
            })),
          ]),
        );
        // Attach the TMDB title (localized) + slim poster/backdrop to each day's
        // items so the day view matches the rest of the UI's language instead of
        // showing each source's raw title (Nuvio in FR, Simkl in EN, …).
        result.timeline = (result.timeline || []).map((day) => ({
          ...day,
          items: (day.items || []).map((item) => {
            const meta = metadata.get(`${item.kind === "movie" ? "movie" : "series"}:${item.contentId}`);
            return {
              ...item,
              title: meta?.title || item.title,
              poster: meta?.poster || null,
              backdrop: meta?.backdrop || null,
            };
          }),
        }));
        result.tmdb = enriched.tmdb;
        // Full metadata keyed by "type:contentId" (deduped, one entry per title)
        // so the day view can open a complete media sheet for any title, not just
        // the ranked ones, without bloating each timeline event.
        result.mediaMetadata = Object.fromEntries(
          [...metadata.entries()].filter(([, value]) => value),
        );
        statisticsCache.set(cacheKey, {
          expiresAt: Date.now() + 5 * 60 * 1000,
          value: result,
        });
        return json(res, result);
      }
      if (route === "/api/connections") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const selectedAccount = url.searchParams.get("accountId"),
          selectedProfile = Number(url.searchParams.get("profileId"));
        await assertProfile(selectedAccount, selectedProfile);
        const rows = panel.connections?.[connectionRef(selectedAccount, selectedProfile)] || {};
        return json(res, {
          configured: {
            trakt: Boolean(trackerConfig("trakt").clientId && trackerConfig("trakt").clientSecret),
            simkl: Boolean(trackerConfig("simkl").clientId),
          },
          connections: Object.fromEntries(["trakt", "simkl"].map((service) => [service, rows[service] ? {
            connected: true,
            connectedAt: rows[service].connectedAt,
            lastSync: rows[service].lastSync || null,
            lastError: rows[service].lastError || "",
          } : { connected: false }])),
          statsNuvioDisabled: Boolean(panel.statsNuvioDisabled?.[connectionRef(selectedAccount, selectedProfile)]),
        });
      }
      if (route === "/api/connections/stats-source") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        await assertProfile(b.accountId, Number(b.profileId));
        const ref = connectionRef(b.accountId, Number(b.profileId));
        panel.statsNuvioDisabled ??= {};
        if (b.disabled) panel.statsNuvioDisabled[ref] = true;
        else delete panel.statsNuvioDisabled[ref];
        savePanel();
        statisticsCache.clear();
        return json(res, { ok: true, disabled: Boolean(b.disabled) });
      }
      if (route === "/api/connections/start") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(["trakt", "simkl"].includes(b.service), "Service invalide");
        await assertProfile(b.accountId, Number(b.profileId));
        const pairing = b.service === "trakt"
          ? await startTrakt(trackerConfig("trakt"))
          : await startSimkl(trackerConfig("simkl"));
        const id = crypto.randomUUID();
        trackerPairings.set(id, {
          ...pairing,
          service: b.service,
          accountId: b.accountId,
          profileId: Number(b.profileId),
          busy: false,
        });
        return json(res, {
          id,
          service: b.service,
          userCode: pairing.userCode,
          verificationUrl: pairing.verificationUrl,
          interval: pairing.interval,
          expiresAt: pairing.expiresAt,
        });
      }
      if (route === "/api/connections/poll") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const pairing = trackerPairings.get(b.id);
        assert(pairing && !pairing.busy, "Association introuvable ou déjà vérifiée", 409);
        pairing.busy = true;
        try {
          const result = pairing.service === "trakt"
            ? await pollTrakt(pairing, trackerConfig("trakt"))
            : await pollSimkl(pairing, trackerConfig("simkl"));
          if (result.status !== "connected") {
            if (result.interval) pairing.interval = result.interval;
            return json(res, { status: "pending", interval: pairing.interval });
          }
          panel.connections ??= {};
          const ref = connectionRef(pairing.accountId, pairing.profileId);
          panel.connections[ref] ??= {};
          panel.connections[ref][pairing.service] = result.connection;
          savePanel();
          trackerPairings.delete(b.id);
          statisticsCache.clear();
          return json(res, { status: "connected", service: pairing.service });
        } finally {
          pairing.busy = false;
        }
      }
      if (route === "/api/connections/disconnect") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(["trakt", "simkl"].includes(b.service), "Service invalide");
        await assertProfile(b.accountId, Number(b.profileId));
        const ref = connectionRef(b.accountId, Number(b.profileId));
        if (panel.connections?.[ref]) delete panel.connections[ref][b.service];
        delete trackerCache.entries?.[`${ref}:${b.service}`];
        savePanel();
        db.write("tracker-cache", trackerCache);
        statisticsCache.clear();
        return json(res, { ok: true });
      }
      if (route === "/api/profile") {
        const a = account(url.searchParams.get("accountId"));
        const profileId = Number(url.searchParams.get("profileId"));
        const data = await profile(await token(a), profileId, a.provider);
        // Revoke relay grants whose addon is no longer in the profile's list.
        addonProxy.reconcile(a.id, profileId, (data.addons || []).map((x) => x.url));
        return json(res, data);
      }
      if (route === "/api/profile/identity") {
        const a = account(b.accountId);
        assert(typeof b.name === "string" && b.name.trim(), "Nom requis");
        assert(
          typeof b.color === "string" && /^#[0-9a-f]{6}$/i.test(b.color),
          "Couleur de profil invalide",
        );
        const avatarId = typeof b.avatarId === "string" ? b.avatarId.trim() : "";
        const avatarUrl = typeof b.avatarUrl === "string" ? b.avatarUrl.trim() : "";
        assert(!(avatarId && avatarUrl), "Choisissez un avatar Nuvio ou une URL personnalisée");
        const normalizedAvatarUrl = avatarUrl ? normalizeUrl(avatarUrl) : null;
        const t = await token(a);
        const id = await backup(a, "Modification du profil");
        const patch = {
          name: b.name.trim(),
          avatar_color_hex: b.color.toUpperCase(),
          uses_primary_addons: Boolean(b.inheritAddons),
          uses_primary_plugins: Boolean(b.inheritPlugins),
          ...(avatarId ? { avatar_id: avatarId } : { avatar_url: normalizedAvatarUrl }),
        };
        const result = isTuvora(a)
          ? await patchProfileRow(a, t, Number(b.profileId), patch)
          : await rpc(
              "sync_patch_profile",
              {
                p_profile_id: Number(b.profileId),
                p_name: patch.name,
                p_avatar_color_hex: patch.avatar_color_hex,
                p_uses_primary_addons: patch.uses_primary_addons,
                p_uses_primary_plugins: patch.uses_primary_plugins,
                p_avatar_url: normalizedAvatarUrl,
                p_avatar_url_provided: !avatarId,
                p_avatar_id: avatarId || null,
                p_avatar_id_provided: Boolean(avatarId),
              },
              t,
              a.provider,
            );
        return json(res, { result, backupId: id });
      }
      if (route === "/api/profile/create") {
        const a = account(b.accountId),
          t = await token(a),
          rows = await rpc("sync_pull_profiles", {}, t, a.provider);
        assert(typeof b.name === "string" && b.name.trim(), "Nom requis");
        const index = [1, 2, 3, 4, 5, 6].find(
          (id) => !rows.some((p) => p.profile_index === id),
        );
        assert(index, "Limite de six profils atteinte");
        const backupId = await backup(a, "Création de profil");
        await rpc(
          "sync_push_profiles",
          {
            p_client_max_profiles: 6,
            p_profiles: [
              ...rows.map(
                ({
                  profile_index,
                  name,
                  avatar_color_hex,
                  uses_primary_addons,
                  uses_primary_plugins,
                  avatar_id,
                  avatar_url,
                }) => ({
                  profile_index,
                  name,
                  avatar_color_hex,
                  uses_primary_addons,
                  uses_primary_plugins,
                  avatar_id,
                  avatar_url,
                }),
              ),
              {
                profile_index: index,
                name: b.name.trim(),
                avatar_color_hex: "#31B7AA",
                uses_primary_addons: false,
                uses_primary_plugins: false,
              },
            ],
            ...originId(a),
          },
          t,
          a.provider,
        );
        return json(res, { backupId });
      }
      if (route === "/api/library/save") {
        assert(typeof b.name === "string" && b.name.trim(), "Nom requis");
        let address = normalizeUrl(b.url);
        if (!new URL(address).pathname.endsWith("/manifest.json")) {
          const u = new URL(address);
          u.pathname = u.pathname.replace(/\/$/, "") + "/manifest.json";
          address = u.href;
        }
        const previous = state.library.find((item) => item.id === b.id);
        const logo = await readManifestLogo(address).catch(() => previous?.logo || null);
        const item = {
          id: b.id || crypto.randomUUID(),
          name: b.name.trim(),
          url: address,
          logo,
          logo_checked_at: new Date().toISOString(),
        };
        state.library = state.library.filter((i) => i.id !== item.id);
        state.library.push(item);
        save();
        return json(res, item);
      }
      if (route === "/api/library/refresh-logos") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        await Promise.all(state.library
          .filter((item) => !Object.hasOwn(item, "logo"))
          .map(async (item) => {
            item.logo = await readManifestLogo(item.url).catch(() => null);
            item.logo_checked_at = new Date().toISOString();
          }));
        save();
        return json(res, { library: state.library });
      }
      if (route === "/api/library/remove") {
        state.library = state.library.filter((i) => i.id !== b.id);
        save();
        return json(res, { ok: true });
      }
      if (route === "/api/proxy/status") {
        return json(res, await addonProxy.status());
      }
      if (route === "/api/proxy/test") {
        assert(["direct", "warp"].includes(b.mode), "Mode inconnu");
        return json(res, await addonProxy.test(b.mode));
      }
      if (route === "/api/preview") {
        const a = account(b.accountId),
          target = await profile(await token(a), Number(b.profileId), a.provider);
        let desired = b.desired;
        const extra = {};
        const extraDiff = [];
        let sourceName = null, targetName = null;
        if (b.source) {
          assert(
            b.source.accountId !== b.accountId ||
              Number(b.source.profileId) !== Number(b.profileId),
            "Choisis un profil différent",
          );
          const sourceAccount = account(b.source.accountId);
          const sourceToken = await token(sourceAccount);
          const sourceProfileId = Number(b.source.profileId);
          const source = await profile(sourceToken, sourceProfileId, sourceAccount.provider);
          sourceName = source.identity?.name || null;
          targetName = target.identity?.name || null;
          desired = {};
          for (const part of ["tv", "mobile"])
            if (b.selection?.[part])
              desired[part] = Array.isArray(b.selection[part])
                ? copyPaths(
                    source[part].settings_json,
                    target[part].settings_json,
                    b.selection[part],
                  )
                : source[part].settings_json;
          for (const part of ["addons", "plugins"]) {
            if (!b.selection?.[part]) continue;
            let srcRows = writableList(source[part]);
            // Addons may carry relay URLs: re-mint them so the target owns its
            // own revocable grants instead of pointing at the source's.
            if (part === "addons")
              srcRows = await remapRelayAddons(srcRows, {
                accountId: a.id,
                profileId: Number(b.profileId),
              });
            if (!b.merge) {
              desired[part] = srcRows;
              continue;
            }
            const keyOf = part === "addons" ? addonUpstreamKey : (u) => u;
            const have = new Set(writableList(target[part]).map((y) => keyOf(y.url)));
            desired[part] = [
              ...writableList(target[part]),
              ...srcRows.filter((x) => !have.has(keyOf(x.url))),
            ];
          }
          // Home catalogs + collections use their own RPCs (not the diff pipeline),
          // so they are carried on the plan and shown as a summary row each.
          const targetToken = await token(a);
          if (b.selection?.catalogs) {
            const srcHome = await homeCatalogSettings(sourceToken, sourceProfileId, sourceAccount.provider);
            if (srcHome.items.length) {
              extra.catalogs = { hide_unreleased_content: srcHome.hideUnreleasedContent, items: srcHome.items };
              const tgtHome = await homeCatalogSettings(targetToken, Number(b.profileId), a.provider);
              extraDiff.push({ path: ["catalogs"], before: tgtHome.items.length, after: srcHome.items.length });
            }
          }
          if (b.selection?.collections) {
            const srcCols = await collections(sourceToken, sourceProfileId, sourceAccount.provider);
            // Never wipe the destination's collections with an empty source
            // (mirrors the catalogs guard): an empty source is skipped, not copied.
            if (srcCols.length) {
              const tgtCols = await collections(targetToken, Number(b.profileId), a.provider);
              extra.collections = srcCols;
              extraDiff.push({ path: ["collections"], before: tgtCols.length, after: srcCols.length });
            }
          }
        }
        if (b.assignment) {
          const item = state.library.find((x) => x.id === b.assignment.id);
          assert(item, "Addon introuvable");
          const installUrl = await installation(item, b.assignment.mode, {
            accountId: a.id,
            profileId: Number(b.profileId),
          });
          const rows = writableList(target.addons);
          const existing = rows.find((x) => x.url === installUrl);
          if (!existing)
            rows.push({
              url: installUrl,
              name: item.name,
              enabled: true,
              sort_order: rows.length,
            });
          desired = { addons: rows };
        }
        assert(desired && typeof desired === "object", "Sélection requise");
        desired = desiredParts(target, desired);
        const before = snapshotParts(target, Object.keys(desired));
        // UI must provide its read version for editor saves; never rebase stale edits silently.
        if (b.expected)
          assert(
            hash(before) === b.expected,
            "Le profil a changé. Recharge avant de sauvegarder.",
            409,
          );
        const diff = [...changes(before, desired), ...extraDiff];
        const id = crypto.randomUUID();
        plans.set(id, {
          accountId: a.id,
          profileId: Number(b.profileId),
          target,
          desired,
          before,
          extra,
          expires: Date.now() + 10 * 60000,
        });
        return json(res, { id, diff, count: diff.length, sourceName, targetName });
      }
      if (route === "/api/apply") {
        const p = plans.get(b.id);
        assert(p && p.expires > Date.now(), "Aperçu expiré");
        assert(isAdmin || p.accountId === viewer.account, "Accès refusé", 403);
        const key = p.accountId + ":" + p.profileId;
        assert(!locks.has(key), "Une écriture est en cours", 409);
        locks.add(key);
        plans.delete(b.id);
        const completed = [];
        let backupId;
        try {
          const a = account(p.accountId),
            t = await token(a),
            current = await profile(t, p.profileId, a.provider);
          assert(
            hash(snapshotParts(current, Object.keys(p.desired))) ===
              hash(p.before),
            "Le profil a changé depuis l’aperçu. Recharge et recommence.",
            409,
          );
          backupId = await backup(a, "Avant enregistrement / copie");
          for (const [part, value] of Object.entries(p.desired)) {
            if (part === "tv" || part === "mobile")
              // Tuvora has no *_guarded variant (no optimistic-lock param); it
              // uses the plain blob push with an origin client id instead.
              await (isTuvora(a)
                ? rpc(
                    "sync_push_profile_settings_blob",
                    {
                      p_profile_id: p.profileId,
                      p_platform: part,
                      p_settings_json: value,
                      ...originId(a),
                    },
                    t,
                    a.provider,
                  )
                : rpc(
                    "sync_push_profile_settings_blob_guarded",
                    {
                      p_profile_id: p.profileId,
                      p_platform: part,
                      p_settings_json: value,
                      p_expected_updated_at: current[part].updated_at,
                    },
                    t,
                    a.provider,
                  ));
            else
              await rpc(
                "sync_push_" + part,
                { p_profile_id: p.profileId, ["p_" + part]: value, ...originId(a) },
                t,
                a.provider,
              );
            completed.push(part);
          }
          // Home catalogs + collections: pushed via their own RPCs after the
          // settings parts (so addons are in place first when catalogs reference them).
          if (p.extra?.catalogs) {
            await pushHomeCatalogSettings(t, p.profileId, p.extra.catalogs, a.provider, originId(a));
            completed.push("catalogs");
          }
          if (p.extra?.collections) {
            await pushCollections(t, p.profileId, p.extra.collections, a.provider, originId(a));
            statisticsCache.clear();
            completed.push("collections");
          }
          // After the addon list is written, revoke grants for any addon just
          // removed from this profile (immediate, without waiting for a reload).
          if (p.desired.addons)
            addonProxy.reconcile(p.accountId, p.profileId, p.desired.addons.map((x) => x.url));
          return json(res, { ok: true, completed, backupId });
        } catch (e) {
          return json(
            res,
            {
              error: e.message,
              completed,
              backupId,
              partial: completed.length > 0,
            },
            e.status || 502,
          );
        } finally {
          locks.delete(key);
        }
      }
      if (route === "/api/backup/create") {
        const a = account(b.accountId);
        assert(providerOf(a.provider).canBackup, "Les sauvegardes ne sont pas disponibles pour les comptes Tuvora.", 400);
        return json(res, { id: await backup(a, "Sauvegarde manuelle") });
      }
      if (route === "/api/backup/delete") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const item = state.backups.find((entry) => entry.id === b.id);
        assert(item, "Sauvegarde inconnue", 404);
        state.backups = state.backups.filter((entry) => entry.id !== item.id);
        persistBackups([item]);
        return json(res, { ok: true });
      }
      if (route === "/api/backup/restore" || route === "/api/backup/restore-file") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
        const a = account(b.accountId);
        assert(providerOf(a.provider).canBackup, "Les sauvegardes ne sont pas disponibles pour les comptes Tuvora.", 400);
        let snapshot;
        if (route.endsWith("restore-file")) snapshot = validateBackupSnapshot(b.backup);
        else {
          const item = state.backups.find((entry) => entry.id === b.id);
          assert(item && item.accountId === a.id, "Sauvegarde inconnue", 404);
          snapshot = validateBackupSnapshot(db.read("backup-" + item.id, null));
        }
        const safetyBackupId = await backup(a, "Avant restauration");
        let result, method = "rpc", rpcError = null;
        try {
          result = await rpc(
            "sync_restore_account_backup",
            { p_backup: snapshot, p_mode: "replace" },
            await token(a),
            a.provider,
          );
        } catch (error) {
          // Some hosted Nuvio instances deny the replace RPC ("permission denied").
          // Fall back to restoring the synced settings via the per-item push RPCs,
          // which are allowed. History/library are left untouched on purpose.
          rpcError = error.message;
          result = await restoreViaPush(a, snapshot);
          method = "fallback";
        }
        statisticsCache.clear();
        return json(res, { ok: true, result, method, rpcError, safetyBackupId });
      }
      if (route === "/api/backup/download") {
        const id = url.searchParams.get("id");
        assert(
          state.backups.some((x) => x.id === id),
          "Sauvegarde inconnue",
          404,
        );
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="nuvio-backup-${id}.json"`,
        );
        return json(res, db.read("backup-" + id, null));
      }
      return json(res, { error: "Route inconnue" }, 404);
    }
    assert(
      req.method === "GET" || req.method === "HEAD",
      "Méthode non autorisée",
      405,
    );
    const files = {
      "/": "index.html",
      "/app.js": "app.js",
      "/i18n.js": "i18n.js",
      "/i18n/fr.js": "i18n/fr.js",
      "/i18n/x-fr.js": "i18n/x-fr.js",
      "/i18n/en.js": "i18n/en.js",
      "/i18n/es.js": "i18n/es.js",
      "/i18n/de.js": "i18n/de.js",
      "/i18n/it.js": "i18n/it.js",
      "/i18n/x-en.js": "i18n/x-en.js",
      "/i18n/x-es.js": "i18n/x-es.js",
      "/i18n/x-de.js": "i18n/x-de.js",
      "/i18n/x-it.js": "i18n/x-it.js",
      "/panel-settings.js": "panel-settings.js",
      "/activity.js": "activity.js",
      "/statistics.js": "statistics.js",
      "/connections.js": "connections.js",
      "/iptv.js": "iptv.js",
      "/sports.js": "sports.js",
      "/collections.js": "collections.js",
      "/theme.js": "theme.js",
      "/catalog.js": "catalog.js",
      "/settings-controls.js": "settings-controls.js",
      "/settings-controls-v2.js": "settings-controls-v2.js",
      "/settings-layout.js": "settings-layout.js",
      "/settings-schema.js": "settings-schema.js",
      "/settings-catalog.json": "settings-catalog.json",
      "/trakt.png": "trakt.png",
      "/simkl.webp": "simkl.webp",
      "/assets/nuvio-manager-logo.png": "assets/nuvio-manager-logo.png",
      "/assets/nuvio_login.webp": "assets/nuvio_login.webp",
      "/assets/nuvio_logo.png": "assets/nuvio_logo.png",
      "/assets/tuvora_logo.svg": "assets/tuvora_logo.svg",
      "/assets/favicon.png": "assets/favicon.png",
      "/style.css": "style.css",
      "/aurora.css": "aurora.css",
    };
    assert(files[url.pathname], "Page introuvable", 404);
    res.setHeader(
      "Content-Security-Policy",
      // style-src allows 'unsafe-inline' because charts/bars/timeline set computed
      // inline styles that can't live in a static stylesheet; script-src stays strict.
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    res.setHeader(
      "Content-Type",
      url.pathname.endsWith(".js")
        ? "text/javascript; charset=utf-8"
        : url.pathname.endsWith(".png")
          ? "image/png"
          : url.pathname.endsWith(".webp")
            ? "image/webp"
            : url.pathname.endsWith(".json")
              ? "application/json; charset=utf-8"
              : url.pathname.endsWith(".css")
                ? "text/css; charset=utf-8"
                : url.pathname.endsWith(".svg")
                  ? "image/svg+xml; charset=utf-8"
                  : "text/html; charset=utf-8",
    );
    res.end(fs.readFileSync(path.join(root, "public", files[url.pathname])));
  } catch (e) {
    if (!res.headersSent) json(res, { error: e.message }, e.status || 502);
    else res.destroy();
  }
});
server.listen(port, host, () => {
  console.log(`Nuvio Manager : http://localhost:${server.address().port}`);
  if (authProxyEnabled())
    console.log(
      "Authentification par proxy externe activée (AUTH_PROXY) : identité X-Auth-Request-* / X-Forwarded-User de confiance.",
    );
  // Start the background history mirror (initial fill + periodic refresh).
  if (!setupRequired()) historyStore.start();
  if (setupRequired()) {
    console.log(
      "Configuration initiale requise : ouvre le dashboard pour créer l’administrateur,",
    );
    console.log(
      "ou définis ADMIN_USERNAME / ADMIN_PASSWORD (et PUBLIC_URL) dans l’environnement.",
    );
  } else if (!panel.publicUrl) {
    console.log("Adresse publique à configurer dans les paramètres (ou via PUBLIC_URL).");
  }
});

// Optional second listener that serves ONLY the public addon relay (/relay/**).
// It lets operators expose the relay on a host/port that is not behind the
// external auth proxy, when exempting "/relay" per-path (Traefik
// --skip-auth-route / a dedicated router) is not possible. The main listener
// keeps serving the relay too, so this is purely additive.
const relayPort = Number(process.env.RELAY_PORT || 0);
if (Number.isInteger(relayPort) && relayPort > 0) {
  const relayServer = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      const url = new URL(req.url, "http://localhost");
      if (await addonProxy.handle(req, res, url)) return;
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Route inconnue" }));
    } catch (e) {
      if (!res.headersSent) {
        res.writeHead(e.status || 502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      } else res.destroy();
    }
  });
  relayServer.listen(relayPort, host, () => {
    console.log(`Relais d'addons public : http://localhost:${relayServer.address().port}`);
  });
}
