import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { assert } from "./core.js";

const privateIpv4 = (address) => {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19));
};

const privateIp = (address) => {
  const value = String(address || "").toLowerCase().split("%")[0];
  if (isIP(value) === 4) return privateIpv4(value);
  if (isIP(value) !== 6) return true;
  if (value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value)) return true;
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? privateIpv4(mapped) : false;
};

const remoteUrl = (value, base) => {
  try {
    const url = new URL(String(value || ""), base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
};

async function assertPublicHost(url, lookupImpl) {
  assert(url.hostname.toLowerCase() !== "localhost", "Adresse locale refusée");
  const literal = isIP(url.hostname) ? [{ address: url.hostname }] : await lookupImpl(url.hostname, { all: true, verbatim: true });
  assert(literal.length && literal.every(({ address }) => !privateIp(address)), "Adresse réseau privée refusée");
}

async function fetchManifest(manifestUrl, { fetchImpl = fetch, lookupImpl = lookup } = {}) {
  const manifest = remoteUrl(manifestUrl);
  assert(manifest, "URL de manifeste invalide");
  await assertPublicHost(manifest, lookupImpl);
  const response = await fetchImpl(manifest, {
    headers: { Accept: "application/json", "User-Agent": "Nuvio-Manager/0.1" },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  assert(response.ok, `Manifest : erreur ${response.status}`, 502);
  const length = Number(response.headers?.get?.("content-length") || 0);
  assert(!length || length <= 1024 * 1024, "Manifest trop volumineux", 502);
  const text = await response.text();
  assert(Buffer.byteLength(text) <= 1024 * 1024, "Manifest trop volumineux", 502);
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error("Manifest JSON invalide"); }
  return { manifest, payload };
}

export async function readManifestLogo(manifestUrl, options = {}) {
  const { lookupImpl = lookup } = options;
  const { manifest, payload } = await fetchManifest(manifestUrl, options);
  const logo = remoteUrl(payload?.logo || payload?.icon, manifest);
  if (!logo) return null;
  await assertPublicHost(logo, lookupImpl);
  return logo.href;
}

// Logo + Stremio configuration hints in one read. `configurable` mirrors
// Stremio's "Configure" button: the addon serves a page at …/configure next to
// its manifest (configuration in the URL path is kept, so the page opens on the
// current settings).
export async function readManifestInfo(manifestUrl, options = {}) {
  const { lookupImpl = lookup } = options;
  const { manifest, payload } = await fetchManifest(manifestUrl, options);
  const hints = payload?.behaviorHints || {};
  let logo = null;
  const raw = payload?.logo || payload?.icon;
  if (raw) {
    const url = remoteUrl(raw, manifest);
    if (url) {
      await assertPublicHost(url, lookupImpl);
      logo = url.href;
    }
  }
  return {
    id: typeof payload?.id === "string" ? payload.id : null,
    logo,
    configurable: Boolean(hints.configurable || hints.configurationRequired),
    configurationRequired: Boolean(hints.configurationRequired),
  };
}

// The configuration page of an addon, as Stremio builds it.
export const configureUrl = (manifestUrl) => String(manifestUrl).replace(/\/manifest\.json(?=$|\?)/i, "/configure");
