import { renderPanelSettings } from "./panel-settings.js";
import { renderActivity } from "./activity.js";
import { renderStatistics } from "./statistics.js";
import { renderConnections } from "./connections.js";
import {
  officialSettingsItems,
  readSettingControl,
  settingControl,
  settingDescription,
  settingsSections,
  setSettingValue,
  visibleOfficialSettings,
} from "./settings-controls-v2.js";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let state,
  page = "home",
  accountId = "",
  profileId = 1,
  profiles = [],
  current,
  tab = "tv",
  draft,
  selectedPaths = new Set(),
  settingsSection = { tv: "appearance", mobile: "layout" },
  openSettingGroups = { tv: new Set(), mobile: new Set() },
  historyTab = "progress",
  pairTimer,
  homeTimer,
  perfTimer;
const labels = {
  home: "Accueil",
  profiles: "Comptes & profils",
  statistics: "Statistiques",
  library: "Bibliothèque d’addons",
  copy: "Cloner un profil",
  proxy: "Proxy",
  backups: "Sauvegardes",
  settings: "Paramètres",
};
const titles = {
  appearance: "Apparence",
  track_preference: "Préférences par vidéo",
  trailer_settings: "Bandes-annonces",
  stream_badge_settings: "Badges des flux",
  mdblist_settings: "Notes MDBList",
  debrid_settings: "Services de débridage",
  trakt_comments_settings: "Commentaires Trakt",
  notifications_settings: "Notifications",
  poster_card_style_settings_payload: "Style des affiches",
  card_depth_style_settings_payload: "Relief des cartes",
  collection_mobile_settings_payload: "Collections Mobile",
  continue_watching_settings_payload: "Reprise de lecture",
  meta_screen_settings_payload: "Fiches des contenus",
  trakt_settings_payload: "Traking",
  dismissed_next_up_keys: "Épisodes suivants masqués",
  dismissedNextUpKeys: "Épisodes suivants masqués",
  has_chosen_layout: "Disposition déjà choisie",
  folder_gif_overrides: "Images animées des dossiers",
  theme: "Thème",
  player_settings: "Lecture",
  layout_settings: "Disposition",
  theme_settings: "Apparence",
  subtitle_settings: "Sous-titres",
  audio_settings: "Audio",
  experience_settings: "Expérience",
  stream_settings: "Flux",
  tmdb_settings: "TMDB",
  trakt_settings: "Traking",
  settings: "Paramètres",
  features: "Catégories",
  general: "Général",
};
const human = (s) =>
  titles[s] ||
  (/^sub_(lang|name|type|track_id|is_forced)\|/.test(s) ? ({lang:"Langue des sous-titres",name:"Nom des sous-titres",type:"Type de sous-titres",track_id:"Identifiant de piste",is_forced:"Sous-titres forcés"}[s.split("|")[0].slice(4)] + " · " + s.split("|")[1]) : "") ||
  s
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
const hash = async (x) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(x)),
      ),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
