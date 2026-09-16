const esc = (value) => String(value ?? "").replace(
  /[&<>"']/g,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
);

export async function renderPanelSettings(container, { api, run, toast, onSaved }) {
  const config = await api("settings");
  const proxy = config.externalProxy || {};
  container.innerHTML = `
    <section class="panel">
      <h2>TMDB</h2>
      <p class="muted">Clé API ou jeton de lecture TMDB pour enrichir la progression, la bibliothèque et les contenus vus avec les jaquettes et fiches françaises. La valeur est conservée chiffrée sur le serveur.</p>
      <p>${config.tmdbConfigured ? "✓ Une clé TMDB est enregistrée et l’enrichissement est actif." : "Aucune clé TMDB enregistrée."}</p>
      <form id="tmdb-form" class="form">
        <label>Clé API / API Read Access Token<input name="tmdbKey" type="password" autocomplete="off" maxlength="4096" placeholder="${config.tmdbConfigured ? "Saisir une nouvelle clé pour la remplacer" : "Saisir votre clé TMDB"}" required></label>
        <div class="actions"><button class="primary">Enregistrer la clé</button>${config.tmdbConfigured ? '<button type="button" id="remove-tmdb">Supprimer la clé</button>' : ""}</div>
      </form>
      <p class="muted">Les résultats sont mis en cache pendant 7 jours.</p>
    </section>

    <section class="panel">
      <h2>Adresse publique</h2>
      <p class="muted">Adresse utilisée pour générer les manifests et les liens des addons proxifiés. Indique le domaine HTTPS de ton reverse proxy, sans chemin final.</p>
      <form id="public-url-form" class="form">
        <label>URL du dashboard<input name="publicUrl" type="url" value="${esc(config.publicUrl)}" autocomplete="off" spellcheck="false" placeholder="https://manager.example.com" required></label>
        <div class="actions"><button class="primary">Enregistrer l’adresse</button></div>
        <p id="public-url-result" class="muted"></p>
      </form>
    </section>

    <section class="panel">
      <h2>Proxy externe</h2>
      <p class="muted">Configure une sortie WARP ou tout autre proxy HTTP(S) ou SOCKS accessible depuis le serveur. Cette adresse est utilisée par les addons attribués au mode « Proxy externe ».</p>
      <p>${proxy.configured ? `✓ Proxy ${esc(proxy.type)} configuré : <code>${esc(proxy.display)}</code>${proxy.source === "environment" ? " · variable d’environnement" : ""}` : "Aucun proxy externe configuré."}</p>
      ${proxy.valid === false ? `<p class="error">${esc(proxy.error)}</p>` : ""}
      <form id="proxy-form" class="form">
        <label>URL du proxy<input name="externalProxyUrl" type="text" inputmode="url" autocomplete="off" data-form-type="other" spellcheck="false" maxlength="4096" placeholder="socks5://utilisateur:mot-de-passe@serveur:1080" required></label>
        <p class="muted">Protocoles acceptés : HTTP, HTTPS, SOCKS, SOCKS4 et SOCKS5. Les identifiants peuvent être inclus dans l’URL et restent chiffrés sur le serveur.</p>
        <div class="actions"><button class="primary">Enregistrer le proxy</button><button type="button" id="test-proxy">Tester cette adresse</button>${proxy.configured ? '<button type="button" id="remove-proxy">Désactiver</button>' : ""}</div>
        <p id="proxy-test-result" class="muted"></p>
      </form>
    </section>

    <section class="panel">
      <h2>Trakt et Simkl</h2>
      <p class="muted">Configure les applications utilisées pour associer un compte de suivi à chaque profil Nuvio. Les secrets restent chiffrés côté serveur.</p>
      <form id="trackers-form" class="form">
        <h3>Application Trakt</h3>
        <p class="muted">Crée une application depuis <a href="https://trakt.tv/oauth/applications" target="_blank" rel="noopener noreferrer">les applications API Trakt</a>. L’association des profils utilise ensuite le code affiché par Trakt.</p>
        <label>Client ID<input name="traktClientId" value="${esc(config.trackers?.trakt?.clientId)}" autocomplete="off" maxlength="4096"></label>
        <label>Client Secret<input name="traktClientSecret" type="password" autocomplete="off" maxlength="4096" placeholder="${config.trackers?.trakt?.configured ? "Secret déjà enregistré — laisser vide pour le conserver" : "Client Secret Trakt"}"></label>
        <h3>Application Simkl</h3>
        <p class="muted">Crée une application dans <a href="https://simkl.com/settings/developer/new/" target="_blank" rel="noopener noreferrer">les réglages développeur Simkl</a> et utilise <code>urn:ietf:wg:oauth:2.0:oob</code> comme URI de redirection.</p>
        <label>Client ID / clé API<input name="simklClientId" value="${esc(config.trackers?.simkl?.clientId)}" autocomplete="off" maxlength="4096"></label>
        <button class="primary">Enregistrer les applications</button>
        <p class="muted">Associe ensuite Trakt ou Simkl depuis l’onglet dédié de chaque profil.</p>
      </form>
    </section>

    <section class="panel">
      <h2>Administrateur du panel</h2>
      <p class="muted">${config.authEnabled ? "Le mot de passe actuel est requis pour modifier les identifiants." : "L’accès local est actuellement sans mot de passe. Définis un mot de passe pour activer la connexion administrateur."}</p>
      <form id="admin-form" class="form">
        <label>Nom d’utilisateur<input name="username" value="${esc(config.username)}" autocomplete="username" maxlength="80" required></label>
        ${config.authEnabled ? '<label>Mot de passe actuel<input name="currentPassword" type="password" autocomplete="current-password" required></label>' : ""}
        <label>Nouveau mot de passe<input name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="1024" ${config.authEnabled ? 'placeholder="Laisser vide pour le conserver"' : "required"}></label>
        <label>Confirmer le nouveau mot de passe<input name="confirmation" type="password" autocomplete="new-password" maxlength="1024"></label>
        <p class="muted">12 caractères minimum. Les autres sessions seront déconnectées après enregistrement.</p>
        <button class="primary">Enregistrer les identifiants</button>
      </form>
    </section>`;

  const $ = (selector) => container.querySelector(selector);
  $("#tmdb-form").onsubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api("settings/tmdb", { key: new FormData(event.target).get("tmdbKey") });
      toast("Clé TMDB enregistrée.");
      await onSaved();
    });
  };
  if ($("#remove-tmdb"))
    $("#remove-tmdb").onclick = () => run(async () => {
      await api("settings/tmdb", { key: "" });
      toast("Clé TMDB supprimée.");
      await onSaved();
    });

  $("#public-url-form").onsubmit = (event) => {
    event.preventDefault();
    run(async () => {
      const result = await api("settings/public-url", { url: new FormData(event.target).get("publicUrl") });
      $("#public-url-result").textContent = result.url === location.origin
        ? "Adresse publique enregistrée."
        : `Adresse enregistrée. Ouvre maintenant ${result.url}`;
      toast("Adresse publique enregistrée.");
      if (result.url === location.origin) await onSaved();
    });
  };

  const proxyInput = $("#proxy-form [name=externalProxyUrl]");
  $("#proxy-form").onsubmit = (event) => {
    event.preventDefault();
    run(async () => {
      await api("settings/proxy", { url: proxyInput.value });
      toast("Proxy externe enregistré.");
      await onSaved();
    });
  };
  $("#test-proxy").onclick = () => run(async () => {
    const result = await api("settings/proxy/test", { url: proxyInput.value.trim() });
    $("#proxy-test-result").textContent = result.ok
      ? `Connexion réussie · IP de sortie : ${result.ip}`
      : `Échec : ${result.error}`;
  });
  if ($("#remove-proxy"))
    $("#remove-proxy").onclick = () => run(async () => {
      await api("settings/proxy", { url: "" });
      toast("Proxy externe désactivé.");
      await onSaved();
    });

  $("#trackers-form").onsubmit = (event) => {
    event.preventDefault();
    run(async () => {
      const values = Object.fromEntries(new FormData(event.target));
      await api("settings/trackers", values);
      toast("Applications Trakt et Simkl enregistrées.");
      await onSaved();
    });
  };
  $("#admin-form").onsubmit = (event) => {
    event.preventDefault();
    const values = new FormData(event.target);
    run(async () => {
      if (values.get("newPassword") !== values.get("confirmation"))
        throw Error("Les deux mots de passe ne correspondent pas.");
      await api("settings/admin", {
        username: values.get("username"),
        currentPassword: values.get("currentPassword") || "",
        newPassword: values.get("newPassword"),
      });
      toast("Identifiants administrateur enregistrés.");
      await onSaved();
    });
  };
}
