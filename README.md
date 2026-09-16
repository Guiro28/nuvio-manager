# Nuvio Manager

Dashboard privé en français pour les comptes Nuvio. Node.js 24. Le moteur réseau de `stremio-addon-proxy` est intégré au serveur afin de choisir une sortie directe ou un proxy externe pour chaque addon.

## Développement local

```powershell
npm ci
npm run dev
```

Ouvrir http://localhost:3100. Par défaut, le serveur écoute uniquement sur `127.0.0.1` en développement.

Lors de la première ouverture, récupérer le code affiché dans le terminal, puis créer l’administrateur et confirmer l’adresse du dashboard dans l’assistant.

La connexion au site nuvio.tv dans un navigateur n’est pas automatiquement partagée avec le dashboard : cliquer **Connecter un compte** et valider le code sur Nuvio. Les tokens sont conservés chiffrés dans `data/`, jamais dans le navigateur ni dans Git.

## VPS avec Docker

Une image multiarchitecture pour AMD64 et ARM64 est publiée automatiquement dans le registre privé GitHub Container Registry :

```sh
echo "$GHCR_TOKEN" | docker login ghcr.io -u Guiro28 --password-stdin
docker pull ghcr.io/guiro28/nuvio-manager:latest
```

Le jeton GitHub utilisé sur le VPS doit disposer du droit `read:packages`. Pour lancer uniquement le dashboard avec l’image préconstruite :

```sh
docker run -d \
  --name nuvio-manager \
  --restart unless-stopped \
  -p 127.0.0.1:3100:3100 \
  -v nuvio-manager-data:/app/data \
  ghcr.io/guiro28/nuvio-manager:latest
```

Cette commande lance le dashboard et son proxy direct intégré. Aucun fichier `.env` n’est requis.

1. Se connecter à GHCR avec un jeton `read:packages`.
2. Démarrer le dashboard.
3. Lire le code de première configuration.

```sh
docker compose pull
docker compose up -d
docker logs nuvio-manager
```

Ouvrir ensuite le domaine du dashboard. L’assistant demande le code affiché dans les journaux, le nom d’utilisateur, le mot de passe administrateur et l’adresse publique. Placer un reverse proxy HTTPS devant `127.0.0.1:3100`. Exemple Caddy :

```caddy
manager.example.com {
    reverse_proxy 127.0.0.1:3100
}
```

Les routes `/relay/direct/*` et `/relay/warp/*` doivent rester accessibles aux lecteurs. Les routes de gestion exigent le mot de passe du dashboard. Ne pas ajouter d’authentification HTTP globale devant les routes de lecture. Le proxy ne relaie que les flux directs HTTP/HTTPS, conformément au projet d’origine.

### Utiliser un proxy ou un conteneur WARP existant

Ouvrir **Paramètres > Proxy externe** dans le dashboard pour enregistrer et tester une URL `http://`, `https://`, `socks://`, `socks4://` ou `socks5://`. La valeur est chiffrée dans les données du panel et s’applique immédiatement aux addons attribués au mode **Proxy externe**. Elle peut contenir les identifiants du proxy, par exemple `socks5://utilisateur:mot-de-passe@serveur:1080`.

Pour un proxy hébergé ailleurs, saisir simplement son URL publique ou privée accessible depuis le serveur. Pour un conteneur WARP présent sur le même serveur, la méthode recommandée consiste à le raccorder au réseau créé par Nuvio Manager :

```sh
docker compose up -d manager
docker network connect --alias warp-existant nuvio-manager_default votre-conteneur-warp
```

Saisir ensuite cette URL dans le dashboard :

```text
socks5://warp-existant:1080
```

Si le SOCKS5 de WARP est déjà publié sur un port de l’hôte accessible aux conteneurs, utiliser plutôt :

```text
socks5://host.docker.internal:40000
```

L’entrée `host.docker.internal` est configurée par `compose.yaml`, y compris sous Docker Engine Linux. Un port publié uniquement sur `127.0.0.1` de l’hôte n’est généralement pas joignable depuis un conteneur ; le réseau Docker partagé évite d’exposer ce port. Contrôler ensuite la connexion et l’IP de sortie depuis **Proxy**.

L’adresse du proxy se règle uniquement dans le dashboard. Aucun redémarrage du conteneur n’est nécessaire pour la remplacer ou la désactiver.

## Fonctions