async function api(route, data) {
  const r = await fetch("/api/" + route, {
    ...(data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {}),
  });
  const b = await r.json();
  if (!r.ok) {
    if (r.status === 401 && !route.startsWith("pair")) login();
    if (r.status === 428 && route !== "setup") setup();
    throw Error(
      b.error +
        (b.partial
          ? `\nDéjà enregistrés : ${b.completed.join(", ")}. Une sauvegarde est disponible.`
          : ""),
    );
  }
  return b;
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  setTimeout(() => ($("#toast").hidden = true), 7000);
}
async function run(fn) {
  document.body.classList.add("busy");
  try {
    await fn();
  } catch (e) {
    toast(e.message);
  } finally {
    document.body.classList.remove("busy");
  }
}
function btn(text, id, cls = "") {
  return `<button ${id ? `id="${id}"` : ""} class="${cls}">${text}</button>`;
}
function heading(title, text, action = "") {
  return `<div class="title-row"><div><h1>${title}</h1><p class="muted">${text}</p></div>${action}</div>`;
}
function openDialog(html) {
  const d = $("#dialog");
  d.innerHTML = html;
  if (!d.open) d.showModal();
  d.querySelectorAll("[data-close]").forEach(
    (b) => (b.onclick = () => d.close()),
  );
}
function accountOptions(id = accountId) {
  return state.accounts
    .map(
      (a) =>
        `<option value="${esc(a.id)}" ${a.id === id ? "selected" : ""}>${esc(a.name || a.email)}</option>`,
    )
    .join("");
}
function renameAccount() {
  const selected = state.accounts.find(a => a.id === accountId);
  openDialog(`<h2>Renommer le compte</h2><form id="rename-account-form" class="form"><label>Nom affiché<input name="name" maxlength="80" value="${esc(selected.name || selected.email)}" placeholder="${esc(selected.email)}" autocomplete="off"></label><p class="muted">Ce nom est utilisé dans le dashboard. Laisse le champ vide pour afficher à nouveau l’adresse e-mail.</p><div class="dialog-actions"><button type="button" data-close>Annuler</button><button class="primary">Enregistrer</button></div></form>`);
  $("#rename-account-form").onsubmit = event => {
    event.preventDefault();
    const name = event.target.elements.name.value;
    run(async () => {
      await api("accounts/rename", { accountId: selected.id, name });
      $("#dialog").close();
      await render();
      toast("Nom du compte enregistré");
    });
  };
}
function profileOptions(rows = profiles, id = profileId) {
  return rows
    .map(
      (p) =>
        `<option value="${p.profile_index}" ${p.profile_index === Number(id) ? "selected" : ""}>${esc(p.name)} · Profil ${p.profile_index}</option>`,
    )
    .join("");
}
function listValues(rows) {
  return rows.map((r, i) => ({
    url: new URL(r.url).href,
    name: String(r.name || ""),
    enabled: r.enabled !== false,
    sort_order: i,
    ...(r.repo_type ? { repo_type: r.repo_type } : {}),
  }));
}
async function refreshState() {
  state = await api("state");
  if (!state.accounts.some((a) => a.id === accountId)) {
    accountId = state.accounts[0]?.id || "";
    profileId = 1;
  }
}
async function loadProfiles() {
  if (!accountId) {
    profiles = [];
    current = null;
    return;
  }
  profiles = await api("profiles?accountId=" + encodeURIComponent(accountId));
  if (!profiles.some((p) => p.profile_index === Number(profileId)))
    profileId = profiles[0]?.profile_index || 1;
}
async function loadProfile() {
  current = await api(
    `profile?accountId=${encodeURIComponent(accountId)}&profileId=${profileId}`,
  );
  draft = structuredClone(current[tab]?.settings_json || {});
}
const NUVIO_PAGES = ["profiles", "statistics", "proxy"];
async function render() {
  await refreshState();
  clearInterval(homeTimer);
  clearInterval(perfTimer);
  document.querySelector(".perf-tip")?.remove();
  const isAdmin = state.viewer?.isAdmin === true;
  $$("#nav button").forEach((b) => {
    const allowed = isAdmin || NUVIO_PAGES.includes(b.dataset.page);
    b.style.display = allowed ? "" : "none";
  });
  if (!isAdmin && !NUVIO_PAGES.includes(page)) page = "profiles";
  $("#crumb").textContent = labels[page];
  $$("#nav button").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === page),
  );
  if (page === "home") await renderHome();
  if (page === "profiles") await renderProfiles();
  if (page === "statistics") await renderStatistics($("#content"), { api, run, openDialog });
  if (page === "library") renderLibrary();
  if (page === "copy") await renderCopy();
  if (page === "proxy") await renderProxy();
  if (page === "backups") renderBackups();
  if (page === "settings") await renderPanelSettings($("#content"), {api,run,toast,onSaved:render});
}
const $$ = (s) => [...document.querySelectorAll(s)];
const fmtBytes = (n) => {
  n = Number(n) || 0;
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
};
const fmtUptime = (seconds) => {
  const s = Math.floor(Number(seconds) || 0),
    d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60);
  if (d) return `${d} j ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
};
// Material Design Icons (single-path SVG data) used on the home tiles.
const HOME_ICONS = {
  memory: "M17,17H7V7H17M21,11V9H19V7C19,5.89 18.1,5 17,5H15V3H13V5H11V3H9V5H7C5.89,5 5,5.89 5,7V9H3V11H5V13H3V15H5V17A2,2 0 0,0 7,19H9V21H11V19H13V21H15V19H17A2,2 0 0,0 19,17V15H21V13H19V11M13,13H11V11H13M15,9H9V15H15V9Z",
  server: "M2 4.6V9.4C2 10.3 2.5 11 3.2 11H20.9C21.5 11 22.1 10.3 22.1 9.4V4.6C22 3.7 21.5 3 20.8 3H3.2C2.5 3 2 3.7 2 4.6M10 8V6H9V8H10M5 8H7V6H5V8M20 9H4V5H20V9M2 14.6V19.4C2 20.3 2.5 21 3.2 21H20.9C21.5 21 22.1 20.3 22.1 19.4V14.6C22.1 13.7 21.6 13 20.9 13H3.2C2.5 13 2 13.7 2 14.6M10 18V16H9V18H10M5 18H7V16H5V18M20 19H4V15H20V19Z",
  cpu: "M9,3V5H7A2,2 0 0,0 5,7V9H3V11H5V13H3V15H5V17A2,2 0 0,0 7,19H9V21H11V19H13V21H15V19H17A2,2 0 0,0 19,17V15H21V13H19V11H21V9H19V7A2,2 0 0,0 17,5H15V3H13V5H11V3M8,9H11.5V10.5H8.5V11.25H10.5A1,1 0 0,1 11.5,12.25V14A1,1 0 0,1 10.5,15H8A1,1 0 0,1 7,14V10A1,1 0 0,1 8,9M12.5,9H14V11H15.5V9H17V15H15.5V12.5H12.5M8.5,12.75V13.5H10V12.75",
  clock: "M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z",
  speedometer: "M12,16A3,3 0 0,1 9,13C9,11.88 9.61,10.9 10.5,10.39L20.21,4.77L14.68,14.35C14.18,15.33 13.17,16 12,16M12,3C13.81,3 15.5,3.5 16.97,4.32L14.87,5.53C14,5.19 13,5 12,5A8,8 0 0,0 4,13C4,15.21 4.89,17.21 6.34,18.65H6.35C6.74,19.04 6.74,19.67 6.35,20.06C5.96,20.45 5.32,20.45 4.93,20.07V20.07C3.12,18.26 2,15.76 2,13A10,10 0 0,1 12,3M22,13C22,15.76 20.88,18.26 19.07,20.07V20.07C18.68,20.45 18.05,20.45 17.66,20.06C17.27,19.67 17.27,19.04 17.66,18.65V18.65C19.11,17.2 20,15.21 20,13C20,12 19.81,11 19.46,10.1L20.67,8C21.5,9.5 22,11.18 22,13Z",
  lan: "M10,2C8.89,2 8,2.89 8,4V7C8,8.11 8.89,9 10,9H11V11H2V13H6V15H5C3.89,15 3,15.89 3,17V20C3,21.11 3.89,22 5,22H9C10.11,22 11,21.11 11,20V17C11,15.89 10.11,15 9,15H8V13H16V15H15C13.89,15 13,15.89 13,17V20C13,21.11 13.89,22 15,22H19C20.11,22 21,21.11 21,20V17C21,15.89 20.11,15 19,15H18V13H22V11H13V9H14C15.11,9 16,8.11 16,7V4C16,2.89 15.11,2 14,2H10M10,4H14V7H10V4M5,17H9V20H5V17M15,17H19V20H15V17Z",
  earth: "M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z",
  swap: "M9,3L5,7H8V14H10V7H13M16,17V10H14V17H11L15,21L19,17H16Z",
  account: "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7.07,18.28C7.5,17.38 10.12,16.5 12,16.5C13.88,16.5 16.5,17.38 16.93,18.28C15.57,19.36 13.86,20 12,20C10.14,20 8.43,19.36 7.07,18.28M18.36,16.83C16.93,15.09 13.46,14.5 12,14.5C10.54,14.5 7.07,15.09 5.64,16.83C4.62,15.5 4,13.82 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,13.82 19.38,15.5 18.36,16.83M12,6C10.06,6 8.5,7.56 8.5,9.5C8.5,11.44 10.06,13 12,13C13.94,13 15.5,11.44 15.5,9.5C15.5,7.56 13.94,6 12,6M12,11A1.5,1.5 0 0,1 10.5,9.5A1.5,1.5 0 0,1 12,8A1.5,1.5 0 0,1 13.5,9.5A1.5,1.5 0 0,1 12,11Z",
  accounts: "M13.07 10.41A5 5 0 0 0 13.07 4.59A3.39 3.39 0 0 1 15 4A3.5 3.5 0 0 1 15 11A3.39 3.39 0 0 1 13.07 10.41M5.5 7.5A3.5 3.5 0 1 1 9 11A3.5 3.5 0 0 1 5.5 7.5M7.5 7.5A1.5 1.5 0 1 0 9 6A1.5 1.5 0 0 0 7.5 7.5M16 17V19H2V17S2 13 9 13 16 17 16 17M14 17C13.86 16.22 12.67 15 9 15S4.07 16.31 4 17M15.95 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13Z",
  puzzle: "M22,13.5C22,15.26 20.7,16.72 19,16.96V20A2,2 0 0,1 17,22H13.2V21.7A2.7,2.7 0 0,0 10.5,19C9,19 7.8,20.21 7.8,21.7V22H4A2,2 0 0,1 2,20V16.2H2.3C3.79,16.2 5,15 5,13.5C5,12 3.79,10.8 2.3,10.8H2V7A2,2 0 0,1 4,5H7.04C7.28,3.3 8.74,2 10.5,2C12.26,2 13.72,3.3 13.96,5H17A2,2 0 0,1 19,7V10.04C20.7,10.28 22,11.74 22,13.5M17,15H18.5A1.5,1.5 0 0,0 20,13.5A1.5,1.5 0 0,0 18.5,12H17V7H12V5.5A1.5,1.5 0 0,0 10.5,4A1.5,1.5 0 0,0 9,5.5V7H4V9.12C5.76,9.8 7,11.5 7,13.5C7,15.5 5.75,17.2 4,17.88V20H6.12C6.8,18.25 8.5,17 10.5,17C12.5,17 14.2,18.25 14.88,20H17V15Z",
  shuffle: "M17,3L22.25,7.5L17,12L22.25,16.5L17,21V18H14.26L11.44,15.18L13.56,13.06L15.5,15H17V12L17,9H15.5L6.5,18H2V15H5.26L14.26,6H17V3M2,6H6.5L9.32,8.82L7.2,10.94L5.26,9H2V6Z",
  database: "M12 3C7.58 3 4 4.79 4 7V17C4 19.21 7.59 21 12 21S20 19.21 20 17V7C20 4.79 16.42 3 12 3M18 17C18 17.5 15.87 19 12 19S6 17.5 6 17V14.77C7.61 15.55 9.72 16 12 16S16.39 15.55 18 14.77V17M18 12.45C16.7 13.4 14.42 14 12 14C9.58 14 7.3 13.4 6 12.45V9.64C7.47 10.47 9.61 11 12 11C14.39 11 16.53 10.47 18 9.64V12.45M12 9C8.13 9 6 7.5 6 7S8.13 5 12 5C15.87 5 18 6.5 18 7S15.87 9 12 9Z",
  trakt: "m15.082 15.107-.73-.73 9.578-9.583a4.499 4.499 0 0 0-.115-.575L13.662 14.382l1.08 1.08-.73.73-1.81-1.81L23.422 3.144c-.075-.15-.155-.3-.25-.44L11.508 14.377l2.154 2.155-.73.73-7.193-7.199.73-.73 4.309 4.31L22.546 1.86A5.618 5.618 0 0 0 18.362 0H5.635A5.637 5.637 0 0 0 0 5.634V18.37A5.632 5.632 0 0 0 5.635 24h12.732C21.477 24 24 21.48 24 18.37V6.19l-8.913 8.918zm-4.314-2.155L6.814 8.988l.73-.73 3.954 3.96zm1.075-1.084-3.954-3.96.73-.73 3.959 3.96zm9.853 5.688a4.141 4.141 0 0 1-4.14 4.14H6.438a4.144 4.144 0 0 1-4.139-4.14V6.438A4.141 4.141 0 0 1 6.44 2.3h10.387v1.04H6.438c-1.71 0-3.099 1.39-3.099 3.1V17.55c0 1.71 1.39 3.105 3.1 3.105h11.117c1.71 0 3.1-1.395 3.1-3.105v-1.754h1.04v1.754z",
  simkl: "M3.84 0A3.832 3.832 0 0 0 0 3.84v16.32A3.832 3.832 0 0 0 3.84 24h16.32A3.832 3.832 0 0 0 24 20.16V3.84A3.832 3.832 0 0 0 20.16 0zm8.567 4.11c2.074 0 3.538.061 4.393.186 1.127.168 1.94.46 2.438.877.672.578 1.009 1.613 1.009 3.104 0 .161-.004.417-.01.768h-4.234c-.014-.358-.039-.607-.074-.746-.098-.41-.42-.64-.966-.692-.484-.043-1.66-.066-3.53-.066-1.85 0-2.946.056-3.289.165-.385.133-.578.474-.578 1.024 0 .528.203.851.61.969.343.095 1.887.187 4.633.275 2.487.073 4.073.165 4.76.275.693.11 1.244.275 1.654.495.41.22.737.532.983.936.37.595.557 1.552.557 2.873 0 1.475-.182 2.557-.546 3.247-.364.683-.96 1.149-1.785 1.398-.812.25-3.05.374-6.71.374-2.226 0-3.832-.062-4.82-.187-1.204-.147-2.068-.434-2.593-.86-.567-.456-.903-1.1-1.008-1.93a10.522 10.522 0 0 1-.085-1.434v-.789H7.44c-.007.74.136 1.216.43 1.428.154.102.33.167.525.203.196.037.54.063 1.03.077a166.2 166.2 0 0 0 2.405.022c1.862-.007 2.94-.018 3.234-.033.553-.044.917-.12 1.092-.23.245-.161.368-.52.368-1.077 0-.38-.078-.648-.231-.802-.211-.212-.712-.325-1.503-.34-.547 0-1.688-.044-3.425-.132-1.794-.088-2.956-.14-3.488-.154-1.387-.044-2.364-.212-2.932-.505-.728-.373-1.205-1.01-1.429-1.91-.126-.498-.189-1.15-.189-1.956 0-1.698.309-2.895.925-3.59.462-.527 1.163-.875 2.102-1.044.848-.146 2.865-.22 6.053-.22z",
};
const mdiIcon = (name) =>
  `<span class="metric-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${HOME_ICONS[name]}"></path></svg></span>`;
const homeMetric = (label, value, icon = "") =>
  `<article class="metric metric-home">${icon}<span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
