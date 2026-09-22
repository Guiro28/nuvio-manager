import { t, getLang } from "./i18n.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const duration = (minutes) => {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  return hours ? `${hours} ${t("unit.h")} ${rest ? rest + " " + t("unit.min") : ""}` : `${rest} ${t("unit.min")}`;
};
const date = (value) =>
  value ? new Date(value).toLocaleString(getLang()) : t("Aucune activité");
const relativeDate = (value) => {
  if (!value) return t("Date inconnue");
  const elapsed = new Date(value).getTime() - Date.now();
  const units = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
  ];
  const [unit, size] = units.find(([, duration]) => Math.abs(elapsed) >= duration) || ["minute", 60 * 1000];
  return new Intl.RelativeTimeFormat(getLang(), { numeric: "auto" }).format(Math.round(elapsed / size), unit);
};
const sourceLabel = (source) =>
  ({ nuvio: "Nuvio", tuvora: "Tuvora", trakt: "Trakt", simkl: "Simkl" })[source] || source;

let statsResizeHandler = null;
let statsOutsideHandler = null;
export async function renderStatistics(container, { api, run, openDialog }) {
  container.innerHTML = `<div class="title-row"><div><h1>${esc(t("Statistiques"))}</h1><p class="muted">${esc(t("Comparez l’activité et les habitudes de visionnage de tous les profils."))}</p></div><div class="stats-controls"><div class="stats-profile-filter"><span class="stats-control-label">${esc(t("Profils"))}</span><details id="stats-profile-menu" class="stats-profile-menu"><summary><span id="stats-profile-summary">${esc(t("Tous les profils"))}</span><span class="stats-profile-chevron" aria-hidden="true">⌄</span></summary><div class="stats-profile-popover"><div class="stats-profile-actions"><button type="button" id="stats-select-all">${esc(t("Tout sélectionner"))}</button><button type="button" id="stats-select-none" class="quiet">${esc(t("Tout désélectionner"))}</button></div><div id="stats-profile-list" class="stats-profile-list" role="group" aria-label="${esc(t("Profils à comparer"))}"></div></div></details></div><label>${esc(t("Période"))}<select id="stats-days"><option value="30">${esc(t("30 jours"))}</option><option value="90">${esc(t("90 jours"))}</option><option value="365">${esc(t("1 an"))}</option><option value="0">${esc(t("Tout l’historique"))}</option><option value="custom">${esc(t("Jours précis…"))}</option></select></label><input type="number" id="stats-days-input" class="stats-days-input" min="1" max="3650" step="1" value="7" hidden aria-label="${esc(t("Nombre de jours"))}"><button id="stats-refresh">${esc(t("Actualiser"))}</button></div></div><p id="stats-status" role="status">${esc(t("Chargement des historiques…"))}</p><div id="stats-view"></div>`;
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
    if (!boxes.length) summary.textContent = t("Tous les profils");
    else if (!selected.length) summary.textContent = t("Aucun profil");
    else if (selected.length === boxes.length) summary.textContent = t("Tous les profils ({n})", { n: boxes.length });
    else if (selected.length === 1) summary.textContent = selected[0].dataset.profileName;
    else summary.textContent = t("{n} profils sélectionnés", { n: selected.length });
  };
  const updateProfileOptions = (profiles) => {
    const list = $("#stats-profile-list"), previous = new Set(selectedProfiles());
    const firstLoad = !list.querySelector('input[type="checkbox"]');
    list.innerHTML = profiles.map((profile) => `<label class="stats-profile-option"><input type="checkbox" value="${esc(profile.ref)}" data-profile-name="${esc(profile.profileName)}" ${firstLoad || previous.has(profile.ref) ? "checked" : ""}><span><strong>${esc(profile.profileName)}</strong><small>${esc(profile.accountName)}</small></span></label>`).join("") || `<p class="muted">${esc(t("Aucun profil disponible."))}</p>`;
    updateProfileSummary();
  };
  async function load(force = false) {
    $("#stats-status").textContent = t("Calcul des statistiques…");
    $("#stats-refresh").disabled = true;
    try {
      const sel = $("#stats-days").value;
      const days = sel === "custom"
        ? Math.max(1, Math.round(Number($("#stats-days-input").value) || 1))
        : sel;
      const params = new URLSearchParams({ days });
      const profiles = selectedProfiles();
      const hasProfileOptions = Boolean($("#stats-profile-list").querySelector('input[type="checkbox"]'));
      if (hasProfileOptions) params.set("profiles", profiles.length ? profiles.join(",") : "__none__");
      if (force) params.set("refresh", Date.now());
      const data = await api(`statistics?${params}`);
      if (!container.isConnected) return;
      updateProfileOptions(data.availableProfiles || []);
      $("#stats-status").textContent = t("Mis à jour le {date} · données en consultation", { date: date(data.generatedAt) });
      render(data);
    } finally {
      if (container.isConnected) $("#stats-refresh").disabled = false;
    }
  }
  function paintTimeline() {
    const host = $("#stats-timeline");
    if (!host || !currentData) return;
    const width = host.clientWidth || host.parentElement?.clientWidth || 900;
    host.innerHTML = timelineChart(currentData.timeline, width);
    bindTimelineTooltip(host);
  }
  const tipAvatar = (info) => {
    const initial = esc((info?.profileName || "").trim().slice(0, 1).toUpperCase() || "•");
    return `<span class="stats-daytip-avatar">${info?.avatarUrl ? `<img src="${esc(info.avatarUrl)}" alt="" referrerpolicy="no-referrer">` : ""}<span>${initial}</span></span>`;
  };
  const dayTipContent = (day) => {
    const dateLabel = new Date(`${day.date}T00:00:00`).toLocaleDateString(getLang(), { weekday: "long", day: "numeric", month: "long" });
    const rows = (day.profiles || [])
      .map((entry) => {
        const info = profileDetails.get(entry.ref);
        return `<li>${tipAvatar(info)}<span class="stats-daytip-name">${esc(info?.profileName || t("Profil"))}</span><strong>${entry.count}</strong></li>`;
      })
      .join("");
    return `<div class="stats-daytip-head"><span>${esc(dateLabel)}</span><span>${day.count} ${esc(t(day.count > 1 ? "lectures" : "lecture"))}</span></div><ul>${rows || `<li class="muted">${esc(t("Aucune lecture"))}</li>`}</ul>`;
  };
  const dayItemCard = (item, index) => {
    const poster = safeImageUrl(item.poster);
    const title = mediaTitle(item);
    const episode = item.kind === "episode" && (item.season != null || item.episode != null)
      ? `S${String(item.season ?? 0).padStart(2, "0")} E${String(item.episode ?? 0).padStart(2, "0")}`
      : "";
    const at = item.at ? new Date(item.at).toLocaleTimeString(getLang(), { hour: "2-digit", minute: "2-digit" }) : "";
    const meta = [item.profileName || t("Profil inconnu"), at].filter(Boolean).join(" · ");
    const logo = sourceLogo(item.source), label = sourceLabel(item.source);
    const source = logo
      ? `<span class="stats-day-source" title="${esc(label)}"><img src="${esc(logo)}" alt="${esc(label)}" loading="lazy"></span>`
      : `<span class="stats-day-source stats-day-source-text" title="${esc(label)}">${esc(label)}</span>`;
    return `<article class="stats-day-item" tabindex="0" role="button" data-day-media="${index}" aria-label="${esc(t("Afficher les détails de {title}", { title }))}">
      <div class="stats-day-poster">${poster ? `<img src="${esc(poster)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span aria-hidden="true">▶</span>'}</div>
      <div class="stats-day-item-main">
        <strong title="${esc(title)}">${esc(title)}</strong>
        ${episode ? `<span class="stats-day-sub">${esc(episode)}</span>` : ""}
        <span class="stats-day-meta">${esc(meta)}</span>
      </div>
      ${source}
    </article>`;
  };
  const dayTabPanel = (items, emptyLabel) =>
    items.length
      ? `<div class="stats-day-list">${items.map((item, index) => dayItemCard(item, index)).join("")}</div>`
      : `<p class="stats-card-empty">${esc(emptyLabel)}</p>`;
  const allProfilesIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
  const dayAvatar = (info) => {
    const url = safeImageUrl(info?.avatarUrl);
    const initial = esc((info?.profileName || "").trim().slice(0, 1).toUpperCase() || "•");
    return url ? `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer">` : `<span>${initial}</span>`;
  };
  const showDayDetail = (day) => {
    const items = day.items || [];
    const dateLabel = new Date(`${day.date}T00:00:00`).toLocaleDateString(getLang(), {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    // Profiles active that day, ordered by their play count (day.profiles is
    // already sorted); "all" is prepended as an aggregate view.
    const order = (day.profiles || []).map((entry) => entry.ref);
    const refs = [...new Set(items.map((item) => item.ref))]
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const state = { ref: "all", kind: null };
    let currentList = [];
    const itemsFor = (ref) => (ref === "all" ? items : items.filter((item) => item.ref === ref));
    openDialog?.(`<article class="stats-detail-modal stats-day-modal">
      <header class="stats-day-header">
        <p class="stats-detail-kicker">${esc(t("Activité du jour"))}</p>
        <h2>${esc(dateLabel)}</h2>
        <p class="muted">${day.count} ${esc(t(day.count > 1 ? "lectures" : "lecture"))}</p>
      </header>
      <div class="stats-day-profiles" role="tablist" aria-label="${esc(t("Profils"))}"></div>
      <div class="stats-day-tabs" role="tablist"></div>
      <div class="stats-day-body"></div>
      <div class="dialog-actions"><button type="button" data-close>${esc(t("Fermer"))}</button></div>
    </article>`);
    const dialog = document.getElementById("dialog");
    if (!dialog) return;
    const profilesRow = dialog.querySelector(".stats-day-profiles");
    const tabsRow = dialog.querySelector(".stats-day-tabs");
    const body = dialog.querySelector(".stats-day-body");
    const chip = (ref) => {
      const info = ref === "all" ? null : profileDetails.get(ref);
      const name = ref === "all" ? t("Tous") : info?.profileName || t("Profil");
      const active = ref === state.ref;
      const avatar = ref === "all"
        ? `<span class="stats-day-profile-icon">${allProfilesIcon}</span>`
        : dayAvatar(info);
      return `<button type="button" role="tab" class="stats-day-profile${active ? " active" : ""}" data-day-profile="${esc(ref)}" aria-selected="${active}" title="${esc(name)}"><span class="stats-day-profile-av">${avatar}<span class="stats-day-profile-count">${itemsFor(ref).length}</span></span><span class="stats-day-profile-name">${esc(name)}</span></button>`;
    };
    const renderChips = () => {
      profilesRow.innerHTML = ["all", ...refs].map(chip).join("");
    };
    const tab = (kind, count, active) =>
      `<button type="button" role="tab" class="${active ? "active" : ""}" data-day-tab="${kind}" aria-selected="${active}">${esc(kind === "movie" ? t("Films") : t("Séries"))} <span>${count}</span></button>`;
    const renderTabsAndBody = () => {
      const scoped = itemsFor(state.ref);
      const movies = scoped.filter((item) => item.kind === "movie");
      const series = scoped.filter((item) => item.kind !== "movie");
      if (!state.kind) state.kind = movies.length || !series.length ? "movie" : "episode";
      if (state.kind === "movie" && !movies.length && series.length) state.kind = "episode";
      if (state.kind === "episode" && !series.length && movies.length) state.kind = "movie";
      tabsRow.innerHTML = tab("movie", movies.length, state.kind === "movie") + tab("episode", series.length, state.kind === "episode");
      currentList = state.kind === "movie" ? movies : series;
      body.innerHTML = dayTabPanel(currentList, state.kind === "movie" ? t("Aucun film ce jour-là.") : t("Aucun épisode ce jour-là."));
    };
    const openMedia = (item) => {
      // Aggregate every play of this title across all days, profiles and sources
      // (the timeline is the fullest client-side dataset), so the sheet shows the
      // combined count instead of only the clicked event's single source.
      const events = (currentData?.timeline || [])
        .flatMap((entry) => entry.items || [])
        .filter((it) => it.contentId === item.contentId && it.kind === item.kind);
      const byRef = new Map();
      const sources = new Set(), seasons = new Set(), episodes = new Set();
      let lastActivity = 0, poster = item.poster, backdrop = item.backdrop, title = item.title;
      for (const ev of events) {
        sources.add(ev.source);
        const detail = byRef.get(ev.ref) || {
          ref: ev.ref,
          profileName: profileDetails.get(ev.ref)?.profileName || ev.profileName,
          plays: 0,
        };
        detail.plays++;
        byRef.set(ev.ref, detail);
        if (ev.kind === "episode") {
          episodes.add(`${ev.season ?? ""}:${ev.episode ?? ""}`);
          if (ev.season != null) seasons.add(ev.season);
        }
        lastActivity = Math.max(lastActivity, ev.at || 0);
        poster = poster || ev.poster;
        backdrop = backdrop || ev.backdrop;
        title = title || ev.title;
      }
      // Full TMDB metadata (synopsis, year, rating, genres…) for any title, from
      // the deduped map; fall back to the ranked aggregate, then a slim poster.
      const metaKey = `${item.kind === "movie" ? "movie" : "series"}:${item.contentId}`;
      const fullMeta = currentData?.mediaMetadata?.[metaKey] || matchingAggregate(item)?.metadata || null;
      showMediaDetail({
        contentId: item.contentId,
        title,
        kind: item.kind,
        season: item.season,
        episode: item.episode,
        plays: events.length || 1,
        profiles: byRef.size,
        profileDetails: [...byRef.values()].sort((a, b) => b.plays - a.plays),
        sources: [...sources],
        seasonCount: seasons.size,
        episodeCount: episodes.size,
        lastActivity,
        metadata: fullMeta || (poster || backdrop ? { poster, backdrop, title } : null),
      });
      // Opened from the day listing: offer a "back" action that reopens it
      // instead of only the "Fermer" that closes everything.
      const actions = document.getElementById("dialog")?.querySelector(".dialog-actions");
      if (actions) {
        const back = document.createElement("button");
        back.type = "button";
        back.className = "stats-day-back";
        back.textContent = `← ${t("Retour")}`;
        back.addEventListener("click", () => showDayDetail(day));
        actions.prepend(back);
      }
    };
    profilesRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-day-profile]");
      if (!button) return;
      state.ref = button.dataset.dayProfile;
      renderChips();
      renderTabsAndBody();
    });
    tabsRow.addEventListener("click", (event) => {
      const button = event.target.closest("[data-day-tab]");
      if (!button) return;
      state.kind = button.dataset.dayTab;
      renderTabsAndBody();
    });
    const activateMedia = (target) => {
      const card = target.closest("[data-day-media]");
      if (!card) return;
      const item = currentList[Number(card.dataset.dayMedia)];
      if (item) openMedia(item);
    };
    body.addEventListener("click", (event) => activateMedia(event.target));
    body.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) return;
      if (!event.target.closest("[data-day-media]")) return;
      event.preventDefault();
      activateMedia(event.target);
    });
    renderChips();
    renderTabsAndBody();
  };
  function bindTimelineTooltip(host) {
    // A single viewport-fixed tooltip, reused across renders, so it can always
    // sit just above the cursor without being clipped by the chart.
    let tip = document.querySelector(".stats-daytip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "stats-daytip";
      tip.hidden = true;
      document.body.appendChild(tip);
    }
    const place = (day, clientX, clientY) => {
      tip.innerHTML = dayTipContent(day);
      tip.hidden = false;
      const tipW = tip.offsetWidth,
        tipH = tip.offsetHeight;
      let left = clientX - tipW / 2;
      left = Math.max(6, Math.min(left, window.innerWidth - tipW - 6));
      let top = Math.max(6, clientY - tipH - 16);
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };
    host.querySelectorAll(".timeline-day").forEach((bar) => {
      const day = currentData.timeline[Number(bar.dataset.day)];
      if (!day || !day.count) return;
      const follow = (event) => place(day, event.clientX, event.clientY);
      bar.addEventListener("mouseenter", follow);
      bar.addEventListener("mousemove", follow);
      bar.addEventListener("mouseleave", () => { tip.hidden = true; });
      bar.addEventListener("focus", () => {
        const r = bar.getBoundingClientRect();
        place(day, r.left + r.width / 2, r.top);
      });
      bar.addEventListener("blur", () => { tip.hidden = true; });
      // Clicking a day opens the full watch list for that date.
      bar.classList.add("timeline-day-clickable");
      const open = () => { tip.hidden = true; showDayDetail(day); };
      bar.addEventListener("click", open);
      bar.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        open();
      });
    });
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
        ${metric(t("Profils comparés"), data.totals.profiles)}
        ${metric(t("Lectures"), data.totals.plays)}
        ${metric(t("Titres uniques"), data.totals.uniqueTitles)}
        ${metric(t("Temps suivi estimé"), duration(data.totals.trackedMinutes))}
      </section>
      <section class="panel stats-section"><div class="section-heading"><div><h2>${esc(t("Activité quotidienne"))}</h2><p class="muted">${esc(t("Lectures terminées par jour, toutes sources confondues."))}</p></div><div class="timeline-legend" aria-label="${esc(t("Légende"))}"><span><i class="movie"></i> ${esc(t("Films"))}</span><span><i class="series"></i> ${esc(t("Séries"))}</span></div></div><div id="stats-timeline"></div></section>
      <section class="stats-dashboard-grid">
        ${rankingCard(t("Séries les plus regardées"), rankings.watchedSeries, t("Lectures"), "plays")}
        ${rankingCard(t("Séries les plus populaires"), rankings.popularSeries, t("Profils"), "profiles")}
        ${rankingCard(t("Films les plus regardés"), rankings.watchedMovies, t("Lectures"), "plays")}
        ${rankingCard(t("Films les plus populaires"), rankings.popularMovies, t("Profils"), "profiles")}
        ${sourceCard(data.sources || [])}
        ${profileRankingCard(activeProfiles)}
      </section>
      ${recentShelf(recentItems.slice(0, 20))}
      <p class="footer-note">${esc(t("Le temps suivi est estimé à partir de la progression Nuvio et de la durée des lectures Trakt et Simkl. Une durée moyenne est utilisée lorsque le service ne fournit pas cette information."))}</p>`;
    bindRankingPreviews();
    bindRecentShelf();
    bindDetailTriggers();
    paintTimeline();
  }
  const metric = (label, value) => `<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
  const mediaTitle = (item) => item?.metadata?.title || item?.title || item?.contentId || t("Contenu inconnu");
  const backdrop = (item) => item?.metadata?.backdrop || item?.metadata?.poster || "";
  const cardBackground = (item) => backdrop(item) ? `<img class="stats-card-bg" src="${esc(backdrop(item))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
  const leadPoster = (item, round = false) => item?.metadata?.poster
    ? `<img class="stats-lead-image${round ? " round" : ""}" src="${esc(item.metadata.poster)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="stats-lead-image${round ? " round" : ""}">▶</span>`;
  const rankingCard = (title, items, metricLabel, metricKey) => {
    const first = items[0];
    return `<article class="stats-ranking-card stats-preview-card" data-default-poster="${esc(first?.metadata?.poster || "")}" data-default-backdrop="${esc(backdrop(first))}" data-default-title="${esc(mediaTitle(first))}">${cardBackground(first)}<div class="stats-card-content"><header><h2>${esc(title)}</h2><small>${esc(metricLabel)}</small></header>${items.length ? `<div class="stats-ranking-body">${leadPoster(first)}<ol>${items.map((item, index) => previewRow(item, index, item[metricKey] || 0)).join("")}</ol></div>` : `<p class="stats-card-empty">${esc(t("Aucune donnée sur cette période."))}</p>`}</div></article>`;
  };
  const sourceLogo = (source) => ({
    nuvio: "/assets/nuvio-manager-logo.png",
    tuvora: "/assets/tuvora_logo.svg",
    trakt: "/trakt.png",
    simkl: "/simkl.webp",
  })[source] || "";
  const sourceCard = (sources) => {
    const first = sources[0], firstLogo = sourceLogo(first?.source);
    const background = firstLogo ? `<img class="stats-card-bg" src="${esc(firstLogo)}" alt="" loading="lazy">` : "";
    const lead = firstLogo
      ? `<img class="stats-lead-image stats-source-logo" src="${esc(firstLogo)}" alt="Logo ${esc(sourceLabel(first.source))}" loading="lazy">`
      : '<span class="stats-lead-image stats-source-logo" aria-hidden="true">●</span>';
    return `<article class="stats-ranking-card stats-preview-card stats-source-preview" data-default-poster="${esc(firstLogo)}" data-default-backdrop="${esc(firstLogo)}" data-default-title="${esc(sourceLabel(first?.source || ""))}">${background}<div class="stats-card-content"><header><h2>${esc(t("Sources les plus actives"))}</h2><small>${esc(t("Lectures"))}</small></header>${sources.length ? `<div class="stats-ranking-body">${lead}<ol>${sources.slice(0, 5).map((source, index) => {
      const logo = sourceLogo(source.source), label = sourceLabel(source.source);
      return `<li tabindex="0" data-preview-poster="${esc(logo)}" data-preview-backdrop="${esc(logo)}" data-preview-title="${esc(label)}" title="${t("{movies} films · {series} épisodes · {profiles} profil(s)", { movies: source.movies, series: source.series, profiles: source.profiles })}"><b>${index + 1}</b><span>${esc(label)}</span><strong>${source.plays}</strong></li>`;
    }).join("")}</ol></div>` : `<p class="stats-card-empty">${esc(t("Aucune source active."))}</p>`}</div></article>`;
  };
  const recentShelf = (items) => {
    const first = items[0];
    return `<section class="panel stats-recent-shelf" aria-labelledby="stats-recent-title" data-default-backdrop="${esc(backdrop(first))}">
    ${cardBackground(first)}
    <div class="stats-recent-overlay"></div>
    <div class="stats-recent-content"><header class="stats-recent-header">
      <div><h2 id="stats-recent-title">${esc(t("Derniers visionnages"))}</h2><p class="muted"><span data-recent-count>${items.length}</span> ${esc(t(items.length > 1 ? "éléments récents" : "élément récent"))}</p></div>
      <div class="stats-recent-tools">
        <div class="stats-recent-filters" role="group" aria-label="${esc(t("Filtrer les derniers visionnages"))}">
          <button type="button" class="active" data-recent-filter="all">${esc(t("Tous"))}</button>
          <button type="button" data-recent-filter="movie">${esc(t("Films"))}</button>
          <button type="button" data-recent-filter="episode">${esc(t("Séries"))}</button>
        </div>
        <div class="stats-recent-arrows">
          <button type="button" data-recent-scroll="-1" aria-label="${esc(t("Faire défiler vers la gauche"))}">‹</button>
          <button type="button" data-recent-scroll="1" aria-label="${esc(t("Faire défiler vers la droite"))}">›</button>
        </div>
      </div>
    </header>
    ${items.length ? `<div class="stats-recent-track">${items.map((item) => {
      const detailId = registerMedia(item);
      const title = mediaTitle(item);
      const poster = item?.metadata?.poster;
      const subtitle = item.kind === "movie"
        ? item?.metadata?.year || t("Film")
        : item.season != null ? t("Saison {season} · Épisode {episode}", { season: item.season, episode: item.episode }) : t("Série");
      return `<article class="stats-recent-tile" tabindex="0" role="button" aria-label="${esc(t("Afficher les détails de {title}", { title }))}" data-stats-media="${detailId}" data-recent-kind="${esc(item.kind)}" data-preview-backdrop="${esc(backdrop(item))}">
        <div class="stats-recent-poster">${poster ? `<img src="${esc(poster)}" alt="${esc(t("Jaquette de {title}", { title }))}" loading="lazy" referrerpolicy="no-referrer">` : '<span aria-hidden="true">▶</span>'}<small>${esc(relativeDate(item.at))}</small></div>
        <strong title="${esc(title)}">${esc(title)}</strong>
        <span>${esc(subtitle)}</span>
        <span>${esc(item.profileName || t("Profil inconnu"))} · ${esc(sourceLabel(item.source))}</span>
      </article>`;
    }).join("")}</div>` : `<p class="empty-inline">${esc(t("Aucun visionnage récent sur cette période."))}</p>`}
    </div>
  </section>`;
  };
  const previewRow = (item, index, value) => {
    const detailId = registerMedia(item);
    return `<li tabindex="0" role="button" aria-label="${esc(t("Afficher les détails de {title}", { title: mediaTitle(item) }))}" data-stats-media="${detailId}" data-preview-poster="${esc(item?.metadata?.poster || "")}" data-preview-backdrop="${esc(backdrop(item))}" data-preview-title="${esc(mediaTitle(item))}"><b>${index + 1}</b><span title="${esc(mediaTitle(item))}">${esc(mediaTitle(item))}</span><strong>${esc(value)}</strong></li>`;
  };
  const profileRankingCard = (profiles) => {
    const first = profiles[0];
    const background = first?.avatarUrl ? `<img class="stats-card-bg" src="${esc(first.avatarUrl)}" alt="" referrerpolicy="no-referrer">` : "";
    const fallback = first?.profileName?.trim()?.slice(0, 1)?.toUpperCase() || "●";
    const lead = first?.avatarUrl ? `<img class="stats-lead-image round" src="${esc(first.avatarUrl)}" alt="${esc(t("Avatar de {name}", { name: first.profileName }))}" referrerpolicy="no-referrer">` : `<span class="stats-lead-image round">${esc(fallback)}</span>`;
    return `<article class="stats-ranking-card stats-profile-ranking-card stats-preview-card stats-profile-preview" data-default-poster="${esc(first?.avatarUrl || "")}" data-default-backdrop="${esc(first?.avatarUrl || "")}" data-default-title="${esc(first?.profileName || "")}">${background}<div class="stats-card-content"><header><h2>${esc(t("Profils les plus actifs"))}</h2><small>${esc(t("Lectures"))}</small></header>${profiles.length ? `<div class="stats-ranking-body">${lead}<ol>${profiles.slice(0, 5).map((profile, index) => `<li tabindex="0" role="button" aria-label="${esc(t("Afficher les détails du profil {name}", { name: profile.profileName }))}" data-stats-profile="${esc(profile.ref)}" data-preview-poster="${esc(profile.avatarUrl || "")}" data-preview-backdrop="${esc(profile.avatarUrl || "")}" data-preview-title="${esc(profile.profileName)}"><b>${index + 1}</b><span>${esc(profile.profileName)}</span><strong>${esc(profile.plays || 0)}</strong></li>`).join("")}</ol></div>` : `<p class="stats-card-empty">${esc(t("Aucun profil."))}</p>`}</div></article>`;
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
  const mediaKind = (item) => item?.kind === "movie" ? t("Film") : t("Série");
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
        <div class="stats-detail-visual">${poster ? `<img src="${esc(poster)}" alt="${esc(t("Jaquette de {title}", { title }))}" referrerpolicy="no-referrer">` : '<span aria-hidden="true">▶</span>'}</div>
        <div class="stats-detail-main">
          <p class="stats-detail-kicker">${esc(mediaKind(detail))}${episode ? ` · ${esc(episode)}` : ""}</p>
          <h2>${esc(title)}</h2>
          ${metadata.originalTitle && metadata.originalTitle !== title ? `<p class="stats-detail-original">${esc(metadata.originalTitle)}</p>` : ""}
          <p class="stats-detail-overview">${esc(metadata.overview || t("Aucun synopsis disponible pour ce titre."))}</p>
          <dl class="stats-detail-facts">
            ${fact(t("Année"), metadata.year)}
            ${fact(t("Note TMDB"), metadata.rating != null ? `${metadata.rating} / 10` : "")}
            ${fact(t("Lectures"), detail.plays)}
            ${fact(t("Profils"), detail.profiles || profiles.length || "")}
            ${detail.kind === "episode" ? fact(t("Saisons vues"), detail.seasonCount) : ""}
            ${detail.kind === "episode" ? fact(t("Épisodes vus"), detail.episodeCount) : ""}
            ${fact(t("Dernière activité"), detail.lastActivity || detail.at ? date(detail.lastActivity || detail.at) : "")}
          </dl>
          ${metadata.genres?.length ? `<p class="stats-detail-tags">${metadata.genres.map((genre) => `<span>${esc(genre)}</span>`).join("")}</p>` : ""}
          ${detail.sources?.length ? `<p class="stats-detail-sources"><strong>${esc(t("Sources :"))}</strong> ${detail.sources.map(sourceLabel).map(esc).join(" · ")}</p>` : ""}
          ${profiles.length ? `<section class="stats-detail-list"><h3>${esc(t("Profils concernés"))}</h3>${profiles.map((profile) => `<div><span>${esc(profile.profileName || profile.ref || t("Profil"))}</span><strong>${esc(profile.plays)} ${esc(t(profile.plays > 1 ? "lectures" : "lecture"))}</strong></div>`).join("")}</section>` : ""}
          <p class="stats-detail-id">${esc(t("Identifiant :"))} ${esc(detail.contentId || t("Inconnu"))}</p>
        </div>
      </div>
      <div class="dialog-actions">${tmdbUrl ? `<a class="button" href="${esc(tmdbUrl)}" target="_blank" rel="noopener noreferrer">${esc(t("Voir sur TMDB"))}</a>` : ""}<button type="button" data-close>${esc(t("Fermer"))}</button></div>
    </article>`);
  };
  const showProfileDetail = (profile) => {
    const avatar = safeImageUrl(profile.avatarUrl);
    const recent = (currentData?.recent || []).filter((item) => item.ref === profile.ref).slice(0, 6);
    const overlaps = (currentData?.overlap || [])
      .filter((item) => item.left === profile.ref || item.right === profile.ref)
      .map((item) => ({
        ...item,
        other: profileDetails.get(item.left === profile.ref ? item.right : item.left)?.profileName || t("Autre profil"),
      }))
      .sort((a, b) => b.similarity - a.similarity);
    openDialog?.(`<article class="stats-detail-modal stats-profile-modal">
      <header class="stats-profile-detail-header">
        <div class="stats-profile-detail-avatar">${avatar ? `<img src="${esc(avatar)}" alt="${esc(t("Avatar de {name}", { name: profile.profileName }))}" referrerpolicy="no-referrer">` : '<span aria-hidden="true">●</span>'}</div>
        <div><p class="stats-detail-kicker">${esc(t("Profil"))}</p><h2>${esc(profile.profileName)}</h2><p>${esc(profile.accountName)}</p></div>
      </header>
      <dl class="stats-detail-facts stats-profile-facts">
        ${fact(t("Lectures"), profile.plays)}
        ${fact(t("Titres uniques"), profile.uniqueTitles)}
        ${fact(t("Films"), profile.movies)}
        ${fact(t("Épisodes"), profile.episodes)}
        ${fact(t("Temps suivi estimé"), duration(profile.trackedMinutes))}
        ${fact(t("Dernière activité"), date(profile.lastActivity))}
      </dl>
      ${profile.sources?.length ? `<p class="stats-detail-tags">${profile.sources.map((source) => `<span>${esc(sourceLabel(source))}</span>`).join("")}</p>` : ""}
      ${recent.length ? `<section class="stats-profile-recent"><h3>${esc(t("Activité récente"))}</h3><div>${recent.map((item) => `<article>${item.metadata?.poster ? `<img src="${esc(safeImageUrl(item.metadata.poster))}" alt="" referrerpolicy="no-referrer">` : '<span class="stats-mini-poster" aria-hidden="true">▶</span>'}<span><strong>${esc(mediaTitle(item))}</strong><small>${esc(mediaKind(item))}${item.season != null ? ` · S${item.season} E${item.episode}` : ""}<br>${esc(date(item.at))}</small></span></article>`).join("")}</div></section>` : ""}
      ${overlaps.length ? `<section class="stats-detail-list"><h3>${esc(t("Historique partagé"))}</h3>${overlaps.map((item) => `<div><span>${esc(item.other)}</span><strong>${item.common} ${esc(t(item.common > 1 ? "titres" : "titre"))} · ${item.similarity} %</strong></div>`).join("")}</section>` : ""}
      <div class="dialog-actions"><button type="button" data-close>${esc(t("Fermer"))}</button></div>
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
  const timelineChart = (items, availableWidth = 900) => {
    // Bars widen/narrow to fill the tile up to maxFinesse days; beyond that the
    // slot width is capped and the chart scrolls horizontally.
    const count = items.length || 1,
      left = 50,
      rightPad = 22,
      maxFinesse = 50,
      avail = Math.max(360, Math.floor(availableWidth) - 2),
      plotWidth = Math.max(140, avail - left - rightPad),
      step = plotWidth / Math.min(count, maxFinesse),
      barWidth = Math.max(3, Math.min(30, step * 0.62)),
      width = left + count * step + rightPad,
      labelEvery = Math.max(1, Math.round(58 / step)),
      values = items.map((item) => Number(item.count) || 0),
      maxDay = Math.max(1, ...values),
      baseline = 190,
      plotHeight = 142,
      totalPeriod = values.reduce((sum, value) => sum + value, 0),
      average = items.length ? totalPeriod / items.length : 0,
      peakIndex = values.indexOf(maxDay),
      peak = items[peakIndex],
      // Square-root scale so spike days don't crush the readability of quiet
      // days. Axis labels stay round values; gridlines compress toward the top.
      scale = (value) => Math.sqrt(Math.max(0, value)) / Math.sqrt(maxDay),
      compact = (value) => new Intl.NumberFormat(getLang(), {
        notation: "compact",
        maximumFractionDigits: value >= 1000 ? 1 : 0,
      }).format(Math.round(value)),
      shortDate = (value) => {
        const parsed = new Date(`${value}T00:00:00`);
        return Number.isNaN(parsed.getTime())
          ? value
          : parsed.toLocaleDateString(getLang(), { day: "numeric", month: "short" });
      },
      yearOf = (value) => {
        const parsed = new Date(`${value}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? "" : String(parsed.getFullYear());
      };
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = maxDay * ratio;
      const y = baseline - plotHeight * Math.sqrt(ratio);
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
        x = left + index * step + (step - barWidth) / 2,
        title = `${shortDate(item.date)} · ${total} ${t(total > 1 ? "lectures" : "lecture")} · ${movies} ${t(movies > 1 ? "films" : "film")} · ${series} ${t(series > 1 ? "épisodes" : "épisode")}`,
        showValue = total && (index === peakIndex || total >= average * 2 || items.length <= 14);
      return `<g class="timeline-day" data-day="${index}" tabindex="0" role="img" aria-label="${esc(title)}"><rect class="timeline-hit" x="${left + index * step}" y="${baseline - plotHeight}" width="${step}" height="${plotHeight}"></rect>${total ? `${seriesHeight ? `<rect class="timeline-series" x="${x}" y="${baseline - totalHeight}" width="${barWidth}" height="${seriesHeight}" rx="3"></rect>` : ""}${movieHeight ? `<rect class="timeline-movie" x="${x}" y="${baseline - movieHeight}" width="${barWidth}" height="${movieHeight}" rx="3"></rect>` : ""}${showValue ? `<text class="timeline-total" x="${x + barWidth / 2}" y="${Math.max(16, baseline - totalHeight - 7)}">${compact(total)}</text>` : ""}` : `<rect class="timeline-empty" x="${x}" y="${baseline - 2}" width="${barWidth}" height="2" rx="1"></rect>`}${index % labelEvery === 0 || index === items.length - 1 ? `<text class="timeline-date" x="${x + barWidth / 2}" y="${baseline + 21}">${esc(shortDate(item.date))}</text><text class="timeline-year" x="${x + barWidth / 2}" y="${baseline + 33}">${esc(yearOf(item.date))}</text>` : ""}</g>`;
    }).join("");
    return `<div class="timeline-summary"><div><span>${esc(t("Total de la période"))}</span><strong>${compact(totalPeriod)} ${esc(t("lectures"))}</strong></div><div><span>${esc(t("Moyenne quotidienne"))}</span><strong>${new Intl.NumberFormat(getLang(), { maximumFractionDigits: 1 }).format(average)}</strong></div><div><span>${esc(t("Jour le plus actif"))}</span><strong>${peak ? `${shortDate(peak.date)} · ${compact(maxDay)}` : esc(t("Aucune activité"))}</strong></div></div><div class="timeline-scroll"><svg class="timeline-chart" style="width:${width}px" viewBox="0 0 ${width} 238" role="img" aria-label="${esc(t("Activité quotidienne : films en jaune et épisodes de séries en rouge."))}">${ticks}<line class="timeline-axis" x1="${left - 4}" y1="${baseline}" x2="${width - 12}" y2="${baseline}"></line>${bars}</svg></div>`;
  };
  $("#stats-days").onchange = () => {
    const input = $("#stats-days-input");
    if (input) input.hidden = $("#stats-days").value !== "custom";
    run(load);
  };
  $("#stats-days-input").oninput = () => run(load);
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
  // Repaint the timeline to the tile width on resize (debounced, single handler).
  if (statsResizeHandler) window.removeEventListener("resize", statsResizeHandler);
  let resizeTimer;
  statsResizeHandler = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if ($("#stats-timeline")?.isConnected) paintTimeline();
    }, 150);
  };
  window.addEventListener("resize", statsResizeHandler);
  // Close the profile dropdown when clicking anywhere outside of it (native
  // <details> stays open otherwise), like a real select.
  if (statsOutsideHandler) document.removeEventListener("pointerdown", statsOutsideHandler);
  statsOutsideHandler = (event) => {
    const menu = $("#stats-profile-menu");
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  };
  document.addEventListener("pointerdown", statsOutsideHandler);
  await load();
}
