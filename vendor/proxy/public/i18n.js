// i18n vanilla, partagé entre index.html et login.html.
// Détection auto (navigator.language), repli anglais, choix mémorisé (localStorage).
(function () {
  const SUPPORTED = ['fr', 'en', 'es', 'de', 'it'];

  const I18N = {
    fr: {
      subtitle: "Ajoute un addon, colle le lien « proxifié » généré dans Stremio. Les flux vidéo HTTP/HTTPS passeront par ce serveur.",
      logout: "Déconnexion", stats: "Statistiques", network: "Sortie réseau",
      mode: "Mode", modeDirect: "Direct — IP du serveur", modeSocks: "SOCKS5 — WARP / VPN", modeHttp: "Proxy HTTP",
      proxyUrl: "URL du proxy (si SOCKS/HTTP)",
      networkHint: 'Exemples WARP : <code>socks5://127.0.0.1:40000</code> · Proxy HTTP : <code>http://user:pass@host:port</code>. Laisse vide en mode Direct.',
      save: "Enregistrer", testIp: "Tester l'IP de sortie",
      addAddon: "Ajouter un addon", manifestUrlLabel: "URL du manifest de l'addon",
      addHint: 'Colle l\'URL <code>…/manifest.json</code> de l\'addon (celle que tu mettrais normalement dans Stremio).',
      add: "Ajouter", proxied: "Addons proxifiés",
      bandwidth: "Bande passante", uptime: "uptime",
      noAddons: "Aucun addon pour l'instant.", origin: "d'origine :",
      install: "Installer", copy: "Copier", copied: "Copié ✓",
      rename: "Renommer", edit: "Modifier", del: "Suppr.", sourceUrl: "URL source :",
      checking: "Vérification…", addedOk: "Addon ajouté ✓",
      saving: "Enregistrement…", savedOk: "Enregistré ✓",
      testing: "Test en cours…", exitIp: "IP de sortie", failed: "Échec :",
      dayU: "j", hourU: "h", minU: "m",
      loginSub: "Connexion à l'interface d'administration",
      user: "Identifiant", password: "Mot de passe", signIn: "Se connecter",
      connecting: "Connexion…", loginFailed: "Échec de la connexion", netError: "Erreur réseau",
      warpDetecting: "Détection de WARP…", warpNone: "WARP : désactivé ou introuvable",
      warpUse: "URL à utiliser :", warpDirect: "Direct (aucune URL)", warpFail: "WARP : détection impossible —"
    },
    en: {
      subtitle: "Add an addon and paste the “proxified” link it generates into Stremio. HTTP/HTTPS video streams will go through this server.",
      logout: "Log out", stats: "Statistics", network: "Network egress",
      mode: "Mode", modeDirect: "Direct — server IP", modeSocks: "SOCKS5 — WARP / VPN", modeHttp: "HTTP proxy",
      proxyUrl: "Proxy URL (if SOCKS/HTTP)",
      networkHint: 'WARP examples: <code>socks5://127.0.0.1:40000</code> · HTTP proxy: <code>http://user:pass@host:port</code>. Leave empty in Direct mode.',
      save: "Save", testIp: "Test exit IP",
      addAddon: "Add an addon", manifestUrlLabel: "Addon manifest URL",
      addHint: 'Paste the addon\'s <code>…/manifest.json</code> URL (the one you\'d normally put into Stremio).',
      add: "Add", proxied: "Proxified addons",
      bandwidth: "Bandwidth", uptime: "uptime",
      noAddons: "No addons yet.", origin: "original:",
      install: "Install", copy: "Copy", copied: "Copied ✓",
      rename: "Rename", edit: "Edit", del: "Del.", sourceUrl: "Source URL:",
      checking: "Checking…", addedOk: "Addon added ✓",
      saving: "Saving…", savedOk: "Saved ✓",
      testing: "Testing…", exitIp: "Exit IP", failed: "Failed:",
      dayU: "d", hourU: "h", minU: "m",
      loginSub: "Sign in to the admin interface",
      user: "Username", password: "Password", signIn: "Sign in",
      connecting: "Signing in…", loginFailed: "Sign-in failed", netError: "Network error",
      warpDetecting: "Detecting WARP…", warpNone: "WARP: disabled or not found",
      warpUse: "URL to use:", warpDirect: "Direct (no URL)", warpFail: "WARP: detection failed —"
    },
    es: {
      subtitle: "Añade un addon y pega en Stremio el enlace «proxificado» generado. Los flujos de vídeo HTTP/HTTPS pasarán por este servidor.",
      logout: "Cerrar sesión", stats: "Estadísticas", network: "Salida de red",
      mode: "Modo", modeDirect: "Directo — IP del servidor", modeSocks: "SOCKS5 — WARP / VPN", modeHttp: "Proxy HTTP",
      proxyUrl: "URL del proxy (si SOCKS/HTTP)",
      networkHint: 'Ejemplos WARP: <code>socks5://127.0.0.1:40000</code> · Proxy HTTP: <code>http://user:pass@host:port</code>. Déjalo vacío en modo Directo.',
      save: "Guardar", testIp: "Probar IP de salida",
      addAddon: "Añadir un addon", manifestUrlLabel: "URL del manifest del addon",
      addHint: 'Pega la URL <code>…/manifest.json</code> del addon (la que pondrías normalmente en Stremio).',
      add: "Añadir", proxied: "Addons proxificados",
      bandwidth: "Ancho de banda", uptime: "activo",
      noAddons: "Aún no hay addons.", origin: "original:",
      install: "Instalar", copy: "Copiar", copied: "Copiado ✓",
      rename: "Renombrar", edit: "Editar", del: "Elim.", sourceUrl: "URL de origen:",
      checking: "Verificando…", addedOk: "Addon añadido ✓",
      saving: "Guardando…", savedOk: "Guardado ✓",
      testing: "Probando…", exitIp: "IP de salida", failed: "Error:",
      dayU: "d", hourU: "h", minU: "m",
      loginSub: "Acceso a la interfaz de administración",
      user: "Usuario", password: "Contraseña", signIn: "Acceder",
      connecting: "Accediendo…", loginFailed: "Error de acceso", netError: "Error de red",
      warpDetecting: "Detectando WARP…", warpNone: "WARP: desactivado o no encontrado",
      warpUse: "URL a usar:", warpDirect: "Directo (sin URL)", warpFail: "WARP: detección imposible —"
    },
    de: {
      subtitle: "Füge ein Addon hinzu und füge den erzeugten „proxifizierten“ Link in Stremio ein. HTTP/HTTPS-Videostreams laufen über diesen Server.",
      logout: "Abmelden", stats: "Statistiken", network: "Netzwerkausgang",
      mode: "Modus", modeDirect: "Direkt — Server-IP", modeSocks: "SOCKS5 — WARP / VPN", modeHttp: "HTTP-Proxy",
      proxyUrl: "Proxy-URL (bei SOCKS/HTTP)",
      networkHint: 'WARP-Beispiele: <code>socks5://127.0.0.1:40000</code> · HTTP-Proxy: <code>http://user:pass@host:port</code>. Im Direkt-Modus leer lassen.',
      save: "Speichern", testIp: "Ausgangs-IP testen",
      addAddon: "Addon hinzufügen", manifestUrlLabel: "Addon-Manifest-URL",
      addHint: 'Füge die <code>…/manifest.json</code>-URL des Addons ein (die, die du normalerweise in Stremio einträgst).',
      add: "Hinzufügen", proxied: "Proxierte Addons",
      bandwidth: "Bandbreite", uptime: "Laufzeit",
      noAddons: "Noch keine Addons.", origin: "Original:",
      install: "Installieren", copy: "Kopieren", copied: "Kopiert ✓",
      rename: "Umbenennen", edit: "Bearbeiten", del: "Entf.", sourceUrl: "Quell-URL:",
      checking: "Prüfe…", addedOk: "Addon hinzugefügt ✓",
      saving: "Speichern…", savedOk: "Gespeichert ✓",
      testing: "Teste…", exitIp: "Ausgangs-IP", failed: "Fehler:",
      dayU: "T", hourU: "Std", minU: "Min",
      loginSub: "Anmeldung an der Verwaltungsoberfläche",
      user: "Benutzername", password: "Passwort", signIn: "Anmelden",
      connecting: "Anmeldung…", loginFailed: "Anmeldung fehlgeschlagen", netError: "Netzwerkfehler",
      warpDetecting: "WARP wird erkannt…", warpNone: "WARP: deaktiviert oder nicht gefunden",
      warpUse: "Zu verwendende URL:", warpDirect: "Direkt (keine URL)", warpFail: "WARP: Erkennung fehlgeschlagen —"
    },
    it: {
      subtitle: "Aggiungi un addon e incolla in Stremio il link «proxato» generato. I flussi video HTTP/HTTPS passeranno da questo server.",
      logout: "Disconnetti", stats: "Statistiche", network: "Uscita di rete",
      mode: "Modalità", modeDirect: "Diretto — IP del server", modeSocks: "SOCKS5 — WARP / VPN", modeHttp: "Proxy HTTP",
      proxyUrl: "URL del proxy (se SOCKS/HTTP)",
      networkHint: 'Esempi WARP: <code>socks5://127.0.0.1:40000</code> · Proxy HTTP: <code>http://user:pass@host:port</code>. Lascia vuoto in modalità Diretto.',
      save: "Salva", testIp: "Testa IP di uscita",
      addAddon: "Aggiungi un addon", manifestUrlLabel: "URL del manifest dell'addon",
      addHint: 'Incolla l\'URL <code>…/manifest.json</code> dell\'addon (quella che metteresti normalmente in Stremio).',
      add: "Aggiungi", proxied: "Addon proxati",
      bandwidth: "Larghezza di banda", uptime: "attivo",
      noAddons: "Nessun addon per ora.", origin: "originale:",
      install: "Installa", copy: "Copia", copied: "Copiato ✓",
      rename: "Rinomina", edit: "Modifica", del: "Elim.", sourceUrl: "URL di origine:",
      checking: "Verifica…", addedOk: "Addon aggiunto ✓",
      saving: "Salvataggio…", savedOk: "Salvato ✓",
      testing: "Test in corso…", exitIp: "IP di uscita", failed: "Errore:",
      dayU: "g", hourU: "h", minU: "m",
      loginSub: "Accesso all'interfaccia di amministrazione",
      user: "Nome utente", password: "Password", signIn: "Accedi",
      connecting: "Accesso…", loginFailed: "Accesso non riuscito", netError: "Errore di rete",
      warpDetecting: "Rilevamento WARP…", warpNone: "WARP: disattivato o non trovato",
      warpUse: "URL da usare:", warpDirect: "Diretto (nessun URL)", warpFail: "WARP: rilevamento non riuscito —"
    }
  };

  function detect() {
    try { const s = localStorage.getItem('lang'); if (SUPPORTED.includes(s)) return s; } catch (e) { /* ignore */ }
    const a = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.includes(a) ? a : 'en';
  }

  let LANG = detect();

  function t(key) {
    const d = I18N[LANG] || I18N.en;
    return (key in d) ? d[key] : (I18N.en[key] != null ? I18N.en[key] : key);
  }

  function apply() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  }

  function set(lang) {
    if (!SUPPORTED.includes(lang)) return;
    LANG = lang;
    try { localStorage.setItem('lang', lang); } catch (e) { /* ignore */ }
    apply();
  }

  window.I18n = { SUPPORTED, t, apply, set, current: () => LANG };
})();