// Latest fetched series + window, kept for the hover interaction.
let perfSeries = [];
let perfPeriodSec = 86400;
// Previous cumulative bandwidth sample, to derive a live throughput.
let lastBw = null;
// Draws a CPU/RAM time series on a real time axis, with a % grid (labels on the
// left). RAM shares the plot, auto-scaled; its value shows in the hover tooltip.
function perfChart(series, periodSeconds) {
  const W = 600, H = 160, padT = 8, padB = 8, plotH = H - padT - padB,
    n = series.length,
    ramMax = Math.max(1, ...series.map((p) => p.rss)) * 1.15,
    tEnd = Date.now(),
    tStart = tEnd - (Number(periodSeconds) || 86400) * 1000,
    span = Math.max(1, tEnd - tStart),
    xf = (t) => Math.max(0, Math.min(1, (t - tStart) / span)),
    yCpu = (v) => padT + (1 - Math.max(0, Math.min(100, v)) / 100) * plotH,
    yRam = (v) => padT + (1 - v / ramMax) * plotH,
    poly = (get, yFn) => series.map((p) => `${(xf(p.t) * W).toFixed(1)},${yFn(get(p)).toFixed(1)}`).join(" "),
    grid = [0, 25, 50, 75, 100]
      .map((v) => `<line class="perf-grid" vector-effect="non-scaling-stroke" x1="0" y1="${yCpu(v).toFixed(1)}" x2="${W}" y2="${yCpu(v).toFixed(1)}"></line>`)
      .join(""),
    labels = [100, 75, 50, 25, 0].map((v) => `<span style="top:${(yCpu(v) / H * 100).toFixed(1)}%">${v} %</span>`).join(""),
    inner =
      n < 2
        ? grid
        : `${grid}<polyline class="perf-line perf-ram" vector-effect="non-scaling-stroke" points="${poly((p) => p.rss, yRam)}"></polyline><polyline class="perf-line perf-cpu" vector-effect="non-scaling-stroke" points="${poly((p) => p.cpu, yCpu)}"></polyline>`;
  return `<div class="perf-plot"><div class="perf-yaxis">${labels}</div><div class="perf-canvas"><svg class="perf-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Utilisation CPU et RAM dans le temps">${inner}</svg><div class="perf-cursor" hidden></div></div></div>${n < 2 ? '<p class="muted perf-hint">Pas encore assez de données sur cette période.</p>' : ""}`;
}
function bindPerfHover() {
  const canvas = $(".perf-canvas"),
    cursor = $(".perf-cursor");
  if (!canvas || !cursor || perfSeries.length < 2) return;
  let tip = document.querySelector(".perf-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "perf-tip";
    document.body.appendChild(tip);
  }
  tip.hidden = true;
  const tEnd = Date.now(),
    tStart = tEnd - perfPeriodSec * 1000,
    span = Math.max(1, tEnd - tStart);
  const move = (event) => {
    const rect = canvas.getBoundingClientRect(),
      frac = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      targetT = tStart + frac * span;
    let best = perfSeries[0], bestD = Infinity;
    for (const p of perfSeries) {
      const d = Math.abs(p.t - targetT);
      if (d < bestD) { bestD = d; best = p; }
    }
    cursor.style.left = `${((best.t - tStart) / span) * rect.width}px`;
    cursor.hidden = false;
    tip.innerHTML = `<div class="perf-tip-time">${new Date(best.t).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div><div><i class="cpu"></i>CPU <b>${Math.round(best.cpu)} %</b></div><div><i class="ram"></i>RAM <b>${esc(fmtBytes(best.rss))}</b></div>`;
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = `${Math.max(6, Math.min(event.clientX - tw / 2, window.innerWidth - tw - 6))}px`;
    tip.style.top = `${Math.max(6, event.clientY - th - 16)}px`;
  };
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseleave", () => { cursor.hidden = true; tip.hidden = true; });
}
const PERF_PERIODS = [
  ["3600", "1 heure"], ["7200", "2 heures"], ["21600", "6 heures"],
  ["43200", "12 heures"], ["86400", "1 jour"], ["172800", "2 jours"], ["604800", "1 semaine"],
];
function homeSkeleton() {
  const options = PERF_PERIODS.map(([v, l]) => `<option value="${v}"${v === "86400" ? " selected" : ""}>${l}</option>`).join("");
  return `<h2 class="home-heading">Système</h2><section class="stats-metrics" id="home-system"></section>` +
    `<div class="panel perf-panel"><div class="perf-head"><h3>Utilisation dans le temps</h3><div class="perf-legend"><span><i class="cpu"></i> CPU <b id="perf-cpu">—</b></span><span><i class="ram"></i> RAM <b id="perf-ram">—</b></span></div><select id="perf-period" class="perf-period" aria-label="Période affichée">${options}</select></div><div id="perf-host"><p class="muted perf-hint">Chargement…</p></div></div>` +
    `<h2 class="home-heading">Réseau · proxy</h2><section class="stats-metrics" id="home-network"></section>` +
    `<h2 class="home-heading">Instance</h2><section class="stats-metrics" id="home-instance"></section>` +
    `<p class="footer-note">Le trafic est compté depuis le démarrage de l’instance et cumulé dans le volume de données. L’historique CPU/RAM est conservé une semaine.</p>`;
}
function updateHomeTiles(d) {
  const system = [
    homeMetric("Mémoire du process", fmtBytes(d.memory.rss), mdiIcon("memory")),
    homeMetric("Mémoire système", fmtBytes(d.memory.used), mdiIcon("server")),
    homeMetric("Processeur", `${Math.round(d.cpu.percent)} %`, mdiIcon("cpu")),
    homeMetric("Uptime", fmtUptime(d.uptime), mdiIcon("clock")),
  ].join("");
  const total = (d.bandwidth.direct || 0) + (d.bandwidth.warp || 0);
  const now = Date.now();
  let rate = null;
  if (lastBw && now > lastBw.t && total >= lastBw.total)
    rate = (total - lastBw.total) / ((now - lastBw.t) / 1000);
  lastBw = { total, t: now };
  const network = [
    homeMetric("Débit en direct", rate == null ? "—" : `${fmtBytes(rate)}/s`, mdiIcon("speedometer")),
    homeMetric("Proxy interne", fmtBytes(d.bandwidth.direct), mdiIcon("lan")),
    homeMetric("Proxy externe", fmtBytes(d.bandwidth.warp), mdiIcon("earth")),
    homeMetric("Trafic total", fmtBytes(total), mdiIcon("swap")),
  ].join("");
  const instance = [
    homeMetric("Comptes Nuvio", d.accounts, mdiIcon("account")),
    homeMetric("Profils", d.profiles, mdiIcon("accounts")),
    homeMetric("Addons en bibliothèque", d.libraryAddons, mdiIcon("puzzle")),
    homeMetric("Addons proxifiés", d.proxyAddons, mdiIcon("shuffle")),
    homeMetric("Comptes Trakt", d.trakt, mdiIcon("trakt")),
    homeMetric("Comptes Simkl", d.simkl, mdiIcon("simkl")),
    homeMetric("Sauvegardes", d.backups, mdiIcon("database")),
  ].join("");
  const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
  set("#home-system", system);
  set("#home-network", network);
  set("#home-instance", instance);
  const cpuEl = $("#perf-cpu"); if (cpuEl) cpuEl.textContent = `${Math.round(d.cpu.percent)} %`;
  const ramEl = $("#perf-ram"); if (ramEl) ramEl.textContent = fmtBytes(d.memory.rss);
}
async function renderHome() {
  const c = $("#content");
  lastBw = null;
  c.innerHTML = heading("Accueil", "Vue d’ensemble de l’instance et de son activité.") + homeSkeleton();
  const loadTiles = async () => {
    let data;
    try { data = await api("overview"); } catch { return; }
    if ($("#home-system")) updateHomeTiles(data);
  };
  const loadChart = async () => {
    const period = $("#perf-period")?.value;
    if (!period) return;
    let result;
    try { result = await api(`metrics/history?period=${period}`); } catch { return; }
    const host = $("#perf-host");
    if (!host) return;
    perfSeries = result.series || [];
    perfPeriodSec = Number(period);
    host.innerHTML = perfChart(perfSeries, period);
    bindPerfHover();
  };
  $("#perf-period").onchange = () => run(loadChart);
  await loadTiles();
  await loadChart();
  clearInterval(perfTimer);
  homeTimer = setInterval(() => {
    if (!$("#home-system")?.isConnected) return clearInterval(homeTimer);
    loadTiles().catch(() => {});
  }, 5000);
  perfTimer = setInterval(() => {
    if (!$("#perf-host")?.isConnected) return clearInterval(perfTimer);
    loadChart().catch(() => {});
  }, 30000);
}
function emptyAccounts() {
  return `<div class="empty"><div class="empty-symbol">▦</div><h2>Vos profils, au même endroit.</h2><p class="muted">Connectez un compte Nuvio pour retrouver ses profils, modifier les réglages TV et Mobile et leur attribuer vos addons.</p>${btn("＋ Connecter un compte", "connect", "primary")}<p class="footer-note">La connexion se valide sur le site officiel Nuvio.<br>Votre mot de passe reste sur Nuvio.</p></div>`;
}
function profileAvatar(profile) {
  let src = '';
  try {
    const url = new URL(profile.avatar_image_url || profile.avatar_url);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) src = url.href;
  } catch {}
  const color = /^#[0-9a-f]{6}$/i.test(profile.avatar_color_hex || "") ? profile.avatar_color_hex : "#1E88E5";
  return '<span class="avatar" style="background:'+esc(color)+'"><span class="avatar-fallback">'+esc(profile.name.slice(0,1))+'</span>'+(src ? '<img class="profile-avatar" src="'+esc(src)+'" alt="" referrerpolicy="no-referrer" decoding="async">' : '')+'</span>';
}
async function renderProfiles() {
  const c = $("#content");
  const admin = state.viewer?.isAdmin === true;
  c.innerHTML = heading(
    "Comptes & profils",
    "Un espace pour chaque compte. Des réglages pour chaque écran.",
    admin ? btn("＋ Connecter un compte", "connect", "primary") : "",
  );
  const connectBtn = $("#connect");
  if (connectBtn) connectBtn.onclick = () => run(pair);
  if (!accountId) {
    c.innerHTML = heading('Comptes & profils', 'Un espace pour chaque compte. Des réglages pour chaque écran.') + emptyAccounts();
    $$("#connect").forEach((b) => (b.onclick = () => run(pair)));
    return;
  }
  await loadProfiles();
  c.innerHTML += `<div class="account-bar"><label>COMPTE NUVIO<select id="account">${accountOptions()}</select></label><div class="actions"><span class="badge neutral">${profiles.length} profils</span>${admin ? btn("Renommer le compte", "rename-account") : ""}${btn("＋ Nouveau profil", "create")}${admin ? btn("Déconnecter ce compte", "disconnect", "quiet") : ""}</div></div><div class="profile-grid">${profiles.map((p) => `<button class="profile-card ${p.profile_index === Number(profileId) ? "selected" : ""}" data-profile="${p.profile_index}">${profileAvatar(p)}<span class="profile-name">${esc(p.name)}</span><span class="muted">${p.profile_index === 1 ? "Profil principal" : "Profil " + p.profile_index} · TV & Mobile</span></button>`).join("")}</div><div id="editor"></div>`;
  const connectAgain = $("#connect");
  if (connectAgain) connectAgain.onclick = () => run(pair);
  $$(".profile-avatar").forEach(image => image.addEventListener('error', () => image.remove(), {once:true}));
  $("#account").onchange = (e) =>
    run(async () => {
      accountId = e.target.value;
      await renderProfiles();
    });
  $$("[data-profile]").forEach(
    (b) =>
      (b.onclick = () =>
        run(async () => {
          profileId = Number(b.dataset.profile);
          await renderProfiles();
        })),
  );
  $("#create").onclick = createProfile;
  const renameBtn = $("#rename-account");
  if (renameBtn) renameBtn.onclick = renameAccount;
  const disconnectBtn = $("#disconnect");
  if (disconnectBtn) disconnectBtn.onclick = () => {
    openDialog(
      `<h2>Déconnecter ce compte du dashboard ?</h2><p>Le compte et ses profils restent disponibles dans Nuvio.</p><div class="dialog-actions"><button data-close>Annuler</button><button id="remove-account" class="danger">Déconnecter</button></div>`,
    );
    $("#remove-account").onclick = () =>
      run(async () => {
        await api("accounts/remove", { accountId });
        $("#dialog").close();
        await render();
      });
  };
  await loadProfile();
  renderEditor();
}
function leaves(value, trail = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.hasOwn(value, "type") && Object.hasOwn(value, "value"))
      return [
        {
          path: [...trail, "value"],
          value: value.value,
          label: trail.at(-1),
          type: value.type,
        },
      ];
    return Object.entries(value).flatMap(([k, v]) => leaves(v, [...trail, k]));
  }
  return [{ path: trail, value, label: trail.at(-1) }];
}
function writePath(obj, parts, value) {
  let ref = obj;
  for (const key of parts.slice(0, -1)) ref = ref[key];
  ref[parts.at(-1)] = value;
}
function settingsContext() { return {addons:listValues(current.addons),plugins:listValues(current.plugins)}; }
function field(item,i) { return settingControl(item,`data-field="${i}"`,settingsContext()); }
function renderEditor() {
  const e = $("#editor");
  e.innerHTML = `<div class="tabs">${[
    ["tv", "Paramètres ATV"],
    ["mobile", "Paramètres Mobile"],
    ["addons", "Addons"],
    ["plugins", "Plugins"],
    ["identity", "Profil"],
    ["connections", "Trakt & Simkl"],
    ["history", "Historique Nuvio"],
  ]
    .map(
      ([k, v]) =>
        `<button data-tab="${k}" class="${tab === k ? "active" : ""}">${v}</button>`,
    )
    .join("")}</div><div id="settings"></div>`;
  $$("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        if (!["history", "connections", "identity", "addons", "plugins"].includes(tab))
          draft = structuredClone(current[tab]?.settings_json || {});
        renderEditor();
      }),
  );
  if (tab === "history") return renderNuvioHistory();
  if (tab === "connections") return renderConnections($("#settings"), {api,accountId,profileId,openDialog,run,toast,onConnected:renderEditor});
  if (tab === "identity") return identityEditor();
  if (tab === "addons" || tab === "plugins") return integrationsEditor();
  const updated = current[tab].updated_at;
  $("#settings").innerHTML =
    `<div class="settings-top"><input id="filter" name="nuvio-settings-filter" type="search" autocomplete="off" data-form-type="other" data-1p-ignore data-lpignore="true" placeholder="Rechercher dans les réglages…" aria-label="Rechercher un paramètre"><div class="actions">${btn("Recharger", "reload")}${btn("Voir les changements", "save", "primary")}</div></div><div class="muted">${updated ? "Synchronisé le " + esc(new Date(updated).toLocaleString("fr-FR")) : "Aucun paramètre synchronisé pour cette plateforme."}</div><div id="fields"></div><details class="panel raw-settings"><summary>Édition JSON avancée</summary><p class="muted">Conserve la structure et les types des paramètres Nuvio. Les champs inconnus sont préservés.</p><textarea id="raw" rows="12" aria-label="Paramètres JSON">${esc(JSON.stringify(draft, null, 2))}</textarea>${btn("Appliquer au brouillon", "raw-apply")}</details>`;
  renderFields();
  $("#filter").oninput = () => renderFields();
  $("#reload").onclick = () =>
    run(async () => {
      await loadProfile();
      renderEditor();
    });
  $("#raw-apply").onclick = () =>
    run(async () => {
      const value = JSON.parse($("#raw").value);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw Error("Objet JSON attendu");
      draft = value;
      renderFields();
      toast("Brouillon mis à jour. Aucun changement envoyé à Nuvio.");
    });
  $("#save").onclick = () =>
    run(async () => {
      const expected = await hash({ [tab]: current[tab].settings_json });
      await preview({
        accountId,
        profileId,
        desired: { [tab]: draft },
        expected,
      });
    });
}

