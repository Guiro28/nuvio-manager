import { proxySummary, normalizeProxyUrl } from "./integrated-proxy.js";
import { createRequire } from "node:module";

const transport = createRequire(import.meta.url)("../vendor/proxy/src/http.js");

// Probe from the manager's network namespace, without needing the Docker socket.
export function createProxyDiagnostics({ request = transport.request, readAll = transport.readAll, getProxyUrl, now = Date.now }) {
  let cached, pending;
  async function probe(rawUrl) {
    const url = normalizeProxyUrl(rawUrl);
    const summary = proxySummary(url);
    const parsed = new URL(url);
    const usableUrl = parsed.username || parsed.password ? "" : summary.display;
    try {
      const { res } = await request("https://cloudflare.com/cdn-cgi/trace", {
        upstream: { mode: url.startsWith("http") ? "http" : "socks", url },
        timeout: 5000,
        headers: { accept: "text/plain" },
      });
      const text = (await readAll(res)).toString("utf8");
      if (res.statusCode !== 200) throw new Error("trace unavailable");
      const fields = Object.fromEntries(text.trim().split(/\r?\n/).map(line => line.split("=")));
      if (!fields.ip || !["on", "plus", "off"].includes(fields.warp)) throw new Error("invalid trace");
      return { display: summary.display, usableUrl, available: true, warp: fields.warp, ip: fields.ip };
    } catch {
      // Do not echo transport errors: they can contain proxy credentials.
      return { display: summary.display, usableUrl, available: false, warp: "unknown", ip: "" };
    }
  }
  async function detect() {
    const configured = getProxyUrl() || "";
    if (cached?.configured === configured && now() - cached.at < 30000) return cached.value;
    if (pending?.configured === configured) return pending.promise;
    const promise = (async () => {
      const candidates = [...new Set([configured, "socks5://warp:1080", "socks5://127.0.0.1:40000"].filter(Boolean))];
      const results = await Promise.all(candidates.map(probe));
      const recommendation = results.find(result => result.available && result.usableUrl && ["on", "plus"].includes(result.warp));
      const value = { checkedAt: now(), results, suggestedUrl: recommendation?.usableUrl || "" };
      cached = { configured, at: now(), value };
      return value;
    })();
    pending = { configured, promise };
    try { return await promise; } finally { if (pending?.promise === promise) pending = null; }
  }
  return { detect, probe };
}
