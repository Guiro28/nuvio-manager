import { hashPassword, verifyPassword } from "./panel-auth.js";
import { activity } from "./activity.js";
import { enrichActivity } from "./tmdb.js";
import { collectNuvioStatistics, summarizeStatistics } from "./statistics.js";
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
import { call, rpc, profile, profileList, backend } from "./nuvio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.HOST || "127.0.0.1",
  port = Number(process.env.PORT || 3100);

const db = vault(process.env.DATA_DIR || path.join(root, "data"));
const state = db.read("state", { accounts: [], library: [], backups: [] });
const save = () => db.write("state", state);
const panel = db.read("panel-settings", {});
const storedSessions = db.read("sessions", { version: 1, entries: {} });
const sessions = new Map(
  Object.entries(storedSessions.entries || {}).filter(
    ([sid, expires]) =>
      /^[a-f0-9]{64}$/.test(sid) &&
      Number.isFinite(expires) &&
      expires > Date.now(),
  ),
);
const tmdbCache = db.read("tmdb-cache", { version: 1, entries: {}, genres: {} });
const trackerCache = db.read("tracker-cache", { entries: {} });
const authEnabled = () => Boolean(panel.admin);
const setupRequired = () => !panel.admin;
const setupCode = setupRequired() || !panel.publicUrl ? crypto.randomBytes(8).toString("hex").toUpperCase() : "";
const adminName = () => panel.admin?.username || "";
const validPassword = value => verifyPassword(value, panel.admin);
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
const issueSession = (res) => {
  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, Date.now() + 8 * 3600 * 1000);
  saveSessions();
  res.setHeader(
    "Set-Cookie",
    `nm_session=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${publicOrigin().startsWith("https:") ? "; Secure" : ""}`,
  );
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
const connectionRef = (accountId, profileId) => `${accountId}:${profileId}`;
const trackerConfig = (service) => panel.trackerApps?.[service] || {};
const savePanel = () => db.write("panel-settings", panel);
// Rolling process CPU usage (%). Compares cpuUsage deltas between calls, so the
// ~5s home-page polling produces a live figure normalized over all cores.
let lastCpu = process.cpuUsage(),
  lastCpuAt = Date.now();
