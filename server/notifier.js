// Discord notifications (webhook). Messages are rich embeds: colored side bar,
// addon logo, readable fields and Discord's own relative timestamps (<t:…:R>),
// shown in each reader's language and time zone. Sends are queued one at a time
// and honour Discord's rate limit (429 retry_after) once.
//
// The webhook URL holds a secret token: it is never logged nor returned to the UI.

const WEBHOOK_RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/(\d{17,20})\/([\w-]{20,100})\/?$/;
// Images Discord can fetch (public repository): the manager logo (bot avatar,
// header, footer, default thumbnail) and the Nuvio logo (Nuvio accounts).
export const AVATAR_URL = "https://raw.githubusercontent.com/Guiro28/nuvio-manager/main/public/assets/nuvio-manager-logo.png";
export const NUVIO_LOGO = "https://raw.githubusercontent.com/Guiro28/nuvio-manager/main/public/assets/nuvio_logo.png";
let footerText = "Nuvio Manager";
export const setNotifierVersion = (version) => {
  footerText = version ? `Nuvio Manager · v${version}` : "Nuvio Manager";
};
export const COLORS = { down: 0xe5484d, partial: 0xf5a524, ok: 0x30a46c, info: 0x8f76ff, neutral: 0x5b5bd6 };
// Every notification the settings can switch on or off (all on by default).
export const EVENTS = ["down", "recovered", "updated", "changed", "proxy", "relay", "device", "reconnect", "sync", "backup", "login", "started", "summary"];

export function normalizeWebhookUrl(value) {
  const raw = String(value || "").trim();
  const match = WEBHOOK_RE.exec(raw);
  if (!match) throw Object.assign(new Error("URL de webhook Discord invalide (https://discord.com/api/webhooks/…)"), { status: 400 });
  return `https://discord.com/api/webhooks/${match[1]}/${match[2]}`;
}

