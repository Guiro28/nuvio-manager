const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const duration = (minutes) => {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  return hours ? `${hours} h ${rest ? rest + " min" : ""}` : `${rest} min`;
};
const date = (value) =>
  value ? new Date(value).toLocaleString("fr-FR") : "Aucune activité";
const relativeDate = (value) => {
  if (!value) return "Date inconnue";
  const elapsed = new Date(value).getTime() - Date.now();
  const units = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];
  const [unit, size] = units.find(([, duration]) => Math.abs(elapsed) >= duration) || ["minute", 60 * 1000];
  return new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" }).format(Math.round(elapsed / size), unit);
};
const sourceLabel = (source) =>
  ({ nuvio: "Nuvio", trakt: "Trakt", simkl: "Simkl" })[source] || source;
const playbackTime = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export async function renderStatistics(container, { api, run, openDialog }) {
  container.innerHTML = `<section id="stats-now-playing" class="panel stats-now-playing" aria-live="polite"></section><div class="title-row"><div><h1>Statistiques</h1><p class="muted">Comparez l’activité et les habitudes de visionnage de tous les profils.</p></div><div class="stats-controls"><div class="stats-profile-filter"><span class="stats-control-label">Profils</span><details id="stats-profile-menu" class="stats-profile-menu"><summary><span id="stats-profile-summary">Tous les profils</span><span class="stats-profile-chevron" aria-hidden="true">⌄</span></summary><div class="stats-profile-popover"><div class="stats-profile-actions"><button type="button" id="stats-select-all">Tout sélectionner</button><button type="button" id="stats-select-none" class="quiet">Tout désélectionner</button></div><div id="stats-profile-list" class="stats-profile-list" role="group" aria-label="Profils à comparer"></div></div></details></div><label>Période<select id="stats-days"><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">1 an</option><option value="0">Tout l’historique</option></select></label><button id="stats-refresh">Actualiser</button></div></div><p id="stats-status" role="status">Chargement des historiques…</p><div id="stats-view"></div>`;
  const $ = (selector) => container.querySelector(selector);
  const mediaDetails = new Map();
  const profileDetails = new Map();
  let detailSequence = 0;
  let currentData = null;
  const registerMedia = (item) => {
    const id = `media-${++detailSequence}`;
    mediaDetails.set(id, item);
    return id;
  };
  const selectedProfiles = () => [...$("#stats-profile-list").querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
  const updateProfileSummary = () => {
    const boxes = [...$("#stats-profile-list").querySelectorAll('input[type="checkbox"]')],
      selected = boxes.filter((input) => input.checked),
      summary = $("#stats-profile-summary");
    if (!boxes.length) summary.textContent = "Tous les profils";
    else if (!selected.length) summary.textContent = "Aucun profil";
    else if (selected.length === boxes.length) summary.textContent = `Tous les profils (${boxes.length})`;
    else if (selected.length === 1) summary.textContent = selected[0].dataset.profileName;
    else summary.textContent = `${selected.length} profils sélectionnés`;
  };
  const updateProfileOptions = (profiles) => {
    const list = $("#stats-profile-list"), previous = new Set(selectedProfiles());
    const firstLoad = !list.querySelector('input[type="checkbox"]');
    list.innerHTML = profiles.map((profile) => `<label class="stats-profile-option"><input type="checkbox" value="${esc(profile.ref)}" data-profile-name="${esc(profile.profileName)}" ${firstLoad || previous.has(profile.ref) ? "checked" : ""}><span><strong>${esc(profile.profileName)}</strong><small>${esc(profile.accountName)}</small></span></label>`).join("") || '<p class="muted">Aucun profil disponible.</p>';
    updateProfileSummary();
  };
  async function load(force = false) {
    $("#stats-status").textContent = "Calcul des statistiques…";
    $("#stats-refresh").disabled = true;
    try {
      const params = new URLSearchParams({ days: $("#stats-days").value });
      const profiles = selectedProfiles();
      const hasProfileOptions = Boolean($("#stats-profile-list").querySelector('input[type="checkbox"]'));
      if (hasProfileOptions) params.set("profiles", profiles.length ? profiles.join(",") : "__none__");
      if (force) params.set("refresh", Date.now());
      const data = await api(`statistics?${params}`);
      if (!container.isConnected) return;
      updateProfileOptions(data.availableProfiles || []);
      render(data);
      await loadNowPlaying();
      if (!container.isConnected) return;
      $("#stats-status").textContent = `Mis à jour le ${date(data.generatedAt)} · données en consultation`;
    } finally {
      if (container.isConnected) $("#stats-refresh").disabled = false;
    }
  }
  function render(data) {
    currentData = data;
    mediaDetails.clear();
    profileDetails.clear();
    detailSequence = 0;
    data.profiles.forEach((profile) => profileDetails.set(profile.ref, profile));
    const rankings = data.rankings || {
      watchedSeries: data.top.filter((item) => item.kind !== "movie").slice(0, 5),
      popularSeries: data.top.filter((item) => item.kind !== "movie").slice(0, 5),
      watchedMovies: data.top.filter((item) => item.kind === "movie").slice(0, 5),
      popularMovies: data.top.filter((item) => item.kind === "movie").slice(0, 5),
    };
    const activeProfiles = [...data.profiles].sort((a, b) => b.plays - a.plays);
    const recentItems = [...new Map(
      data.recent.map((item) => [
        `${item.contentId}:${item.season ?? ""}:${item.episode ?? ""}`,
        item,
      ]),
    ).values()];
    $("#stats-view").innerHTML = `
      <section class="stats-metrics">
        ${metric("Profils comparés", data.totals.profiles)}
        ${metric("Lectures", data.totals.plays)}
        ${metric("Titres uniques", data.totals.uniqueTitles)}
        ${metric("Temps suivi estimé", duration(data.totals.trackedMinutes))}
      </section>
      <section class="panel stats-section"><div class="section-heading"><div><h2>Activité quotidienne</h2><p class="muted">Lectures terminées par jour, toutes sources confondues.</p></div><div class="timeline-legend" aria-label="Légende"><span><i class="movie"></i> Films</span><span><i class="series"></i> Séries</span></div></div>${timelineChart(data.timeline)}</section>
      <section class="stats-dashboard-grid">
        ${rankingCard("Séries les plus regardées", rankings.watchedSeries, "Lectures", "plays")}
        ${rankingCard("Séries les plus populaires", rankings.popularSeries, "Profils", "profiles")}
        ${rankingCard("Films les plus regardés", rankings.watchedMovies, "Lectures", "plays")}
        ${rankingCard("Films les plus populaires", rankings.popularMovies, "Profils", "profiles")}
        ${sourceCard(data.sources || [])}
        ${profileRankingCard(activeProfiles)}
      </section>
      ${recentShelf(recentItems.slice(0, 20))}
      <p class="footer-note">Le temps suivi est estimé à partir de la progression Nuvio et de la durée des lectures Trakt et Simkl. Une durée moyenne est utilisée lorsque le service ne fournit pas cette information.</p>`;
    bindRankingPreviews();
    bindRecentShelf();
    bindDetailTriggers();
  }
  async function loadNowPlaying() {
    const target = $("#stats-now-playing");
    if (!target) return;
    const result = await api("statistics/now-playing");
    if (!target.isConnected) return;
    mediaDetails.forEach((_, id) => {
      if (id.startsWith("now-playing-")) mediaDetails.delete(id);
    });
    const items = result.items || [];
    target.innerHTML = `<div class="stats-now-playing-heading"><div><h2>Lecture en cours</h2><p class="muted">Progression synchronisée par Nuvio.</p></div><small>${items.length ? `${items.length} lecture${items.length > 1 ? "s" : ""}` : ""}</small></div>${items.length ? `<div class="stats-now-playing-grid">${items.map((item, index) => {
      const id = `now-playing-${index}-${item.ref}`;
      mediaDetails.set(id, item);
      const title = mediaTitle(item);
      const poster = item?.metadata?.poster;
      const background = backdrop(item);
      const percent = Math.max(0, Math.min(100, item.duration ? (item.position / item.duration) * 100 : 0));
      const episode = item.kind === "episode" && item.season != null
        ? `Saison ${item.season} · Épisode ${item.episode}`
        : item?.metadata?.year || "Film";
      const avatar = item.avatarUrl
        ? `<img src="${esc(item.avatarUrl)}" alt="" referrerpolicy="no-referrer">`
        : `<span>${esc(item.profileName?.trim()?.slice(0, 1)?.toUpperCase() || "●")}</span>`;
      return `<article class="stats-now-playing-item" tabindex="0" role="button" aria-label="Afficher les détails de ${esc(title)}" data-stats-media="${esc(id)}">${background ? `<img class="stats-card-bg" src="${esc(background)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}<div class="stats-now-playing-overlay"></div><div class="stats-now-playing-content">${poster ? `<img class="stats-now-playing-poster" src="${esc(poster)}" alt="Jaquette de ${esc(title)}" loading="lazy" referrerpolicy="no-referrer">` : '<span class="stats-now-playing-poster" aria-hidden="true">▶</span>'}<div class="stats-now-playing-info"><div class="stats-now-playing-profile">${avatar}<span>${esc(item.profileName)}</span></div><h3>${esc(title)}</h3><p>${esc(episode)}</p><progress max="100" value="${percent}" aria-label="Progression de ${esc(title)}"></progress><div class="stats-now-playing-times"><span>${esc(playbackTime(item.position))}</span><span>${esc(playbackTime(item.duration))}</span></div></div></div></article>`;
    }).join("")}</div>` : '<p class="empty-inline">Aucune lecture en cours.</p>'}`;
    target.querySelectorAll("[data-stats-media]").forEach((element) => {
      const show = () => {
        const item = mediaDetails.get(element.dataset.statsMedia);
        if (item) showMediaDetail(item);
      };
      element.addEventListener("click", show);
      element.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        show();
      });
    });
  }
  const metric = (label, value) => `<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
  const mediaTitle = (item) => item?.metadata?.title || item?.title || item?.contentId || "Contenu inconnu";
  const backdrop = (item) => item?.metadata?.backdrop || item?.metadata?.poster || "";
  const cardBackground = (item) => backdrop(item) ? `<img class="stats-card-bg" src="${esc(backdrop(item))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
  const leadPoster = (item, round = false) => item?.metadata?.poster
    ? `<img class="stats-lead-image${round ? " round" : ""}" src="${esc(item.metadata.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="stats-lead-image${round ? " round" : ""}">▶</span>`;
  const rankingCard = (title, items, metricLabel, metricKey) => {
    const first = items[0];
    return `<article class="stats-ranking-card stats-preview-card" data-default-poster="${esc(first?.metadata?.poster || "")}" data-default-backdrop="${esc(backdrop(first))}" data-default-title="${esc(mediaTitle(first))}">${cardBackground(first)}<div class="stats-card-content"><header><h2>${esc(title)}</h2><small>${esc(metricLabel)}</small></header>${items.length ? `<div class="stats-ranking-body">${leadPoster(first)}<ol>${items.map((item, index) => previewRow(item, index, item[metricKey] || 0)).join("")}</ol></div>` : '<p class="stats-card-empty">Aucune donnée sur cette période.</p>'}</div></article>`;
  };
  const sourceLogo = (source) => ({
    nuvio: "/assets/nuvio-manager-logo.png",
    trakt: "/trakt.png",
    simkl: "/simkl.webp",
  })[source] || "";
  const sourceCard = (sources) => {
    const first = sources[0], firstLogo = sourceLogo(first?.source);
    const background = firstLogo ? `<img class="stats-card-bg" src="${esc(firstLogo)}" alt="" loading="lazy">` : "";
    const lead = firstLogo
      ? `<img class="stats-lead-image stats-source-logo" src="${esc(firstLogo)}" alt="Logo ${esc(sourceLabel(first.source))}" loading="lazy">`
      : '<span class="stats-lead-image stats-source-logo" aria-hidden="true">●</span>';
    return `<article class="stats-ranking-card stats-preview-card stats-source-preview" data-default-poster="${esc(firstLogo)}" data-default-backdrop="${esc(firstLogo)}" data-default-title="${esc(sourceLabel(first?.source || ""))}">${background}<div class="stats-card-content"><header><h2>Sources les plus actives</h2><small>Lectures</small></header>${sources.length ? `<div class="stats-ranking-body">${lead}<ol>${sources.slice(0, 5).map((source, index) => {
      const logo = sourceLogo(source.source), label = sourceLabel(source.source);
      return `<li tabindex="0" data-preview-poster="${esc(logo)}" data-preview-backdrop="${esc(logo)}" data-preview-title="${esc(label)}" title="${source.movies} films · ${source.series} épisodes · ${source.profiles} profil(s)"><b>${index + 1}</b><span>${esc(label)}</span><strong>${source.plays}</strong></li>`;
    }).join("")}</ol></div>` : '<p class="stats-card-empty">Aucune source active.</p>'}</div></article>`;
  };
  const recentShelf = (items) => {
    const first = items[0];
    return `<section class="panel stats-recent-shelf" aria-labelledby="stats-recent-title" data-default-backdrop="${esc(backdrop(first))}">
    ${cardBackground(first)}
    <div class="stats-recent-overlay"></div>
    <div class="stats-recent-content"><header class="stats-recent-header">
      <div><h2 id="stats-recent-title">Derniers visionnages</h2><p class="muted"><span data-recent-count>${items.length}</span> élément${items.length > 1 ? "s" : ""} récent${items.length > 1 ? "s" : ""}</p></div>
      <div class="stats-recent-tools">
        <div class="stats-recent-filters" role="group" aria-label="Filtrer les derniers visionnages">
          <button type="button" class="active" data-recent-filter="all">Tous</button>
          <button type="button" data-recent-filter="movie">Films</button>
          <button type="button" data-recent-filter="episode">Séries</button>
        </div>
        <div class="stats-recent-arrows">
          <button type="button" data-recent-scroll="-1" aria-label="Faire défiler vers la gauche">‹</button>
          <button type="button" data-recent-scroll="1" aria-label="Faire défiler vers la droite">›</button>
        </div>
      </div>
    </header>
    ${items.length ? `<div class="stats-recent-track">${items.map((item) => {
      const detailId = registerMedia(item);
      const title = mediaTitle(item);
      const poster = item?.metadata?.poster;
      const subtitle = item.kind === "movie"
        ? item?.metadata?.year || "Film"
        : item.season != null ? `Saison ${item.season} · Épisode ${item.episode}` : "Série";
      return `<article class="stats-recent-tile" tabindex="0" role="button" aria-label="Afficher les détails de ${esc(title)}" data-stats-media="${detailId}" data-recent-kind="${esc(item.kind)}" data-preview-backdrop="${esc(backdrop(item))}">
        <div class="stats-recent-poster">${poster ? `<img src="${esc(poster)}" alt="Jaquette de ${esc(title)}" loading="lazy" referrerpolicy="no-referrer">` : '<span aria-hidden="true">▶</span>'}<small>${esc(relativeDate(item.at))}</small></div>
        <strong title="${esc(title)}">${esc(title)}</strong>
        <span>${esc(subtitle)}</span>
        <span>${esc(item.profileName || "Profil inconnu")} · ${esc(sourceLabel(item.source))}</span>
      </article>`;
    }).join("")}</div>` : '<p class="empty-inline">Aucun visionnage récent sur cette période.</p>'}
    </div>
  </section>`;
  };
  const previewRow = (item, index, value) => {
    const detailId = registerMedia(item);
    return `<li tabindex="0" role="button" aria-label="Afficher les détails de ${esc(mediaTitle(item))}" data-stats-media="${detailId}" data-preview-poster="${esc(item?.metadata?.poster || "")}" data-preview-backdrop="${esc(backdrop(item))}" data-preview-title="${esc(mediaTitle(item))}"><b>${index + 1}</b><span title="${esc(mediaTitle(item))}">${esc(mediaTitle(item))}</span><strong>${esc(value)}</strong></li>`;
  };
  const profileRankingCard = (profiles) => {
    const first = profiles[0];
    const background = first?.avatarUrl ? `<img class="stats-card-bg" src="${esc(first.avatarUrl)}" alt="" referrerpolicy="no-referrer">` : "";
    const fallback = first?.profileName?.trim()?.slice(0, 1)?.toUpperCase() || "●";
    const lead = first?.avatarUrl ? `<img class="stats-lead-image round" src="${esc(first.avatarUrl)}" alt="Avatar de ${esc(first.profileName)}" referrerpolicy="no-referrer">` : `<span class="stats-lead-image round">${esc(fallback)}</span>`;
    return `<article class="stats-ranking-card stats-profile-ranking-card stats-preview-card stats-profile-preview" data-default-poster="${esc(first?.avatarUrl || "")}" data-default-backdrop="${esc(first?.avatarUrl || "")}" data-default-title="${esc(first?.profileName || "")}">${background}<div class="stats-card-content"><header><h2>Profils les plus actifs</h2><small>Lectures</small></header>${profiles.length ? `<div class="stats-ranking-body">${lead}<ol>${profiles.slice(0, 5).map((profile, index) => `<li tabindex="0" role="button" aria-label="Afficher les détails du profil ${esc(profile.profileName)}" data-stats-profile="${esc(profile.ref)}" data-preview-poster="${esc(profile.avatarUrl || "")}" data-preview-backdrop="${esc(profile.avatarUrl || "")}" data-preview-title="${esc(profile.profileName)}"><b>${index + 1}</b><span>${esc(profile.profileName)}</span><strong>${esc(profile.plays || 0)}</strong></li>`).join("")}</ol></div>` : '<p class="stats-card-empty">Aucun profil.</p>'}</div></article>`;
  };
  const safeImageUrl = (value) => {
    if (!String(value || "").trim()) return "";
    try {
      const url = new URL(value, location.origin);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const setCardPreview = (card, values) => {
    const poster = safeImageUrl(values.poster),
      background = safeImageUrl(values.backdrop || values.poster);
    const isSource = card.classList.contains("stats-source-preview"),
      isProfile = card.classList.contains("stats-profile-preview"),
      leadClass = isSource ? "stats-lead-image stats-source-logo" : isProfile ? "stats-lead-image round" : "stats-lead-image",
      fallback = isProfile ? String(values.title || "").trim().slice(0, 1).toUpperCase() || "●" : "▶";
    let lead = card.querySelector(".stats-lead-image");
    if (poster && lead?.tagName !== "IMG") {
      const image = document.createElement("img");
      image.className = leadClass;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      lead?.replaceWith(image);
      lead = image;
    } else if (!poster && lead?.tagName === "IMG") {
      const placeholder = document.createElement("span");
      placeholder.className = leadClass;
      placeholder.textContent = fallback;
      lead.replaceWith(placeholder);
      lead = placeholder;
    }
    if (!poster && lead?.tagName !== "IMG") {
      lead.className = leadClass;
      lead.textContent = fallback;
    }
    if (poster && lead?.tagName === "IMG") {
      lead.src = poster;
      lead.alt = values.title ? `${isProfile ? "Avatar" : "Jaquette"} de ${values.title}` : "";
    }
    let bg = card.querySelector(".stats-card-bg");
    if (background && !bg) {
      bg = document.createElement("img");
      bg.className = "stats-card-bg";
      bg.alt = "";
      bg.referrerPolicy = "no-referrer";
      card.prepend(bg);
    }
    if (bg) {
      bg.hidden = !background;
      if (background) bg.src = background;
    }
  };
  const bindRankingPreviews = () => container.querySelectorAll(".stats-preview-card").forEach((card) => {
    const defaults = {
      poster: card.dataset.defaultPoster,
      backdrop: card.dataset.defaultBackdrop,
      title: card.dataset.defaultTitle,
    };
    card.querySelectorAll("[data-preview-poster]").forEach((row) => {
      const show = () => setCardPreview(card, {
        poster: row.dataset.previewPoster,
        backdrop: row.dataset.previewBackdrop,
        title: row.dataset.previewTitle,
      });
      row.addEventListener("mouseenter", show);
      row.addEventListener("focus", show);
    });
    card.addEventListener("mouseleave", () => setCardPreview(card, defaults));
    card.addEventListener("focusout", (event) => {
      if (!card.contains(event.relatedTarget)) setCardPreview(card, defaults);
    });
  });
  const bindRecentShelf = () => {
    const shelf = container.querySelector(".stats-recent-shelf");
    if (!shelf) return;
    const track = shelf.querySelector(".stats-recent-track");
    const tiles = [...shelf.querySelectorAll(".stats-recent-tile")];
    const count = shelf.querySelector("[data-recent-count]");
    let defaultBackdrop = shelf.dataset.defaultBackdrop;
    const showBackdrop = (value) => {
      const source = safeImageUrl(value);
      let image = shelf.querySelector(".stats-card-bg");
      if (source && !image) {
        image = document.createElement("img");
        image.className = "stats-card-bg";
        image.alt = "";
        image.referrerPolicy = "no-referrer";
        shelf.prepend(image);
      }
      if (!image) return;
      image.hidden = !source;
      if (source) image.src = source;
    };
    tiles.forEach((tile) => {
      const preview = () => showBackdrop(tile.dataset.previewBackdrop);
      tile.addEventListener("mouseenter", preview);
      tile.addEventListener("focus", preview);
    });
    shelf.addEventListener("mouseleave", () => showBackdrop(defaultBackdrop));
    shelf.addEventListener("focusout", (event) => {
      if (!shelf.contains(event.relatedTarget)) showBackdrop(defaultBackdrop);
    });
    shelf.querySelectorAll("[data-recent-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.recentFilter;
        shelf.querySelectorAll("[data-recent-filter]").forEach((item) => item.classList.toggle("active", item === button));
        tiles.forEach((tile) => { tile.hidden = filter !== "all" && tile.dataset.recentKind !== filter; });
        defaultBackdrop = tiles.find((tile) => !tile.hidden)?.dataset.previewBackdrop || "";
        showBackdrop(defaultBackdrop);
        if (count) count.textContent = tiles.filter((tile) => !tile.hidden).length;
        track?.scrollTo({ left: 0, behavior: "smooth" });
      });
    });
    shelf.querySelectorAll("[data-recent-scroll]").forEach((button) => {
      button.addEventListener("click", () => track?.scrollBy({
        left: Number(button.dataset.recentScroll) * Math.max(320, track.clientWidth * .75),
        behavior: "smooth",
      }));
    });
  };
  const mediaKind = (item) => item?.kind === "movie" ? "Film" : "Série";
  const fact = (label, value) => value === null || value === undefined || value === ""
    ? ""
    : `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  const matchingAggregate = (item) => [
    ...(currentData?.top || []),
    ...Object.values(currentData?.rankings || {}).flat(),
  ]
    .find((candidate) => candidate.contentId === item.contentId && candidate.kind === item.kind);
  const showMediaDetail = (item) => {
    const aggregate = matchingAggregate(item) || {};
    const detail = {
      ...aggregate,
      ...item,
      metadata: item.metadata || aggregate.metadata || null,
      profileDetails: item.profileDetails || aggregate.profileDetails || [],
      sources: item.sources || aggregate.sources || (item.source ? [item.source] : []),
    };
    const metadata = detail.metadata || {};
    const title = mediaTitle(detail);
    const poster = safeImageUrl(metadata.poster);
    const background = safeImageUrl(metadata.backdrop || metadata.poster);
    const tmdbUrl = safeImageUrl(metadata.url);
    const episode = detail.kind === "episode" && (detail.season != null || detail.episode != null)
      ? `S${String(detail.season ?? 0).padStart(2, "0")} E${String(detail.episode ?? 0).padStart(2, "0")}`
      : "";
    const profiles = detail.profileDetails?.length
      ? detail.profileDetails
      : detail.profileName ? [{ profileName: detail.profileName, plays: 1 }] : [];
    openDialog?.(`<article class="stats-detail-modal stats-media-modal">
      ${background ? `<img class="stats-detail-backdrop" src="${esc(background)}" alt="" referrerpolicy="no-referrer">` : ""}
      <div class="stats-detail-scrim"></div>
      <div class="stats-detail-content">
        <div class="stats-detail-visual">${poster ? `<img src="${esc(poster)}" alt="Jaquette de ${esc(title)}" referrerpolicy="no-referrer">` : '<span aria-hidden="true">▶</span>'}</div>
        <div class="stats-detail-main">
          <p class="stats-detail-kicker">${esc(mediaKind(detail))}${episode ? ` · ${esc(episode)}` : ""}</p>
          <h2>${esc(title)}</h2>
          ${metadata.originalTitle && metadata.originalTitle !== title ? `<p class="stats-detail-original">${esc(metadata.originalTitle)}</p>` : ""}
          <p class="stats-detail-overview">${esc(metadata.overview || "Aucun synopsis disponible pour ce titre.")}</p>
          <dl class="stats-detail-facts">
            ${fact("Année", metadata.year)}
            ${fact("Note TMDB", metadata.rating != null ? `${metadata.rating} / 10` : "")}
            ${fact("Lectures", detail.plays)}
            ${fact("Profils", detail.profiles || profiles.length || "")}
            ${detail.kind === "episode" ? fact("Saisons vues", detail.seasonCount) : ""}
            ${detail.kind === "episode" ? fact("Épisodes vus", detail.episodeCount) : ""}
            ${fact("Dernière activité", detail.lastActivity || detail.at ? date(detail.lastActivity || detail.at) : "")}
          </dl>
          ${metadata.genres?.length ? `<p class="stats-detail-tags">${metadata.genres.map((genre) => `<span>${esc(genre)}</span>`).join("")}</p>` : ""}
          ${detail.sources?.length ? `<p class="stats-detail-sources"><strong>Sources :</strong> ${detail.sources.map(sourceLabel).map(esc).join(" · ")}</p>` : ""}
          ${profiles.length ? `<section class="stats-detail-list"><h3>Profils concernés</h3>${profiles.map((profile) => `<div><span>${esc(profile.profileName || profile.ref || "Profil")}</span><strong>${esc(profile.plays)} lecture${profile.plays > 1 ? "s" : ""}</strong></div>`).join("")}</section>` : ""}
          <p class="stats-detail-id">Identifiant : ${esc(detail.contentId || "Inconnu")}</p>
        </div>
      </div>
      <div class="dialog-actions">${tmdbUrl ? `<a class="button" href="${esc(tmdbUrl)}" target="_blank" rel="noopener noreferrer">Voir sur TMDB</a>` : ""}<button type="button" data-close>Fermer</button></div>
    </article>`);
  };
  const showProfileDetail = (profile) => {
    const avatar = safeImageUrl(profile.avatarUrl);
    const recent = (currentData?.recent || []).filter((item) => item.ref === profile.ref).slice(0, 6);
    const overlaps = (currentData?.overlap || [])
      .filter((item) => item.left === profile.ref || item.right === profile.ref)
      .map((item) => ({
        ...item,
        other: profileDetails.get(item.left === profile.ref ? item.right : item.left)?.profileName || "Autre profil",
      }))
      .sort((a, b) => b.similarity - a.similarity);
    openDialog?.(`<article class="stats-detail-modal stats-profile-modal">
      <header class="stats-profile-detail-header">
        <div class="stats-profile-detail-avatar">${avatar ? `<img src="${esc(avatar)}" alt="Avatar de ${esc(profile.profileName)}" referrerpolicy="no-referrer">` : '<span aria-hidden="true">●</span>'}</div>
        <div><p class="stats-detail-kicker">Profil</p><h2>${esc(profile.profileName)}</h2><p>${esc(profile.accountName)}</p></div>
      </header>
      <dl class="stats-detail-facts stats-profile-facts">
        ${fact("Lectures", profile.plays)}
        ${fact("Titres uniques", profile.uniqueTitles)}
        ${fact("Films", profile.movies)}
        ${fact("Épisodes", profile.episodes)}
        ${fact("Temps suivi estimé", duration(profile.trackedMinutes))}
        ${fact("Dernière activité", date(profile.lastActivity))}
      </dl>
      ${profile.sources?.length ? `<p class="stats-detail-tags">${profile.sources.map((source) => `<span>${esc(sourceLabel(source))}</span>`).join("")}</p>` : ""}
      ${recent.length ? `<section class="stats-profile-recent"><h3>Activité récente</h3><div>${recent.map((item) => `<article>${item.metadata?.poster ? `<img src="${esc(safeImageUrl(item.metadata.poster))}" alt="" referrerpolicy="no-referrer">` : '<span class="stats-mini-poster" aria-hidden="true">▶</span>'}<span><strong>${esc(mediaTitle(item))}</strong><small>${esc(mediaKind(item))}${item.season != null ? ` · S${item.season} E${item.episode}` : ""}<br>${esc(date(item.at))}</small></span></article>`).join("")}</div></section>` : ""}
      ${overlaps.length ? `<section class="stats-detail-list"><h3>Historique partagé</h3>${overlaps.map((item) => `<div><span>${esc(item.other)}</span><strong>${item.common} titre${item.common > 1 ? "s" : ""} · ${item.similarity} %</strong></div>`).join("")}</section>` : ""}
      <div class="dialog-actions"><button type="button" data-close>Fermer</button></div>
    </article>`);
  };
  const bindDetailTriggers = () => {
    const bind = (element, action) => {
      element.addEventListener("click", action);
      element.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        action();
      });
    };
    container.querySelectorAll("[data-stats-media]").forEach((element) => bind(element, () => {
      const item = mediaDetails.get(element.dataset.statsMedia);
      if (item) showMediaDetail(item);
    }));
    container.querySelectorAll("[data-stats-profile]").forEach((element) => bind(element, () => {
      const profile = profileDetails.get(element.dataset.statsProfile);
      if (profile) showProfileDetail(profile);
    }));
  };
  const timelineChart = (items) => {
    const values = items.map((item) => Number(item.count) || 0),
      maxDay = Math.max(1, ...values),
      step = items.length > 60 ? 18 : 27,
      barWidth = items.length > 60 ? 11 : 16,
      left = 50,
      width = Math.max(720, items.length * step + left + 22),
      baseline = 190,
      plotHeight = 142,
      labelEvery = items.length > 60 ? 10 : 5,
      totalPeriod = values.reduce((sum, value) => sum + value, 0),
      average = items.length ? totalPeriod / items.length : 0,
      peakIndex = values.indexOf(maxDay),
      peak = items[peakIndex],
      scale = (value) => value / maxDay,
      compact = (value) => new Intl.NumberFormat("fr-FR", {
        notation: "compact",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
      }).format(Math.round(value)),
      shortDate = (value) => {
        const parsed = new Date(`${value}T00:00:00`);
        return Number.isNaN(parsed.getTime())
          ? value
          : parsed.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      };
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = maxDay * ratio;
      const y = baseline - plotHeight * ratio;
      return `<g class="timeline-gridline"><line x1="${left - 4}" y1="${y}" x2="${width - 12}" y2="${y}"></line><text x="${left - 10}" y="${y + 3}">${compact(value)}</text></g>`;
    }).join("");
    const bars = items.map((item, index) => {
      const total = Number(item.count) || 0,
        hasBreakdown = Number.isFinite(Number(item.movies)) && Number.isFinite(Number(item.series)),
        movies = hasBreakdown ? Number(item.movies) : total,
        series = hasBreakdown ? Number(item.series) : 0,
        breakdownTotal = movies + series || total,
        totalHeight = scale(total) * plotHeight,
        movieHeight = total ? totalHeight * (movies / breakdownTotal) : 0,
        seriesHeight = total ? totalHeight * (series / breakdownTotal) : 0,
        x = left + index * step,
        title = `${shortDate(item.date)} · ${total} lecture${total > 1 ? "s" : ""} · ${movies} film${movies > 1 ? "s" : ""} · ${series} épisode${series > 1 ? "s" : ""}`,
        showValue = total && (index === peakIndex || total >= average * 2 || items.length <= 14);
      return `<g class="timeline-day" tabindex="0" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${total ? `${seriesHeight ? `<rect class="timeline-series" x="${x}" y="${baseline - totalHeight}" width="${barWidth}" height="${seriesHeight}" rx="3"></rect>` : ""}${movieHeight ? `<rect class="timeline-movie" x="${x}" y="${baseline - movieHeight}" width="${barWidth}" height="${movieHeight}" rx="3"></rect>` : ""}${showValue ? `<text class="timeline-total" x="${x + barWidth / 2}" y="${Math.max(16, baseline - totalHeight - 7)}">${compact(total)}</text>` : ""}` : `<rect class="timeline-empty" x="${x}" y="${baseline - 2}" width="${barWidth}" height="2" rx="1"></rect>`}${index % labelEvery === 0 || index === items.length - 1 ? `<text class="timeline-date" x="${x + barWidth / 2}" y="${baseline + 21}">${esc(shortDate(item.date))}</text>` : ""}</g>`;
    }).join("");
    return `<div class="timeline-summary"><div><span>Total de la période</span><strong>${compact(totalPeriod)} lectures</strong></div><div><span>Moyenne quotidienne</span><strong>${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(average)}</strong></div><div><span>Jour le plus actif</span><strong>${peak ? `${shortDate(peak.date)} · ${compact(maxDay)}` : "Aucune activité"}</strong></div></div><div class="timeline-scroll"><svg class="timeline-chart" style="width:${width}px" viewBox="0 0 ${width} 226" role="img" aria-label="Activité quotidienne : films en jaune et épisodes de séries en rouge.">${ticks}<line class="timeline-axis" x1="${left - 4}" y1="${baseline}" x2="${width - 12}" y2="${baseline}"></line>${bars}</svg></div>`;
  };
  $("#stats-days").onchange = () => run(load);
  $("#stats-profile-list").onchange = (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    updateProfileSummary();
    run(load);
  };
  $("#stats-select-all").onclick = () => {
    $("#stats-profile-list").querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = true; });
    updateProfileSummary();
    run(load);
  };
  $("#stats-select-none").onclick = () => {
    $("#stats-profile-list").querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = false; });
    updateProfileSummary();
    run(load);
  };
  $("#stats-refresh").onclick = () => run(() => load(true));
  await load();
  const nowPlayingTimer = setInterval(() => {
    if (!container.isConnected) {
      clearInterval(nowPlayingTimer);
      return;
    }
    loadNowPlaying().catch(() => {});
  }, 30_000);
}
