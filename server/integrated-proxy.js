import crypto from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATA_DIR ||= path.join(root, "data");

import { log } from "./logger.js";

const require = createRequire(import.meta.url);
const { request, readAll } = require("../vendor/proxy/src/http.js");
const { decodeToken, fetchManifest, fetchResource } = require("../vendor/proxy/src/addon.js");

const MODES = new Set(["direct", "warp"]);
const PROXY_PROTOCOLS = new Set(["http:", "https:", "socks:", "socks4:", "socks4a:", "socks5:", "socks5h:"]);

export function normalizeProxyUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length > 4096) throw Object.assign(new Error("URL du proxy trop longue"), { status: 400 });
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw Object.assign(new Error("URL du proxy invalide"), { status: 400 });
  }
  if (!PROXY_PROTOCOLS.has(url.protocol) || !url.hostname)
    throw Object.assign(new Error("Utilise une URL HTTP(S) ou SOCKS valide"), { status: 400 });
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash)
    throw Object.assign(new Error("L’URL du proxy ne doit pas contenir de chemin, de paramètres ou d’ancre"), { status: 400 });
  return url.toString();
}

export function proxySummary(value) {
  const normalized = normalizeProxyUrl(value);
  if (!normalized) return { configured: false, display: "", type: "" };
  const url = new URL(normalized);
  const type = url.protocol.startsWith("http") ? "HTTP" : "SOCKS";
  return {
    configured: true,
    display: `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`,
    type,
  };
}

const upstreamFor = (mode, proxyUrl) => {
  if (mode !== "warp") return { mode: "direct", url: "" };
  const normalized = normalizeProxyUrl(proxyUrl);
  if (!normalized) throw Object.assign(new Error("Aucun proxy externe n’est configuré"), { status: 400 });
  return {
    mode: normalized.startsWith("http:") || normalized.startsWith("https:") ? "http" : "socks",
    url: normalized,
  };
};

export function normalizeManifestUrl(value) {
  let source = String(value || "").trim().replace(/^stremio:\/\//i, "https://");
  if (!/\/manifest\.json(?:$|\?)/i.test(source))
    source = source.replace(/\/+$/, "") + "/manifest.json";
  const url = new URL(source);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("URL de manifest HTTP/HTTPS invalide");
  return url.href;
}

const cors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Range");
};

const passthroughHeaders = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "content-disposition",
  "cache-control",
  "expires",
  "last-modified",
  "etag",
];

