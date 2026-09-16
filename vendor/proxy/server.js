const path = require('path');
const express = require('express');

const config = require('./src/config');
const auth = require('./src/auth');
const stats = require('./src/stats');
const { request } = require('./src/http');
const { decodeToken, fetchManifest, fetchResource } = require('./src/addon');

const app = express();
const PORT = process.env.PORT || 7000;

app.use(express.json());
// Protege uniquement l'UI (/) et l'API (/api/*). Les routes addon et /play restent publiques.
app.use(auth.middleware);

// ---- Utilitaires -----------------------------------------------------------

function baseUrl(req) {
  const s = config.getState().settings;
  if (s.publicUrl) return s.publicUrl;
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return '?'; }
}

async function checkWarp(upstream) {
  try {
    const { res: r } = await request('https://cloudflare.com/cdn-cgi/trace', {
      upstream,
      timeout: 5000,
      headers: { accept: 'text/plain' }
    });
    const chunks = [];
    for await (const c of r) chunks.push(c);
    const match = Buffer.concat(chunks).toString('utf8').match(/^warp=(.+)$/m);
    return match ? match[1].trim() : 'off';
  } catch {
    return 'unreachable';
  }
}

// ---- Authentification (page de login) --------------------------------------

app.get('/login', (req, res) => {
  if (!auth.ENABLED || auth.isAuthed(req)) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { user, pass } = req.body || {};
  if (auth.verify(user, pass)) {
    auth.setCookie(req, res);
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Identifiants invalides' });
});

app.post('/api/logout', (req, res) => {
  auth.clearCookie(res);
  res.json({ ok: true });
});

// ---- API interface ---------------------------------------------------------

app.get('/api/stats', (req, res) => {
  res.json(stats.snapshot());
});

app.get('/api/state', (req, res) => {
  const s = config.getState();
  res.json({
    authEnabled: auth.ENABLED,
    settings: s.settings,
    addons: s.addons.map((a) => ({
      ...a,
      displayName: a.displayName || `${a.name} (proxy)`,
      installUrl: `${baseUrl(req)}/${a.id}/manifest.json`
    }))
  });
});

// Normalise une URL d'addon (tolère stremio:// et l'absence de /manifest.json),
// récupère le manifest et le valide. Renvoie { manifestUrl, manifest } ou lève.
async function fetchAndValidateManifest(rawUrl) {
  let manifestUrl = (rawUrl || '').trim();
  if (!manifestUrl) throw new Error('URL requise');
  manifestUrl = manifestUrl.replace(/^stremio:\/\//i, 'https://');
  if (!/\/manifest\.json/i.test(manifestUrl)) {
    manifestUrl = manifestUrl.replace(/\/+$/, '') + '/manifest.json';
  }
  const upstream = config.getState().settings.upstream;
  const { res: r } = await request(manifestUrl, { upstream, headers: { accept: 'application/json' } });
  const chunks = [];
  for await (const c of r) chunks.push(c);
  const manifest = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!manifest || !manifest.id) throw new Error('Manifest sans id');
  return { manifestUrl, manifest };
}

app.post('/api/addons', async (req, res) => {
  try {
    const { manifestUrl, manifest } = await fetchAndValidateManifest(req.body && req.body.manifestUrl);
    const addon = config.addAddon({ name: manifest.name || manifest.id, manifestUrl, logo: manifest.logo });
    res.json({ ...addon, installUrl: `${baseUrl(req)}/${addon.id}/manifest.json` });
  } catch (e) {
    res.status(400).json({ error: 'Manifest injoignable ou invalide : ' + e.message });
  }
});

app.delete('/api/addons/:id', (req, res) => {
  const ok = config.removeAddon(req.params.id);
  res.status(ok ? 200 : 404).json({ ok });
});

// Modifie un addon : renommage (displayName) OU changement d'URL source (manifestUrl).
// L'id — donc l'URL d'installation — reste inchangé dans tous les cas.
app.patch('/api/addons/:id', async (req, res) => {
  const body = req.body || {};

  if (typeof body.displayName === 'string') {
    const addon = config.renameAddon(req.params.id, body.displayName);
    if (!addon) return res.status(400).json({ error: 'Nom invalide ou addon inconnu' });
    return res.json(addon);
  }

  if (typeof body.manifestUrl === 'string') {
    let manifestUrl, manifest;
    try {
      ({ manifestUrl, manifest } = await fetchAndValidateManifest(body.manifestUrl));
    } catch (e) {
      return res.status(400).json({ error: 'Manifest injoignable ou invalide : ' + e.message });
    }
    const addon = config.setAddonUrl(req.params.id, manifestUrl, manifest.logo);
    if (!addon) return res.status(404).json({ error: 'Addon inconnu' });
    return res.json({ ...addon, installUrl: `${baseUrl(req)}/${addon.id}/manifest.json` });
  }

  res.status(400).json({ error: 'Rien à modifier' });
});

app.post('/api/settings', (req, res) => {
  const settings = config.setSettings(req.body || {});
  res.json(settings);
});

// Teste la sortie reseau courante : renvoie l'IP publique vue par l'exterieur.
app.post('/api/test-upstream', async (req, res) => {
  const upstream = (req.body && req.body.upstream) || config.getState().settings.upstream;
  try {
    const { res: r } = await request('https://api.ipify.org?format=json', {
      upstream,
      timeout: 15000,
      headers: { accept: 'application/json' }
    });
    const chunks = [];
    for await (const c of r) chunks.push(c);
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    res.json({ ok: true, ip: data.ip, mode: upstream.mode });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

// Detecte automatiquement WARP via la sortie courante et les adresses usuelles du projet.
app.get('/api/warp-status', async (req, res) => {
  const current = config.getState().settings.upstream;
  const candidates = [
    current,
    { mode: 'socks', url: 'socks5://warp:1080' },
    { mode: 'socks', url: 'socks5://127.0.0.1:40000' }
  ].filter((candidate, index, all) =>
    all.findIndex((item) => item.mode === candidate.mode && item.url === candidate.url) === index
  );

  const results = await Promise.all(candidates.map(async (upstream) => ({
    ...upstream,
    status: await checkWarp(upstream)
  })));
  const detected = results.find((result) => result.status === 'on' || result.status === 'plus');

  res.json(detected
    ? { detected: true, status: detected.status, mode: detected.mode, url: detected.url }
    : { detected: false, status: 'off', mode: null, url: '' });
});

// ---- Relais video ----------------------------------------------------------

app.get('/play', async (req, res) => {
  cors(res);
  let target, extraHeaders;
  try {
    const decoded = decodeToken(req.query.t);
    target = decoded.url;
    extraHeaders = decoded.headers;
  } catch (e) {
    return e.expired
      ? res.status(410).send('Lien expiré')
      : res.status(400).send('Token invalide');
  }

  const headers = { ...extraHeaders };
  if (req.headers.range) headers.range = req.headers.range;
  if (!headers['user-agent']) headers['user-agent'] = req.headers['user-agent'] || 'Mozilla/5.0';
  if (!headers.accept) headers.accept = '*/*';

  try {
    const upstream = config.getState().settings.upstream;
    log(`[play] ${req.method} host=${hostOf(target)} via=${upstream.mode}${upstream.url ? '(' + upstream.url + ')' : ''} range=${req.headers.range ? 'oui' : 'non'}`);
    const { res: origin } = await request(target, {
      upstream,
      headers,
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      timeout: 30000
    });
    log(`[play] -> ${origin.statusCode} host=${hostOf(target)} (${origin.headers['content-type'] || '?'})`);

    res.status(origin.statusCode || 502);
    const pass = [
      'content-type', 'content-length', 'content-range', 'accept-ranges',
      'content-disposition', 'cache-control', 'expires', 'last-modified', 'etag'
    ];
    for (const h of pass) if (origin.headers[h]) res.setHeader(h, origin.headers[h]);
    if (!origin.headers['accept-ranges']) res.setHeader('Accept-Ranges', 'bytes');

    origin.on('data', (c) => { stats.addBytes(c.length); }); // pour la bande passante
    origin.on('error', () => res.destroy());
    req.on('close', () => origin.destroy());
    origin.pipe(res);
  } catch (e) {
    if (!res.headersSent) res.status(502).send('Erreur de relais : ' + e.message);
  }
});

// ---- Routes addon proxifie -------------------------------------------------

app.options(/.*/, (req, res) => {
  cors(res);
  res.sendStatus(204);
});

app.get('/:addonId/manifest.json', async (req, res) => {
  cors(res);
  const addon = config.getAddon(req.params.addonId);
  if (!addon) return res.status(404).json({ error: 'Addon inconnu' });
  try {
    const upstream = config.getState().settings.upstream;
    const manifest = await fetchManifest(addon, upstream);
    res.json(manifest);
  } catch (e) {
    res.status(502).json({ error: 'Manifest amont injoignable : ' + e.message });
  }
});

app.get('/:addonId/*rest', async (req, res) => {
  cors(res);
  const addon = config.getAddon(req.params.addonId);
  if (!addon) return res.status(404).json({ error: 'Addon inconnu' });

  const restPath = Array.isArray(req.params.rest) ? req.params.rest.join('/') : req.params.rest;
  const qIndex = req.originalUrl.indexOf('?');
  const query = qIndex >= 0 ? req.originalUrl.slice(qIndex) : '';

  try {
    const upstream = config.getState().settings.upstream;
    const out = await fetchResource(addon, restPath, query, baseUrl(req), upstream);
    if (restPath.startsWith('stream/')) {
      log(`[stream] addon=${addon.name} ${restPath} -> ${out.proxied}/${out.total} flux proxifies`);
    }
    res.status(out.status);
    res.setHeader('Content-Type', out.contentType);
    res.send(out.body);
  } catch (e) {
    res.status(502).json({ error: 'Ressource amont injoignable : ' + e.message });
  }
});

// ---- Interface web ---------------------------------------------------------

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Stremio Addon Proxy demarre sur le port ${PORT}`);
  console.log(`Interface : http://localhost:${PORT}`);
});
