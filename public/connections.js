const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const labels = { trakt: "Trakt", simkl: "Simkl" };
const formatDate = (value) => value ? new Date(value).toLocaleString("fr-FR") : "Jamais";

export async function renderConnections(container, context) {
  const { api, accountId, profileId, openDialog, run, toast, onConnected } = context;
  const data = await api(`connections?${new URLSearchParams({ accountId, profileId })}`);
  container.innerHTML = `<h2>Sources de suivi</h2><p class="muted">Associez un compte de suivi à ce profil. Les statistiques combinent ensuite les historiques sans modifier les données d’origine.</p><div class="connection-grid">${["trakt", "simkl"].map((service) => card(service, data)).join("")}${nuvioSourceCard(data)}</div><p class="footer-note">Les connexions sont propres à ce profil. Les jetons d’accès restent chiffrés sur le serveur.</p>`;
  const nuvioToggle = container.querySelector("#stats-nuvio-toggle");
  if (nuvioToggle) nuvioToggle.onchange = () => run(async () => {
    const disabled = !nuvioToggle.checked;
    try {
      await api("connections/stats-source", { accountId, profileId, disabled });
      toast(disabled ? "Historique Nuvio exclu des statistiques de ce profil." : "Historique Nuvio inclus dans les statistiques de ce profil.");
    } catch (error) {
      nuvioToggle.checked = !nuvioToggle.checked;
      throw error;
    }
  });
  container.querySelectorAll("[data-connect]").forEach((button) => {
    button.onclick = () => run(() => connect(button.dataset.connect));
  });
  container.querySelectorAll("[data-disconnect]").forEach((button) => {
    button.onclick = () => {
      const service = button.dataset.disconnect;
      if (!confirm(`Dissocier ${labels[service]} de ce profil ? L’historique distant ne sera pas supprimé.`)) return;
      run(async () => {
        await api("connections/disconnect", { accountId, profileId, service });
        toast(`${labels[service]} dissocié de ce profil.`);
        await onConnected();
      });
    };
  });
  async function connect(service) {
    const pairing = await api("connections/start", { accountId, profileId, service });
    const url = new URL(pairing.verificationUrl);
    if (!['https:', 'http:'].includes(url.protocol)) throw Error("Adresse d’autorisation invalide");
    const serviceLogo = service === "trakt" ? "/trakt.png" : "/simkl.webp";
    openDialog(`<div class="nuvio-pair tracker-pair tracker-pair-${service}">
      <button class="nuvio-pair-close" type="button" data-close aria-label="Fermer">×</button>
      <img class="nuvio-pair-logo tracker-pair-logo" src="${serviceLogo}" alt="${labels[service]}">
      <h2>Associer un compte ${labels[service]}</h2>
      <p class="nuvio-pair-intro">Ouvrez ${labels[service]}, connectez-vous à votre compte, puis saisissez ce code pour autoriser l’association.</p>
      <div class="nuvio-pair-code">
        <span>Code d’association</span>
        <strong>${esc(pairing.userCode)}</strong>
      </div>
      <a class="nuvio-pair-primary" href="${esc(url.href)}" target="_blank" rel="noreferrer">
        <span aria-hidden="true">↗</span> Ouvrir le site ${labels[service]}
      </a>
      <ol class="nuvio-pair-steps" aria-label="Étapes d’association">
        <li><span>1</span><strong>Ouvrir ${labels[service]}</strong></li>
        <li><span>2</span><strong>Se connecter</strong></li>
        <li><span>3</span><strong>Saisir le code</strong></li>
      </ol>
      <button id="tracker-pair-check" class="nuvio-pair-secondary" type="button">J’ai terminé l’association</button>
      <p id="tracker-pair-status" class="nuvio-pair-status" aria-live="polite"><span class="nuvio-pair-status-dot" aria-hidden="true"></span><span>En attente de l’autorisation…</span></p>
    </div>`);
    let timer,
      busy = false,
      interval = Math.max(pairing.interval || 5, 5) * 1000;
    const dialog = document.querySelector("#dialog");
    const stop = () => clearTimeout(timer);
    dialog.addEventListener("close", stop, { once: true });
    const setStatus = (message, state = "waiting") => {
      const status = document.querySelector("#tracker-pair-status");
      if (!status) return;
      status.className = `nuvio-pair-status ${state}`;
      status.innerHTML = `<span class="nuvio-pair-status-dot" aria-hidden="true"></span><span>${esc(message)}</span>`;
    };
    async function poll() {
      if (!dialog.open || busy) return;
      busy = true;
      const checkButton = document.querySelector("#tracker-pair-check");
      if (checkButton) checkButton.disabled = true;
      try {
        const result = await api("connections/poll", { id: pairing.id });
        if (result.status === "connected") {
          stop();
          setStatus("Association confirmée.", "connected");
          dialog.close();
          toast(`${labels[service]} est associé au profil.`);
          await onConnected();
          return;
        }
        interval = Math.max(result.interval || interval / 1000, 5) * 1000;
        setStatus("En attente de l’autorisation…");
      } catch (error) {
        setStatus(error.message, "error");
        stop();
        return;
      } finally {
        busy = false;
        if (checkButton?.isConnected) checkButton.disabled = false;
      }
      timer = setTimeout(poll, interval);
    }
    document.querySelector("#tracker-pair-check").onclick = () => {
      stop();
      poll();
    };
    timer = setTimeout(poll, interval);
  }
}

function nuvioSourceCard(data) {
  const included = !data.statsNuvioDisabled;
  return `<article class="panel connection-card stats-source-card"><img class="connection-logo" src="/assets/nuvio_logo.png" alt="Logo Nuvio"><div><h3>Historique Nuvio</h3><p class="muted">Par défaut, l’historique de lecture Nuvio alimente les statistiques avec Trakt et Simkl. Désactive-le pour ne compter que Trakt et Simkl sur ce profil.</p><label class="stats-source-toggle"><input type="checkbox" id="stats-nuvio-toggle"${included ? " checked" : ""}><span>Inclure l’historique Nuvio</span></label></div></article>`;
}

function card(service, data) {
  const connected = data.connections[service],
    configured = data.configured[service];
  return `<article class="panel connection-card"><img class="connection-logo" src="/${service === "trakt" ? "trakt.png" : "simkl.webp"}" alt="Logo ${labels[service]}"><div><h3>${labels[service]}</h3>${connected.connected ? `<p class="connection-ok">● Associé</p><p class="muted">Dernière synchronisation : ${formatDate(connected.lastSync)}</p>${connected.lastError ? `<p class="error">${esc(connected.lastError)}</p>` : ""}<button data-disconnect="${service}">Dissocier</button>` : configured ? `<p class="muted">Importe l’historique de visionnage dans les statistiques de ce profil.</p><button class="primary" data-connect="${service}">Associer le compte</button>` : `<p class="muted">Ajoute les identifiants de l’application ${labels[service]} dans le menu Paramètres.</p><button disabled>Configuration requise</button>`}</div></article>`;
}
