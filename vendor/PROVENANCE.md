# Proxy d’origine

Source : https://github.com/Guiro28/stremio-addon-proxy

Révision : `5267c6ebde2689cf9750bcb5832083ba4c6a7d74`.

Fichiers `server.js`, `src/`, `public/`, `package.json`, `package-lock.json` et `README.md` copiés comme référence. Le dashboard réutilise directement les modules réseau de `src/` depuis `server/integrated-proxy.js`. Le mode direct ou WARP est sélectionné pour chaque URL relayée ; seul le service réseau WARP reste dans un conteneur séparé.
