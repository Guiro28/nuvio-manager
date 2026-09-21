import { t } from "./i18n.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const leagueName = (row) => row.name || `#${row.league_id ?? "?"}`;
const badgeImg = (url) =>
  url ? `<img class="sport-badge" src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "";

// Map a radar-fixtures search result onto a table row (unknown columns default).
const leagueRow = (result) => ({
  league_id: result.id,
  name: result.name || null,
  sport: result.sport || null,
  badge: result.badge || null,
  banner: result.banner || null,
  keywords: result.keywords || null,
  custom: null,
});
const teamRow = (result) => ({
  team_id: result.id,
  name: result.name || null,
  sport: result.sport || null,
  badge: result.badge || null,
  league_id: result.leagueId || result.league_id || null,
  league: result.league || null,
  keywords: result.keywords || null,
});

export async function renderSports(container, context) {
  const { api, accountId, profileId, openDialog, run, toast } = context;
  const data = await api(`sports?${new URLSearchParams({ accountId, profileId })}`);
  const leagues = (data.leagues || []).map((row) => ({ ...row }));
  const teams = (data.teams || []).map((row) => ({ ...row }));

  function paint() {
    container.innerHTML =
      `<div class="settings-top"><p class="muted">${esc(t("Ligues et équipes suivies, dans l’ordre d’affichage des apps."))}</p><div class="actions"><button id="sport-save" class="primary">${esc(t("Enregistrer les suivis"))}</button></div></div>` +
      section("league", t("Ligues suivies"), leagues) +
      section("team", t("Équipes suivies"), teams) +
      `<p class="footer-note">${esc(t("Les suivis sont propres à ce profil et rejoignent vos appareils Tuvora à la prochaine connexion."))}</p>`;
    lists();
    container.querySelector("#sport-save").onclick = () =>
      run(async () => {
        leagues.forEach((row, index) => (row.sort_order = index));
        teams.forEach((row, index) => (row.sort_order = index));
        await api("sports/save", { accountId, profileId, leagues, teams });
        toast(t("Suivis sportifs enregistrés"));
      });
    container.querySelector('[data-add="league"]').onclick = () => openSearch("league");
    container.querySelector('[data-add="team"]').onclick = () => openSearch("team");
  }

  function section(kind, title, rows) {
    return `<div class="sport-section"><div class="sport-section-head"><h3>${esc(title)} <span class="badge neutral">${rows.length}</span></h3><button data-add="${kind}">${esc(kind === "league" ? t("＋ Ajouter une ligue") : t("＋ Ajouter une équipe"))}</button></div><div id="sport-list-${kind}"></div></div>`;
  }

  function lists() {
    render("league", leagues);
    render("team", teams);
  }

  function render(kind, rows) {
    const host = container.querySelector(`#sport-list-${kind}`);
    const label = (row) => (kind === "league" ? leagueName(row) : row.name || `#${row.team_id ?? "?"}`);
    host.innerHTML =
      rows
        .map(
          (row, index) =>
            `<div class="sport-row">${badgeImg(row.badge)}<div class="sport-info"><span class="sport-name">${esc(label(row))}</span><span class="muted">${esc(row.sport || "")}${kind === "team" && row.league ? " · " + esc(row.league) : ""}</span></div><div class="actions"><button data-up="${index}" ${index === 0 ? "disabled" : ""} aria-label="${esc(t("Monter {name}", { name: label(row) }))}">↑</button><button data-down="${index}" ${index === rows.length - 1 ? "disabled" : ""} aria-label="${esc(t("Descendre {name}", { name: label(row) }))}">↓</button><button data-remove="${index}">${esc(t("Retirer"))}</button></div></div>`,
        )
        .join("") ||
      `<p class="empty-inline">${esc(kind === "league" ? t("Aucune ligue suivie.") : t("Aucune équipe suivie."))}</p>`;
    host.querySelectorAll("[data-up]").forEach((el) => {
      el.onclick = () => {
        const i = Number(el.dataset.up);
        [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
        render(kind, rows);
      };
    });
    host.querySelectorAll("[data-down]").forEach((el) => {
      el.onclick = () => {
        const i = Number(el.dataset.down);
        [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
        render(kind, rows);
      };
    });
    host.querySelectorAll("[data-remove]").forEach((el) => {
      el.onclick = () => {
        rows.splice(Number(el.dataset.remove), 1);
        render(kind, rows);
      };
    });
  }

  function openSearch(kind) {
    const rows = kind === "league" ? leagues : teams;
    const has = (result) =>
      kind === "league"
        ? rows.some((row) => String(row.league_id) === String(result.id))
        : rows.some((row) => String(row.team_id) === String(result.id));
    openDialog(
      `<h2>${esc(kind === "league" ? t("Ajouter une ligue") : t("Ajouter une équipe"))}</h2><div class="form"><label>${esc(t("Rechercher"))}<input id="sport-search" type="search" autocomplete="off" placeholder="${esc(kind === "league" ? t("Nom de la ligue…") : t("Nom de l’équipe…"))}"></label></div><div id="sport-results" class="sport-results"></div><div class="dialog-actions"><button type="button" data-close>${esc(t("Fermer"))}</button></div>`,
    );
    const input = document.querySelector("#sport-search");
    const results = document.querySelector("#sport-results");
    let timer = null;
    const search = () => {
      const query = input.value.trim();
      if (query.length < 2) {
        results.innerHTML = "";
        return;
      }
      results.innerHTML = `<p class="muted">${esc(t("Recherche…"))}</p>`;
      run(async () => {
        const data = await api(`sports/search?${new URLSearchParams({ accountId, kind, q: query })}`);
        const items = data.results || [];
        if (input.value.trim() !== query) return;
        results.innerHTML =
          items
            .map(
              (result, index) =>
                `<button type="button" class="sport-result" data-index="${index}" ${has(result) ? "disabled" : ""}>${badgeImg(result.badge)}<span class="sport-info"><span class="sport-name">${esc(result.name || result.id)}</span><span class="muted">${esc(result.sport || "")}${result.country ? " · " + esc(result.country) : ""}${result.league ? " · " + esc(result.league) : ""}</span></span>${has(result) ? `<span class="badge neutral">${esc(t("Déjà suivi"))}</span>` : ""}</button>`,
            )
            .join("") || `<p class="muted">${esc(t("Aucun résultat."))}</p>`;
        results.querySelectorAll(".sport-result[data-index]").forEach((button) => {
          button.onclick = () => {
            const result = items[Number(button.dataset.index)];
            rows.push(kind === "league" ? leagueRow(result) : teamRow(result));
            document.querySelector("#dialog").close();
            render(kind, rows);
            container.querySelector(`#sport-list-${kind}`).scrollIntoView({ block: "nearest" });
          };
        });
      });
    };
    input.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(search, 350);
    };
    input.focus();
  }

  paint();
}