function renderNuvioHistory() {
  const container = $("#settings");
  const historyTabs = [
    ["progress", "Progression"],
    ["library", "Bibliothèque"],
    ["watched", "Déjà vus"],
  ];
  container.innerHTML = `<section class="nuvio-history"><div class="nuvio-history-heading"><div><h2>Historique Nuvio</h2><p class="muted">Consultez les contenus synchronisés par Nuvio pour ce profil.</p></div></div><div class="history-tabs" role="tablist" aria-label="Catégories de l’historique Nuvio">${historyTabs.map(([key, label]) => `<button type="button" role="tab" aria-selected="${historyTab === key}" data-history-tab="${key}" class="${historyTab === key ? "active" : ""}">${label}</button>`).join("")}</div><div id="history-content" role="tabpanel"></div></section>`;
  $$('[data-history-tab]').forEach((button) => {
    button.onclick = () => {
      historyTab = button.dataset.historyTab;
      renderNuvioHistory();
    };
  });
  return renderActivity($("#history-content"), {
    api,
    accountId,
    profileId,
    kind: historyTab,
  });
}
function renderFields() {
  const { official, extra } = officialSettingsItems(draft, tab);
  const allItems = [...official, ...extra];
  const indexed = new Map(
    official.map((item, index) => [
      item.meta.feature + "." + item.meta.key,
      { ...item, i: index },
    ]),
  );
  const visible = new Set(
    visibleOfficialSettings(tab, official).map(
      (item) => item.meta.feature + "." + item.meta.key,
    ),
  );
  const query = $("#filter").value.trim().toLocaleLowerCase("fr");
  const sections = settingsSections[tab];
  const hasInternal = extra.length > 0;
  if (
    !sections.some((section) => section.id === settingsSection[tab]) &&
    settingsSection[tab] !== "internal"
  )
    settingsSection[tab] = sections[0].id;
  if (settingsSection[tab] === "internal" && !hasInternal)
    settingsSection[tab] = sections[0].id;

  const sectionButtons = [
    ...sections.map((section) => ({
      id: section.id,
      title: section.title,
      experimental: section.experimental,
    })),
    ...(hasInternal
      ? [{ id: "internal", title: `Données internes (${extra.length})` }]
      : []),
  ];
  const navigation = `<div class="settings-section-tabs" role="tablist" aria-label="Catégories de réglages">${sectionButtons
    .map(
      (section) =>
        `<button role="tab" data-settings-section="${section.id}" aria-selected="${settingsSection[tab] === section.id}" class="${settingsSection[tab] === section.id ? "active" : ""}">${esc(section.title)}${section.experimental ? " · App" : ""}</button>`,
    )
    .join("")}</div>`;

  let content;
  if (settingsSection[tab] === "internal") {
    const rows = extra
      .map((item, index) => ({ ...item, i: official.length + index }))
      .filter(
        (item) =>
          !query ||
          (human(item.label) + " " + item.path.join(" "))
            .toLocaleLowerCase("fr")
            .includes(query),
      );
    content = `<div class="settings-section-heading"><div><span class="eyebrow">Hors interface officielle</span><h2>Données internes synchronisées</h2><p>Ces valeurs existent dans le profil mais ne correspondent à aucun contrôle actuel de nuvio.tv. Elles sont conservées pour ne pas perturber les applications.</p></div></div><div class="hint warning">Ne modifie ces données que si tu connais leur rôle. Certaines sont des états internes, des préférences anciennes ou des réglages propres à une version d’application.</div><details class="setting-group" ${openSettingGroups[tab].has("internal") ? "open" : ""} data-setting-group="internal"><summary><span>Données supplémentaires</span><span class="muted">${rows.length} valeur${rows.length > 1 ? "s" : ""}</span></summary>${rows
      .map(
        (item) =>
          `<div class="setting-row"><div><strong>${esc(human(item.label))}</strong></div><div class="setting-input">${field(item, item.i)}</div></div>`,
      )
      .join("") || '<div class="empty-inline">Aucune donnée correspondante.</div>'}</details>`;
  } else {
    const section =
      sections.find((candidate) => candidate.id === settingsSection[tab]) ||
      sections[0];
    const groupMarkup = section.groups
      .map((group, groupIndex) => {
        const rows = group.keys
          .map((key) => indexed.get(key))
          .filter(Boolean)
          .filter((item) =>
            visible.has(item.meta.feature + "." + item.meta.key),
          )
          .filter(
            (item) =>
              !query ||
              (
                item.meta.title +
                " " +
                settingDescription(item.meta) +
                " " +
                item.meta.feature +
                " " +
                item.meta.key
              )
                .toLocaleLowerCase("fr")
                .includes(query),
          );
        if (query && !rows.length) return "";
        const groupId = section.id + ":" + groupIndex;
        return `<details class="setting-group" ${openSettingGroups[tab].has(groupId) ? "open" : ""} data-setting-group="${groupId}"><summary><span>${esc(group.title)}</span><span class="muted">${rows.length} réglage${rows.length > 1 ? "s" : ""}</span></summary><p class="setting-group-description">${esc(group.description)}</p>${rows
          .map((item) => {
            const description = settingDescription(item.meta);
            return `<div class="setting-row${item.present ? "" : " setting-default"}"><div><strong>${esc(item.meta.title)}</strong>${description ? `<div class="muted">${esc(description)}</div>` : ""}${item.present ? "" : '<span class="default-badge">Valeur par défaut</span>'}</div><div class="setting-input">${field(item, item.i)}</div></div>`;
          })
          .join("")}</details>`;
      })
      .join("");
    content = `<div class="settings-section-heading"><div><h2>${esc(section.title)}</h2><p>${esc(section.description)}</p></div><span class="section-count">${section.groups.reduce((count, group) => count + group.keys.length, 0)} réglages</span></div>${section.experimental ? '<div class="hint warning">Ces réglages existent dans le code officiel de l’application Mobile mais ne sont pas exposés sur nuvio.tv. Leur utilisation reste expérimentale.</div>' : ""}${groupMarkup || '<div class="empty-inline">Aucun paramètre ne correspond à cette recherche dans cet onglet.</div>'}`;
  }

  $("#fields").innerHTML = navigation + content;
  $$("[data-settings-section]").forEach(
    (button) =>
      (button.onclick = () => {
        settingsSection[tab] = button.dataset.settingsSection;
        renderFields();
      }),
  );
  $$("[data-setting-group]").forEach(
    (details) =>
      (details.ontoggle = () => {
        const group = details.dataset.settingGroup;
        if (details.open) openSettingGroups[tab].add(group);
        else openSettingGroups[tab].delete(group);
      }),
  );
  $$("[data-field]").forEach(
    (element) =>
      (element.onchange = () =>
        run(async () => {
          if (element.type === "radio" && !element.checked) return;
          const item = allItems[Number(element.dataset.field)];
          const value = readSettingControl(
            element,
            item,
            settingsContext(),
          );
          setSettingValue(draft, item, value);
          $("#raw").value = JSON.stringify(draft, null, 2);
          if (element.type === "range")
            element.nextElementSibling.textContent =
              value + " " + (item.meta?.unit || "");
          else renderFields();
        })),
  );
}
function integrationsEditor() {
  const kind = tab,
    rows = listValues(current[kind]),
    inherited =
      current.identity[
        kind === "addons" ? "uses_primary_addons" : "uses_primary_plugins"
      ];
  $("#settings").innerHTML =
    `<div class="settings-top"><p class="muted">${rows.length} ${kind} · ordre de synchronisation</p><div class="actions">${btn("＋ Ajouter", "add-integration")}${btn("Voir les changements", "save-list", "primary")}</div></div>${inherited ? '<div class="hint warning">Ce profil utilise la liste du profil principal. Modifie l’héritage dans l’onglet Profil pour gérer sa propre liste.</div>' : ""}<div id="integration-list"></div>`;
  function display() {
    $("#integration-list").innerHTML =
      rows
        .map(
          (r, i) =>
            `<div class="addon"><div class="addon-top"><label class="check-label"><input type="checkbox" data-enabled="${i}" ${r.enabled ? "checked" : ""} ${inherited ? "disabled" : ""}>${esc(r.name || kind)}</label><div class="actions"><button data-up="${i}" ${i === 0 || inherited ? "disabled" : ""} aria-label="Monter ${esc(r.name)}">↑</button><button data-down="${i}" ${i === rows.length - 1 || inherited ? "disabled" : ""} aria-label="Descendre ${esc(r.name)}">↓</button><button data-remove="${i}" ${inherited ? "disabled" : ""}>Retirer</button></div></div><p class="url">${esc(r.url)}</p></div>`,
        )
        .join("") || '<p class="empty-inline">Aucune intégration.</p>';
    $$("[data-enabled]").forEach(
      (el) =>
        (el.onchange = () =>
          (rows[Number(el.dataset.enabled)].enabled = el.checked)),
    );
    $$("[data-up]").forEach(
      (el) =>
        (el.onclick = () => {
          const i = +el.dataset.up;
          [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
          display();
        }),
    );
    $$("[data-down]").forEach(
      (el) =>
        (el.onclick = () => {
          const i = +el.dataset.down;
          [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
          display();
        }),
    );
    $$("[data-remove]").forEach(
      (el) =>
        (el.onclick = () => {
          rows.splice(+el.dataset.remove, 1);
          display();
        }),
    );
  }
  display();
  $("#save-list").disabled = inherited;
  $("#add-integration").disabled = inherited;
  $("#add-integration").onclick = () => {
    openDialog(
      `<h2>Ajouter un ${kind === "addons" ? "addon" : "plugin"}</h2><form id="integration-form" class="form"><label>Nom<input name="name" required></label><label>URL<input name="url" type="url" required placeholder="https://…"></label>${kind === "plugins" ? '<label>Type de dépôt<select name="repo_type"><option>NUVIO_JS</option><option>EXTERNAL_DEX</option></select></label>' : ""}<div class="dialog-actions"><button type="button" data-close>Annuler</button><button class="primary">Ajouter au brouillon</button></div></form>`,
    );
    $("#integration-form").onsubmit = (e) => {
      e.preventDefault();
      rows.push({
        ...Object.fromEntries(new FormData(e.target)),
        enabled: true,
      });
      $("#dialog").close();
      display();
    };
  };
  $("#save-list").onclick = () =>
    run(async () =>
      preview({
        accountId,
        profileId,
        desired: { [kind]: rows },
        expected: await hash({ [kind]: listValues(current[kind]) }),
      }),
    );
}
function identityEditor() {
  const p = current.identity,
    colors = ["#1E88E5", "#E53935", "#43A047", "#FB8C00", "#8E24AA", "#00ACC1", "#F4511E", "#3949AB", "#C0CA33", "#D81B60", "#00897B", "#5E35B1", "#7CB342", "#039BE5", "#FFB300", "#6D4C41"],
    avatars = current.avatars || [],
    profileColor = /^#[0-9a-f]{6}$/i.test(p.avatar_color_hex || "") ? p.avatar_color_hex : "#1E88E5";
  let selectedAvatarId = p.avatar_id || "",
    xperienceAvatars = [];
  const nuvioAvatars = avatars.map(avatar => `<button type="button" data-avatar-id="${esc(avatar.id)}" data-avatar-url="${esc(avatar.imageUrl)}" class="avatar-choice ${avatar.id === selectedAvatarId ? "selected" : ""}" title="${esc(avatar.displayName)}" aria-label="Choisir ${esc(avatar.displayName)}"><img src="${esc(avatar.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join("") || '<p class="muted">Le catalogue d’avatars Nuvio est indisponible.</p>';
  $("#settings").innerHTML = `
    <form id="identity-form" class="panel form">
      <h2>Identité et héritage</h2>
      <div class="identity-customization">
        <div id="identity-avatar-preview" class="identity-avatar-preview"><span>${esc(p.name.slice(0, 1))}</span><img alt="Aperçu de l’image du profil" referrerpolicy="no-referrer"></div>
        <div class="form">
          <label>Nom du profil<input name="name" required value="${esc(p.name)}"></label>
          <label>Couleur du profil<div class="profile-color-control"><input name="color" type="color" value="${esc(profileColor)}"><output>${esc(profileColor.toUpperCase())}</output></div></label>
          <div class="profile-color-swatches" aria-label="Couleurs Nuvio">${colors.map(color => `<button type="button" data-profile-color="${color}" aria-label="Choisir la couleur ${color}" aria-pressed="false"></button>`).join("")}</div>
        </div>
      </div>
      <fieldset class="profile-avatar-fieldset">
        <legend>Image du profil</legend>
        <h3>Avatars Nuvio</h3>
        <div class="avatar-gallery">${nuvioAvatars}</div>
        <div class="xperience-avatar-heading">
          <h3>Avatars personnalisés Xperience</h3>
          <p class="avatar-source-note">Source des images : <a href="https://xperience-app.com/avatars" target="_blank" rel="noopener noreferrer">galerie Xperience ↗</a>. Les fichiers restent hébergés par Xperience.</p>
        </div>
        <div class="xperience-avatar-tools">
          <label>Catégorie<select id="xperience-category" disabled><option>Chargement…</option></select></label>
          <label>Rechercher<input id="xperience-search" type="search" placeholder="Nom d’un avatar…" disabled></label>
        </div>
        <p id="xperience-avatar-count" class="muted">Chargement du catalogue Xperience…</p>
        <div id="xperience-avatar-gallery" class="avatar-gallery xperience-avatar-gallery"></div>
        <label>URL d’une image personnalisée<input name="avatarUrl" type="url" placeholder="https://…" value="${esc(p.avatar_url || "")}"></label>
        <div><button type="button" id="clear-avatar" class="quiet">Retirer l’image</button></div>
      </fieldset>
      <label class="check-label"><input name="addons" type="checkbox" ${p.uses_primary_addons ? "checked" : ""} ${profileId === 1 ? "disabled" : ""}>Utiliser les addons du profil principal</label>
      <label class="check-label"><input name="plugins" type="checkbox" ${p.uses_primary_plugins ? "checked" : ""} ${profileId === 1 ? "disabled" : ""}>Utiliser les plugins du profil principal</label>
      <div>${btn("Enregistrer le profil", "", "primary")}</div>
      <p class="footer-note">Une sauvegarde du compte est créée avant l’enregistrement.</p>
    </form>`;
  const form = $("#identity-form"),
    colorInput = form.elements.color,
    colorOutput = colorInput.nextElementSibling,
    urlInput = form.elements.avatarUrl,
    preview = $("#identity-avatar-preview"),
    previewImage = preview.querySelector("img"),
    xperienceCategory = $("#xperience-category"),
    xperienceSearch = $("#xperience-search"),
    xperienceGallery = $("#xperience-avatar-gallery"),
    xperienceCount = $("#xperience-avatar-count");
  const validImageUrl = (value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  };
  const updatePreview = () => {
    preview.style.background = colorInput.value;
    colorOutput.textContent = colorInput.value.toUpperCase();
    $$('[data-profile-color]').forEach((button) => {
      const selected = button.dataset.profileColor.toUpperCase() === colorInput.value.toUpperCase();
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const selected = avatars.find((avatar) => avatar.id === selectedAvatarId),
      src = validImageUrl(urlInput.value) || selected?.imageUrl || (!urlInput.value && !selectedAvatarId ? "" : p.avatar_image_url);
    if (src) {
      previewImage.src = src;
      previewImage.hidden = false;
    } else {
      previewImage.removeAttribute("src");
      previewImage.hidden = true;
    }
    $$('[data-avatar-id]').forEach((button) => button.classList.toggle("selected", button.dataset.avatarId === selectedAvatarId));
    $$('[data-xperience-url]').forEach((button) => button.classList.toggle("selected", validImageUrl(button.dataset.xperienceUrl) === validImageUrl(urlInput.value)));
  };
  colorInput.oninput = updatePreview;
  $$('[data-profile-color]').forEach((button) => {
    button.style.backgroundColor = button.dataset.profileColor;
    button.onclick = () => {
      colorInput.value = button.dataset.profileColor;
      updatePreview();
    };
  });
  $$('[data-avatar-id]').forEach((button) => button.onclick = () => {
    selectedAvatarId = button.dataset.avatarId;
    urlInput.value = "";
    updatePreview();
  });
  urlInput.oninput = () => {
    if (urlInput.value.trim()) selectedAvatarId = "";
    updatePreview();
  };
  $("#clear-avatar").onclick = () => {
    selectedAvatarId = "";
    urlInput.value = "";
    updatePreview();
  };
  previewImage.addEventListener("error", () => { previewImage.hidden = true; });
  updatePreview();
  const avatarName = (avatar) => avatar.name.replace(/[-_]+/g, " ").replace(/\bprofile avatar\b/gi, "").replace(/\s+/g, " ").trim() || avatar.name;
  const renderXperienceAvatars = () => {
    const category = xperienceCategory.value,
      query = xperienceSearch.value.trim().toLocaleLowerCase("fr"),
      matching = xperienceAvatars.filter((avatar) =>
        (category === "__all__" || avatar.category === category) &&
        (!query || `${avatar.name} ${avatar.category}`.toLocaleLowerCase("fr").includes(query)),
      );
    xperienceCount.textContent = `${matching.length} avatar${matching.length > 1 ? "s" : ""}`;
    xperienceGallery.innerHTML = matching.map((avatar) => {
      const name = avatarName(avatar);
      return `<button type="button" data-xperience-url="${esc(avatar.url)}" class="avatar-choice" title="${esc(name)}" aria-label="Choisir ${esc(name)}"><img src="${esc(avatar.url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></button>`;
    }).join("") || '<p class="muted">Aucun avatar dans cette sélection.</p>';
    $$('[data-xperience-url]').forEach((button) => button.onclick = () => {
      selectedAvatarId = "";
      urlInput.value = button.dataset.xperienceUrl;
      updatePreview();
    });
    updatePreview();
  };
  api("xperience-avatars").then((result) => {
    if (!form.isConnected) return;
    xperienceAvatars = result.avatars || [];
    const categories = result.categories || [],
      currentXperienceAvatar = xperienceAvatars.find((avatar) => validImageUrl(avatar.url) === validImageUrl(urlInput.value));
    xperienceCategory.innerHTML = `<option value="__all__">Toutes les catégories</option>${categories.map((category) => `<option value="${esc(category)}">${esc(category)} (${xperienceAvatars.filter((avatar) => avatar.category === category).length})</option>`).join("")}`;
    xperienceCategory.value = currentXperienceAvatar?.category || categories[0] || "__all__";
    xperienceCategory.disabled = false;
    xperienceSearch.disabled = false;
    xperienceCategory.onchange = renderXperienceAvatars;
    xperienceSearch.oninput = renderXperienceAvatars;
    renderXperienceAvatars();
  }).catch((error) => {
    if (!form.isConnected) return;
    xperienceCount.textContent = `Catalogue Xperience indisponible : ${error.message}`;
  });
  $("#identity-form").onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    run(async () => {
      await api("profile/identity", {
        accountId,
        profileId,
        name: f.elements.name.value,
        color: f.elements.color.value,
        avatarId: selectedAvatarId,
        avatarUrl: f.elements.avatarUrl.value,
        inheritAddons: f.elements.addons.checked,
        inheritPlugins: f.elements.plugins.checked,
      });
      toast("Profil enregistré");
      await renderProfiles();
    });
  };
}
function createProfile() {
  openDialog(
    `<h2>Nouveau profil</h2><form id="new-profile" class="form"><label>Nom<input name="name" required></label><div class="dialog-actions"><button type="button" data-close>Annuler</button><button class="primary">Créer dans Nuvio</button></div></form>`,
  );
  $("#new-profile").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      await api("profile/create", {
        accountId,
        name: e.target.elements.name.value,
      });
      $("#dialog").close();
      await render();
    });
  };
}
const PLATFORM_LABELS = { tv: "TV", mobile: "Mobile" };
const LIST_LABELS = { addons: "Addons", plugins: "Plugins" };
// Turns a raw diff value into readable French for the settings view.
const friendlyValue = (x) => {
  if (x === true) return "Activé";
  if (x === false) return "Désactivé";
  if (x === null || x === undefined || x === "") return "Absent";
  if (typeof x === "string" || typeof x === "number") return String(x);
  return JSON.stringify(x);
};
// Compares two addon/plugin lists (matched by url) into readable entries.
function diffList(before, after) {
  const b = Array.isArray(before) ? before : [],
    a = Array.isArray(after) ? after : [],
    bByUrl = new Map(b.map((x) => [x.url, x])),
    aByUrl = new Map(a.map((x) => [x.url, x])),
    rows = [];
  for (const item of a) {
    const prev = bByUrl.get(item.url),
      name = item.name || item.url;
    if (!prev) {
      rows.push({ tone: "add", badge: "Ajouté", name });
      continue;
    }
    const notes = [];
    if ((prev.name || "") !== (item.name || ""))
      notes.push(`renommé « ${prev.name || "—"} » → « ${item.name || "—"} »`);
    if ((prev.enabled !== false) !== (item.enabled !== false))
      notes.push(item.enabled !== false ? "activé" : "désactivé");
    if (notes.length) rows.push({ tone: "mod", badge: "Modifié", name, note: notes.join(" · ") });
  }
  for (const item of b)
    if (!aByUrl.has(item.url)) rows.push({ tone: "del", badge: "Retiré", name: item.name || item.url });
  const common = (list, other) => list.map((x) => x.url).filter((url) => other.has(url));
  const bOrder = common(b, aByUrl),
    aOrder = common(a, bByUrl);
  if (bOrder.length === aOrder.length && bOrder.some((url, i) => url !== aOrder[i]))
    rows.push({ tone: "mod", badge: "Ordre", name: "Ordre de la liste modifié" });
  return rows;
}
// Renders the whole diff grouped by section, readable instead of raw JSON.
function renderDiff(diff) {
  const lists = [],
    settings = [];
  for (const d of diff) {
    if (d.path[0] === "addons" || d.path[0] === "plugins") {
      lists.push({ title: LIST_LABELS[d.path[0]], items: diffList(d.before, d.after) });
      continue;
    }
    const secret = /key|token|password|secret/i.test(d.path.join(".")),
      platform = PLATFORM_LABELS[d.path[0]],
      label = (platform ? [platform, ...d.path.slice(1).map(human)] : d.path.map(human)).join(" › ");
    settings.push({
      label,
      before: secret ? "Valeur masquée" : friendlyValue(d.before),
      after: secret ? "Valeur masquée" : friendlyValue(d.after),
    });
  }
  let html = lists
    .map(
      (group) =>
        `<div class="diff-group"><div class="diff-group-title">${esc(group.title)}</div>${group.items
          .map(
            (it) =>
              `<div class="diff-item"><span class="badge diff-badge ${it.tone}">${esc(it.badge)}</span><span class="diff-item-name">${esc(it.name)}</span>${it.note ? `<span class="muted diff-item-note">${esc(it.note)}</span>` : ""}</div>`,
          )
          .join("") || '<div class="diff-item muted">Aucun changement</div>'}</div>`,
    )
    .join("");
  if (settings.length)
    html += `<div class="diff-group"><div class="diff-group-title">Paramètres</div>${settings
      .map(
        (r) =>
          `<div class="diff-row"><div class="diff-label">${esc(r.label)}</div><div class="diff-values"><div class="old">− ${esc(r.before)}</div><div class="new">+ ${esc(r.after)}</div></div></div>`,
      )
      .join("")}</div>`;
  return html;
}
async function preview(data) {
  const result = await api("preview", data);
  if (!result.count) return toast("Aucune modification à appliquer.");
  openDialog(
    `<h2>${result.count} modification${result.count > 1 ? "s" : ""} à vérifier</h2><p class="muted">Une sauvegarde du compte cible sera créée avant l’enregistrement.</p><div class="diff">${renderDiff(result.diff)}</div><div id="apply-error"></div><div class="dialog-actions"><button data-close>Annuler</button><button id="apply" class="primary">Enregistrer dans Nuvio</button></div>`,
  );
  $("#apply").onclick = async () => {
    const button = $("#apply");
    button.disabled = true;
    try {
      await api("apply", { id: result.id });
      $("#dialog").close();
      toast("Modifications enregistrées. Sauvegarde disponible.");
      await render();
    } catch (e) {
      $("#apply-error").innerHTML = `<p class="error">${esc(e.message)}</p>`;
    }
  };
}
function renderLibrary() {
  const addonLogo = (addon) => {
    let source = "";
    try {
      const url = new URL(addon.logo);
      if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) source = url.href;
    } catch {}
    return `<span class="addon-logo"><span>${esc((addon.name || "A").slice(0, 1).toUpperCase())}</span>${source ? `<img src="${esc(source)}" alt="Logo de ${esc(addon.name)}" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>`;
  };
  $("#content").innerHTML =
    heading(
      "Bibliothèque d’addons",
      "Ajoutez une source une fois, puis attribuez-la aux profils de votre choix.",
      btn("＋ Ajouter un addon", "new-addon", "primary"),
    ) +
    `<div class="list">${state.library.map((a) => `<article class="addon library-addon"><div class="addon-top"><div class="library-addon-identity">${addonLogo(a)}<div class="library-addon-copy"><div class="addon-name">${esc(a.name)}</div><p class="url" title="${esc(a.url)}">${esc(a.url)}</p></div></div><div class="actions"><button data-edit="${a.id}">Modifier</button><button data-assign="${a.id}" class="primary">Attribuer à un profil</button><button data-delete="${a.id}" class="quiet">Retirer</button></div></div></article>`).join("") || '<div class="empty"><div class="empty-symbol">⊞</div><h2>Votre catalogue commence ici.</h2><p class="muted">Ajoutez l’URL du manifest d’un addon. Son attribution aux profils reste manuelle.</p></div>'}</div>`;
  $$(".addon-logo img").forEach((image) => image.addEventListener("error", () => image.remove(), { once: true }));
  if (state.library.some((item) => !Object.hasOwn(item, "logo")))
    api("library/refresh-logos", {}).then((result) => {
      state.library = result.library;
      if (page === "library") renderLibrary();
    }).catch(() => {});
  $("#new-addon").onclick = () => addonForm();
  $$("[data-edit]").forEach(
    (b) =>
      (b.onclick = () =>
        addonForm(state.library.find((a) => a.id === b.dataset.edit))),
  );
  $$("[data-assign]").forEach(
    (b) => (b.onclick = () => run(() => assign(b.dataset.assign))),
  );
  $$("[data-delete]").forEach(
    (b) =>
      (b.onclick = () =>
        run(async () => {
          await api("library/remove", { id: b.dataset.delete });
          await render();
          toast(
            "Retiré du catalogue. Les installations Nuvio restent en place.",
          );
        })),
  );
}
function addonForm(a = {}) {
  openDialog(
    `<h2>${a.id ? "Modifier" : "Ajouter"} un addon</h2><form id="addon-form" class="form"><label>Nom<input name="name" required value="${esc(a.name)}" placeholder="Mon addon"></label><label>URL du manifest<input name="url" required value="${esc(a.url)}" placeholder="https://…/manifest.json"></label><p class="muted">Le catalogue conserve l’URL de configuration. Aucun profil n’est modifié à cette étape.</p><div class="dialog-actions"><button type="button" data-close>Annuler</button><button class="primary">Enregistrer</button></div></form>`,
  );
  $("#addon-form").onsubmit = (e) => {
    e.preventDefault();
    run(async () => {
      await api("library/save", {
        id: a.id,
        ...Object.fromEntries(new FormData(e.target)),
      });
      $("#dialog").close();
      await render();
    });
  };
}
async function assign(id) {
  if (!accountId) return toast("Connecte d’abord un compte Nuvio.");
  await loadProfiles();
  openDialog(
    `<h2>Attribuer l’addon</h2><div class="form"><label>Compte<select id="assign-account">${accountOptions()}</select></label><label>Profil<select id="assign-profile">${profileOptions()}</select></label><label>Mode de connexion<select id="assign-mode"><option value="none">Sans proxy · URL d’origine</option><option value="direct">Proxy · IP du serveur</option><option value="warp">Proxy externe · WARP, SOCKS ou HTTP</option></select></label><p class="muted">L’adresse du proxy externe se configure dans Paramètres. Les URL publiques du dashboard doivent rester accessibles depuis vos appareils.</p></div><div class="dialog-actions"><button data-close>Annuler</button><button id="assign-preview" class="primary">Prévisualiser l’attribution</button></div>`,
  );
  $("#assign-account").onchange = (e) =>
    run(async () => {
      $("#assign-profile").innerHTML = profileOptions(
        await api("profiles?accountId=" + encodeURIComponent(e.target.value)),
      );
    });
  $("#assign-preview").onclick = () =>
    run(() =>
      preview({
        accountId: $("#assign-account").value,
        profileId: Number($("#assign-profile").value),
        assignment: { id, mode: $("#assign-mode").value },
      }),
    );
}
async function renderCopy() {
  if (!accountId) {
    $("#content").innerHTML =
      heading(
        "Cloner un profil",
        "Transférez tous les réglages synchronisés ou une sélection précise.",
      ) + emptyAccounts();
    $("#connect").onclick = () => run(pair);
    return;
  }
  await loadProfiles();
  selectedPaths = new Set();
  $("#content").innerHTML =
    heading(
      "Cloner un profil",
      "Choisissez une source, une destination, puis les éléments à transférer.",
    ) +
    `<div class="two-col"><section class="panel form"><h2>01 · Profil source</h2><label>Compte<select id="source-account">${accountOptions()}</select></label><label>Profil<select id="source-profile">${profileOptions()}</select></label></section><section class="panel form"><h2>02 · Profil destination</h2><label>Compte<select id="target-account">${accountOptions()}</select></label><label>Profil<select id="target-profile">${profileOptions(profiles, profiles.find((p) => p.profile_index !== profileId)?.profile_index)}</select></label></section></div><section class="panel"><h2>03 · Éléments à copier</h2><div class="form"><label class="check-label"><input type="checkbox" id="copy-tv" checked>Tous les paramètres ATV synchronisés</label><label class="check-label"><input type="checkbox" id="copy-mobile" checked>Tous les paramètres Mobile synchronisés</label><label class="check-label"><input type="checkbox" id="copy-addons" checked>Addons, activation et ordre</label><label class="check-label"><input type="checkbox" id="copy-plugins" checked>Plugins, activation et ordre</label><label class="check-label"><input type="checkbox" id="merge">Fusionner les listes d’addons et plugins avec la destination</label></div><hr>${btn("Choisir des paramètres précis", "select-paths")}<div id="path-selector"></div><p class="footer-note">Cette copie concerne les paramètres synchronisés, addons et plugins. Elle conserve l’identité, la bibliothèque et l’historique du profil cible. Les identifiants de fournisseurs stockés séparément ne sont pas copiés.</p></section><div class="actions">${btn("Prévisualiser la copie", "copy-preview", "primary")}</div>`;
  for (const side of ["source", "target"])
    $("#" + side + "-account").onchange = (e) =>
      run(async () => {
        $("#" + side + "-profile").innerHTML = profileOptions(
          await api("profiles?accountId=" + encodeURIComponent(e.target.value)),
        );
        if (side === "source") resetPaths();
      });
  $("#source-profile").onchange = resetPaths;
  function resetPaths() {
    selectedPaths.clear();
    $("#path-selector").innerHTML = "";
  }
  $("#select-paths").onclick = () =>
    run(async () => {
      const src = await api(
        `profile?accountId=${encodeURIComponent($("#source-account").value)}&profileId=${$("#source-profile").value}`,
      );
      $("#copy-tv").checked = false;
      $("#copy-mobile").checked = false;
      selectedPaths.clear();
      $("#path-selector").innerHTML = ["tv", "mobile"]
        .map(
          (p) =>
            `<details class="setting-group"><summary>${p === "tv" ? "ATV" : "Mobile"}</summary>${leaves(
              src[p].settings_json,
            )
              .filter((x) => x.path.length && !(x.path.length === 1 && x.path[0] === "version"))
              .map(
                (x) =>
                  `<label class="check-label setting-row"><input type="checkbox" data-path="${esc(JSON.stringify([p, ...x.path]))}">${esc(x.path.join(" › "))}</label>`,
              )
              .join("")}</details>`,
        )
        .join("");
      $$("[data-path]").forEach(
        (el) =>
          (el.onchange = () =>
            el.checked
              ? selectedPaths.add(el.dataset.path)
              : selectedPaths.delete(el.dataset.path)),
      );
    });
  $("#copy-preview").onclick = () =>
    run(async () => {
      const selection = {
        tv: $("#copy-tv").checked,
        mobile: $("#copy-mobile").checked,
        addons: $("#copy-addons").checked,
        plugins: $("#copy-plugins").checked,
      };
      for (const part of ["tv", "mobile"])
        if (!selection[part]) {
          const paths = [...selectedPaths]
            .map(JSON.parse)
            .filter((x) => x[0] === part)
            .map((x) => x.slice(1));
          if (paths.length) selection[part] = paths;
        }
      await preview({
        accountId: $("#target-account").value,
        profileId: Number($("#target-profile").value),
        source: {
          accountId: $("#source-account").value,
          profileId: Number($("#source-profile").value),
        },
        selection,
        merge: $("#merge").checked,
      });
    });
}
async function renderProxy() {
  $("#content").innerHTML =
    heading(
      "Proxy",
      "Le moteur stremio-addon-proxy est intégré au dashboard, avec une sortie choisie pour chaque addon.",
    ) +
    '<div id="proxy-status" class="status-grid"><p class="muted">Vérification des sorties réseau…</p></div><div class="hint">Sans proxy : le profil utilise l’URL originale. Proxy direct : les flux HTTP/HTTPS passent par l’IP du serveur. Proxy externe : ils passent par l’adresse HTTP(S) ou SOCKS définie dans Paramètres. Les flux torrent ne sont pas proxifiés.</div><p class="footer-note">Le proxy direct est toujours disponible. La sortie externe peut être un conteneur WARP ou tout autre proxy accessible depuis le serveur.</p>';
  const rows = await api("proxy/status");
  $("#proxy-status").innerHTML = rows
    .map(
      (r) =>
        `<section class="panel"><h2>${r.mode === "direct" ? "Proxy direct" : "Proxy externe"}</h2><div class="status-value">${r.available ? "Sortie disponible" : r.configured ? "Proxy injoignable" : "Proxy non configuré"}</div><p class="muted">${r.available ? "Routage intégré : " + esc(r.upstream) : r.configured ? esc(r.error || "Vérifie l’adresse et la connexion du proxy.") : "Ajoute son URL dans Paramètres."}</p><button data-test="${r.mode}" ${r.available ? "" : "disabled"}>Tester l’IP de sortie</button><p id="ip-${r.mode}" class="muted"></p></section>`,
    )
    .join("");
  $$("[data-test]").forEach(
    (b) =>
      (b.onclick = () =>
        run(async () => {
          const r = await api("proxy/test", { mode: b.dataset.test });
          $("#ip-" + b.dataset.test).textContent = r.ok
            ? "IP de sortie : " + r.ip
            : "Échec : " + r.error;
        })),
  );
}
function renderBackups() {
  const activeAccount = state.accounts.find((item) => item.id === accountId);
  const backupActions = accountId
    ? `<div class="actions">${btn("Charger depuis le PC", "backup-upload")}${btn("Sauvegarder le compte actif", "backup", "primary")}</div>`
    : "";
  $("#content").innerHTML =
    heading(
      "Sauvegardes",
      "Jusqu’à trois points de retour chiffrés par compte Nuvio.",
      backupActions,
    ) +
    `<div class="hint">Chaque compte conserve ses trois sauvegardes les plus récentes. Une restauration remplace les données synchronisées du compte et crée d’abord une sauvegarde de sécurité.</div><div class="list">${state.backups.map((b) => `<article class="addon"><div class="addon-top"><div><strong>${esc(b.reason)}</strong><p class="muted">${esc(state.accounts.find((item) => item.id === b.accountId)?.name || b.email)} · ${esc(new Date(b.at).toLocaleString("fr-FR"))}</p></div><div class="actions"><a href="/api/backup/download?id=${encodeURIComponent(b.id)}" download>Télécharger</a>${state.accounts.some((item) => item.id === b.accountId) ? `<button data-backup-restore="${esc(b.id)}">Restaurer</button>` : ""}<button data-backup-delete="${esc(b.id)}" class="danger">Supprimer</button></div></div></article>`).join("") || '<div class="empty-inline">Les sauvegardes apparaîtront ici après votre premier enregistrement.</div>'}</div>`;
  if ($("#backup"))
    $("#backup").onclick = () =>
      run(async () => {
        await api("backup/create", { accountId });
        await render();
        toast("Sauvegarde créée");
      });
  if ($("#backup-upload"))
    $("#backup-upload").onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 20_000_000) return toast("Le fichier dépasse la limite de 20 Mo.");
        let snapshot;
        try {
          snapshot = JSON.parse(await file.text());
        } catch {
          return toast("Ce fichier ne contient pas un JSON valide.");
        }
        openDialog(`<h2>Restaurer cette sauvegarde ?</h2><p>Le fichier <strong>${esc(file.name)}</strong> remplacera les données synchronisées du compte <strong>${esc(activeAccount?.name || activeAccount?.email || "actif")}</strong>.</p><p class="hint warning">Une sauvegarde de sécurité sera créée automatiquement avant la restauration.</p><div class="dialog-actions"><button data-close>Annuler</button><button id="restore-uploaded-backup" class="danger">Restaurer le compte</button></div>`);
        $("#restore-uploaded-backup").onclick = () => run(async () => {
          await api("backup/restore-file", { accountId, backup: snapshot });
          $("#dialog").close();
          await render();
          toast("Sauvegarde chargée et restaurée");
        });
      };
      input.click();
    };
  $$('[data-backup-restore]').forEach((button) => {
    button.onclick = () => {
      const item = state.backups.find((backup) => backup.id === button.dataset.backupRestore),
        target = state.accounts.find((account) => account.id === item?.accountId);
      openDialog(`<h2>Restaurer cette sauvegarde ?</h2><p>Les données synchronisées du compte <strong>${esc(target?.name || target?.email || item?.email)}</strong> seront remplacées par la sauvegarde du ${esc(new Date(item.at).toLocaleString("fr-FR"))}.</p><p class="hint warning">Une sauvegarde de sécurité sera créée automatiquement avant la restauration.</p><div class="dialog-actions"><button data-close>Annuler</button><button id="restore-backup" class="danger">Restaurer le compte</button></div>`);
      $("#restore-backup").onclick = () => run(async () => {
        await api("backup/restore", { accountId: item.accountId, id: item.id });
        $("#dialog").close();
        await render();
        toast("Compte restauré");
      });
    };
  });
  $$('[data-backup-delete]').forEach((button) => {
    button.onclick = () => {
      const item = state.backups.find((backup) => backup.id === button.dataset.backupDelete);
      openDialog(`<h2>Supprimer cette sauvegarde ?</h2><p>La sauvegarde du ${esc(new Date(item.at).toLocaleString("fr-FR"))} sera supprimée définitivement.</p><div class="dialog-actions"><button data-close>Annuler</button><button id="delete-backup" class="danger">Supprimer</button></div>`);
      $("#delete-backup").onclick = () => run(async () => {
        await api("backup/delete", { id: item.id });
        $("#dialog").close();
        await render();
        toast("Sauvegarde supprimée");
      });
    };
  });
}
async function pair() {
  clearInterval(pairTimer);
  openDialog(
    `<div class="nuvio-pair nuvio-pair-loading">
      <button class="nuvio-pair-close" type="button" data-close aria-label="Fermer">×</button>
      <img class="nuvio-pair-logo" src="/assets/nuvio_login.webp" alt="Nuvio">
      <div class="nuvio-pair-spinner" aria-hidden="true"></div>
      <h2>Préparation de la connexion…</h2>
      <p>Nous créons votre lien sécurisé vers Nuvio.</p>
    </div>`,
  );
  const p = await api("pair/start");
  const link = new URL(p.web_url);
  if (!["http:", "https:"].includes(link.protocol))
    throw Error("Lien de connexion invalide");
  openDialog(
    `<div class="nuvio-pair">
      <button class="nuvio-pair-close" type="button" data-close aria-label="Fermer">×</button>
      <img class="nuvio-pair-logo" src="/assets/nuvio_login.webp" alt="Nuvio">
      <h2>Connecter un compte Nuvio</h2>
      <p class="nuvio-pair-intro">Ouvrez Nuvio, connectez-vous à votre compte, puis validez l’association avec le dashboard.</p>
      <div class="nuvio-pair-code">
        <span>Code de connexion</span>
        <strong>${esc(p.code)}</strong>
      </div>
      <a class="nuvio-pair-primary" href="${esc(link.href)}" target="_blank" rel="noreferrer">
        <span aria-hidden="true">↗</span> Ouvrir le site Nuvio
      </a>
      <ol class="nuvio-pair-steps" aria-label="Étapes de connexion">
        <li><span>1</span><strong>Ouvrir Nuvio</strong></li>
        <li><span>2</span><strong>Se connecter</strong></li>
        <li><span>3</span><strong>Valider le code</strong></li>
      </ol>
      <button id="pair-check" class="nuvio-pair-secondary" type="button">J’ai terminé la connexion</button>
      <p id="pair-status" class="nuvio-pair-status" aria-live="polite"><span class="nuvio-pair-status-dot" aria-hidden="true"></span><span>En attente de votre validation…</span></p>
    </div>`,
  );
  let busy = false;
  const setStatus = (message, state = "waiting") => {
    const status = $("#pair-status");
    if (!status) return;
    status.className = `nuvio-pair-status ${state}`;
    status.innerHTML = `<span class="nuvio-pair-status-dot" aria-hidden="true"></span><span>${esc(message)}</span>`;
  };
  const checkPairing = async () => {
    if (busy) return;
    if (!$("#dialog").open || !$("#pair-status"))
      return clearInterval(pairTimer);
    busy = true;
    const checkButton = $("#pair-check");
    if (checkButton) checkButton.disabled = true;
    try {
      const r = await api("pair/poll", { id: p.id });
      if (r.status === "connected") {
        clearInterval(pairTimer);
        setStatus("Connexion confirmée.", "connected");
        $("#dialog").close();
        accountId = r.account.id;
        toast("Compte connecté");
        await render();
      } else if (r.status === "expired") {
        clearInterval(pairTimer);
        setStatus("Code expiré. Fermez puis recommencez.", "error");
      } else {
        setStatus("En attente de votre validation…");
      }
    } catch (e) {
      clearInterval(pairTimer);
      setStatus(e.message, "error");
    } finally {
      busy = false;
      if (checkButton?.isConnected) checkButton.disabled = false;
    }
  };
  $("#pair-check").onclick = checkPairing;
  pairTimer = setInterval(
    checkPairing,
    Math.max(p.poll_interval_seconds || 3, 3) * 1000,
  );
}
function login() {
  if (document.querySelector(".auth-screen")) return;
  const host = document.createElement("div");
  host.className = "auth-screen";
  host.innerHTML =
    `<div class="auth-card"><div class="login-brand"><img src="/assets/nuvio-manager-logo.png" alt="" width="64" height="64"><div><h2>Nuvio Manager</h2><p class="muted">Connectez-vous à votre dashboard.</p></div></div>` +
    `<form id="nuvio-login" class="form"><label>Email Nuvio<input name="email" type="email" autocomplete="username" placeholder="vous@exemple.com" required></label><label>Mot de passe Nuvio<input name="password" type="password" autocomplete="current-password" required></label><button class="primary"><img class="btn-logo" src="/assets/nuvio_logo.png" alt="">Se connecter avec Nuvio</button><p id="nuvio-error" class="error" hidden></p></form>` +
    `<div class="auth-sep"><span>ou</span></div>` +
    `<details class="auth-admin"><summary>Connexion local</summary><form id="admin-login" class="form"><label>Utilisateur<input name="user" autocomplete="username" required></label><label>Mot de passe<input name="password" type="password" autocomplete="current-password" required></label><button>Se connecter</button><p id="admin-error" class="error" hidden></p></form></details></div>`;
  document.body.appendChild(host);
  const done = async () => { host.remove(); await render(); };
  const bind = (formId, route, errId) => {
    host.querySelector(`#${formId}`).onsubmit = async (event) => {
      event.preventDefault();
      const err = host.querySelector(`#${errId}`);
      err.hidden = true;
      try {
        await api(route, Object.fromEntries(new FormData(event.target)));
        await done();
      } catch (error) {
        err.hidden = false;
        err.textContent = error.message;
      }
    };
  };
  bind("nuvio-login", "login/nuvio", "nuvio-error");
  bind("admin-login", "login", "admin-error");
}
function setup(publicUrlOnly = false) {
  openDialog(
    `<div class="login-brand"><img src="/assets/nuvio-manager-logo.png" alt="" width="76" height="76"><div><h2>${publicUrlOnly ? "Configurer l’adresse publique" : "Créer l’administrateur"}</h2><p class="muted">${publicUrlOnly ? "Finalisez la migration de votre dashboard." : "Première configuration de votre dashboard privé."}</p></div></div><form id="setup-form" class="form"><label>Code de configuration<input name="code" autocomplete="one-time-code" maxlength="32" placeholder="Code affiché dans les journaux Docker" required></label>${publicUrlOnly ? "" : '<label>Nom d’utilisateur<input name="username" autocomplete="username" maxlength="80" required></label><label>Mot de passe<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required></label><label>Confirmer le mot de passe<input name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required></label>'}<label>Adresse publique du dashboard<input name="publicUrl" type="url" value="${esc(location.origin)}" autocomplete="off" required></label><p class="muted">Récupérez le code avec <code>docker logs nuvio-manager</code>. L’adresse publique servira à générer les URL des addons proxifiés.</p><button class="primary">${publicUrlOnly ? "Enregistrer l’adresse" : "Créer l’administrateur"}</button><p id="setup-error" class="error" hidden></p></form>`,
  );
  $("#setup-form").onsubmit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    if (!publicUrlOnly && values.password !== values.confirmation) {
      $("#setup-error").hidden = false;
      $("#setup-error").textContent = "Les deux mots de passe ne correspondent pas.";
      return;
    }
    try {
      const result = await api("setup", {
        code: values.code,
        username: values.username,
        password: values.password,
        publicUrl: values.publicUrl,
      });
      $("#dialog").close();
      if (result.requiresLogin) login();
      else await render();
    } catch (error) {
      $("#setup-error").hidden = false;
      $("#setup-error").textContent = error.message;
    }
  };
}
$$("#nav button").forEach(
  (b) =>
    (b.onclick = () =>
      run(async () => {
        page = b.dataset.page;
        await render();
      })),
);
$("#logout").onclick = () =>
  run(async () => {
    await api("logout", {});
    login();
  });
run(async () => {
  const initial = await api("setup");
  if (initial.required) setup();
  else if (initial.publicUrlRequired) setup(true);
  else await render();
});
