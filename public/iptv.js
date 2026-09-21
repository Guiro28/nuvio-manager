import { t } from "./i18n.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

// Tuvora IPTV playlist types. The row keeps whatever columns Tuvora returned
// (round-trip); we only read/write the fields the editor exposes per type.
const TYPES = [
  { value: "xtream", label: "Xtream Codes" },
  { value: "m3u", label: "M3U / M3U8" },
  { value: "stalker", label: "Stalker Portal" },
];
const typeLabel = (value) => TYPES.find((type) => type.value === value)?.label || value || "—";
// Tuvora stores the discriminator in `source_type`; fall back to legacy names.
const rowType = (row) => String(row.source_type || row.kind || row.type || "xtream").toLowerCase();
const rowUrl = (row) => row.base_url || row.url || row.portal_url || "";
const setType = (row, value) => (row.source_type = value);
// Editable columns per source type (matches the iptv_playlists schema).
const FIELDS_BY_TYPE = {
  xtream: ["base_url", "username", "password"],
  m3u: ["url"],
  stalker: ["portal_url", "mac_address", "stalker_username", "stalker_password"],
};
const ALL_FIELDS = ["base_url", "username", "password", "url", "portal_url", "mac_address", "stalker_username", "stalker_password"];

export async function renderIptv(container, context) {
  const { api, accountId, profileId, openDialog, run, toast } = context;
  const data = await api(`iptv?${new URLSearchParams({ accountId, profileId })}`);
  const rows = (data.playlists || []).map((row) => ({ ...row }));

  function paint() {
    container.innerHTML =
      `<div class="settings-top"><p class="muted">${t("{n} playlists IPTV", { n: rows.length })} · ${esc(t("ordre d’affichage"))}</p><div class="actions">${
        `<button id="iptv-add">${esc(t("＋ Ajouter une playlist"))}</button>`
      }<button id="iptv-save" class="primary">${esc(t("Enregistrer les playlists"))}</button></div></div>` +
      `<div id="iptv-list"></div>` +
      `<p class="footer-note">${esc(t("Les playlists sont propres à ce profil et rejoignent vos appareils Tuvora à la prochaine connexion. Les identifiants restent sur Tuvora."))}</p>`;
    list();
    container.querySelector("#iptv-add").onclick = () => openForm();
    container.querySelector("#iptv-save").onclick = () =>
      run(async () => {
        rows.forEach((row, index) => (row.sort_order = index));
        await api("iptv/save", { accountId, profileId, playlists: rows });
        toast(t("Playlists IPTV enregistrées"));
      });
  }

  function list() {
    const host = container.querySelector("#iptv-list");
    host.innerHTML =
      rows
        .map((row, index) => {
          const type = rowType(row);
          const url = rowUrl(row);
          return `<div class="addon"><div class="addon-top"><label class="check-label"><input type="checkbox" data-enabled="${index}" ${row.enabled ? "checked" : ""}>${esc(row.name || t("Playlist"))}</label><span class="badge neutral">${esc(typeLabel(type))}</span><div class="actions"><button data-up="${index}" ${index === 0 ? "disabled" : ""} aria-label="${esc(t("Monter {name}", { name: row.name || "" }))}">↑</button><button data-down="${index}" ${index === rows.length - 1 ? "disabled" : ""} aria-label="${esc(t("Descendre {name}", { name: row.name || "" }))}">↓</button><button data-edit="${index}">${esc(t("Modifier"))}</button><button data-remove="${index}">${esc(t("Retirer"))}</button></div></div>${url ? `<p class="url">${esc(url)}</p>` : ""}</div>`;
        })
        .join("") || `<p class="empty-inline">${esc(t("Aucune playlist IPTV."))}</p>`;
    host.querySelectorAll("[data-enabled]").forEach((el) => {
      el.onchange = () => (rows[Number(el.dataset.enabled)].enabled = el.checked);
    });
    host.querySelectorAll("[data-up]").forEach((el) => {
      el.onclick = () => {
        const index = Number(el.dataset.up);
        [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]];
        list();
      };
    });
    host.querySelectorAll("[data-down]").forEach((el) => {
      el.onclick = () => {
        const index = Number(el.dataset.down);
        [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]];
        list();
      };
    });
    host.querySelectorAll("[data-edit]").forEach((el) => {
      el.onclick = () => openForm(Number(el.dataset.edit));
    });
    host.querySelectorAll("[data-remove]").forEach((el) => {
      el.onclick = () => {
        rows.splice(Number(el.dataset.remove), 1);
        list();
      };
    });
  }

  function fieldsFor(type, row) {
    const value = (key) => esc(row?.[key] ?? "");
    if (type === "m3u")
      return `<label>${esc(t("URL M3U"))}<input name="url" type="url" placeholder="https://…/playlist.m3u8" value="${value("url")}"></label>`;
    if (type === "stalker")
      return (
        `<label>${esc(t("URL du portail"))}<input name="portal_url" type="url" placeholder="http://portal.example.tv/c/" value="${value("portal_url")}"></label>` +
        `<label>${esc(t("Adresse MAC"))}<input name="mac_address" placeholder="00:1A:79:xx:xx:xx" value="${value("mac_address")}"></label>` +
        `<label>${esc(t("Nom d’utilisateur"))} <span class="muted">${esc(t("(optionnel)"))}</span><input name="stalker_username" value="${value("stalker_username")}"></label>` +
        `<label>${esc(t("Mot de passe"))} <span class="muted">${esc(t("(optionnel)"))}</span><input name="stalker_password" type="password" value="${value("stalker_password")}"></label>`
      );
    return (
      `<label>${esc(t("URL du serveur"))}<input name="base_url" type="url" placeholder="http://line.example.tv:8080" value="${value("base_url")}"></label>` +
      `<label>${esc(t("Nom d’utilisateur"))}<input name="username" value="${value("username")}"></label>` +
      `<label>${esc(t("Mot de passe"))}<input name="password" type="password" value="${value("password")}"></label>`
    );
  }

  function openForm(index) {
    const editing = index != null;
    const row = editing ? rows[index] : { enabled: true };
    const type = rowType(row);
    const typeOptions = TYPES.map(
      (option) => `<option value="${option.value}" ${option.value === type ? "selected" : ""}>${esc(option.label)}</option>`,
    ).join("");
    openDialog(
      `<h2>${esc(editing ? t("Modifier la playlist") : t("Ajouter une playlist"))}</h2><form id="iptv-form" class="form"><label>${esc(t("Type de source"))}<select name="source_type">${typeOptions}</select></label><label>${esc(t("Nom"))}<input name="name" required value="${esc(row.name ?? "")}"></label><div id="iptv-type-fields">${fieldsFor(type, row)}</div><label class="check-label"><input type="checkbox" name="enabled" ${row.enabled ? "checked" : ""}>${esc(t("Activée"))}</label><div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(editing ? t("Enregistrer le brouillon") : t("Ajouter au brouillon"))}</button></div></form>`,
    );
    const form = document.querySelector("#iptv-form");
    form.querySelector("[name=source_type]").onchange = (event) => {
      form.querySelector("#iptv-type-fields").innerHTML = fieldsFor(event.target.value, editing ? row : {});
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const next = editing ? { ...row } : {};
      setType(next, values.source_type);
      next.name = String(values.name || "").trim();
      next.enabled = form.querySelector("[name=enabled]").checked;
      // Keep only the fields relevant to the chosen type; clear the others so a
      // type switch doesn't leave stale credentials from another source type.
      const keep = new Set(FIELDS_BY_TYPE[values.source_type] || []);
      for (const key of ALL_FIELDS) {
        // Kept fields take the form value; the other types' credential columns
        // are cleared (null) so a type switch leaves no stale secrets. Columns
        // outside ALL_FIELDS (user_agent, epg_url, …) are preserved untouched.
        if (keep.has(key)) next[key] = String(values[key] ?? next[key] ?? "");
        else next[key] = null;
      }
      if (editing) rows[index] = next;
      else rows.push(next);
      document.querySelector("#dialog").close();
      list();
    };
  }

  paint();
}