const unix = (ms) => Math.floor(ms / 1000);
const PATHS = { direct: "Depuis le serveur", warp: "Via le proxy externe" };
// An image Discord can show: HTTP(S), not SVG (Discord does not render it).
const imageUrl = (value) => {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !/\.svg$/i.test(url.pathname) ? url.href : null;
  } catch {
    return null;
  }
};
export const duration = (ms) => {
  const minutes = Math.max(1, Math.round(ms / 6e4));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return minutes % 60 && hours < 10 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  return `${Math.round(hours / 24)} j`;
};
export const bytes = (value) => {
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let n = Math.max(0, Number(value) || 0);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 10 && i ? 1 : 0 })} ${units[i]}`;
};
// "Alice, Bob, Chloé et 3 autres" — at most `max` names.
export function profileList(names, max = 5) {
  if (!names.length) return "Aucun profil";
  const shown = names.slice(0, max).join(", ");
  return names.length > max ? `${shown} et ${names.length - max} autre${names.length - max > 1 ? "s" : ""}` : shown;
}
const clip = (text, size) => (String(text).length > size ? `${String(text).slice(0, size - 1)}…` : String(text));
const field = (name, value, inline = true) => (value === undefined || value === null || value === "" ? null : { name: clip(name, 256), value: clip(value, 1024), inline });

// Common frame of every embed: header with the manager logo and the category,
// a thumbnail (addon / Nuvio logo, the manager logo when there is none usable)
// and the manager version in the footer.
function embed({ color, title, description, fields = [], thumbnail, origin, footer, now = Date.now() }) {
  return {
    author: { name: footer, icon_url: AVATAR_URL, url: origin || undefined },
    color,
    title: clip(title, 256),
    description: description ? clip(description, 4096) : undefined,
    url: origin || undefined,
    thumbnail: { url: imageUrl(thumbnail) || AVATAR_URL },
    fields: fields.filter(Boolean).slice(0, 25),
    timestamp: new Date(now).toISOString(),
    footer: { text: footerText, icon_url: AVATAR_URL },
  };
}
const profilesField = (profiles) => field(`Profils concernés (${profiles.length})`, profileList(profiles), false);

// ── Addons ────────────────────────────────────────────────────────────────
// change = { item, before, after, record, failingSince }
export function healthEmbed({ item, after, record, failingSince }, { profiles = [], origin = "", now = Date.now() } = {}) {
  const paths = Object.entries(record.paths || {});
  const pathLines = paths.map(([mode, p]) => `${p.ok ? "✅" : "❌"} ${PATHS[mode] || mode} — ${p.ok ? `${p.ms} ms` : p.error}`).join("\n");
  const failed = paths.filter(([, p]) => !p.ok).map(([mode]) => mode);
  const common = { thumbnail: item.logo, origin, now, footer: "Santé des addons" };
  if (after === "ok")
    return embed({
      ...common,
      color: COLORS.ok,
      title: `🟢 ${item.name} est de nouveau en ligne`,
      description: "L’addon répond à nouveau normalement.",
      fields: [
        failingSince ? field("Indisponible pendant", duration(now - failingSince)) : null,
        field("Temps de réponse", `${paths.find(([, p]) => p.ok)?.[1].ms ?? "?"} ms`),
        field("Version", record.version),
        profilesField(profiles),
      ],
    });
  const partial = after === "partial";
  return embed({
    ...common,
    color: partial ? COLORS.partial : COLORS.down,
    title: partial
      ? `🟠 ${item.name} est injoignable ${failed.includes("warp") ? "via le proxy externe" : "depuis le serveur"}`
      : `🔴 ${item.name} est injoignable`,
    description: partial
      ? "L’addon répond par un chemin mais pas par l’autre : seuls les profils qui passent par le chemin en erreur sont touchés."
      : "Le manifest de l’addon ne répond plus. Les profils qui l’utilisent n’en reçoivent plus les catalogues ni les sources.",
    fields: [
      field("Vérification", pathLines || "—", false),
      field("Depuis", `<t:${unix(failingSince || now)}:R>`),
      record.lastOkAt ? field("Dernière réponse correcte", `<t:${unix(record.lastOkAt)}:R>`) : null,
      profilesField(profiles),
    ],
  });
}

export function updateEmbed({ item, previous, version }, { profiles = [], origin = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.info,
    title: `🔵 ${item.name} a été mis à jour`,
    description: "Une nouvelle version du manifest a été détectée.",
    thumbnail: item.logo,
    origin,
    now,
    footer: "Santé des addons",
    fields: [field("Version", `\`${previous || "?"}\` → \`${version || "?"}\``), profilesField(profiles)],
  });
}

export function contentEmbed({ item, version }, { profiles = [], origin = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.info,
    title: `🧩 Le manifest de ${item.name} a changé`,
    description: "Les catalogues, ressources ou types de contenu proposés ont changé, sans nouvelle version. L’addon a peut-être été reconfiguré.",
    thumbnail: item.logo,
    origin,
    now,
    footer: "Santé des addons",
    fields: [field("Version", version), profilesField(profiles)],
  });
}

// ── Proxy & relay ─────────────────────────────────────────────────────────
export function proxyEmbed({ ok, display, since, ip }, { origin = "", now = Date.now() } = {}) {
  return ok
    ? embed({
        color: COLORS.ok,
        title: "🟢 Le proxy externe répond à nouveau",
        description: "Les addons en mode « Proxy externe » retrouvent leur sortie.",
        origin,
        now,
        footer: "Proxy",
        fields: [field("Proxy", `\`${display}\``), since ? field("Indisponible pendant", duration(now - since)) : null, field("IP de sortie", ip)],
      })
    : embed({
        color: COLORS.down,
        title: "🔴 Le proxy externe est injoignable",
        description: "Les addons en mode « Proxy externe » n’ont plus de sortie. Choisis un autre proxy dans les paramètres du manager si la panne dure.",
        origin,
        now,
        footer: "Proxy",
        fields: [field("Proxy", `\`${display}\``), field("Depuis", `<t:${unix(since || now)}:R>`)],
      });
}

