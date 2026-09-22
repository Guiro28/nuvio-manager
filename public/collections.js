import { t } from "./i18n.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const clone = (value) => JSON.parse(JSON.stringify(value ?? null));
const uuid = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const typeLabel = (value) => {
  const raw = String(value || "").toLowerCase();
  if (raw === "movie") return t("Films");
  if (raw === "series") return t("Séries");
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "";
};
const VIEW_MODES = ["TABBED_GRID", "ROWS", "FOLLOW_LAYOUT"];
const TILE_SHAPES = ["POSTER", "LANDSCAPE", "SQUARE"];
// TMDB discover sort values (value, i18n label). Media-agnostic subset.
const TMDB_SORTS = [
  ["popularity.desc", "Populaires"],
  ["vote_average.desc", "Mieux notés"],
  ["vote_count.desc", "Plus votés"],
  ["revenue.desc", "Revenus"],
];
// TMDB genre ids (fixed catalogue). Names stay in their canonical form.
const TMDB_MOVIE_GENRES = [
  ["28", "Action"], ["12", "Adventure"], ["16", "Animation"], ["35", "Comedy"], ["80", "Crime"],
  ["99", "Documentary"], ["18", "Drama"], ["10751", "Family"], ["14", "Fantasy"], ["36", "History"],
  ["27", "Horror"], ["10402", "Music"], ["9648", "Mystery"], ["10749", "Romance"], ["878", "Science Fiction"],
  ["53", "Thriller"], ["10752", "War"], ["37", "Western"],
];
const TMDB_TV_GENRES = [
  ["10759", "Action & Adventure"], ["16", "Animation"], ["35", "Comedy"], ["80", "Crime"], ["99", "Documentary"],
  ["18", "Drama"], ["10751", "Family"], ["10762", "Kids"], ["9648", "Mystery"], ["10765", "Sci-Fi & Fantasy"],
  ["10768", "War & Politics"], ["37", "Western"],
];

