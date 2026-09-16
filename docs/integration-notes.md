# Nuvio Manager — préparation de l’intégration

## Demande

Application en français auto-hébergée sur VPS avec Docker. Gestion de plusieurs comptes Nuvio et de leurs profils, paramètres TV et Mobile, addons et plugins. Copie totale ou sélective entre profils. Bibliothèque centrale d’addons avec attribution manuelle et choix sans proxy, proxy direct ou proxy WARP.

## Sources examinées

- https://github.com/Guiro28/stremio-addon-proxy — révision 5267c6ebde2689cf9750bcb5832083ba4c6a7d74, copie de travail dans reference-proxy.
- https://github.com/NuvioMedia/NuvioTV — copie de travail dans reference-nuvio-tv.
- https://nuvio.tv/account/login — ouvert pour connexion manuelle du propriétaire.
- https://docs.trakt.tv/reference/auth — association Trakt par code d’appareil et renouvellement OAuth.
- https://github.com/SIMKL/API/blob/master/apiary.apib — association Simkl par PIN et export de synchronisation.

Les copies de référence sont ignorées par Git ; elles ne constituent pas encore l’application livrable.

## Constats dans le code officiel TV

- Profils : RPC sync_pull_profiles et sync_push_profiles. Identifiant profile_index côté profil, p_profile_id côté RPC de paramètres.
- Paramètres : sync_pull_profile_settings_blob et sync_push_profile_settings_blob avec p_profile_id et p_platform. La plateforme TV utilise tv. Le push utilise p_settings_json.
- Copie : sync_copy_profile_setup accepte notamment les identifiants source/cible et des sélections TV/Mobile/Desktop. Vérifier ses effets exacts avant usage.
- Addons : table addons filtrée par user_id et profile_id ; écriture via sync_push_addons. Champs url, name, enabled, sort_order.
- Plugins : sync_push_plugins ; champs url, name, enabled, sort_order, repo_type.
- Certains profils héritent des addons et plugins du profil principal : respecter uses_primary_addons et uses_primary_plugins.
- De nombreux paramètres du lecteur restent locaux à l’appareil ; les clés de fournisseurs suivent une synchronisation distincte. Ne pas présenter la copie du blob comme une copie de toutes les données.
- Les RPC Nuvio `sync_pull_watched_items` et `sync_pull_watch_progress` fournissent respectivement l’état vu et la dernière progression par profil. Ils ne constituent pas un journal détaillé de toutes les sessions de lecture.
- La configuration du backend et sa clé publique sont fournies au build officiel ; elles ne figurent pas dans les valeurs par défaut du dépôt. Le contrat d’authentification du site reste à vérifier.

## Statistiques et services de suivi

La page Statistiques agrège Nuvio avec les comptes Trakt/Simkl associés au profil. Trakt utilise `/oauth/device/code`, `/oauth/device/token` et l’historique paginé `/sync/history`. Simkl utilise son flux PIN puis les exports `/sync/all-items/{type}/{status}` avec les dates d’épisodes détaillées lorsqu’elles sont disponibles.

Les identifiants d’application, jetons et caches restent côté serveur dans les fichiers chiffrés. L’interface ne reçoit que l’état de configuration et de connexion. Les lectures Nuvio représentent des éléments marqués vus ; le temps suivi affiché est une estimation calculée depuis la dernière position enregistrée.

## Architecture envisagée pour le proxy

Conserver le moteur original et exécuter deux instances avec des volumes distincts : sortie directe et sortie SOCKS5 WARP. L’attribution d’un addon à un profil choisit son URL originale ou l’URL générée par l’une des deux instances. Cela évite de changer la sortie globale d’un proxy partagé lors de la configuration d’un autre profil.

Le réseau SOCKS5 reste interne à Docker. Le dashboard protège les routes de gestion ; les endpoints de manifest et de lecture restent accessibles aux lecteurs. Les liens de lecture sont chiffrés et expirent conformément au moteur d’origine. Seuls les flux HTTP/HTTPS sont relayés, pas les torrents.

## Étape nécessaire avant implémentation de la connexion

Examiner le site connecté avec le propriétaire pour inventorier les réglages effectivement exposés, vérifier la structure Mobile et choisir un mécanisme de connexion compatible. Ne pas récupérer les cookies ou mots de passe du navigateur. Prévoir un aperçu des changements et une sauvegarde avant toute copie ou écriture distante.