// failures = [{ at, addon, profile, reason }]
export function relayEmbed(failures, { origin = "", now = Date.now() } = {}) {
  const lines = failures.slice(-5).map((f) => `❌ **${f.addon || "Addon"}**${f.profile ? ` · ${f.profile}` : ""} — ${f.reason} · <t:${unix(f.at)}:R>`);
  return embed({
    color: COLORS.down,
    title: `⚠️ ${failures.length} lectures ont échoué à la suite`,
    thumbnail: failures.find((f) => imageUrl(f.logo))?.logo,
    description: "Plusieurs flux ont échoué au relais en peu de temps. Le débrideur bloque peut-être l’IP de sortie, ou la source est indisponible.",
    origin,
    now,
    footer: "Relais",
    fields: [field("Derniers échecs", lines.join("\n"), false)],
  });
}

// ── Accounts ──────────────────────────────────────────────────────────────
export function deviceEmbed({ account, device }, { origin = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.neutral,
    title: `📱 Nouvel appareil sur ${account}`,
    thumbnail: NUVIO_LOGO,
    description: "Un appareil vient de se connecter à ce compte Nuvio. Si ce n’est pas toi ou un proche, change le mot de passe du compte.",
    origin,
    now,
    footer: "Appareils",
    fields: [
      field("Appareil", device.name || "Inconnu"),
      field("Plateforme", device.platform),
      field("Application", [device.app, device.version && `v${device.version}`].filter(Boolean).join(" ")),
      device.firstSeen ? field("Connecté", `<t:${unix(Date.parse(device.firstSeen))}:R>`) : null,
    ],
  });
}

export function reconnectEmbed({ account, provider, error }, { origin = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.down,
    title: `🔑 Le compte ${account} doit être reconnecté`,
    thumbnail: provider === "Nuvio" ? NUVIO_LOGO : null,
    description: "Sa session a expiré ou a été refusée : le manager ne peut plus lire ni modifier ses profils. Reconnecte-le depuis « Comptes & profils ».",
    origin,
    now,
    footer: "Comptes",
    fields: [field("Service", provider), field("Réponse", error)],
  });
}

// items = [{ label, error }]
export function syncEmbed(items, { origin = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.partial,
    title: items.length > 1 ? `🔄 La synchronisation échoue pour ${items.length} éléments` : `🔄 La synchronisation échoue pour ${items[0].label}`,
    description: "Le manager garde les dernières données connues ; les statistiques et l’historique de ces profils ne sont plus à jour.",
    origin,
    now,
    footer: "Synchronisation",
    fields: [field("Détail", items.slice(0, 10).map((i) => `• **${i.label}** — ${i.error}`).join("\n"), false)],
  });
}

// ── Backups & security ────────────────────────────────────────────────────
export function backupEmbed({ account, reason, profile, error }, { origin = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.down,
    title: `💾 Sauvegarde automatique échouée · ${account}`,
    description: "La sauvegarde faite avant une modification n’a pas pu être créée ; la modification a été annulée.",
    origin,
    now,
    footer: "Sauvegardes",
    fields: [field("Avant", reason), field("Profil", profile), field("Erreur", error, false)],
  });
}

export function loginEmbed({ ip, count, users, minutes }, { origin = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.down,
    title: `🚨 ${count} connexions échouées au manager`,
    description: `${count} tentatives de connexion ont échoué depuis la même adresse en ${minutes} minutes.`,
    origin,
    now,
    footer: "Sécurité",
    fields: [field("Adresse IP", `\`${ip}\``), field("Identifiants essayés", users.length ? users.map((u) => `\`${u}\``).join(", ") : "—")],
  });
}

// ── System ────────────────────────────────────────────────────────────────
export function startedEmbed({ version, previous, origin = "", now = Date.now() }) {
  const updated = previous && previous !== version;
  return embed({
    color: updated ? COLORS.info : COLORS.neutral,
    title: updated ? `🚀 Nuvio Manager mis à jour en v${version}` : `▶️ Nuvio Manager a démarré`,
    description: updated ? `Passage de la v${previous} à la v${version}.` : "Le manager est en ligne.",
    thumbnail: AVATAR_URL,
    origin,
    now,
    footer: "Système",
    fields: [field("Version", `v${version}`), origin ? field("Instance", origin) : null],
  });
}

