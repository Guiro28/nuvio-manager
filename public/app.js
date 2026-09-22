import { renderPanelSettings } from "./panel-settings.js";
import { renderActivity } from "./activity.js";
import { renderStatistics } from "./statistics.js";
import { renderConnections } from "./connections.js";
import { renderIptv } from "./iptv.js";
import { renderSports } from "./sports.js";
import { renderCollections } from "./collections.js";
import { initI18n, setLang, getLang, t, SUPPORTED_LANGS, LANG_NAMES } from "./i18n.js";
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
  tab = "identity",
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
    headers: { "X-Lang": getLang(), ...(data ? { "Content-Type": "application/json" } : {}) },
    ...(data ? { method: "POST", body: JSON.stringify(data) } : {}),
  });
  const b = await r.json();
  if (!r.ok) {
    if (r.status === 401 && !route.startsWith("pair")) login();
    if (r.status === 428 && route !== "setup") setup();
    throw Error(
      t(b.error) +
        (b.partial
          ? `\n${t("Déjà enregistrés : {list}. Une sauvegarde est disponible.", { list: b.completed.join(", ") })}`
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
// Provider badge (icon + type name) shown at the right of each account entry.
function accountTypeBadge(provider) {
  const isTuvora = provider === "tuvora";
  const icon = isTuvora
    ? `<span class="acct-type-icon acct-type-icon-svg">${TUVORA_LOGO}</span>`
    : `<img class="acct-type-icon" src="/assets/nuvio_logo.png" alt="">`;
  return `<span class="acct-type acct-type-${isTuvora ? "tuvora" : "nuvio"}">${icon}<span class="acct-type-name">${isTuvora ? "Tuvora" : "Nuvio"}</span></span>`;
}
// Custom account selector: account name on the left, provider icon + type on
// the right (a native <option> can render neither an inline SVG nor this layout).
function accountMenu() {
  const current = state.accounts.find((a) => a.id === accountId) || state.accounts[0];
  const row = (a) =>
    `<button type="button" role="option" data-account="${esc(a.id)}" aria-selected="${a.id === accountId}" class="acct-option"><span class="acct-option-name">${esc(a.name || a.email)}</span>${accountTypeBadge(a.provider)}</button>`;
  return `<details class="acct-menu" id="account-menu"><summary aria-label="${esc(t("COMPTE NUVIO"))}"><span class="acct-current-name">${esc(current?.name || current?.email || "")}</span>${current ? accountTypeBadge(current.provider) : ""}<span class="acct-caret" aria-hidden="true">⌄</span></summary><div class="acct-list" role="listbox">${state.accounts.map(row).join("")}</div></details>`;
}
let accountOutsideHandler = null;
function setupAccountMenu() {
  const menu = $("#account-menu");
  if (!menu) return;
  menu.querySelectorAll("[data-account]").forEach((button) => {
    button.onclick = () =>
      run(async () => {
        menu.open = false;
        accountId = button.dataset.account;
        await renderProfiles();
      });
  });
  if (accountOutsideHandler) document.removeEventListener("pointerdown", accountOutsideHandler);
  accountOutsideHandler = (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  };
  document.addEventListener("pointerdown", accountOutsideHandler);
}
function renameAccount() {
  const selected = state.accounts.find(a => a.id === accountId);
  openDialog(`<h2>${esc(t("Renommer le compte"))}</h2><form id="rename-account-form" class="form"><label>${esc(t("Nom affiché"))}<input name="name" maxlength="80" value="${esc(selected.name || selected.email)}" placeholder="${esc(selected.email)}" autocomplete="off"></label><p class="muted">${esc(t("Ce nom est utilisé dans le dashboard. Laisse le champ vide pour afficher à nouveau l’adresse e-mail."))}</p><div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Enregistrer"))}</button></div></form>`);
  $("#rename-account-form").onsubmit = event => {
    event.preventDefault();
    const name = event.target.elements.name.value;
    run(async () => {
      await api("accounts/rename", { accountId: selected.id, name });
      $("#dialog").close();
      await render();
      toast(t("Nom du compte enregistré"));
    });
  };
}
function profileOptions(rows = profiles, id = profileId) {
  return rows
    .map(
      (p) =>
        `<option value="${p.profile_index}" ${p.profile_index === Number(id) ? "selected" : ""}>${esc(p.name)} · ${esc(t("Profil {n}", { n: p.profile_index }))}</option>`,
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
// Re-label the static chrome (nav, breadcrumb, header) for the active language.
function applyChrome() {
  $$("#nav button").forEach((b) => {
    const label = b.querySelector(".nav-label");
    if (label) label.textContent = t("nav." + b.dataset.page);
  });
  const root = $("#crumb-root");
  if (root) root.textContent = t("header.root");
  const logout = $("#logout");
  if (logout) logout.textContent = t("header.logout");
  window.i18nTheme = (light) => ({
    text: t(light ? "header.themeDark" : "header.themeLight"),
    aria: t(light ? "header.themeDarkAria" : "header.themeLightAria"),
  });
  window.__themeUpdate?.();
  if ($("#lang-menu")) updateLangSummary();
}
// Inline SVG flags for the language menu (viewBox 0 0 640 480, styled via CSS).
const LANG_FLAGS = {
  fr: '<svg viewBox="0 0 640 480" aria-hidden="true"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#000091" d="M0 0h213.3v480H0z"/><path fill="#e1000f" d="M426.7 0H640v480H426.7z"/></svg>',
  en: '<svg viewBox="0 0 640 480" aria-hidden="true"><path fill="#012169" d="M0 0h640v480H0z"/><path fill="#fff" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"/><path fill="#c8102e" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"/><path fill="#fff" d="M241 0v480h160V0zM0 160v160h640V160z"/><path fill="#c8102e" d="M0 193v96h640v-96zM273 0v480h96V0z"/></svg>',
  es: '<svg viewBox="0 0 640 480" aria-hidden="true"><path fill="#c60b1e" d="M0 0h640v480H0z"/><path fill="#ffc400" d="M0 120h640v240H0z"/></svg>',
  de: '<svg viewBox="0 0 640 480" aria-hidden="true"><path fill="#fc0" d="M0 320h640v160H0z"/><path fill="#000" d="M0 0h640v160H0z"/><path fill="red" d="M0 160h640v160H0z"/></svg>',
  it: '<svg viewBox="0 0 640 480" aria-hidden="true"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#009246" d="M0 0h213.3v480H0z"/><path fill="#ce2b37" d="M426.7 0H640v480H426.7z"/></svg>',
};
let langOutsideHandler = null;
function updateLangSummary() {
  const code = getLang();
  const flag = $("#lang-current-flag");
  if (flag) flag.innerHTML = LANG_FLAGS[code] || "";
  const name = $("#lang-current-name");
  if (name) name.textContent = LANG_NAMES[code];
  const menu = $("#lang-menu");
  if (menu) menu.querySelector("summary")?.setAttribute("aria-label", t("header.language"));
  $$("#lang-list [data-lang]").forEach((b) =>
    b.setAttribute("aria-selected", String(b.dataset.lang === code)),
  );
}
function setupLangSelect() {
  const menu = $("#lang-menu"), list = $("#lang-list");
  if (!menu || !list) return;
  list.innerHTML = SUPPORTED_LANGS.map(
    (code) => `<button type="button" role="option" data-lang="${code}" class="lang-option"><span class="lang-flag">${LANG_FLAGS[code] || ""}</span><span>${esc(LANG_NAMES[code])}</span></button>`,
  ).join("");
  list.querySelectorAll("[data-lang]").forEach((button) => {
    button.onclick = () =>
      run(async () => {
        menu.open = false;
        await setLang(button.dataset.lang);
        updateLangSummary();
        await render();
      });
  });
  updateLangSummary();
  // Close the menu when clicking outside of it (single reusable handler).
  if (langOutsideHandler) document.removeEventListener("pointerdown", langOutsideHandler);
  langOutsideHandler = (event) => { if (menu.open && !menu.contains(event.target)) menu.open = false; };
  document.addEventListener("pointerdown", langOutsideHandler);
}
const NUVIO_PAGES = ["profiles", "statistics", "proxy"];
async function render() {
  await refreshState();
  applyChrome();
  clearInterval(homeTimer);
  clearInterval(perfTimer);
  document.querySelector(".perf-tip")?.remove();
  const isAdmin = state.viewer?.isAdmin === true;
  $$("#nav button").forEach((b) => {
    const allowed = isAdmin || NUVIO_PAGES.includes(b.dataset.page);
    b.style.display = allowed ? "" : "none";
  });
  if (!isAdmin && !NUVIO_PAGES.includes(page)) page = "profiles";
  $("#crumb").textContent = t("nav." + page);
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
  if (d) return `${d} ${t("unit.d")} ${h} ${t("unit.h")}`;
  if (h) return `${h} ${t("unit.h")} ${m} ${t("unit.min")}`;
  return `${m} ${t("unit.min")}`;
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
  return `<div class="perf-plot"><div class="perf-yaxis">${labels}</div><div class="perf-canvas"><svg class="perf-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Utilisation CPU et RAM dans le temps">${inner}</svg><div class="perf-cursor" hidden></div></div></div>${n < 2 ? `<p class="muted perf-hint">${esc(t("perf.noData"))}</p>` : ""}`;
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
  const options = PERF_PERIODS.map(([v]) => `<option value="${v}"${v === "86400" ? " selected" : ""}>${esc(t("period." + v))}</option>`).join("");
  return `<h2 class="home-heading">${esc(t("home.section.system"))}</h2><section class="stats-metrics" id="home-system"></section>` +
    `<div class="panel perf-panel"><div class="perf-head"><h3>${esc(t("perf.title"))}</h3><div class="perf-legend"><span><i class="cpu"></i> CPU <b id="perf-cpu">—</b></span><span><i class="ram"></i> RAM <b id="perf-ram">—</b></span></div><select id="perf-period" class="perf-period" aria-label="${esc(t("perf.title"))}">${options}</select></div><div id="perf-host"><p class="muted perf-hint">${esc(t("perf.loading"))}</p></div></div>` +
    `<h2 class="home-heading">${esc(t("home.section.network"))}</h2><section class="stats-metrics" id="home-network"></section>` +
    `<h2 class="home-heading">${esc(t("home.section.instance"))}</h2><section class="stats-metrics" id="home-instance"></section>` +
    `<p class="footer-note">${esc(t("home.footer"))}</p>`;
}
function updateHomeTiles(d) {
  const system = [
    homeMetric(t("home.procMemory"), fmtBytes(d.memory.rss), mdiIcon("memory")),
    homeMetric(t("home.sysMemory"), fmtBytes(d.memory.used), mdiIcon("server")),
    homeMetric(t("home.cpu"), `${Math.round(d.cpu.percent)} %`, mdiIcon("cpu")),
    homeMetric(t("home.uptime"), fmtUptime(d.uptime), mdiIcon("clock")),
  ].join("");
  const total = (d.bandwidth.direct || 0) + (d.bandwidth.warp || 0);
  const now = Date.now();
  let rate = null;
  if (lastBw && now > lastBw.t && total >= lastBw.total)
    rate = (total - lastBw.total) / ((now - lastBw.t) / 1000);
  lastBw = { total, t: now };
  const network = [
    homeMetric(t("home.liveRate"), rate == null ? "—" : `${fmtBytes(rate)}${t("unit.perSecond")}`, mdiIcon("speedometer")),
    homeMetric(t("home.proxyInternal"), fmtBytes(d.bandwidth.direct), mdiIcon("lan")),
    homeMetric(t("home.proxyExternal"), fmtBytes(d.bandwidth.warp), mdiIcon("earth")),
    homeMetric(t("home.totalTraffic"), fmtBytes(total), mdiIcon("swap")),
  ].join("");
  const instance = [
    homeMetric(t("home.nuvioAccounts"), d.accounts, mdiIcon("account")),
    homeMetric(t("home.profiles"), d.profiles, mdiIcon("accounts")),
    homeMetric(t("home.libraryAddons"), d.libraryAddons, mdiIcon("puzzle")),
    homeMetric(t("home.proxyAddons"), d.proxyAddons, mdiIcon("shuffle")),
    homeMetric(t("home.trakt"), d.trakt, mdiIcon("trakt")),
    homeMetric(t("home.simkl"), d.simkl, mdiIcon("simkl")),
    homeMetric(t("home.backups"), d.backups, mdiIcon("database")),
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
  c.innerHTML = heading(t("home.title"), t("home.subtitle")) + homeSkeleton();
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
  return `<div class="empty"><div class="empty-symbol">▦</div><h2>${esc(t("Vos profils, au même endroit."))}</h2><p class="muted">${esc(t("Connectez un compte Nuvio pour retrouver ses profils, modifier les réglages TV et Mobile et leur attribuer vos addons."))}</p>${btn(t("＋ Connecter un compte"), "connect", "primary")}<p class="footer-note">${t("La connexion se valide sur le site officiel Nuvio.<br>Votre mot de passe reste sur Nuvio.")}</p></div>`;
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
    t("nav.profiles"),
    t("Un espace pour chaque compte. Des réglages pour chaque écran."),
    admin ? btn(t("＋ Connecter un compte"), "connect", "primary") : "",
  );
  const connectBtn = $("#connect");
  if (connectBtn) connectBtn.onclick = () => connectAccount();
  if (!accountId) {
    c.innerHTML = heading(t("nav.profiles"), t("Un espace pour chaque compte. Des réglages pour chaque écran.")) + emptyAccounts();
    $$("#connect").forEach((b) => (b.onclick = () => connectAccount()));
    return;
  }
  await loadProfiles();
  c.innerHTML += `<div class="account-bar"><label>${esc(t("COMPTE NUVIO"))}${accountMenu()}</label><div class="actions"><span class="badge neutral">${t("{n} profils", { n: profiles.length })}</span>${admin ? btn(t("Renommer le compte"), "rename-account") : ""}${btn(t("＋ Nouveau profil"), "create")}${admin ? btn(t("Déconnecter ce compte"), "disconnect", "quiet") : ""}</div></div><div class="profile-grid">${profiles.map((p) => `<button class="profile-card ${p.profile_index === Number(profileId) ? "selected" : ""}" data-profile="${p.profile_index}">${profileAvatar(p)}<span class="profile-name">${esc(p.name)}</span><span class="muted">${p.profile_index === 1 ? esc(t("Profil principal")) : esc(t("Profil {n}", { n: p.profile_index }))} · TV & Mobile</span></button>`).join("")}</div><div id="editor"></div>`;
  const connectAgain = $("#connect");
  if (connectAgain) connectAgain.onclick = () => connectAccount();
  $$(".profile-avatar").forEach(image => image.addEventListener('error', () => image.remove(), {once:true}));
  setupAccountMenu();
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
      `<h2>${esc(t("Déconnecter ce compte du dashboard ?"))}</h2><p>${esc(t("Le compte et ses profils restent disponibles dans Nuvio."))}</p><div class="dialog-actions"><button data-close>${esc(t("Annuler"))}</button><button id="remove-account" class="danger">${esc(t("Déconnecter"))}</button></div>`,
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
function accountProvider(id = accountId) {
  return state.accounts?.find((a) => a.id === id)?.provider || "nuvio";
}
function renderEditor() {
  const e = $("#editor");
  const isTuvora = accountProvider() === "tuvora";
  const tabs = [
    ["identity", "Profil"],
    ["tv", "Paramètres TV"],
    ["mobile", "Paramètres Mobile"],
    ["addons", "Addons"],
    ["plugins", "Plugins"],
    ["catalogs", "Catalogues & collections"],
    ...(isTuvora ? [["iptv", "IPTV"], ["sports", "Guide des sports"]] : []),
    ["connections", "Sources de suivi"],
    ["history", t("Historique {name}", { name: isTuvora ? "Tuvora" : "Nuvio" })],
  ];
  // A previously-selected Tuvora-only tab must not stick on a Nuvio profile.
  if (!isTuvora && (tab === "iptv" || tab === "sports")) tab = "identity";
  e.innerHTML = `<div class="tabs">${tabs
    .map(
      ([k, v]) =>
        `<button data-tab="${k}" class="${tab === k ? "active" : ""}">${esc(t(v))}</button>`,
    )
    .join("")}</div><div id="settings"></div>`;
  $$("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        if (!["history", "connections", "identity", "addons", "plugins", "iptv", "sports", "catalogs"].includes(tab))
          draft = structuredClone(current[tab]?.settings_json || {});
        renderEditor();
      }),
  );
  if (tab === "history") return renderNuvioHistory();
  if (tab === "catalogs") return void run(() => renderCollections($("#settings"), {api,accountId,profileId,openDialog,run,toast,provider:accountProvider()}));
  if (tab === "iptv") return void run(() => renderIptv($("#settings"), {api,accountId,profileId,openDialog,run,toast}));
  if (tab === "sports") return void run(() => renderSports($("#settings"), {api,accountId,profileId,openDialog,run,toast}));
  if (tab === "connections") return renderConnections($("#settings"), {api,accountId,profileId,openDialog,run,toast,onConnected:renderEditor,provider:accountProvider()});
  if (tab === "identity") return identityEditor();
  if (tab === "addons" || tab === "plugins") return integrationsEditor();
  const updated = current[tab].updated_at;
  $("#settings").innerHTML =
    `<div class="settings-top"><input id="filter" name="nuvio-settings-filter" type="search" autocomplete="off" data-form-type="other" data-1p-ignore data-lpignore="true" placeholder="${esc(t("Rechercher dans les réglages…"))}" aria-label="${esc(t("Rechercher un paramètre"))}"><div class="actions">${btn(t("Recharger"), "reload")}${btn(t("Voir les changements"), "save", "primary")}</div></div><div class="muted">${updated ? esc(t("Synchronisé le {date}", { date: new Date(updated).toLocaleString(getLang()) })) : esc(t("Aucun paramètre synchronisé pour cette plateforme."))}</div><div id="fields"></div><details class="panel raw-settings"><summary>${esc(t("Édition JSON avancée"))}</summary><p class="muted">${esc(t("Conserve la structure et les types des paramètres Nuvio. Les champs inconnus sont préservés."))}</p><textarea id="raw" rows="12" aria-label="${esc(t("Paramètres JSON"))}">${esc(JSON.stringify(draft, null, 2))}</textarea>${btn(t("Appliquer au brouillon"), "raw-apply")}</details>`;
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
        throw Error(t("Objet JSON attendu"));
      draft = value;
      renderFields();
      toast(t("Brouillon mis à jour. Aucun changement envoyé à Nuvio."));
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
  const brand = accountProvider() === "tuvora" ? "Tuvora" : "Nuvio";
  container.innerHTML = `<section class="nuvio-history"><div class="nuvio-history-heading"><div><h2>${esc(t("Historique {name}", { name: brand }))}</h2><p class="muted">${esc(t("Consultez les contenus synchronisés par {name} pour ce profil.", { name: brand }))}</p></div></div><div class="history-tabs" role="tablist" aria-label="${esc(t("Catégories de l’historique {name}", { name: brand }))}">${historyTabs.map(([key, label]) => `<button type="button" role="tab" aria-selected="${historyTab === key}" data-history-tab="${key}" class="${historyTab === key ? "active" : ""}">${esc(t(label))}</button>`).join("")}</div><div id="history-content" role="tabpanel"></div></section>`;
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
  const query = $("#filter").value.trim().toLocaleLowerCase(getLang());
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
      ? [{ id: "internal", title: `${t("Données internes")} (${extra.length})` }]
      : []),
  ];
  const navigation = `<div class="settings-section-tabs" role="tablist" aria-label="${esc(t("Catégories de réglages"))}">${sectionButtons
    .map(
      (section) =>
        `<button role="tab" data-settings-section="${section.id}" aria-selected="${settingsSection[tab] === section.id}" class="${settingsSection[tab] === section.id ? "active" : ""}">${esc(t(section.title))}${section.experimental ? " · App" : ""}</button>`,
    )
    .join("")}</div>`;

  let content;
  if (settingsSection[tab] === "internal") {
    const rows = extra
      .map((item, index) => ({ ...item, i: official.length + index }))
      .filter(
        (item) =>
          !query ||
          (t(human(item.label)) + " " + item.path.join(" "))
            .toLocaleLowerCase(getLang())
            .includes(query),
      );
    content = `<div class="settings-section-heading"><div><span class="eyebrow">${esc(t("Hors interface officielle"))}</span><h2>${esc(t("Données internes synchronisées"))}</h2><p>${esc(t("Ces valeurs existent dans le profil mais ne correspondent à aucun contrôle actuel de nuvio.tv. Elles sont conservées pour ne pas perturber les applications."))}</p></div></div><div class="hint warning">${esc(t("Ne modifie ces données que si tu connais leur rôle. Certaines sont des états internes, des préférences anciennes ou des réglages propres à une version d’application."))}</div><details class="setting-group" ${openSettingGroups[tab].has("internal") ? "open" : ""} data-setting-group="internal"><summary><span>${esc(t("Données supplémentaires"))}</span><span class="muted">${rows.length} ${esc(t(rows.length > 1 ? "valeurs" : "valeur"))}</span></summary>${rows
      .map(
        (item) =>
          `<div class="setting-row"><div><strong>${esc(t(human(item.label)))}</strong></div><div class="setting-input">${field(item, item.i)}</div></div>`,
      )
      .join("") || `<div class="empty-inline">${esc(t("Aucune donnée correspondante."))}</div>`}</details>`;
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
                t(item.meta.title) +
                " " +
                settingDescription(item.meta) +
                " " +
                item.meta.feature +
                " " +
                item.meta.key
              )
                .toLocaleLowerCase(getLang())
                .includes(query),
          );
        if (query && !rows.length) return "";
        const groupId = section.id + ":" + groupIndex;
        return `<details class="setting-group" ${openSettingGroups[tab].has(groupId) ? "open" : ""} data-setting-group="${groupId}"><summary><span>${esc(t(group.title))}</span><span class="muted">${rows.length} ${esc(t(rows.length > 1 ? "réglages" : "réglage"))}</span></summary><p class="setting-group-description">${esc(t(group.description))}</p>${rows
          .map((item) => {
            const description = settingDescription(item.meta);
            return `<div class="setting-row${item.present ? "" : " setting-default"}"><div><strong>${esc(t(item.meta.title))}</strong>${description ? `<div class="muted">${esc(description)}</div>` : ""}${item.present ? "" : `<span class="default-badge">${esc(t("Valeur par défaut"))}</span>`}</div><div class="setting-input">${field(item, item.i)}</div></div>`;
          })
          .join("")}</details>`;
      })
      .join("");
    content = `<div class="settings-section-heading"><div><h2>${esc(t(section.title))}</h2><p>${esc(t(section.description))}</p></div><span class="section-count">${section.groups.reduce((count, group) => count + group.keys.length, 0)} ${esc(t("réglages"))}</span></div>${section.experimental ? `<div class="hint warning">${esc(t("Ces réglages existent dans le code officiel de l’application Mobile mais ne sont pas exposés sur nuvio.tv. Leur utilisation reste expérimentale."))}</div>` : ""}${groupMarkup || `<div class="empty-inline">${esc(t("Aucun paramètre ne correspond à cette recherche dans cet onglet."))}</div>`}`;
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
    `<div class="settings-top"><p class="muted">${rows.length} ${kind} · ${esc(t("ordre de synchronisation"))}</p><div class="actions">${btn(t("＋ Ajouter"), "add-integration")}${btn(t("Voir les changements"), "save-list", "primary")}</div></div>${inherited ? `<div class="hint warning">${esc(t("Ce profil utilise la liste du profil principal. Modifie l’héritage dans l’onglet Profil pour gérer sa propre liste."))}</div>` : ""}<div id="integration-list"></div>`;
  function display() {
    $("#integration-list").innerHTML =
      rows
        .map(
          (r, i) =>
            `<div class="addon"><div class="addon-top"><label class="check-label"><input type="checkbox" data-enabled="${i}" ${r.enabled ? "checked" : ""} ${inherited ? "disabled" : ""}>${esc(r.name || kind)}</label><div class="actions"><button data-up="${i}" ${i === 0 || inherited ? "disabled" : ""} aria-label="${esc(t("Monter {name}", { name: r.name }))}">↑</button><button data-down="${i}" ${i === rows.length - 1 || inherited ? "disabled" : ""} aria-label="${esc(t("Descendre {name}", { name: r.name }))}">↓</button><button data-remove="${i}" ${inherited ? "disabled" : ""}>${esc(t("Retirer"))}</button></div></div><p class="url">${esc(r.url)}</p></div>`,
        )
        .join("") || `<p class="empty-inline">${esc(t("Aucune intégration."))}</p>`;
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
      `<h2>${kind === "addons" ? esc(t("Ajouter un addon")) : esc(t("Ajouter un plugin"))}</h2><form id="integration-form" class="form"><label>${esc(t("Nom"))}<input name="name" required></label><label>URL<input name="url" type="url" required placeholder="https://…"></label>${kind === "plugins" ? `<label>${esc(t("Type de dépôt"))}<select name="repo_type"><option>NUVIO_JS</option><option>EXTERNAL_DEX</option></select></label>` : ""}<div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Ajouter au brouillon"))}</button></div></form>`,
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
  const nuvioAvatars = avatars.map(avatar => `<button type="button" data-avatar-id="${esc(avatar.id)}" data-avatar-url="${esc(avatar.imageUrl)}" class="avatar-choice ${avatar.id === selectedAvatarId ? "selected" : ""}" title="${esc(avatar.displayName)}" aria-label="${esc(t("Choisir {name}", { name: avatar.displayName }))}"><img src="${esc(avatar.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join("") || `<p class="muted">${esc(t("Le catalogue d’avatars Nuvio est indisponible."))}</p>`;
  $("#settings").innerHTML = `
    <form id="identity-form" class="panel form">
      <h2>${esc(t("Identité et héritage"))}</h2>
      <div class="identity-customization">
        <div id="identity-avatar-preview" class="identity-avatar-preview"><span>${esc(p.name.slice(0, 1))}</span><img alt="${esc(t("Aperçu de l’image du profil"))}" referrerpolicy="no-referrer"></div>
        <div class="form">
          <label>${esc(t("Nom du profil"))}<input name="name" required value="${esc(p.name)}"></label>
          <label>${esc(t("Couleur du profil"))}<div class="profile-color-control"><input name="color" type="color" value="${esc(profileColor)}"><output>${esc(profileColor.toUpperCase())}</output></div></label>
          <div class="profile-color-swatches" aria-label="${esc(t("Couleurs Nuvio"))}">${colors.map(color => `<button type="button" data-profile-color="${color}" aria-label="${esc(t("Choisir la couleur {color}", { color }))}" aria-pressed="false"></button>`).join("")}</div>
        </div>
      </div>
      <fieldset class="profile-avatar-fieldset">
        <legend>${esc(t("Image du profil"))}</legend>
        <h3>${esc(t("Avatars Nuvio"))}</h3>
        <div class="avatar-gallery">${nuvioAvatars}</div>
        <div class="xperience-avatar-heading">
          <h3>${esc(t("Avatars personnalisés Xperience"))}</h3>
          <p class="avatar-source-note">${t("Source des images : {link}. Les fichiers restent hébergés par Xperience.", { link: `<a href="https://xperience-app.com/avatars" target="_blank" rel="noopener noreferrer">${esc(t("galerie Xperience ↗"))}</a>` })}</p>
        </div>
        <div class="xperience-avatar-tools">
          <label>${esc(t("Catégorie"))}<select id="xperience-category" disabled><option>${esc(t("Chargement…"))}</option></select></label>
          <label>${esc(t("Rechercher"))}<input id="xperience-search" type="search" placeholder="${esc(t("Nom d’un avatar…"))}" disabled></label>
        </div>
        <p id="xperience-avatar-count" class="muted">${esc(t("Chargement du catalogue Xperience…"))}</p>
        <div id="xperience-avatar-gallery" class="avatar-gallery xperience-avatar-gallery"></div>
        <label>${esc(t("URL d’une image personnalisée"))}<input name="avatarUrl" type="url" placeholder="https://…" value="${esc(p.avatar_url || "")}"></label>
        <div><button type="button" id="clear-avatar" class="quiet">${esc(t("Retirer l’image"))}</button></div>
      </fieldset>
      <label class="check-label"><input name="addons" type="checkbox" ${p.uses_primary_addons ? "checked" : ""} ${profileId === 1 ? "disabled" : ""}>${esc(t("Utiliser les addons du profil principal"))}</label>
      <label class="check-label"><input name="plugins" type="checkbox" ${p.uses_primary_plugins ? "checked" : ""} ${profileId === 1 ? "disabled" : ""}>${esc(t("Utiliser les plugins du profil principal"))}</label>
      <div>${btn(t("Enregistrer le profil"), "", "primary")}</div>
      <p class="footer-note">${esc(t("Une sauvegarde du compte est créée avant l’enregistrement."))}</p>
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
    xperienceCount.textContent = t("{n} avatars", { n: matching.length });
    xperienceGallery.innerHTML = matching.map((avatar) => {
      const name = avatarName(avatar);
      return `<button type="button" data-xperience-url="${esc(avatar.url)}" class="avatar-choice" title="${esc(name)}" aria-label="${esc(t("Choisir {name}", { name }))}"><img src="${esc(avatar.url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></button>`;
    }).join("") || `<p class="muted">${esc(t("Aucun avatar dans cette sélection."))}</p>`;
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
    xperienceCategory.innerHTML = `<option value="__all__">${esc(t("Toutes les catégories"))}</option>${categories.map((category) => `<option value="${esc(category)}">${esc(category)} (${xperienceAvatars.filter((avatar) => avatar.category === category).length})</option>`).join("")}`;
    xperienceCategory.value = currentXperienceAvatar?.category || categories[0] || "__all__";
    xperienceCategory.disabled = false;
    xperienceSearch.disabled = false;
    xperienceCategory.onchange = renderXperienceAvatars;
    xperienceSearch.oninput = renderXperienceAvatars;
    renderXperienceAvatars();
  }).catch((error) => {
    if (!form.isConnected) return;
    xperienceCount.textContent = t("Catalogue Xperience indisponible : {error}", { error: error.message });
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
      toast(t("Profil enregistré"));
      await renderProfiles();
    });
  };
}
function createProfile() {
  openDialog(
    `<h2>${esc(t("Nouveau profil"))}</h2><form id="new-profile" class="form"><label>${esc(t("Nom"))}<input name="name" required></label><div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Créer dans Nuvio"))}</button></div></form>`,
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
const PLATFORM_LABELS = { tv: "TV", mobile: "Mobile", catalogs: "Catalogues d’accueil", collections: "Collections" };
const LIST_LABELS = { addons: "Addons", plugins: "Plugins" };
// Turns a raw diff value into readable French for the settings view.
const friendlyValue = (x) => {
  if (x === true) return t("Activé");
  if (x === false) return t("Désactivé");
  if (x === null || x === undefined || x === "") return t("Absent");
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
      rows.push({ tone: "add", badge: t("Ajouté"), name });
      continue;
    }
    const notes = [];
    if ((prev.name || "") !== (item.name || ""))
      notes.push(t("renommé « {before} » → « {after} »", { before: prev.name || "—", after: item.name || "—" }));
    if ((prev.enabled !== false) !== (item.enabled !== false))
      notes.push(item.enabled !== false ? t("activé") : t("désactivé"));
    if (notes.length) rows.push({ tone: "mod", badge: t("Modifié"), name, note: notes.join(" · ") });
  }
  for (const item of b)
    if (!aByUrl.has(item.url)) rows.push({ tone: "del", badge: t("Retiré"), name: item.name || item.url });
  const common = (list, other) => list.map((x) => x.url).filter((url) => other.has(url));
  const bOrder = common(b, aByUrl),
    aOrder = common(a, bByUrl);
  if (bOrder.length === aOrder.length && bOrder.some((url, i) => url !== aOrder[i]))
    rows.push({ tone: "mod", badge: t("Ordre"), name: t("Ordre de la liste modifié") });
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
      platform = PLATFORM_LABELS[d.path[0]] ? t(PLATFORM_LABELS[d.path[0]]) : undefined,
      label = (platform ? [platform, ...d.path.slice(1).map((s) => t(human(s)))] : d.path.map((s) => t(human(s)))).join(" › ");
    settings.push({
      label,
      before: secret ? t("Valeur masquée") : friendlyValue(d.before),
      after: secret ? t("Valeur masquée") : friendlyValue(d.after),
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
          .join("") || `<div class="diff-item muted">${esc(t("Aucun changement"))}</div>`}</div>`,
    )
    .join("");
  if (settings.length)
    html += `<div class="diff-group"><div class="diff-group-title">${esc(t("Paramètres"))}</div>${settings
      .map(
        (r) =>
          `<div class="diff-row"><div class="diff-label">${esc(r.label)}</div><div class="diff-values"><div class="old">− ${esc(r.before)}</div><div class="new">+ ${esc(r.after)}</div></div></div>`,
      )
      .join("")}</div>`;
  return html;
}
async function preview(data) {
  const result = await api("preview", data);
  if (!result.count) return toast(t("Aucune modification à appliquer."));
  openDialog(
    `<h2>${esc(t(result.count > 1 ? "{n} modifications à vérifier" : "{n} modification à vérifier", { n: result.count }))}</h2><p class="muted">${esc(t("Une sauvegarde du compte cible sera créée avant l’enregistrement."))}</p><div class="diff">${renderDiff(result.diff)}</div><div id="apply-error"></div><div class="dialog-actions"><button data-close>${esc(t("Annuler"))}</button><button id="apply" class="primary">${esc(t("Enregistrer dans Nuvio"))}</button></div>`,
  );
  $("#apply").onclick = async () => {
    const button = $("#apply");
    button.disabled = true;
    try {
      await api("apply", { id: result.id });
      $("#dialog").close();
      toast(t("Modifications enregistrées. Sauvegarde disponible."));
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
    return `<span class="addon-logo"><span>${esc((addon.name || "A").slice(0, 1).toUpperCase())}</span>${source ? `<img src="${esc(source)}" alt="${esc(t("Logo de {name}", { name: addon.name }))}" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>`;
  };
  $("#content").innerHTML =
    heading(
      t("nav.library"),
      t("Ajoutez une source une fois, puis attribuez-la aux profils de votre choix."),
      btn(t("＋ Ajouter un addon"), "new-addon", "primary"),
    ) +
    `<div class="list">${state.library.map((a) => `<article class="addon library-addon"><div class="addon-top"><div class="library-addon-identity">${addonLogo(a)}<div class="library-addon-copy"><div class="addon-name">${esc(a.name)}</div><p class="url" title="${esc(a.url)}">${esc(a.url)}</p></div></div><div class="actions"><button data-edit="${a.id}">${esc(t("Modifier"))}</button><button data-assign="${a.id}" class="primary">${esc(t("Attribuer à un profil"))}</button><button data-delete="${a.id}" class="quiet">${esc(t("Retirer"))}</button></div></div></article>`).join("") || `<div class="empty"><div class="empty-symbol">⊞</div><h2>${esc(t("Votre catalogue commence ici."))}</h2><p class="muted">${esc(t("Ajoutez l’URL du manifest d’un addon. Son attribution aux profils reste manuelle."))}</p></div>`}</div>`;
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
            t("Retiré du catalogue. Les installations Nuvio restent en place."),
          );
        })),
  );
}
function addonForm(a = {}) {
  openDialog(
    `<h2>${a.id ? esc(t("Modifier un addon")) : esc(t("Ajouter un addon"))}</h2><form id="addon-form" class="form"><label>${esc(t("Nom"))}<input name="name" required value="${esc(a.name)}" placeholder="${esc(t("Mon addon"))}"></label><label>${esc(t("URL du manifest"))}<input name="url" required value="${esc(a.url)}" placeholder="https://…/manifest.json"></label><p class="muted">${esc(t("Le catalogue conserve l’URL de configuration. Aucun profil n’est modifié à cette étape."))}</p><div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Enregistrer"))}</button></div></form>`,
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
  if (!accountId) return toast(t("Connecte d’abord un compte Nuvio."));
  await loadProfiles();
  openDialog(
    `<h2>${esc(t("Attribuer l’addon"))}</h2><div class="form"><label>${esc(t("Compte"))}<select id="assign-account">${accountOptions()}</select></label><label>${esc(t("Profil"))}<select id="assign-profile">${profileOptions()}</select></label><label>${esc(t("Mode de connexion"))}<select id="assign-mode"><option value="none">${esc(t("Sans proxy · URL d’origine"))}</option><option value="direct">${esc(t("Proxy · IP du serveur"))}</option><option value="warp">${esc(t("Proxy externe · WARP, SOCKS ou HTTP"))}</option></select></label><p class="muted">${esc(t("L’adresse du proxy externe se configure dans Paramètres. Les URL publiques du dashboard doivent rester accessibles depuis vos appareils."))}</p></div><div class="dialog-actions"><button data-close>${esc(t("Annuler"))}</button><button id="assign-preview" class="primary">${esc(t("Prévisualiser l’attribution"))}</button></div>`,
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
        t("nav.copy"),
        t("Transférez tous les réglages synchronisés ou une sélection précise."),
      ) + emptyAccounts();
    $("#connect").onclick = () => connectAccount();
    return;
  }
  await loadProfiles();
  selectedPaths = new Set();
  $("#content").innerHTML =
    heading(
      t("nav.copy"),
      t("Choisissez une source, une destination, puis les éléments à transférer."),
    ) +
    `<div class="two-col"><section class="panel form"><h2>${esc(t("01 · Profil source"))}</h2><label>${esc(t("Compte"))}<select id="source-account">${accountOptions()}</select></label><label>${esc(t("Profil"))}<select id="source-profile">${profileOptions()}</select></label></section><section class="panel form"><h2>${esc(t("02 · Profil destination"))}</h2><label>${esc(t("Compte"))}<select id="target-account">${accountOptions()}</select></label><label>${esc(t("Profil"))}<select id="target-profile">${profileOptions(profiles, profiles.find((p) => p.profile_index !== profileId)?.profile_index)}</select></label></section></div><section class="panel"><h2>${esc(t("03 · Éléments à copier"))}</h2><div class="form"><label class="check-label"><input type="checkbox" id="copy-tv" checked>${esc(t("Tous les paramètres TV synchronisés"))}</label><label class="check-label"><input type="checkbox" id="copy-mobile" checked>${esc(t("Tous les paramètres Mobile synchronisés"))}</label><label class="check-label"><input type="checkbox" id="copy-addons" checked>${esc(t("Addons, activation et ordre"))}</label><label class="check-label"><input type="checkbox" id="copy-plugins" checked>${esc(t("Plugins, activation et ordre"))}</label><label class="check-label"><input type="checkbox" id="copy-catalogs" checked>${esc(t("Catalogues d’accueil (ordre et activation)"))}</label><label class="check-label"><input type="checkbox" id="copy-collections" checked>${esc(t("Collections (dossiers et sources)"))}</label><label class="check-label"><input type="checkbox" id="merge">${esc(t("Fusionner les listes d’addons et plugins avec la destination"))}</label></div><hr>${btn(t("Choisir des paramètres précis"), "select-paths")}<div id="path-selector"></div><p class="footer-note">${esc(t("Cette copie concerne les paramètres synchronisés, addons et plugins. Elle conserve l’identité, la bibliothèque et l’historique du profil cible. Les identifiants de fournisseurs stockés séparément ne sont pas copiés."))}</p></section><div class="actions">${btn(t("Prévisualiser la copie"), "copy-preview", "primary")}</div>`;
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
            `<details class="setting-group"><summary>${p === "tv" ? esc(t("TV")) : esc(t("Mobile"))}</summary>${leaves(
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
        catalogs: $("#copy-catalogs").checked,
        collections: $("#copy-collections").checked,
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
      t("nav.proxy"),
      t("Le moteur stremio-addon-proxy est intégré au dashboard, avec une sortie choisie pour chaque addon."),
    ) +
    `<div id="proxy-status" class="status-grid"><p class="muted">${esc(t("Vérification des sorties réseau…"))}</p></div><div class="hint">${esc(t("Sans proxy : le profil utilise l’URL originale. Proxy direct : les flux HTTP/HTTPS passent par l’IP du serveur. Proxy externe : ils passent par l’adresse HTTP(S) ou SOCKS définie dans Paramètres. Les flux torrent ne sont pas proxifiés."))}</div><p class="footer-note">${esc(t("Le proxy direct est toujours disponible. La sortie externe peut être un conteneur WARP ou tout autre proxy accessible depuis le serveur."))}</p>`;
  const rows = await api("proxy/status");
  $("#proxy-status").innerHTML = rows
    .map(
      (r) =>
        `<section class="panel"><h2>${r.mode === "direct" ? esc(t("Proxy direct")) : esc(t("Proxy externe"))}</h2><div class="status-value">${r.available ? esc(t("Sortie disponible")) : r.configured ? esc(t("Proxy injoignable")) : esc(t("Proxy non configuré"))}</div><p class="muted">${r.available ? esc(t("Routage intégré : {upstream}", { upstream: r.upstream })) : r.configured ? esc(r.error || t("Vérifie l’adresse et la connexion du proxy.")) : esc(t("Ajoute son URL dans Paramètres."))}</p><button data-test="${r.mode}" ${r.available ? "" : "disabled"}>${esc(t("Tester l’IP de sortie"))}</button><p id="ip-${r.mode}" class="muted"></p></section>`,
    )
    .join("");
  $$("[data-test]").forEach(
    (b) =>
      (b.onclick = () =>
        run(async () => {
          const r = await api("proxy/test", { mode: b.dataset.test });
          $("#ip-" + b.dataset.test).textContent = r.ok
            ? t("IP de sortie : {ip}", { ip: r.ip })
            : t("Échec : {error}", { error: r.error });
        })),
  );
}
function renderBackups() {
  const activeAccount = state.accounts.find((item) => item.id === accountId);
  const backupActions = accountId
    ? `<div class="actions">${btn(t("Charger depuis le PC"), "backup-upload")}${btn(t("Sauvegarder le compte actif"), "backup", "primary")}</div>`
    : "";
  $("#content").innerHTML =
    heading(
      t("nav.backups"),
      t("Jusqu’à trois points de retour chiffrés par compte Nuvio."),
      backupActions,
    ) +
    `<div class="hint">${esc(t("Chaque compte conserve ses trois sauvegardes les plus récentes. Une restauration remplace les données synchronisées du compte et crée d’abord une sauvegarde de sécurité."))}</div><div class="list">${state.backups.map((b) => `<article class="addon"><div class="addon-top"><div><strong>${esc(t(b.reason))}</strong><p class="muted">${esc(state.accounts.find((item) => item.id === b.accountId)?.name || b.email)} · ${esc(new Date(b.at).toLocaleString(getLang()))}</p></div><div class="actions"><a href="/api/backup/download?id=${encodeURIComponent(b.id)}" download>${esc(t("Télécharger"))}</a>${state.accounts.some((item) => item.id === b.accountId) ? `<button data-backup-restore="${esc(b.id)}">${esc(t("Restaurer"))}</button>` : ""}<button data-backup-delete="${esc(b.id)}" class="danger">${esc(t("Supprimer"))}</button></div></div></article>`).join("") || `<div class="empty-inline">${esc(t("Les sauvegardes apparaîtront ici après votre premier enregistrement."))}</div>`}</div>`;
  if ($("#backup"))
    $("#backup").onclick = () =>
      run(async () => {
        await api("backup/create", { accountId });
        await render();
        toast(t("Sauvegarde créée"));
      });
  if ($("#backup-upload"))
    $("#backup-upload").onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 20_000_000) return toast(t("Le fichier dépasse la limite de 20 Mo."));
        let snapshot;
        try {
          snapshot = JSON.parse(await file.text());
        } catch {
          return toast(t("Ce fichier ne contient pas un JSON valide."));
        }
        openDialog(`<h2>${esc(t("Restaurer cette sauvegarde ?"))}</h2><p>${t("Le fichier <strong>{name}</strong> remplacera les données synchronisées du compte <strong>{account}</strong>.", { name: esc(file.name), account: esc(activeAccount?.name || activeAccount?.email || t("actif")) })}</p><p class="hint warning">${esc(t("Une sauvegarde de sécurité sera créée automatiquement avant la restauration."))}</p><div class="dialog-actions"><button data-close>${esc(t("Annuler"))}</button><button id="restore-uploaded-backup" class="danger">${esc(t("Restaurer le compte"))}</button></div>`);
        $("#restore-uploaded-backup").onclick = () => run(async () => {
          await api("backup/restore-file", { accountId, backup: snapshot });
          $("#dialog").close();
          await render();
          toast(t("Sauvegarde chargée et restaurée"));
        });
      };
      input.click();
    };
  $$('[data-backup-restore]').forEach((button) => {
    button.onclick = () => {
      const item = state.backups.find((backup) => backup.id === button.dataset.backupRestore),
        target = state.accounts.find((account) => account.id === item?.accountId);
      openDialog(`<h2>${esc(t("Restaurer cette sauvegarde ?"))}</h2><p>${t("Les données synchronisées du compte <strong>{account}</strong> seront remplacées par la sauvegarde du {date}.", { account: esc(target?.name || target?.email || item?.email), date: esc(new Date(item.at).toLocaleString(getLang())) })}</p><p class="hint warning">${esc(t("Une sauvegarde de sécurité sera créée automatiquement avant la restauration."))}</p><div class="dialog-actions"><button data-close>${esc(t("Annuler"))}</button><button id="restore-backup" class="danger">${esc(t("Restaurer le compte"))}</button></div>`);
      $("#restore-backup").onclick = () => run(async () => {
        await api("backup/restore", { accountId: item.accountId, id: item.id });
        $("#dialog").close();
        await render();
        toast(t("Compte restauré"));
      });
    };
  });
  $$('[data-backup-delete]').forEach((button) => {
    button.onclick = () => {
      const item = state.backups.find((backup) => backup.id === button.dataset.backupDelete);
      openDialog(`<h2>${esc(t("Supprimer cette sauvegarde ?"))}</h2><p>${t("La sauvegarde du {date} sera supprimée définitivement.", { date: esc(new Date(item.at).toLocaleString(getLang())) })}</p><div class="dialog-actions"><button data-close>${esc(t("Annuler"))}</button><button id="delete-backup" class="danger">${esc(t("Supprimer"))}</button></div>`);
      $("#delete-backup").onclick = () => run(async () => {
        await api("backup/delete", { id: item.id });
        $("#dialog").close();
        await render();
        toast(t("Sauvegarde supprimée"));
      });
    };
  });
}
// Inline Tuvora brand logo (amber play square) — mirrors how Trakt/Simkl are
// shipped as inline SVG so no external asset is needed.
const TUVORA_LOGO = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="48" y="48" width="416" height="416" rx="52" fill="#f0b429"/><path fill="#141414" d="M204 164c-15 0-27 12-27 27v130c0 21 23 34 41 23l108-65c17-10 17-34 0-44l-108-65c-4-2-9-6-14-6z"/></svg>`;

// Account providers sharing the Nuvio-fork TV-login pairing flow.
const ACCOUNT_PROVIDERS = {
  nuvio: {
    name: "Nuvio",
    tagline: "Films, séries et animés",
    logoMark: `<img src="/assets/nuvio_logo.png" alt="" class="acct-choice-logo">`,
    pairLogo: `<img class="nuvio-pair-logo" src="/assets/nuvio_login.webp" alt="Nuvio">`,
    cls: "",
  },
  tuvora: {
    name: "Tuvora",
    tagline: "IPTV, sport et guide TV",
    logoMark: `<span class="acct-choice-logo acct-choice-logo-svg">${TUVORA_LOGO}</span>`,
    pairLogo: `<span class="nuvio-pair-logo nuvio-pair-logo-svg">${TUVORA_LOGO}</span>`,
    cls: "provider-tuvora",
    // Tuvora's device-login cannot be driven as anon, so accounts connect with
    // email + password (exchanged for tokens; the password is never stored).
    passwordConnect: true,
  },
};
function connectAccount() {
  clearInterval(pairTimer);
  const choice = (id) => {
    const cfg = ACCOUNT_PROVIDERS[id];
    return `<button type="button" class="acct-choice acct-choice-${id}" data-provider="${id}">
      ${cfg.logoMark}
      <span class="acct-choice-name">${esc(cfg.name)}</span>
      <span class="acct-choice-desc">${esc(t(cfg.tagline))}</span>
    </button>`;
  };
  openDialog(
    `<div class="acct-chooser">
      <button class="nuvio-pair-close" type="button" data-close aria-label="${esc(t("Fermer"))}">×</button>
      <h2>${esc(t("Connecter un compte"))}</h2>
      <p class="acct-chooser-intro">${esc(t("Quel type de compte souhaitez-vous connecter ?"))}</p>
      <div class="acct-chooser-options">${choice("nuvio")}${choice("tuvora")}</div>
    </div>`,
  );
  $$(".acct-choice").forEach(
    (button) =>
      (button.onclick = () => {
        const provider = button.dataset.provider;
        if (ACCOUNT_PROVIDERS[provider]?.passwordConnect) connectWithPassword(provider);
        else run(() => pair(provider));
      }),
  );
}
// Password-based connect window (Tuvora): same branded card, with an email +
// password form instead of the code-pairing dance.
function connectWithPassword(provider) {
  clearInterval(pairTimer);
  const cfg = ACCOUNT_PROVIDERS[provider] || ACCOUNT_PROVIDERS.nuvio;
  openDialog(
    `<div class="nuvio-pair ${cfg.cls}">
      <button class="nuvio-pair-close" type="button" data-close aria-label="${esc(t("Fermer"))}">×</button>
      ${cfg.pairLogo}
      <h2>${esc(t("Connecter un compte {name}", { name: cfg.name }))}</h2>
      <p class="nuvio-pair-intro">${esc(t("Saisissez les identifiants du compte {name} à connecter.", { name: cfg.name }))}</p>
      <form id="pair-pass-form" class="nuvio-pair-form">
        <label>${esc(t("Email {name}", { name: cfg.name }))}<input name="email" type="email" autocomplete="off" required></label>
        <label>${esc(t("Mot de passe"))}<input name="password" type="password" autocomplete="off" required></label>
        <button class="nuvio-pair-primary" type="submit">${esc(t("Connecter le compte"))}</button>
        <p id="pair-pass-error" class="error" hidden></p>
      </form>
      <p class="nuvio-pair-note">${esc(t("Le mot de passe sert uniquement à la connexion et n’est jamais enregistré."))}</p>
    </div>`,
  );
  $("#pair-pass-form").onsubmit = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    run(async () => {
      const err = $("#pair-pass-error");
      if (err) err.hidden = true;
      try {
        const r = await api("accounts/connect", {
          provider,
          email: values.email,
          password: values.password,
        });
        $("#dialog").close();
        accountId = r.account.id;
        toast(t("Compte connecté"));
        await render();
      } catch (e) {
        if (err) {
          err.hidden = false;
          err.textContent = e.message;
        }
      }
    });
  };
}
async function pair(provider = "nuvio") {
  clearInterval(pairTimer);
  const cfg = ACCOUNT_PROVIDERS[provider] || ACCOUNT_PROVIDERS.nuvio;
  openDialog(
    `<div class="nuvio-pair nuvio-pair-loading ${cfg.cls}">
      <button class="nuvio-pair-close" type="button" data-close aria-label="${esc(t("Fermer"))}">×</button>
      ${cfg.pairLogo}
      <div class="nuvio-pair-spinner" aria-hidden="true"></div>
      <h2>${esc(t("Préparation de la connexion…"))}</h2>
      <p>${esc(t("Nous créons votre lien sécurisé vers {name}.", { name: cfg.name }))}</p>
    </div>`,
  );
  const p = await api("pair/start", { provider });
  const link = new URL(p.web_url);
  if (!["http:", "https:"].includes(link.protocol))
    throw Error(t("Lien de connexion invalide"));
  openDialog(
    `<div class="nuvio-pair ${cfg.cls}">
      <button class="nuvio-pair-close" type="button" data-close aria-label="${esc(t("Fermer"))}">×</button>
      ${cfg.pairLogo}
      <h2>${esc(t("Connecter un compte {name}", { name: cfg.name }))}</h2>
      <p class="nuvio-pair-intro">${esc(t("Ouvrez {name}, connectez-vous à votre compte, puis validez l’association avec le dashboard.", { name: cfg.name }))}</p>
      <div class="nuvio-pair-code">
        <span>${esc(t("Code de connexion"))}</span>
        <strong>${esc(p.code)}</strong>
      </div>
      <a class="nuvio-pair-primary" href="${esc(link.href)}" target="_blank" rel="noreferrer">
        <span aria-hidden="true">↗</span> ${esc(t("Ouvrir le site {name}", { name: cfg.name }))}
      </a>
      <ol class="nuvio-pair-steps" aria-label="${esc(t("Étapes de connexion"))}">
        <li><span>1</span><strong>${esc(t("Ouvrir {name}", { name: cfg.name }))}</strong></li>
        <li><span>2</span><strong>${esc(t("Se connecter"))}</strong></li>
        <li><span>3</span><strong>${esc(t("Valider le code"))}</strong></li>
      </ol>
      <button id="pair-check" class="nuvio-pair-secondary" type="button">${esc(t("J’ai terminé la connexion"))}</button>
      <p id="pair-status" class="nuvio-pair-status" aria-live="polite"><span class="nuvio-pair-status-dot" aria-hidden="true"></span><span>${esc(t("En attente de votre validation…"))}</span></p>
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
        setStatus(t("Connexion confirmée."), "connected");
        $("#dialog").close();
        accountId = r.account.id;
        toast(t("Compte connecté"));
        await render();
      } else if (r.status === "expired") {
        clearInterval(pairTimer);
        setStatus(t("Code expiré. Fermez puis recommencez."), "error");
      } else {
        setStatus(t("En attente de votre validation…"));
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
    `<div class="auth-card"><div class="login-brand"><img src="/assets/nuvio-manager-logo.png" alt="" width="64" height="64"><div><h2>Nuvio Manager</h2><p class="muted">${esc(t("Connectez-vous à votre dashboard."))}</p></div></div>` +
    `<form id="nuvio-login" class="form"><label>${esc(t("Email"))}<input name="email" type="email" autocomplete="username" placeholder="${esc(t("vous@exemple.com"))}" required></label><label>${esc(t("Mot de passe"))}<input name="password" type="password" autocomplete="current-password" required></label><button class="primary">${esc(t("Se connecter"))}</button><p id="nuvio-error" class="error" hidden></p></form>` +
    `<div class="auth-sep"><span>${esc(t("ou"))}</span></div>` +
    `<details class="auth-admin"><summary>${esc(t("Connexion local"))}</summary><form id="admin-login" class="form"><label>${esc(t("Utilisateur"))}<input name="user" autocomplete="username" required></label><label>${esc(t("Mot de passe"))}<input name="password" type="password" autocomplete="current-password" required></label><button>${esc(t("Se connecter"))}</button><p id="admin-error" class="error" hidden></p></form></details></div>`;
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
    `<div class="login-brand"><img src="/assets/nuvio-manager-logo.png" alt="" width="76" height="76"><div><h2>${publicUrlOnly ? esc(t("Configurer l’adresse publique")) : esc(t("Créer l’administrateur"))}</h2><p class="muted">${publicUrlOnly ? esc(t("Finalisez la migration de votre dashboard.")) : esc(t("Première configuration de votre dashboard privé."))}</p></div></div><form id="setup-form" class="form"><label>${esc(t("Code de configuration"))}<input name="code" autocomplete="one-time-code" maxlength="32" placeholder="${esc(t("Code affiché dans les journaux Docker"))}" required></label>${publicUrlOnly ? "" : `<label>${esc(t("Nom d’utilisateur"))}<input name="username" autocomplete="username" maxlength="80" required></label><label>${esc(t("Mot de passe"))}<input name="password" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required></label><label>${esc(t("Confirmer le mot de passe"))}<input name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required></label>`}<label>${esc(t("Adresse publique du dashboard"))}<input name="publicUrl" type="url" value="${esc(location.origin)}" autocomplete="off" required></label><p class="muted">${t("Récupérez le code avec {code}. L’adresse publique servira à générer les URL des addons proxifiés.", { code: "<code>docker logs nuvio-manager</code>" })}</p><button class="primary">${publicUrlOnly ? esc(t("Enregistrer l’adresse")) : esc(t("Créer l’administrateur"))}</button><p id="setup-error" class="error" hidden></p></form>`,
  );
  $("#setup-form").onsubmit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    if (!publicUrlOnly && values.password !== values.confirmation) {
      $("#setup-error").hidden = false;
      $("#setup-error").textContent = t("Les deux mots de passe ne correspondent pas.");
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
  await initI18n();
  setupLangSelect();
  const loading = $("#content");
  if (loading) loading.innerHTML = `<p>${esc(t("app.loading"))}</p>`;
  const initial = await api("setup");
  if (initial.required) setup();
  else if (initial.publicUrlRequired) setup(true);
  else await render();
});
