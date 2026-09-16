import crypto from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATA_DIR ||= path.join(root, "data");

const require = createRequire(import.meta.url);
const { request, readAll } = require("../vendor/proxy/src/http.js");
const { decodeToken, fetchManifest, fetchResource } = require("../vendor/proxy/src/addon.js");

const MODES = new Set(["direct", "warp"]);
const upstreamFor = (mode, warpUrl) => mode === "warp"
  ? { mode: "socks", url: warpUrl }
  : { mode: "direct", url: "" };

function normalizeManifestUrl(value) {
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

export function createIntegratedProxy({ state, save, origin, warpUrl }) {
  const socksUrl = warpUrl || process.env.WARP_PROXY_URL || "socks5://127.0.0.1:40000";
  if (!Array.isArray(state.proxyAddons)) {
    state.proxyAddons = [];
    save();
  }

  const getAddon = (id) => state.proxyAddons.find((addon) => addon.id === id);

  async function register(item, mode) {
    if (!MODES.has(mode)) throw new Error("Mode proxy invalide");
    const manifestUrl = normalizeManifestUrl(item.url);
    let addon = state.proxyAddons.find((entry) => entry.manifestUrl === manifestUrl);
    if (addon) return addon;

    const { res } = await request(manifestUrl, {
      upstream: upstreamFor(mode, socksUrl),
      headers: { accept: "application/json" },
      timeout: 25000,
    });
    const manifest = JSON.parse((await readAll(res)).toString("utf8"));
    if (!manifest?.id) throw new Error("Manifest sans identifiant");
    addon = {
      id: crypto.randomBytes(5).toString("hex"),
      name: String(manifest.name || item.name || manifest.id),
      displayName: `${String(item.name || manifest.name || manifest.id)} (proxy)`,
      manifestUrl,
      logo: String(manifest.logo || item.logo || ""),
      addedAt: new Date().toISOString(),
    };
    state.proxyAddons.push(addon);
    save();
    return addon;
  }

  async function checkWarp() {
    try {
      const { res } = await request("https://cloudflare.com/cdn-cgi/trace", {
        upstream: upstreamFor("warp", socksUrl),
        timeout: 6000,
        headers: { accept: "text/plain" },
      });
      const trace = (await readAll(res)).toString("utf8");
      return /^(warp=on|warp=plus)$/m.test(trace);
    } catch {
      return false;
    }
  }

  async function status() {
    const warpAvailable = await checkWarp();
    return [
      { mode: "direct", available: true, upstream: "direct" },
      { mode: "warp", available: warpAvailable, upstream: "socks" },
    ];
  }

  async function test(mode) {
    if (!MODES.has(mode)) throw new Error("Mode proxy invalide");
    try {
      const { res } = await request("https://api.ipify.org?format=json", {
        upstream: upstreamFor(mode, socksUrl),
        timeout: 15000,
        headers: { accept: "application/json" },
      });
      const data = JSON.parse((await readAll(res)).toString("utf8"));
      return { ok: true, ip: data.ip, mode };
    } catch (error) {
      return { ok: false, error: error.message, mode };
    }
  }

  async function handle(req, res, url) {
    const match = url.pathname.match(
      /^\/relay\/(direct|warp)\/(play|([a-f0-9]{10})\/(.+))$/,
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
    const upstream = upstreamFor(mode, socksUrl);
    try {
      if (match[2] === "play") {
        const decoded = decodeToken(url.searchParams.get("t"));
        const headers = { ...decoded.headers };
        if (req.headers.range) headers.range = req.headers.range;
        headers["user-agent"] ||= req.headers["user-agent"] || "Mozilla/5.0";
        headers.accept ||= "*/*";
        const { res: media } = await request(decoded.url, {
          upstream,
          headers,
          method: req.method === "HEAD" ? "HEAD" : "GET",
          timeout: 30000,
        });
        res.statusCode = media.statusCode || 502;
        for (const name of passthroughHeaders)
          if (media.headers[name]) res.setHeader(name, media.headers[name]);
        res.setHeader("Accept-Ranges", media.headers["accept-ranges"] || "bytes");
        if (req.method === "HEAD") {
          media.resume();
          res.end();
        } else {
          media.on("error", () => res.destroy());
          req.on("close", () => media.destroy());
          media.pipe(res);
        }
        return true;
      }

      const addon = getAddon(match[3]);
      if (!addon) {
        res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Addon inconnu" }));
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

      const output = await fetchResource(
        addon,
        restPath,
        url.search,
        `${origin}/relay/${mode}`,
        upstream,
      );
      res.writeHead(output.status, { "Content-Type": output.contentType });
      if (req.method === "HEAD") res.end();
      else res.end(output.body);
      return true;
    } catch (error) {
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

  return { handle, register, status, test };
}