// summary = { dateLabel, since, watched, opens, bandwidth, profiles:[{name,count,titles}], failing:[names] }
export function summaryEmbed(summary, { origin = "", now = Date.now() } = {}) {
  const top = summary.profiles
    .slice(0, 5)
    .map((p, i) => `${["🥇", "🥈", "🥉", "▫️", "▫️"][i]} **${p.name}** — ${p.count} titre${p.count > 1 ? "s" : ""}${p.titles.length ? ` · ${p.titles.join(", ")}` : ""}`)
    .join("\n");
  return embed({
    color: COLORS.info,
    title: `📊 Résumé du ${summary.dateLabel}`,
    description: summary.watched || summary.opens ? `Activité depuis <t:${unix(summary.since)}:R>.` : `Aucune activité depuis <t:${unix(summary.since)}:R>.`,
    thumbnail: AVATAR_URL,
    origin,
    now,
    footer: "Résumé quotidien",
    fields: [
      field("Titres regardés", String(summary.watched)),
      field("Flux ouverts", String(summary.opens)),
      summary.bandwidth != null ? field("Bande passante relayée", bytes(summary.bandwidth)) : null,
      top ? field("Profils les plus actifs", top, false) : null,
      field("Addons", summary.failing.length ? `⚠️ À surveiller : ${summary.failing.join(", ")}` : "✅ Tous les addons répondent", false),
    ],
  });
}

export function testEmbed({ origin = "", version = "", now = Date.now() } = {}) {
  return embed({
    color: COLORS.info,
    title: "🔔 Notifications Nuvio Manager activées",
    description: "Ce salon recevra les alertes choisies dans les paramètres du manager.",
    origin,
    now,
    footer: "Notifications",
    fields: [field("Version", version ? `v${version}` : ""), origin ? field("Instance", origin) : null],
  });
}

export function createDiscordNotifier({ getWebhook, log, fetchImpl = fetch, wait = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  let queue = Promise.resolve();

  async function post(url, payload) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetchImpl(`${url}?wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Nuvio-Manager" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 429 && attempt === 0) {
        const body = await response.json().catch(() => ({}));
        await wait(Math.min(10e3, Math.ceil((Number(body.retry_after) || 1) * 1000)));
        continue;
      }
      if (!response.ok) {
        const reason = response.status === 404 || response.status === 401 ? "webhook supprimé ou invalide" : `erreur HTTP ${response.status}`;
        throw Object.assign(new Error(`Discord : ${reason}`), { status: 502 });
      }
      return;
    }
    throw Object.assign(new Error("Discord : trop de messages, réessayez dans un instant"), { status: 502 });
  }

  // Queued send; resolves once Discord accepted it (or rejects with a clean error).
  function send(embeds, url = getWebhook()) {
    if (!url) return Promise.resolve(false);
    const payload = { username: "Nuvio Manager", avatar_url: AVATAR_URL, embeds: [].concat(embeds), allowed_mentions: { parse: [] } };
    const job = queue.then(() => post(url, payload));
    queue = job.catch(() => {});
    return job.then(() => true);
  }

  // Background alert: never throws, logs a failure without the webhook URL.
  function notify(embeds, label) {
    send(embeds).catch((error) => log.warn("notify", "notification Discord non envoyée", { event: label, error: error.message }));
  }

  // Webhook name, to confirm the address works when it is saved.
  async function inspect(url) {
    const response = await fetchImpl(url, { headers: { "User-Agent": "Nuvio-Manager" }, signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!response?.ok) throw Object.assign(new Error("Webhook Discord introuvable ou supprimé"), { status: 400 });
    const data = await response.json().catch(() => ({}));
    return { name: String(data.name || "Webhook") };
  }

  return { send, notify, inspect };
}
