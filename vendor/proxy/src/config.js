const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'config.json');

const DEFAULTS = {
  settings: {
    // Sortie reseau utilisee pour aller chercher les flux video.
    // mode: 'direct' (IP du serveur) | 'socks' (ex: WARP) | 'http'
    // Valeurs initiales possibles via env UPSTREAM_MODE / UPSTREAM_URL (ex: compose WARP).
    upstream: {
      mode: ['direct', 'socks', 'http'].includes(process.env.UPSTREAM_MODE) ? process.env.UPSTREAM_MODE : 'direct',
      url: process.env.UPSTREAM_URL || ''
    },
    // URL publique du proxy (ex: https://proxy.mondomaine.com). Vide = deduite de la requete.
    publicUrl: ''
  },
  addons: [] // [{ id, name, manifestUrl, addedAt }]
};

let state = clone(DEFAULTS);

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    state = {
      settings: {
        upstream: {
          mode: raw?.settings?.upstream?.mode || 'direct',
          url: raw?.settings?.upstream?.url || ''
        },
        publicUrl: raw?.settings?.publicUrl || ''
      },
      addons: Array.isArray(raw?.addons) ? raw.addons : []
    };
  } catch {
    state = clone(DEFAULTS);
  }
  return state;
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
}

function getState() {
  return state;
}

function getAddon(id) {
  return state.addons.find((a) => a.id === id);
}

function addAddon({ name, manifestUrl, logo }) {
  const id = crypto.randomBytes(5).toString('hex');
  // name = nom d'origine du manifest. displayName = ce qui s'affiche dans Stremio,
  // modifiable ensuite depuis le dashboard (défaut : "<nom d'origine> (proxy)").
  // logo = icône de l'addon (champ logo du manifest), pour l'afficher au dashboard.
  const addon = { id, name, displayName: `${name} (proxy)`, manifestUrl, logo: logo || '', addedAt: new Date().toISOString() };
  state.addons.push(addon);
  save();
  return addon;
}

function renameAddon(id, displayName) {
  const addon = state.addons.find((a) => a.id === id);
  const dn = String(displayName || '').trim();
  if (!addon || !dn) return null;
  addon.displayName = dn;
  save();
  return addon;
}

// Change l'URL source d'un addon en conservant son id (donc son URL d'installation).
// Rafraîchit aussi le logo depuis le nouveau manifest.
function setAddonUrl(id, manifestUrl, logo) {
  const addon = state.addons.find((a) => a.id === id);
  const url = String(manifestUrl || '').trim();
  if (!addon || !url) return null;
  addon.manifestUrl = url;
  if (logo !== undefined) addon.logo = logo || '';
  save();
  return addon;
}

function removeAddon(id) {
  const before = state.addons.length;
  state.addons = state.addons.filter((a) => a.id !== id);
  const changed = state.addons.length !== before;
  if (changed) save();
  return changed;
}

function setSettings(next) {
  if (next.upstream) {
    state.settings.upstream = {
      mode: ['direct', 'socks', 'http'].includes(next.upstream.mode) ? next.upstream.mode : 'direct',
      url: typeof next.upstream.url === 'string' ? next.upstream.url.trim() : ''
    };
  }
  if (typeof next.publicUrl === 'string') {
    state.settings.publicUrl = next.publicUrl.trim().replace(/\/+$/, '');
  }
  save();
  return state.settings;
}

load();

module.exports = { load, save, getState, getAddon, addAddon, removeAddon, renameAddon, setAddonUrl, setSettings, DATA_DIR };