export async function renderCollections(container, context) {
  const { api, accountId, profileId, openDialog, run, toast } = context;
  const query = new URLSearchParams({ accountId, profileId });
  const data = await api(`collections?${query}`);

  const home = {
    hide: Boolean(data.home?.hideUnreleasedContent),
    items: (data.home?.items || []).map((item) => ({ ...item })),
  };
  const homeEmpty = !home.items.length;
  let cols = (data.collections || []).map((collection) => clone(collection));
  const catalogs = data.catalogs || [];
  const addonById = new Map(catalogs.map((addon) => [addon.addonId, addon]));

  // Resolve a home item / source to a human label using the addon manifests.
  const resolveCatalog = (addonId, type, catalogId) => {
    const addon = addonById.get(addonId);
    const catalog = addon?.catalogs.find((entry) => entry.type === type && entry.id === catalogId);
    return {
      addonName: addon?.addonName || addonId || "?",
      catalogName: catalog?.name || catalogId || "?",
      known: Boolean(catalog),
    };
  };
  const collectionById = (id) => cols.find((collection) => collection.id === id);

  // ── Home catalog order ───────────────────────────────────────────────────
  function homeRow(item, index) {
    let title, subtitle, icon;
    if (item.is_collection) {
      const collection = collectionById(item.collection_id);
      title = collection?.title || t("Collection supprimée");
      subtitle = t("Collection");
      icon = "▦";
    } else {
      const info = resolveCatalog(item.addon_id, item.type, item.catalog_id);
      title = item.custom_title?.trim() || info.catalogName;
      subtitle = `${info.addonName} · ${typeLabel(item.type)}`;
      icon = "▤";
    }
    return `<div class="col-home-row${item.enabled ? "" : " disabled"}" data-index="${index}">
      <span class="col-home-grip" aria-hidden="true">${icon}</span>
      <div class="col-home-main"><strong>${esc(title)}</strong><span class="muted">${esc(subtitle)}</span></div>
      <div class="col-home-actions">
        <button data-up="${index}" ${index === 0 ? "disabled" : ""} aria-label="${esc(t("Monter"))}">↑</button>
        <button data-down="${index}" ${index === home.items.length - 1 ? "disabled" : ""} aria-label="${esc(t("Descendre"))}">↓</button>
        ${item.is_collection ? "" : `<button data-rename="${index}" title="${esc(t("Renommer"))}">✎</button>`}
        <label class="col-switch" title="${esc(item.enabled ? t("Activé") : t("Désactivé"))}"><input type="checkbox" data-toggle="${index}" ${item.enabled ? "checked" : ""}><span></span></label>
      </div>
    </div>`;
  }

  function paintHome() {
    const host = container.querySelector("#col-home-list");
    host.innerHTML =
      home.items.map((item, index) => homeRow(item, index)).join("") ||
      `<p class="empty-inline">${esc(t("Aucun catalogue sur l’accueil."))}</p>`;
    host.querySelectorAll("[data-up]").forEach((el) => (el.onclick = () => moveHome(Number(el.dataset.up), -1)));
    host.querySelectorAll("[data-down]").forEach((el) => (el.onclick = () => moveHome(Number(el.dataset.down), 1)));
    host.querySelectorAll("[data-toggle]").forEach(
      (el) => (el.onchange = () => { home.items[Number(el.dataset.toggle)].enabled = el.checked; paintHome(); }),
    );
    host.querySelectorAll("[data-rename]").forEach((el) => (el.onclick = () => renameHome(Number(el.dataset.rename))));
  }
  function moveHome(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= home.items.length) return;
    [home.items[index], home.items[target]] = [home.items[target], home.items[index]];
    paintHome();
  }
  function renameHome(index) {
    const item = home.items[index];
    const info = resolveCatalog(item.addon_id, item.type, item.catalog_id);
    openDialog(
      `<h2>${esc(t("Renommer le catalogue"))}</h2><form id="col-rename" class="form"><label>${esc(t("Titre affiché"))}<input name="title" value="${esc(item.custom_title || "")}" placeholder="${esc(info.catalogName)}" autocomplete="off"></label><div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Valider"))}</button></div></form>`,
    );
    document.querySelector("#col-rename").onsubmit = (event) => {
      event.preventDefault();
      item.custom_title = event.target.title.value.trim();
      document.querySelector("#dialog").close();
      paintHome();
    };
  }
  function saveHome() {
    run(async () => {
      home.items.forEach((item, index) => (item.order = index));
      await api("catalogs/save", {
        accountId,
        profileId,
        settings: { hide_unreleased_content: home.hide, items: home.items },
      });
      toast(t("Ordre des catalogues enregistré"));
    });
  }

  // ── Collections ──────────────────────────────────────────────────────────
  const sourceLabel = (source) => {
    if (source.provider === "tmdb") return `TMDB · ${source.title || source.tmdbSourceType || ""}`;
    if (source.provider === "trakt") return `Trakt · ${source.title || "#" + source.traktListId}`;
    const info = resolveCatalog(source.addonId, source.type, source.catalogId);
    const label = source.title || source.catalogName || info.catalogName;
    return `${info.addonName} · ${label}${source.genre && source.genre !== "None" ? " · " + source.genre : ""}`;
  };

  function paintCollections() {
    const host = container.querySelector("#col-collections");
    host.innerHTML =
      cols.map((collection, index) => collectionCard(collection, index)).join("") ||
      `<p class="empty-inline">${esc(t("Aucune collection."))}</p>`;
    cols.forEach((collection, index) => bindCollectionCard(host, collection, index));
  }

  function collectionCard(collection, index) {
    const folders = collection.folders || [];
    const sourceCount = folders.reduce((sum, folder) => sum + (folder.sources?.length || 0), 0);
    return `<details class="col-card" data-id="${esc(collection.id)}">
      <summary>
        <span class="col-card-title">${esc(collection.title)}</span>
        <span class="col-card-meta">${folders.length} ${esc(t("dossiers"))} · ${sourceCount} ${esc(t("sources"))}</span>
        <span class="col-card-move"><button data-cup="${index}" ${index === 0 ? "disabled" : ""} aria-label="${esc(t("Monter"))}">↑</button><button data-cdown="${index}" ${index === cols.length - 1 ? "disabled" : ""} aria-label="${esc(t("Descendre"))}">↓</button></span>
      </summary>
      <div class="col-card-body">
        <div class="col-card-toolbar">
          <button data-settings="${index}">${esc(t("Réglages"))}</button>
          <button data-addfolder="${index}">${esc(t("＋ Dossier"))}</button>
          <button data-delcol="${index}" class="danger">${esc(t("Supprimer la collection"))}</button>
        </div>
        <div class="col-folders">${folders.map((folder, folderIndex) => folderBlock(collection, folder, folderIndex)).join("") || `<p class="empty-inline">${esc(t("Aucun dossier."))}</p>`}</div>
      </div>
    </details>`;
  }

  function folderBlock(collection, folder, folderIndex) {
    const sources = folder.sources || [];
    return `<div class="col-folder" data-folder="${folderIndex}">
      <div class="col-folder-head">
        <strong>${esc(folder.title)}</strong>
        <span class="muted">${sources.length} ${esc(t("sources"))}</span>
        <div class="col-folder-actions">
          <button data-fup="${folderIndex}" ${folderIndex === 0 ? "disabled" : ""} aria-label="${esc(t("Monter"))}">↑</button>
          <button data-fdown="${folderIndex}" ${folderIndex === (collection.folders.length - 1) ? "disabled" : ""} aria-label="${esc(t("Descendre"))}">↓</button>
          <button data-fedit="${folderIndex}" title="${esc(t("Modifier le dossier"))}">✎</button>
          <button data-addsource="${folderIndex}">${esc(t("＋ Source"))}</button>
          <button data-fdel="${folderIndex}" class="danger" aria-label="${esc(t("Supprimer"))}">✕</button>
        </div>
      </div>
      <div class="col-sources">${sources
        .map(
          (source, sourceIndex) =>
            `<div class="col-source"><span class="col-source-tag">${esc(source.provider || "addon")}</span><span class="col-source-name">${esc(sourceLabel(source))}</span><span class="col-source-actions"><button data-sup="${folderIndex}:${sourceIndex}" ${sourceIndex === 0 ? "disabled" : ""} aria-label="${esc(t("Monter"))}">↑</button><button data-sdown="${folderIndex}:${sourceIndex}" ${sourceIndex === sources.length - 1 ? "disabled" : ""} aria-label="${esc(t("Descendre"))}">↓</button><button data-sdel="${folderIndex}:${sourceIndex}" class="danger" aria-label="${esc(t("Retirer"))}">✕</button></span></div>`,
        )
        .join("") || `<p class="empty-inline">${esc(t("Aucune source dans ce dossier."))}</p>`}</div>
    </div>`;
  }

  function bindCollectionCard(host, collection, index) {
    const card = host.querySelector(`.col-card[data-id="${CSS.escape(collection.id)}"]`);
    if (!card) return;
    card.querySelectorAll("[data-cup]").forEach((el) => (el.onclick = (event) => { event.preventDefault(); moveCollection(index, -1); }));
    card.querySelectorAll("[data-cdown]").forEach((el) => (el.onclick = (event) => { event.preventDefault(); moveCollection(index, 1); }));
    const q = (selector) => card.querySelector(selector);
    q(`[data-settings="${index}"]`).onclick = () => editCollection(collection);
    q(`[data-addfolder="${index}"]`).onclick = () => addFolder(collection);
    q(`[data-delcol="${index}"]`).onclick = () => deleteCollection(index);
    card.querySelectorAll("[data-fup]").forEach((el) => (el.onclick = () => moveFolder(collection, Number(el.dataset.fup), -1)));
    card.querySelectorAll("[data-fdown]").forEach((el) => (el.onclick = () => moveFolder(collection, Number(el.dataset.fdown), 1)));
    card.querySelectorAll("[data-fedit]").forEach((el) => (el.onclick = () => editFolder(collection, Number(el.dataset.fedit))));
    card.querySelectorAll("[data-fdel]").forEach((el) => (el.onclick = () => deleteFolder(collection, Number(el.dataset.fdel))));
    card.querySelectorAll("[data-addsource]").forEach((el) => (el.onclick = () => addSource(collection, Number(el.dataset.addsource))));
    card.querySelectorAll("[data-sup]").forEach((el) => (el.onclick = () => moveSource(collection, el.dataset.sup, -1)));
    card.querySelectorAll("[data-sdown]").forEach((el) => (el.onclick = () => moveSource(collection, el.dataset.sdown, 1)));
    card.querySelectorAll("[data-sdel]").forEach((el) => (el.onclick = () => deleteSource(collection, el.dataset.sdel)));
  }

  const keepOpen = () => [...container.querySelectorAll(".col-card[open]")].map((el) => el.dataset.id);
  const restoreOpen = (ids) => ids.forEach((id) => { const el = container.querySelector(`.col-card[data-id="${CSS.escape(id)}"]`); if (el) el.open = true; });
  function refreshCollections() {
    const open = keepOpen();
    paintCollections();
    restoreOpen(open);
  }

  function moveCollection(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= cols.length) return;
    [cols[index], cols[target]] = [cols[target], cols[index]];
    refreshCollections();
  }
  function deleteCollection(index) {
    const collection = cols[index];
    openDialog(
      `<h2>${esc(t("Supprimer cette collection ?"))}</h2><p>${esc(t("« {name} » et ses dossiers seront retirés à l’enregistrement.", { name: collection.title }))}</p><div class="dialog-actions"><button data-close>${esc(t("Annuler"))}</button><button id="col-confirm-del" class="danger">${esc(t("Supprimer"))}</button></div>`,
    );
    document.querySelector("#col-confirm-del").onclick = () => {
      cols.splice(index, 1);
      home.items = home.items.filter((item) => !(item.is_collection && item.collection_id === collection.id));
      document.querySelector("#dialog").close();
      refreshCollections();
      paintHome();
    };
  }
  function createCollection() {
    openDialog(
      `<h2>${esc(t("Nouvelle collection"))}</h2><form id="col-new" class="form"><label>${esc(t("Nom"))}<input name="title" required autocomplete="off"></label><div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Créer"))}</button></div></form>`,
    );
    document.querySelector("#col-new").onsubmit = (event) => {
      event.preventDefault();
      const title = event.target.title.value.trim();
      if (!title) return;
      const collection = { id: uuid(), title, focusGlowEnabled: true, pinToTop: false, viewMode: "TABBED_GRID", showAllTab: true, backdropImageUrl: null, folders: [] };
      cols.push(collection);
      home.items.push({ addon_id: "", type: "", catalog_id: "", enabled: true, order: home.items.length, custom_title: "", is_collection: true, collection_id: collection.id });
      document.querySelector("#dialog").close();
      refreshCollections();
      paintHome();
    };
  }
  function editCollection(collection) {
    openDialog(
      `<h2>${esc(t("Réglages de la collection"))}</h2><form id="col-edit" class="form">
        <label>${esc(t("Nom"))}<input name="title" value="${esc(collection.title)}" required autocomplete="off"></label>
        <label>${esc(t("Image de fond (URL)"))}<input name="backdrop" value="${esc(collection.backdropImageUrl || "")}" placeholder="https://…" autocomplete="off"></label>
        <label>${esc(t("Mode d’affichage"))}<select name="viewMode">${VIEW_MODES.map((mode) => `<option value="${mode}" ${collection.viewMode === mode ? "selected" : ""}>${esc(viewModeLabel(mode))}</option>`).join("")}</select></label>
        <label class="check-label"><input type="checkbox" name="pin" ${collection.pinToTop ? "checked" : ""}>${esc(t("Épingler en haut de l’accueil"))}</label>
        <label class="check-label"><input type="checkbox" name="glow" ${collection.focusGlowEnabled !== false ? "checked" : ""}>${esc(t("Effet de halo au focus"))}</label>
        <label class="check-label"><input type="checkbox" name="alltab" ${collection.showAllTab !== false ? "checked" : ""}>${esc(t("Afficher l’onglet « Tout »"))}</label>
        <div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Valider"))}</button></div>
      </form>`,
    );
    document.querySelector("#col-edit").onsubmit = (event) => {
      event.preventDefault();
      const form = event.target;
      collection.title = form.title.value.trim() || collection.title;
      collection.backdropImageUrl = form.backdrop.value.trim() || null;
      collection.viewMode = form.viewMode.value;
      collection.pinToTop = form.pin.checked;
      collection.focusGlowEnabled = form.glow.checked;
      collection.showAllTab = form.alltab.checked;
      document.querySelector("#dialog").close();
      refreshCollections();
      paintHome();
    };
  }
  const viewModeLabel = (mode) =>
    ({ TABBED_GRID: t("Grille à onglets"), ROWS: t("Rangées"), FOLLOW_LAYOUT: t("Suivre la mise en page") })[mode] || mode;

  // ── Folders ──────────────────────────────────────────────────────────────
  function addFolder(collection) {
    folderDialog(t("Nouveau dossier"), { title: "", tileShape: "POSTER", hideTitle: false, coverImageUrl: "" }, (values) => {
      collection.folders = collection.folders || [];
      collection.folders.push({ id: uuid(), title: values.title, tileShape: values.tileShape, hideTitle: values.hideTitle, coverImageUrl: values.coverImageUrl || null, focusGifEnabled: true, sources: [] });
      refreshCollections();
    });
  }
  function editFolder(collection, folderIndex) {
    const folder = collection.folders[folderIndex];
    folderDialog(t("Modifier le dossier"), folder, (values) => {
      folder.title = values.title;
      folder.tileShape = values.tileShape;
      folder.hideTitle = values.hideTitle;
      folder.coverImageUrl = values.coverImageUrl || null;
      refreshCollections();
    });
  }
  function folderDialog(heading, folder, onSubmit) {
    openDialog(
      `<h2>${esc(heading)}</h2><form id="col-folder" class="form">
        <label>${esc(t("Titre"))}<input name="title" value="${esc(folder.title || "")}" required autocomplete="off"></label>
        <label>${esc(t("Forme des vignettes"))}<select name="tileShape">${TILE_SHAPES.map((shape) => `<option value="${shape}" ${folder.tileShape === shape ? "selected" : ""}>${esc(tileShapeLabel(shape))}</option>`).join("")}</select></label>
        <label>${esc(t("Image de couverture (URL)"))}<input name="cover" value="${esc(folder.coverImageUrl || "")}" placeholder="https://…" autocomplete="off"></label>
        <label class="check-label"><input type="checkbox" name="hide" ${folder.hideTitle ? "checked" : ""}>${esc(t("Masquer le titre sur les vignettes"))}</label>
        <div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button class="primary">${esc(t("Valider"))}</button></div>
      </form>`,
    );
    document.querySelector("#col-folder").onsubmit = (event) => {
      event.preventDefault();
      const form = event.target;
      const title = form.title.value.trim();
      if (!title) return;
      document.querySelector("#dialog").close();
      onSubmit({ title, tileShape: form.tileShape.value, hideTitle: form.hide.checked, coverImageUrl: form.cover.value.trim() });
    };
  }
  const tileShapeLabel = (shape) =>
    ({ POSTER: t("Affiche"), LANDSCAPE: t("Paysage"), SQUARE: t("Carré") })[shape] || shape;
  function moveFolder(collection, folderIndex, delta) {
    const target = folderIndex + delta;
    if (target < 0 || target >= collection.folders.length) return;
    [collection.folders[folderIndex], collection.folders[target]] = [collection.folders[target], collection.folders[folderIndex]];
    refreshCollections();
  }
  function deleteFolder(collection, folderIndex) {
    collection.folders.splice(folderIndex, 1);
    refreshCollections();
  }

  // ── Sources ──────────────────────────────────────────────────────────────
  function moveSource(collection, ref, delta) {
    const [folderIndex, sourceIndex] = ref.split(":").map(Number);
    const sources = collection.folders[folderIndex].sources;
    const target = sourceIndex + delta;
    if (target < 0 || target >= sources.length) return;
    [sources[sourceIndex], sources[target]] = [sources[target], sources[sourceIndex]];
    refreshCollections();
  }
  function deleteSource(collection, ref) {
    const [folderIndex, sourceIndex] = ref.split(":").map(Number);
    collection.folders[folderIndex].sources.splice(sourceIndex, 1);
    refreshCollections();
  }
  function addSource(collection, folderIndex) {
    const folder = collection.folders[folderIndex];
    const withCatalogs = catalogs.filter((addon) => addon.catalogs.length);
    const genreList = (media) => (media === "TV" ? TMDB_TV_GENRES : TMDB_MOVIE_GENRES);
    openDialog(
      `<h2>${esc(t("Ajouter une source"))}</h2><div class="form">
        <label>${esc(t("Type de source"))}<select id="col-src-provider"><option value="addon">${esc(t("Catalogue d’addon"))}</option><option value="tmdb">${esc(t("Découverte TMDB"))}</option><option value="trakt">${esc(t("Liste Trakt"))}</option></select></label>
      </div>
      <div id="col-src-addon-box" class="form">
        <p class="muted">${esc(t("Catalogues fournis par les addons installés sur ce profil."))}</p>
        <label>${esc(t("Addon"))}<select id="col-src-addon">${withCatalogs.map((addon, index) => `<option value="${index}">${esc(addon.addonName)} (${addon.catalogs.length})</option>`).join("") || `<option value="">${esc(t("Aucun addon avec catalogue"))}</option>`}</select></label>
        <label>${esc(t("Rechercher un catalogue"))}<input id="col-src-filter" type="search" autocomplete="off" placeholder="${esc(t("Nom du catalogue…"))}"></label>
        <label>${esc(t("Catalogue"))}<select id="col-src-catalog" size="8" class="col-src-list"></select></label>
        <div id="col-src-genre-wrap" hidden><label>${esc(t("Genre (optionnel)"))}<select id="col-src-genre"></select></label></div>
      </div>
      <div id="col-src-tmdb-box" class="form" hidden>
        <label>${esc(t("Type de contenu"))}<select id="tmdb-media"><option value="MOVIE">${esc(t("Films"))}</option><option value="TV">${esc(t("Séries"))}</option></select></label>
        <label>${esc(t("Titre"))}<input id="tmdb-title" autocomplete="off" placeholder="${esc(t("Découverte TMDB"))}"></label>
        <label>${esc(t("Trier par"))}<select id="tmdb-sort">${TMDB_SORTS.map((s) => `<option value="${s[0]}">${esc(t(s[1]))}</option>`).join("")}</select></label>
        <label>${esc(t("Genres (facultatif)"))}<select id="tmdb-genres" multiple size="6" class="col-src-list"></select></label>
        <label>${esc(t("Année (facultatif)"))}<input id="tmdb-year" type="number" min="1900" max="2100" step="1" autocomplete="off"></label>
      </div>
      <div id="col-src-trakt-box" class="form" hidden>
        <label>${esc(t("Identifiant de la liste Trakt"))}<input id="trakt-id" type="number" min="1" step="1" autocomplete="off"></label>
        <label>${esc(t("Titre"))}<input id="trakt-title" autocomplete="off" placeholder="${esc(t("Liste Trakt"))}"></label>
        <label>${esc(t("Type de contenu"))}<select id="trakt-media"><option value="MOVIE">${esc(t("Films"))}</option><option value="TV">${esc(t("Séries"))}</option></select></label>
        <label>${esc(t("Trier par"))}<input id="trakt-sort" value="rank" autocomplete="off"></label>
        <label>${esc(t("Ordre de tri"))}<select id="trakt-how"><option value="asc">${esc(t("Croissant"))}</option><option value="desc">${esc(t("Décroissant"))}</option></select></label>
      </div>
      <div class="dialog-actions"><button type="button" data-close>${esc(t("Annuler"))}</button><button id="col-src-add" class="primary">${esc(t("Ajouter"))}</button></div>`,
    );
    const providerSelect = document.querySelector("#col-src-provider");
    const boxes = {
      addon: document.querySelector("#col-src-addon-box"),
      tmdb: document.querySelector("#col-src-tmdb-box"),
      trakt: document.querySelector("#col-src-trakt-box"),
    };
    const addButton = document.querySelector("#col-src-add");
    const showProvider = () => {
      const provider = providerSelect.value;
      Object.entries(boxes).forEach(([key, box]) => (box.hidden = key !== provider));
      addButton.disabled = provider === "addon" && !withCatalogs.length;
    };
    providerSelect.onchange = showProvider;

    // Addon sub-form
    const addonSelect = document.querySelector("#col-src-addon");
    const filterInput = document.querySelector("#col-src-filter");
    const catalogSelect = document.querySelector("#col-src-catalog");
    const genreWrap = document.querySelector("#col-src-genre-wrap");
    const genreSelect = document.querySelector("#col-src-genre");
    const currentAddon = () => withCatalogs[Number(addonSelect.value)] || null;
    const currentCatalog = () => currentAddon()?.catalogs[Number(catalogSelect.value)] || null;
    const fillGenres = () => {
      const options = currentCatalog()?.genreOptions || [];
      genreWrap.hidden = !options.length;
      genreSelect.innerHTML = options.length
        ? `<option value="">${esc(t("Aucun"))}</option>` + options.map((genre) => `<option value="${esc(genre)}">${esc(genre)}</option>`).join("")
        : "";
    };
    const fillCatalogs = () => {
      const addon = currentAddon();
      const search = filterInput.value.trim().toLowerCase();
      const list = (addon?.catalogs || []).filter((catalog) => !search || `${catalog.name} ${catalog.type}`.toLowerCase().includes(search));
      catalogSelect.innerHTML =
        list.map((catalog) => `<option value="${addon.catalogs.indexOf(catalog)}">${esc(catalog.name)} · ${esc(typeLabel(catalog.type))}</option>`).join("") ||
        `<option value="">${esc(t("Aucun catalogue"))}</option>`;
      fillGenres();
    };
    if (withCatalogs.length) {
      addonSelect.onchange = fillCatalogs;
      filterInput.oninput = fillCatalogs;
      catalogSelect.onchange = fillGenres;
      fillCatalogs();
    }

    // TMDB genres depend on the media type
    const tmdbMedia = document.querySelector("#tmdb-media");
    const tmdbGenres = document.querySelector("#tmdb-genres");
    const fillTmdbGenres = () => {
      tmdbGenres.innerHTML = genreList(tmdbMedia.value)
        .map((entry) => `<option value="${entry[0]}">${esc(entry[1])}</option>`)
        .join("");
    };
    tmdbMedia.onchange = fillTmdbGenres;
    fillTmdbGenres();

    showProvider();
    addButton.onclick = () => {
      const provider = providerSelect.value;
      folder.sources = folder.sources || [];
      if (provider === "addon") {
        const addon = currentAddon();
        const catalog = currentCatalog();
        if (!addon || !catalog) return;
        folder.sources.push({
          provider: "addon",
          addonId: addon.addonId,
          addonBaseUrl: addon.addonBaseUrl || null,
          addonName: addon.addonName || null,
          type: catalog.type,
          catalogId: catalog.id,
          catalogName: catalog.name,
          title: catalog.name,
          genre: (!genreWrap.hidden && genreSelect.value) || "None",
        });
      } else if (provider === "tmdb") {
        const media = tmdbMedia.value === "TV" ? "TV" : "MOVIE";
        const genres = [...tmdbGenres.selectedOptions].map((option) => option.value);
        const year = Number(document.querySelector("#tmdb-year").value);
        folder.sources.push({
          provider: "tmdb",
          tmdbSourceType: "DISCOVER",
          title: document.querySelector("#tmdb-title").value.trim() || t("Découverte TMDB"),
          tmdbId: null,
          mediaType: media,
          sortBy: document.querySelector("#tmdb-sort").value,
          filters: {
            withGenres: genres.length ? genres.join(",") : null,
            year: Number.isFinite(year) && year > 0 ? Math.trunc(year) : null,
          },
        });
      } else {
        const listId = Number(document.querySelector("#trakt-id").value);
        if (!Number.isFinite(listId) || listId <= 0) {
          document.querySelector("#trakt-id").reportValidity?.();
          return;
        }
        folder.sources.push({
          provider: "trakt",
          title: document.querySelector("#trakt-title").value.trim() || `${t("Liste Trakt")} ${Math.trunc(listId)}`,
          traktListId: Math.trunc(listId),
          mediaType: document.querySelector("#trakt-media").value === "TV" ? "TV" : "MOVIE",
          sortBy: document.querySelector("#trakt-sort").value.trim() || "rank",
          sortHow: document.querySelector("#trakt-how").value,
        });
      }
      document.querySelector("#dialog").close();
      refreshCollections();
    };
  }
  function saveCollections() {
    run(async () => {
      await api("collections/save", { accountId, profileId, collections: cols });
      toast(t("Collections enregistrées"));
    });
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="settings-top"><p class="muted">${esc(t("Organisez l’accueil et vos collections, comme dans l’application. Les changements rejoignent vos appareils à la prochaine synchronisation."))}</p></div>
    <section class="panel col-panel">
      <div class="col-panel-head"><div><h3>${esc(t("Catalogues d’accueil"))}</h3><p class="muted">${esc(t("Une ligne par catalogue, dans l’ordre de l’accueil."))}</p></div>${homeEmpty ? "" : `<button id="col-home-save" class="primary">${esc(t("Enregistrer l’ordre"))}</button>`}</div>
      ${homeEmpty
        ? `<p class="col-warn">${esc(t("Aucun réglage d’accueil synchronisé pour ce profil. Organisez l’ordre des catalogues depuis l’application Nuvio ou le site officiel, puis rechargez cette page."))}</p>`
        : `<label class="check-label col-hide"><input type="checkbox" id="col-hide-unreleased" ${home.hide ? "checked" : ""}>${esc(t("Masquer les contenus non encore sortis"))}</label>
      <div id="col-home-list" class="col-home-list"></div>`}
    </section>
    <section class="panel col-panel">
      <div class="col-panel-head"><div><h3>${esc(t("Collections"))}</h3><p class="muted">${esc(t("Rangées personnalisées : dossiers et sources."))}</p></div><div class="actions"><button id="col-new-btn">${esc(t("＋ Collection"))}</button><button id="col-save" class="primary">${esc(t("Enregistrer les collections"))}</button></div></div>
      <div id="col-collections" class="col-collections"></div>
    </section>`;

  const hideToggle = container.querySelector("#col-hide-unreleased");
  if (hideToggle) hideToggle.onchange = (event) => (home.hide = event.target.checked);
  container.querySelector("#col-home-save")?.addEventListener("click", saveHome);
  container.querySelector("#col-new-btn").onclick = createCollection;
  container.querySelector("#col-save").onclick = saveCollections;
  if (!homeEmpty) paintHome();
  paintCollections();
}