- Plusieurs comptes par appairage officiel Nuvio, renouvellement des sessions côté serveur.
- Consultation, création et renommage des profils ; héritage des addons/plugins.
- Page Statistiques dédiée : comparaison multi-profils, périodes de 30/90/365 jours ou historique complet, activité quotidienne, contenus dominants, historique commun et activité récente.
- Association facultative d’un compte Trakt et/ou Simkl à chaque profil Nuvio par code d’appareil, sans transmettre le mot de passe au dashboard.
- Édition des paramètres synchronisés ATV et Mobile, champs typés et JSON avancé ; préservation des clés inconnues.
- Gestion des addons et plugins par profil, activation et ordre.
- Catalogue d’addons indépendant ; attribution manuelle sans proxy, via proxy direct ou via un proxy externe HTTP/SOCKS.
- Copie entre comptes et profils, plateformes entières ou paramètres précis ; remplacement ou fusion des listes.
- Aperçu avant application ; sauvegarde chiffrée du compte cible ; contrôle des modifications concurrentes. Le RPC protégé Nuvio est requis pour écrire les paramètres : aucune dégradation silencieuse vers une écriture non protégée.
- Exports de sauvegarde JSON au format renvoyé par Nuvio. La restauration globale n’est pas automatisée.

## Limites et fonctionnement

Les réglages locaux aux appareils ne sont pas modifiables via la synchronisation. L’interface édite les valeurs présentes dans les blobs Nuvio ; elle ne reproduit pas encore tous les sélecteurs et validations spécialisés du site officiel. Les droits Supporter restent contrôlés par Nuvio. Les données d’historique/bibliothèque et les identifiants fournisseurs stockés hors des blobs ne sont pas copiés.

Les écritures de plusieurs catégories Nuvio ne sont pas une transaction globale : si une catégorie échoue, le dashboard indique celles déjà enregistrées et conserve la sauvegarde. Les modifications concurrentes des paramètres sont protégées par Nuvio ; les listes addons/plugins disposent d’un contrôle avant envoi mais leur API n’offre pas la même atomicité.

Conserver les volumes Docker et la clé `master.key` avec les fichiers chiffrés lors d’une sauvegarde du serveur. La perte de cette clé rend les sessions et exports chiffrés illisibles. Les copies et exports peuvent contenir des URL d’addons avec identifiants.

## Vérifications

```sh
npm test
```

Voir `docs/integration-notes.md` pour les sources examinées. Aucune modification des comptes réels n’est nécessaire aux tests automatisés.

### Paramètres du panel

Le menu Paramètres permet d’enregistrer l’adresse publique, le proxy externe, une clé TMDB et de modifier les identifiants administrateur. Les secrets sont chiffrés dans `data/panel-settings.enc` ; le mot de passe est haché avec scrypt et un sel aléatoire. Aucun identifiant administrateur ni réglage réseau sensible n’est requis dans les variables d’environnement.

Une modification des identifiants révoque toutes les autres sessions. Sur une installation neuve, le code de configuration change à chaque redémarrage tant que l’administrateur n’a pas été créé.

La clé TMDB enrichit les onglets Progression, Bibliothèque, Déjà vus et Statistiques. Les identifiants IMDb synchronisés par Nuvio sont résolus via TMDB et le dashboard affiche le titre français, la jaquette, le résumé, l’année, les genres et la note. Les réponses sont mises en cache pendant sept jours dans data/tmdb-cache.enc. Une erreur TMDB n’empêche jamais l’affichage des données Nuvio.

### Statistiques et comptes de suivi

La page **Statistiques** fonctionne immédiatement avec l’historique et la progression de Nuvio. Le sélecteur permet de comparer tous les profils ou seulement certains d’entre eux. Les calculs sont mis en cache cinq minutes ; le bouton **Actualiser** force une nouvelle synchronisation.

Pour compléter un profil avec Trakt ou Simkl :

1. Créer ses propres applications chez [Trakt](https://trakt.tv/oauth/applications) et/ou [Simkl](https://simkl.com/settings/developer/new/).
2. Renseigner les identifiants d’application dans **Paramètres > Trakt et Simkl**. Simkl attend l’URI de redirection `urn:ietf:wg:oauth:2.0:oob`.
3. Ouvrir le profil Nuvio, puis l’onglet **Trakt & Simkl**, et valider le code sur le site du service.

Les jetons, secrets et caches d’historique sont chiffrés dans le volume `data`. Les mots de passe Trakt et Simkl ne passent jamais par le dashboard. L’historique Trakt conserve les événements de lecture disponibles via son endpoint de synchronisation. Nuvio conserve surtout l’état vu et la dernière progression ; son temps de visionnage est donc estimé à partir de cette progression, et Simkl dépend des dates d’épisodes que son export fournit.