function cpuPercent() {
  const current = process.cpuUsage(),
    now = Date.now(),
    elapsedMs = now - lastCpuAt || 1,
    cpuMs = (current.user - lastCpu.user + current.system - lastCpu.system) / 1000,
    cores = os.cpus().length || 1;
  lastCpu = current;
  lastCpuAt = now;
  return Math.max(0, Math.min(100, (cpuMs / (elapsedMs * cores)) * 100));
}
// Total profiles across accounts, cached because it needs Nuvio calls and the
// home page polls frequently.
let profilesCount = { at: 0, value: 0 };
async function totalProfiles() {
  if (Date.now() - profilesCount.at < 60000) return profilesCount.value;
  let total = 0;
  for (const a of state.accounts) {
    try {
      total += (await profileList(await token(a))).length;
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
    proxyAddons: state.proxyAddons?.length || 0,
    trakt: connections.filter((c) => c?.trakt).length,
    simkl: connections.filter((c) => c?.simkl).length,
    backups: state.backups.length,
    tmdbConfigured: Boolean(panel.tmdbKey),
    proxyExternal: { configured: Boolean(panel.proxyUrl) },
    memory: { rss: mem.rss, used: totalMem - freeMem, total: totalMem },
    cpu: { percent: cpuPercent(), cores: os.cpus().length },
    uptime: process.uptime(),
    bandwidth: addonProxy.metrics(),
  };
}
async function assertProfile(accountId, profileId) {
  const selected = account(accountId),
    access = await token(selected),
    rows = await rpc("sync_pull_profiles", {}, access);
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
        const t = await call("/auth/v1/token?grant_type=refresh_token", {
          refresh_token: a.refresh,
        });
        a.access = t.access_token;
        a.refresh = t.refresh_token;
        a.expires = Date.now() + t.expires_in * 1000;
        save();
        return a.access;
      })().finally(() => refreshing.delete(a.id)),
    );
  return refreshing.get(a.id);
}
async function addSession(t) {
  const info = await call("/auth/v1/user", null, t.access_token, "GET");
  let a = state.accounts.find((a) => a.id === info.id);
  if (!a) {
    a = { id: info.id };
    state.accounts.push(a);
  }
  Object.assign(a, {
    email: info.email,
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
  const snapshot = await rpc("sync_export_account_backup", {}, await token(a));
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
function normalizeUrl(value) {
  const u = new URL(String(value || "").replace(/^stremio:\/\//i, "https://"));
  assert(
    ["http:", "https:"].includes(u.protocol) && !u.username && !u.password,
    "URL HTTP/HTTPS requise, sans identifiants HTTP",
  );
  return u.href;
}
async function installation(item, mode) {
  if (mode === "none") return item.url;
  assert(["direct", "warp"].includes(mode), "Mode proxy invalide");
  const addon = await addonProxy.register(item, mode);
  return `${publicOrigin()}/relay/${mode}/${addon.id}/manifest.json`;
}
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
          publicOrigin(),
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
      const allowedHosts = new Set([
        new URL(publicOrigin()).host,
        `localhost:${port}`,
        `127.0.0.1:${port}`,
      ]);
      if (port !== 0 && url.pathname !== "/api/setup")
        assert(allowedHosts.has(req.headers.host), "Hôte non autorisé", 403);
      if (url.pathname === "/api/setup") {
        if (req.method === "GET") return json(res, { required: setupRequired(), publicUrlRequired: !panel.publicUrl });
        assert(req.method === "POST", "Méthode non autorisée", 405);
        assert(setupRequired() || !panel.publicUrl, "La configuration initiale est déjà terminée", 409);
        const b = await body(req),
          ip = req.socket.remoteAddress,
          recent = attempts.get(ip) || [],
          active = recent.filter((time) => Date.now() - time < 60000);
        assert(active.length < 10, "Réessaie dans une minute", 429);
        active.push(Date.now());
        attempts.set(ip, active);
        assert(typeof b.code === "string" && equal(b.code.trim().toUpperCase(), setupCode), "Code de configuration incorrect", 403);
        const createAdmin = setupRequired();
        if (createAdmin) {
          assert(typeof b.username === "string" && b.username.trim().length > 0 && b.username.trim().length <= 80, "Nom d’utilisateur requis (80 caractères maximum)");
          assert(typeof b.password === "string" && b.password.length >= 12 && b.password.length <= 1024, "Le mot de passe doit contenir au moins 12 caractères");
          panel.admin = { ...hashPassword(b.password), username: b.username.trim() };
        }
        panel.publicUrl = normalizePublicUrl(b.publicUrl);
        savePanel();
        if (createAdmin) issueSession(res);
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
        issueSession(res);
        return json(res, { ok: true });
      }
      const sid = req.headers.cookie?.match(
        /(?:^|; )nm_session=([a-f0-9]+)/,
      )?.[1];
      const sessionExpiry = sessions.get(sid);
      if (sessionExpiry && sessionExpiry <= Date.now()) {
        sessions.delete(sid);
        saveSessions();
      }
      assert(!setupRequired(), "Configuration initiale requise", 428);
      assert(authEnabled() && sessionExpiry > Date.now(), "Connexion au dashboard requise", 401);
      const b = req.method === "GET"
        ? {}
        : await body(req, url.pathname === "/api/backup/restore-file" ? 25_000_000 : 2_000_000);
      const route = url.pathname;
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
        });
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
      if (route === "/api/settings/admin") {
        assert(req.method === "POST", "Méthode non autorisée", 405);
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
        issueSession(res);
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
      if (route === "/api/state")
        return json(res, {
          accounts: state.accounts.map(({ id, email, name }) => ({ id, email, name: name || email })),
          library: state.library,
          backups: state.backups,
          backend,
        });
      if (route === "/api/logout") {
        sessions.delete(sid);
        saveSessions();
        res.setHeader(
          "Set-Cookie",
          "nm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return json(res, { ok: true });
      }
      if (route === "/api/pair/start") {
        const nonce = crypto.randomBytes(24).toString("hex");
        const result = (
          await rpc("start_tv_login_session", {
            p_device_nonce: nonce,
            p_redirect_base_url:
              process.env.NUVIO_LOGIN_URL || "https://nuvio.tv/tv-login",
            p_device_name: "Nuvio Manager",
          })
        )[0];
        const id = crypto.randomUUID();
        pairings.set(id, { ...result, nonce });
        return json(res, { id, ...result });
      }
      if (route === "/api/pair/poll") {
        const p = pairings.get(b.id);
        assert(p && Date.parse(p.expires_at) > Date.now(), "Code expiré");
        assert(!p.busy, "Vérification déjà en cours", 409);
        p.busy = true;
        try {
          const result = (
            await rpc("poll_tv_login_session", {
              p_code: p.code,
              p_device_nonce: p.nonce,
            })
          )[0];
          if (result.status !== "approved")
            return json(res, { status: result.status });
          const t = await call("/functions/v1/tv-logins-exchange", {
            code: p.code,
            device_nonce: p.nonce,
          });
          const a = await addSession(t);
          pairings.delete(b.id);
          return json(res, { status: "connected", account: a });
        } finally {
          p.busy = false;
        }
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
        const prefix = `${a.id}:`;
        for (const ref of Object.keys(panel.connections || {}))
          if (ref.startsWith(prefix)) delete panel.connections[ref];
        for (const ref of Object.keys(trackerCache.entries || {}))
          if (ref.startsWith(prefix)) delete trackerCache.entries[ref];
        save();
        savePanel();
        db.write("tracker-cache", trackerCache);
        statisticsCache.clear();
        return json(res, { ok: true });
      }
      if (route === "/api/profiles")
        return json(
          res,
          await profileList(
            await token(account(url.searchParams.get("accountId"))),
          ),
        );
      if (route === "/api/xperience-avatars") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        return json(res, await getXperienceAvatars());
      }
      if (route === "/api/activity") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const result = await activity(await token(account(url.searchParams.get("accountId"))), Number(url.searchParams.get("profileId")), url.searchParams.get("kind"), Number(url.searchParams.get("page") || 1));
        return json(res, await enrichActivity(result, {
          key: panel.tmdbKey,
          cache: tmdbCache,
          persist: (value) => db.write("tmdb-cache", value),
        }));
      }
      if (route === "/api/statistics") {
        assert(req.method === "GET", "Méthode non autorisée", 405);
        const days = Number(url.searchParams.get("days") ?? 30);
        assert([30, 90, 365, 0].includes(days), "Période invalide");
        const requestedProfiles = [...new Set(
          (url.searchParams.get("profiles") || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        )].sort();
        const cacheKey = `stats-v5:${days}:${requestedProfiles.join(",")}`;
        const cached = statisticsCache.get(cacheKey);
        if (!url.searchParams.has("refresh") && cached?.expiresAt > Date.now())
          return json(res, cached.value);
        const dataset = await collectNuvioStatistics(state.accounts, {
          getToken: token,
          rpc,
          externalHistory,
          getProfiles: profileList,
        });
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
        const metadataItems = [...result.top, ...rankedItems, ...result.recent].map((item) => ({
          content_id: item.contentId,
          content_type: item.kind === "movie" ? "movie" : "series",
        }));
        const enriched = await enrichActivity(
          {
            items: metadataItems,
          },
          {
            key: panel.tmdbKey,
            cache: tmdbCache,
            persist: (value) => db.write("tmdb-cache", value),
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
        result.tmdb = enriched.tmdb;
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
        });
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
      if (route === "/api/profile")
        return json(
          res,
          await profile(
            await token(account(url.searchParams.get("accountId"))),
            Number(url.searchParams.get("profileId")),
          ),
        );
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
        const id = await backup(a, "Modification du profil");
        const result = await rpc(
          "sync_patch_profile",
          {
            p_profile_id: Number(b.profileId),
            p_name: b.name.trim(),
            p_avatar_color_hex: b.color.toUpperCase(),
            p_uses_primary_addons: Boolean(b.inheritAddons),
            p_uses_primary_plugins: Boolean(b.inheritPlugins),
            p_avatar_url: normalizedAvatarUrl,
            p_avatar_url_provided: !avatarId,
            p_avatar_id: avatarId || null,
            p_avatar_id_provided: Boolean(avatarId),
          },
          await token(a),
        );
        return json(res, { result, backupId: id });
      }
      if (route === "/api/profile/create") {
        const a = account(b.accountId),
          t = await token(a),
          rows = await rpc("sync_pull_profiles", {}, t);
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
          },
          t,
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
          target = await profile(await token(a), Number(b.profileId));
        let desired = b.desired;
        if (b.source) {
          assert(
            b.source.accountId !== b.accountId ||
              Number(b.source.profileId) !== Number(b.profileId),
            "Choisis un profil différent",
          );
          const source = await profile(
            await token(account(b.source.accountId)),
            Number(b.source.profileId),
          );
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
          for (const part of ["addons", "plugins"])
            if (b.selection?.[part])
              desired[part] = b.merge
                ? [
                    ...writableList(target[part]),
                    ...writableList(source[part]).filter(
                      (x) => !target[part].some((y) => y.url === x.url),
                    ),
                  ]
                : writableList(source[part]);
        }
        if (b.assignment) {
          const item = state.library.find((x) => x.id === b.assignment.id);
          assert(item, "Addon introuvable");
          const installUrl = await installation(item, b.assignment.mode);
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
        const diff = changes(before, desired);
        const id = crypto.randomUUID();
        plans.set(id, {
          accountId: a.id,
          profileId: Number(b.profileId),
          target,
          desired,
          before,
          expires: Date.now() + 10 * 60000,
        });
        return json(res, { id, diff, count: diff.length });
      }
      if (route === "/api/apply") {
        const p = plans.get(b.id);
        assert(p && p.expires > Date.now(), "Aperçu expiré");
        const key = p.accountId + ":" + p.profileId;
        assert(!locks.has(key), "Une écriture est en cours", 409);
        locks.add(key);
        plans.delete(b.id);
        const completed = [];
        let backupId;
        try {
          const a = account(p.accountId),
            t = await token(a),
            current = await profile(t, p.profileId);
          assert(
            hash(snapshotParts(current, Object.keys(p.desired))) ===
              hash(p.before),
            "Le profil a changé depuis l’aperçu. Recharge et recommence.",
            409,
          );
          backupId = await backup(a, "Avant enregistrement / copie");
          for (const [part, value] of Object.entries(p.desired)) {
            if (part === "tv" || part === "mobile")
              await rpc(
                "sync_push_profile_settings_blob_guarded",
                {
                  p_profile_id: p.profileId,
                  p_platform: part,
                  p_settings_json: value,
                  p_expected_updated_at: current[part].updated_at,
                },
                t,
              );
            else
              await rpc(
                "sync_push_" + part,
                { p_profile_id: p.profileId, ["p_" + part]: value },
                t,
              );
            completed.push(part);
          }
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
      if (route === "/api/backup/create")
        return json(res, {
          id: await backup(account(b.accountId), "Sauvegarde manuelle"),
        });
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
        let snapshot;
        if (route.endsWith("restore-file")) snapshot = validateBackupSnapshot(b.backup);
        else {
          const item = state.backups.find((entry) => entry.id === b.id);
          assert(item && item.accountId === a.id, "Sauvegarde inconnue", 404);
          snapshot = validateBackupSnapshot(db.read("backup-" + item.id, null));
        }
        const safetyBackupId = await backup(a, "Avant restauration");
        const result = await rpc(
          "sync_restore_account_backup",
          { p_backup: snapshot, p_mode: "replace" },
          await token(a),
        );
        statisticsCache.clear();
        return json(res, { ok: true, result, safetyBackupId });
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
      "/panel-settings.js": "panel-settings.js",
      "/activity.js": "activity.js",
      "/statistics.js": "statistics.js",
      "/connections.js": "connections.js",
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
      "/assets/favicon.png": "assets/favicon.png",
      "/style.css": "style.css",
      "/aurora.css": "aurora.css",
    };
    assert(files[url.pathname], "Page introuvable", 404);
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https: http:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
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
  if (setupRequired()) {
    console.log("Configuration initiale requise.");
    console.log(`Code de configuration : ${setupCode}`);
  } else if (!panel.publicUrl) {
    console.log("Adresse publique à configurer.");
    console.log(`Code de configuration : ${setupCode}`);
  }
});