export function createIntegratedProxy({ state, save, origin, getOrigin, warpUrl, getProxyUrl, getProfileLabel }) {
  const configuredOrigin = () => getOrigin ? getOrigin() : origin;
  const configuredProxy = () => getProxyUrl
    ? getProxyUrl()
    : warpUrl || "";
  if (!Array.isArray(state.proxyAddons)) {
    state.proxyAddons = [];
    save();
  }
  // Per-assignment relay grants: one unique, revocable token per
  // (account, profile, upstream manifest, mode). Legacy `proxyAddons` entries
  // (shared 10-hex ids) keep resolving so already-saved URLs still work.
  if (!Array.isArray(state.proxyGrants)) {
    state.proxyGrants = [];
    save();
  }
  if (!state.bandwidth || typeof state.bandwidth !== "object") state.bandwidth = {};
  state.bandwidth.direct = Number(state.bandwidth.direct) || 0;
  state.bandwidth.warp = Number(state.bandwidth.warp) || 0;
  let lastBandwidthSave = 0;
  // Cumulative bytes relayed, split by upstream (direct = internal, warp = external
  // proxy). Persisted to the data volume, throttled so streaming does not thrash disk.
  const countBytes = (mode, bytes) => {
    if (!bytes || !(mode in state.bandwidth)) return;
    state.bandwidth[mode] += bytes;
    if (Date.now() - lastBandwidthSave > 15000) {
      lastBandwidthSave = Date.now();
      save();
    }
  };
  const metrics = () => ({ direct: state.bandwidth.direct, warp: state.bandwidth.warp });

  // Per-addon "stream opens": one event each time a NEW /play token is first
  // requested (its grant carries the addon id). A single playback reuses one token
  // for all its range requests, so buffering / seeking / resuming count once; a
  // genuinely new launch re-generates the stream list and mints a fresh token.
  if (!Array.isArray(state.addonOpens)) {
    state.addonOpens = [];
    save();
  }
  // ~13 months keeps every stats period in range without unbounded growth.
  const OPENS_RETENTION_MS = 400 * 24 * 3600 * 1000;
  const OPENS_MAX = 50000;
  // De-dup within a token's lifetime (same as the /play TTL): a token already
  // counted is ignored until it expires. In-memory only (a restart may recount a
  // playback once — negligible). Hashed so raw tokens are never kept.
  const DEDUP_MS = (() => {
    const h = Number(process.env.PLAY_TTL_HOURS ?? 12);
    return (Number.isFinite(h) && h > 0 ? h : 12) * 3600 * 1000;
  })();
  const seenPlayTokens = new Map(); // tokenHash -> expiresAt
  const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex").slice(0, 32);
  const isNewOpen = (token) => {
    const now = Date.now();
    if (seenPlayTokens.size > 10000)
      for (const [k, exp] of seenPlayTokens) if (exp <= now) seenPlayTokens.delete(k);
    const hash = hashToken(token);
    const exp = seenPlayTokens.get(hash);
    if (exp && exp > now) return false;
    seenPlayTokens.set(hash, now + DEDUP_MS);
    return true;
  };
  const recordOpen = (grant, mode) => {
    if (!grant || !grant.manifestUrl || grant.accountId == null) return;
    state.addonOpens.push({
      at: Date.now(),
      accountId: grant.accountId,
      profileId: grant.profileId ?? null,
      manifest: grant.manifestUrl,
      mode,
    });
    const ref = `${grant.accountId}:${grant.profileId ?? ""}`;
    const info = getProfileLabel?.(ref) || null;
    log.info("proxy", "flux ouvert", {
      addon: grant.name || "",
      mode,
      profile: info?.profileName || "",
      ref,
    });
    const cutoff = Date.now() - OPENS_RETENTION_MS;
    if (state.addonOpens.length > OPENS_MAX || (state.addonOpens[0] && state.addonOpens[0].at < cutoff))
      state.addonOpens = state.addonOpens.filter((e) => e.at >= cutoff).slice(-OPENS_MAX);
    save();
  };
  const openEvents = () => state.addonOpens;

  // ── Live playback sessions ("Lecture en cours") ──────────────────────────────
  // When an addon's stream list goes through the relay, each rewritten /play token
  // is remembered with what the addon said about that stream (release name, size,
  // content id). When a token is then played, the relay tracks the session: bytes
  // (per-second buckets for the live rate), requests, open connections and who
  // closed them. In memory only — a restart simply forgets live sessions.
  const STREAM_META_MAX = 20000;
  const SESSION_MIN_BYTES = 2 * 1024 * 1024; // below this it's a probe, not a playback
  const SESSION_RETENTION_MS = 4 * 3600 * 1000;
  const streamMeta = new Map(); // tokenHash -> { type, id, release, source, size }
  const sessions = new Map(); // tokenHash -> session
  const SIZE_UNITS = { kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4 };
  const parseSize = (text) => {
    const m = /(\d+(?:[.,]\d+)?)\s*(TB|GB|MB|KB|TiB|GiB|MiB|KiB)\b/i.exec(String(text || ""));
    return m ? Math.round(Number(m[1].replace(",", ".")) * SIZE_UNITS[m[2].toLowerCase()]) : 0;
  };
  const VIDEO_FILE = /\.(mkv|mp4|m4v|avi|ts|m2ts|webm|mov|wmv)$/i;
  const cleanLine = (line) => String(line || "").replace(/^[^\p{L}\p{N}[(]+/u, "").trim();
  // Release name: behaviorHints.filename (Stremio standard), else the line of the
  // title/description that looks like a release (filename or resolution tag).
  const releaseOf = (stream) => {
    const filename = typeof stream.behaviorHints?.filename === "string" ? stream.behaviorHints.filename.trim() : "";
    if (filename) return filename.slice(0, 300);
    const lines = String(stream.description || stream.title || "").split("\n").map(cleanLine).filter(Boolean);
    const line = lines.find((l) => VIDEO_FILE.test(l)) ||
      lines.find((l) => /\b(2160p|1080p|720p|480p|4k|uhd)\b/i.test(l) && /[._]/.test(l)) ||
      "";
    return line.slice(0, 300);
  };
  const rememberStream = (token, stream, type, id) => {
    const hints = stream.behaviorHints || {};
    streamMeta.set(hashToken(token), {
      type,
      id,
      release: releaseOf(stream),
      source: String(stream.name || "").split("\n").map((s) => s.trim()).filter(Boolean).join(" ").slice(0, 80),
      size: Number(hints.videoSize) > 0 ? Number(hints.videoSize) : parseSize(`${stream.description || ""}\n${stream.title || ""}`),
    });
    if (streamMeta.size > STREAM_META_MAX) streamMeta.delete(streamMeta.keys().next().value);
  };
  // Fallback release name from the media itself (debrid links usually end with
  // the file name; some sources send Content-Disposition). Never the URL itself.
  const fileNameFrom = (mediaUrl, disposition) => {
    const fromHeader = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(String(disposition || ""))?.[1];
    if (fromHeader) {
      try { return decodeURIComponent(fromHeader).slice(0, 300); } catch { return fromHeader.slice(0, 300); }
    }
    try {
      const last = new URL(mediaUrl).pathname.split("/").filter(Boolean).pop() || "";
      const name = decodeURIComponent(last);
      return VIDEO_FILE.test(name) ? name.slice(0, 300) : "";
    } catch {
      return "";
    }
  };
  const pruneSessions = () => {
    const cutoff = Date.now() - SESSION_RETENTION_MS;
    for (const [key, s] of sessions)
      if (Math.max(s.lastRequestAt, s.lastByteAt, s.lastCloseAt) < cutoff) sessions.delete(key);
  };
  const trackSession = (hash, grant, mode) => {
    let session = sessions.get(hash);
    if (!session) {
      pruneSessions();
      const meta = streamMeta.get(hash) || {};
      const now = Date.now();
      session = {
        id: hash.slice(0, 16),
        accountId: grant?.accountId ?? null,
        profileId: grant?.profileId ?? null,
        addonName: grant?.name || "",
        addonLogo: grant?.logo || "",
        mode,
        type: meta.type || "",
        contentId: meta.id || "",
        release: meta.release || "",
        source: meta.source || "",
        size: meta.size || 0,
        total: 0,
        startedAt: now,
        lastRequestAt: now,
        lastByteAt: 0,
        lastCloseAt: 0,
        lastClientCloseAt: 0,
        lastUpstreamFailAt: 0,
        requests: 0,
        openConns: 0,
        bytes: 0,
        firstRangeStart: null,
        buckets: new Map(), // epoch second -> bytes
      };
      sessions.set(hash, session);
    }
    return session;
  };
  const countSessionBytes = (session, bytes) => {
    const now = Date.now();
    session.bytes += bytes;
    session.lastByteAt = now;
    const second = Math.floor(now / 1000);
    session.buckets.set(second, (session.buckets.get(second) || 0) + bytes);
    if (session.buckets.size > 90)
      for (const key of session.buckets.keys()) if (key < second - 70) session.buckets.delete(key);
  };
  // Snapshot for the now-playing engine: only real playbacks (past the probe
  // threshold) of tracked profiles, with the live rate (bits/s over the last 5 s)
  // and a 60 s history in 2 s steps for the sparkline.
  const liveSessions = () => {
    pruneSessions();
    const second = Math.floor(Date.now() / 1000);
    const bucket = (s, from, to) => {
      let sum = 0;
      for (let k = from; k <= to; k++) sum += s.buckets.get(k) || 0;
      return sum;
    };
    return [...sessions.values()]
      .filter((s) => s.bytes >= SESSION_MIN_BYTES && s.accountId != null && s.profileId != null)
      .map((s) => {
        const { buckets, ...rest } = s;
        // Exclude the current (partial) second so the rate does not flicker.
        const rate = Math.round((bucket(s, second - 5, second - 1) * 8) / 5);
        const series = Array.from({ length: 30 }, (_, i) => {
          const end = second - 1 - (29 - i) * 2;
          return Math.round((bucket(s, end - 1, end) * 8) / 2);
        });
        return { ...rest, rate, series };
      });
  };

  // Resolve a relay token to its grant (new) or legacy addon. Revoked grants are
  // returned too (callers decide): the relay refuses them, but clone/describe
  // still need their manifestUrl, which is why grants are soft-deleted.
  const getGrant = (token) =>
    state.proxyGrants.find((g) => g.id === token) ||
    state.proxyAddons.find((a) => a.id === token) ||
    null;

  // Extract {mode, token} from one of our own relay URLs (any host).
  const RELAY_RE = /\/relay\/(direct|warp)\/([a-f0-9]{10}|[a-f0-9]{32})\/manifest\.json(?:$|\?)/i;
  const relayRef = (url) => {
    const m = RELAY_RE.exec(String(url || ""));
    return m ? { mode: m[1], token: m[2] } : null;
  };
  // For cloning: resolve a relay URL back to its upstream so the target can be
  // given a fresh, target-owned grant. Returns null for non-relay URLs.
  const describe = (url) => {
    const ref = relayRef(url);
    if (!ref) return null;
    const grant = getGrant(ref.token);
    if (!grant) return null;
    return { mode: ref.mode, manifestUrl: grant.manifestUrl, name: grant.name, logo: grant.logo || "" };
  };

  // Resolve a proxied addon's display logo from one of our relay URLs. Reuses the
  // grant's stored logo; when empty (e.g. minted before we read `icon`, or the
  // manifest only exposes `icon`), fetches the upstream manifest THROUGH the proxy
  // — so geo-blocked addons resolve where a plain direct fetch would fail — and
  // backfills the grant. `logoChecked` stops us re-fetching when there is no logo.
  const resolveLogo = async (url) => {
    const ref = relayRef(url);
    if (!ref) return null;
    const grant = getGrant(ref.token);
    if (!grant) return null;
    if (grant.logo) return grant.logo;
    if (grant.logoChecked) return null;
    try {
      const meta = await fetchMeta(grant.manifestUrl, grant.mode || ref.mode, grant);
      grant.logo = meta.logo || "";
      grant.logoChecked = true;
      save();
      return grant.logo || null;
    } catch (error) {
      log.debug("proxy", "logo d’addon introuvable", { addon: grant.name || "", error: error.message });
      return null;
    }
  };

  async function fetchMeta(manifestUrl, mode, item) {
    const { res } = await request(manifestUrl, {
      upstream: upstreamFor(mode, configuredProxy()),
      headers: { accept: "application/json" },
      timeout: 25000,
    });
    const manifest = JSON.parse((await readAll(res)).toString("utf8"));
    if (!manifest?.id) throw new Error("Manifest sans identifiant");
    return {
      name: String(manifest.name || item.name || manifest.id),
      displayName: `${String(item.name || manifest.name || manifest.id)} (proxy)`,
      logo: String(manifest.logo || manifest.icon || item.logo || ""),
    };
  }

  // Register a relay entry. With {accountId, profileId} context, mint/reuse a
  // per-assignment grant (unique revocable token). Without context, fall back to
  // the legacy shared-by-manifest addon (kept for back-compat).
  async function register(item, mode, ctx) {
    if (!MODES.has(mode)) throw new Error("Mode proxy invalide");
    const manifestUrl = normalizeManifestUrl(item.url);
    if (ctx && ctx.accountId != null && ctx.profileId != null) {
      const existing = state.proxyGrants.find(
        (g) =>
          !g.revoked &&
          g.accountId === ctx.accountId &&
          g.profileId === ctx.profileId &&
          g.manifestUrl === manifestUrl &&
          g.mode === mode,
      );
      if (existing) return existing;
      const meta = await fetchMeta(manifestUrl, mode, item);
      const grant = {
        id: crypto.randomBytes(16).toString("hex"),
        accountId: ctx.accountId,
        profileId: ctx.profileId,
        manifestUrl,
        mode,
        name: meta.name,
        displayName: meta.displayName,
        logo: meta.logo,
        createdAt: new Date().toISOString(),
        revoked: false,
      };
      state.proxyGrants.push(grant);
      save();
      log.debug("proxy", "lien de relais créé", { addon: meta.name, mode, ref: `${ctx.accountId}:${ctx.profileId}` });
      return grant;
    }
    let addon = state.proxyAddons.find((entry) => entry.manifestUrl === manifestUrl);
    if (addon) return addon;
    const meta = await fetchMeta(manifestUrl, mode, item);
    addon = {
      id: crypto.randomBytes(5).toString("hex"),
      name: meta.name,
      displayName: meta.displayName,
      manifestUrl,
      logo: meta.logo,
      addedAt: new Date().toISOString(),
    };
    state.proxyAddons.push(addon);
    save();
    return addon;
  }

  // Revoke every live grant of an account (called when it leaves the manager).
  function revokeAccount(accountId) {
    let n = 0;
    const at = new Date().toISOString();
    for (const g of state.proxyGrants)
      if (!g.revoked && g.accountId === accountId) {
        g.revoked = true;
        g.revokedAt = at;
        n++;
      }
    if (n) {
      save();
      log.info("proxy", "liens révoqués (compte retiré)", { accountId, count: n });
    }
    return n;
  }

  // Revoke grants of a (account, profile) whose token is no longer present in the
  // profile's current addon list — catches removals done in or outside the manager.
  function reconcile(accountId, profileId, activeUrls) {
    const live = new Set();
    for (const u of activeUrls || []) {
      const ref = relayRef(u);
      if (ref) live.add(ref.token);
    }
    let n = 0;
    const at = new Date().toISOString();
    for (const g of state.proxyGrants)
      if (
        !g.revoked &&
        g.accountId === accountId &&
        g.profileId === profileId &&
        !live.has(g.id)
      ) {
        g.revoked = true;
        g.revokedAt = at;
        n++;
      }
    if (n) {
      save();
      log.info("proxy", "liens révoqués (addon retiré du profil)", { ref: `${accountId}:${profileId}`, count: n });
    }
    return n;
  }

  async function checkProxy(proxyUrl = configuredProxy()) {
    if (!proxyUrl) return { available: false, configured: false, upstream: "non configuré" };
    try {
      const upstream = upstreamFor("warp", proxyUrl);
      const { res } = await request("https://api.ipify.org?format=json", {
        upstream,
        timeout: 10000,
        headers: { accept: "application/json" },
      });
      const data = JSON.parse((await readAll(res)).toString("utf8"));
      if (!data.ip) throw new Error("Réponse IP invalide");
      return { available: true, configured: true, upstream: upstream.mode, ip: data.ip };
    } catch (error) {
      return { available: false, configured: true, upstream: "proxy", error: error.message };
    }
  }

  async function status() {
    const external = await checkProxy();
    return [
      { mode: "direct", available: true, upstream: "direct" },
      { mode: "warp", ...external },
    ];
  }

  async function test(mode, proxyUrl) {
    if (!MODES.has(mode)) throw new Error("Mode proxy invalide");
    try {
      const upstream = upstreamFor(mode, proxyUrl === undefined ? configuredProxy() : proxyUrl);
      const { res } = await request("https://api.ipify.org?format=json", {
        upstream,
        timeout: 15000,
        headers: { accept: "application/json" },
      });
      const data = JSON.parse((await readAll(res)).toString("utf8"));
      return { ok: true, ip: data.ip, mode, upstream: upstream.mode };
    } catch (error) {
      return { ok: false, error: error.message, mode };
    }
  }

  async function handle(req, res, url) {
    const match = url.pathname.match(
      /^\/relay\/(direct|warp)\/(play|([a-f0-9]{10}|[a-f0-9]{32})\/(.+))$/,
    );
    if (!match) return false;

    cors(res);
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return true;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Méthode non autorisée");
      return true;
    }

    const mode = match[1];
    try {
      const upstream = upstreamFor(mode, configuredProxy());
      if (match[2] === "play") {
        const rawToken = url.searchParams.get("t");
        const decoded = decodeToken(rawToken);
        const grant = decoded.addonId ? getGrant(decoded.addonId) : null;
        // Count a stream open once per fresh token (ignores range/buffer/seek).
        if (req.method === "GET" && grant && isNewOpen(rawToken)) recordOpen(grant, mode);
        // Live session tracking (GET only: HEAD probes carry no media).
        let session = null;
        let upstreamFailed = false;
        if (req.method === "GET") {
          session = trackSession(hashToken(rawToken), grant, mode);
          session.requests++;
          session.lastRequestAt = Date.now();
          session.openConns++;
          const rangeStart = Number(/bytes=(\d+)-/i.exec(req.headers.range || "")?.[1] || 0);
          if (session.firstRangeStart == null) session.firstRangeStart = rangeStart;
          res.on("close", () => {
            session.openConns = Math.max(0, session.openConns - 1);
            session.lastCloseAt = Date.now();
            // Not finished and not an upstream failure → the player hung up.
            if (!res.writableFinished && !upstreamFailed) session.lastClientCloseAt = session.lastCloseAt;
          });
        }
        const headers = { ...decoded.headers };
        if (req.headers.range) headers.range = req.headers.range;
        headers["user-agent"] ||= req.headers["user-agent"] || "Mozilla/5.0";
        headers.accept ||= "*/*";
        let media;
        try {
          ({ res: media } = await request(decoded.url, {
            upstream,
            headers,
            method: req.method === "HEAD" ? "HEAD" : "GET",
            timeout: 30000,
          }));
        } catch (error) {
          upstreamFailed = true;
          if (session) session.lastUpstreamFailAt = Date.now();
          throw error;
        }
        res.statusCode = media.statusCode || 502;
        for (const name of passthroughHeaders)
          if (media.headers[name]) res.setHeader(name, media.headers[name]);
        res.setHeader("Accept-Ranges", media.headers["accept-ranges"] || "bytes");
        if (session) {
          const total = Number(/\/(\d+)\s*$/.exec(media.headers["content-range"] || "")?.[1] ||
            (media.statusCode === 200 ? media.headers["content-length"] : 0) || 0);
          if (total > session.total) session.total = total;
          if (!session.release) session.release = fileNameFrom(decoded.url, media.headers["content-disposition"]);
        }
        if (req.method === "HEAD") {
          media.resume();
          res.end();
        } else {
          media.on("error", () => {
            upstreamFailed = true;
            session.lastUpstreamFailAt = Date.now();
            res.destroy();
          });
          // A source connection cut mid-transfer (without an "error") is also an
          // upstream failure — unless the player already hung up (we destroy
          // the source ourselves then).
          media.on("close", () => {
            if (!media.complete && !res.destroyed && !upstreamFailed) {
              upstreamFailed = true;
              session.lastUpstreamFailAt = Date.now();
            }
          });
          req.on("close", () => media.destroy());
          media.on("data", (chunk) => {
            countBytes(mode, chunk.length);
            countSessionBytes(session, chunk.length);
          });
          media.pipe(res);
        }
        return true;
      }

      const addon = getGrant(match[3]);
      if (!addon) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Addon inconnu" }));
        return true;
      }
      if (addon.revoked) {
        res.writeHead(410, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Lien révoqué" }));
        return true;
      }
      const restPath = match[4];
      if (restPath === "manifest.json") {
        const manifest = await fetchManifest(addon, upstream);
        if (manifest.id) manifest.id = `${manifest.id}.${mode}`;
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        if (req.method === "HEAD") res.end();
        else res.end(JSON.stringify(manifest));
        return true;
      }

      // Stream lists: remember each rewritten token's release info and content id
      // (stream/{type}/{id}.json) for the live "Lecture en cours" view.
      const streamPath = /^stream\/([^/]+)\/([^/]+)\.json$/.exec(restPath);
      let streamType = "", streamId = "";
      if (streamPath) {
        try {
          streamType = decodeURIComponent(streamPath[1]);
          streamId = decodeURIComponent(streamPath[2]);
        } catch {}
      }
      const output = await fetchResource(
        addon,
        restPath,
        url.search,
        `${configuredOrigin()}/relay/${mode}`,
        upstream,
        streamId ? { onToken: (token, stream) => rememberStream(token, stream, streamType, streamId) } : {},
      );
      res.writeHead(output.status, { "Content-Type": output.contentType });
      if (req.method === "HEAD") res.end();
      else {
        countBytes(mode, output.body?.length || 0);
        res.end(output.body);
      }
      return true;
    } catch (error) {
      log[error.expired ? "debug" : "warn"]("proxy", "relais échoué", { mode, expired: Boolean(error.expired), error: error.message });
      if (!res.headersSent) {
        const statusCode = error.expired ? 410 : 502;
        res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(error.expired ? "Lien expiré" : `Erreur de relais : ${error.message}`);
      } else {
        res.destroy();
      }
      return true;
    }
  }

  return { handle, register, status, test, metrics, openEvents, liveSessions, describe, resolveLogo, revokeAccount, reconcile };
}
