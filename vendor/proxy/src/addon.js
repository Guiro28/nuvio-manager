const { request, readAll } = require('./http');
const { encrypt, decrypt } = require('./secret');

// Durée de validité d'un lien /play. Doit couvrir toute une session de visionnage
// (film + pauses). 0 = pas d'expiration. Réglable via PLAY_TTL_HOURS.
const TTL_HOURS = process.env.PLAY_TTL_HOURS !== undefined ? Number(process.env.PLAY_TTL_HOURS) : 12;
const TTL_MS = TTL_HOURS > 0 ? TTL_HOURS * 3600 * 1000 : 0;

// Le token /play est CHIFFRE (AES-256-GCM) : l'URL réelle et les headers restent
// confidentiels, et le token ne peut être ni modifié ni forgé sans la clé serveur
// (protège contre l'usage du relais en open proxy / SSRF). Il expire après TTL_MS.
function encodeToken(url, headers, addonId) {
  const payload = { u: url };
  if (headers && typeof headers === 'object' && Object.keys(headers).length > 0) payload.h = headers;
  if (addonId) payload.d = addonId;
  if (TTL_MS > 0) payload.x = Date.now() + TTL_MS;
  return encrypt(JSON.stringify(payload));
}

function decodeToken(token) {
  const obj = JSON.parse(decrypt(token)); // lève une erreur si falsifié/forgé
  if (!obj || typeof obj.u !== 'string') throw new Error('Token invalide');
  if (obj.x && Date.now() > obj.x) {
    const e = new Error('Token expiré');
    e.expired = true;
    throw e;
  }
  return { url: obj.u, headers: obj.h || {}, addonId: obj.d || null };
}

/** Base d'un addon = son manifestUrl sans le suffixe /manifest.json. */
function addonBase(manifestUrl) {
  return manifestUrl.replace(/\/manifest\.json.*$/i, '').replace(/\/+$/, '');
}

/** Recupere et transforme le manifest d'un addon (pour eviter les collisions d'id). */
async function fetchManifest(addon, upstream) {
  const { res } = await request(addon.manifestUrl, { upstream, headers: { accept: 'application/json' } });
  const body = await readAll(res);
  const manifest = JSON.parse(body.toString('utf8'));

  // Namespacing pour ne pas entrer en conflit avec l'addon d'origine si les deux sont installes.
  if (manifest.id) manifest.id = `${manifest.id}.wproxy`;
  // Nom affiche dans Stremio : le nom personnalise du dashboard, sinon "<origine> (proxy)".
  manifest.name = addon.displayName || (manifest.name ? `${manifest.name} (proxy)` : manifest.name);
  return manifest;
}

/**
 * Recupere une ressource d'addon (stream/catalog/meta/subtitles...).
 * Si la reponse contient des streams HTTP(S), leurs URLs sont reecrites vers /play.
 * Retourne { status, contentType, body(Buffer) }.
 */
async function fetchResource(addon, restPath, query, baseUrl, upstream) {
  const target = addonBase(addon.manifestUrl) + '/' + restPath + (query || '');
  const { res } = await request(target, { upstream, headers: { accept: 'application/json' } });
  const status = res.statusCode || 502;
  const contentType = res.headers['content-type'] || 'application/json';
  const raw = await readAll(res);

  // On ne reecrit que du JSON contenant des streams.
  if (!/json/i.test(contentType)) {
    return { status, contentType, body: raw };
  }

  let data;
  try {
    data = JSON.parse(raw.toString('utf8'));
  } catch {
    return { status, contentType, body: raw };
  }

  let proxied = 0;
  let total = 0;
  if (data && Array.isArray(data.streams)) {
    total = data.streams.length;
    data.streams = data.streams.map((s) => {
      const out = rewriteStream(s, baseUrl, addon.id);
      if (out !== s && out.url && out.url.startsWith(baseUrl + '/play')) proxied++;
      return out;
    });
  }

  return {
    status,
    contentType: 'application/json; charset=utf-8',
    body: Buffer.from(JSON.stringify(data)),
    proxied,
    total
  };
}

/** Reecrit un stream: url HTTP(S) -> passe par /play. Les torrents (infoHash) sont laisses tels quels. */
function rewriteStream(stream, baseUrl, addonId) {
  if (!stream || typeof stream.url !== 'string' || !/^https?:\/\//i.test(stream.url)) {
    return stream; // torrent (infoHash), externalUrl, ytId... : non proxifiable ici
  }

  const reqHeaders = stream.behaviorHints && stream.behaviorHints.proxyHeaders
    ? stream.behaviorHints.proxyHeaders.request
    : null;

  const token = encodeToken(stream.url, reqHeaders, addonId);
  const out = { ...stream, url: `${baseUrl}/play?t=${token}` };

  // On gere les headers nous-memes cote /play : on les retire du stream.
  if (out.behaviorHints && out.behaviorHints.proxyHeaders) {
    out.behaviorHints = { ...out.behaviorHints };
    delete out.behaviorHints.proxyHeaders;
  }
  return out;
}

module.exports = { encodeToken, decodeToken, addonBase, fetchManifest, fetchResource };
