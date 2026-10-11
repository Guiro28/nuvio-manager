# Nuvio Manager

Dashboard auto-hébergé pour gérer plusieurs comptes et profils [Nuvio](https://nuvio.tv), ainsi que les comptes [Tuvora](https://tuvora.co).

> Projet communautaire indépendant, non affilié à Nuvio ni à Tuvora.

## Fonctionnalités

### Comptes & profils

- Plusieurs comptes **Nuvio** et **Tuvora**, chacun avec plusieurs profils.
- Connexion Nuvio par appairage TV (code), Tuvora par e-mail + mot de passe. **Le mot de passe n’est jamais stocké.**
- Identité de profil : nom, couleur, avatar (galerie Nuvio ou Xperience), héritage des addons/plugins du profil principal.
- Interface multilingue : français, anglais, espagnol, allemand, italien.

### Réglages & contenu

- Réglages **Apple TV** et **Mobile** par profil.
- **Catalogues d’accueil** : ordre d’affichage, activation, titres personnalisés.
- **Collections** : création et édition complète (dossiers, sources Addon / TMDB / Trakt), à l’image du dashboard officiel.
- **Bibliothèque d’addons** avec attribution par profil.

### Proxy d’addons intégré

- Relais **direct** (interne) ou via **proxy externe** HTTP, HTTPS, SOCKS4 ou SOCKS5 (compatible Cloudflare WARP).
- **URL de relais uniques par profil et révocables** : supprimer un compte ou retirer un addon coupe immédiatement le lien ; le clonage régénère des URL propres au profil cible.
- Compteurs de bande passante (interne / externe).

### Clonage de profils

- Copie **complète ou partielle** entre profils (réglages TV/Mobile, addons, plugins, catalogues, collections), y compris entre comptes et entre Nuvio et Tuvora.
- Garde-fous : sens de la copie affiché, avertissement en cas de perte de données, protection contre l’écrasement par une source vide.

### Suivi & statistiques

- Connexion facultative à **Trakt** et **Simkl** ; exclusion possible de l’historique Nuvio par profil.
- Historique, progression et bibliothèque par profil.
- **Statistiques** avec activité quotidienne cliquable (détail par jour : profils et contenus vus, fiches films/séries) et enrichissement **TMDB** (titres localisés, synopsis, affiches).

### Spécifique Tuvora

- **Playlists IPTV** par profil (Xtream, M3U, Stalker).
- **Guide des sports** : ligues et équipes suivies.

### Sauvegardes & données

- **Sauvegardes chiffrées** du compte avec restauration (et repli automatique si l’API refuse la restauration).
- Toutes les données locales (comptes, sessions, réglages, sauvegardes) sont **chiffrées au repos**.

### Interface & exploitation

- Tableau de bord d’accueil : mémoire, processeur, disponibilité, bande passante et état réseau/proxy.
- Thème sombre et clair.
- Version du manager affichée dans la barre latérale (clic vers le commit) et liens Discord et GitHub.
- Images Docker multi-architecture (AMD64 / ARM64).

## Installation avec Docker

```sh
git clone https://github.com/Guiro28/nuvio-manager.git
cd nuvio-manager
docker compose pull
docker compose up -d
docker logs nuvio-manager
```

Ouvrir ensuite :

```text
http://ADRESSE-DU-SERVEUR:3100
```

Lors de la première ouverture, le dashboard demande :

- Le code affiché par `docker logs nuvio-manager`.
- Le nom et le mot de passe de l’administrateur.
- L’adresse publique du dashboard.

Aucun fichier `.env` n’est nécessaire.

## Variante avec WARP

Pour lancer Nuvio Manager avec un conteneur Cloudflare WARP :

```sh
docker compose -f compose.warp.yaml pull
docker compose -f compose.warp.yaml up -d
```

Dans **Paramètres > Proxy externe**, utiliser :

```text
socks5://warp:1080
```

Le dashboard accepte également les proxys HTTP, HTTPS, SOCKS4 et SOCKS5 hébergés localement ou à distance.

## Reverse proxy

Pour utiliser un domaine HTTPS, placer Caddy, Nginx ou Traefik devant le port `3100`, puis enregistrer le domaine dans **Paramètres > Adresse publique**.

Exemple Caddy :

```caddy
manager.example.com {
    reverse_proxy 127.0.0.1:3100
}
```

## Mise à jour

```sh
git pull
docker compose pull
docker compose up -d
```

Avec WARP :

```sh
git pull
docker compose -f compose.warp.yaml pull
docker compose -f compose.warp.yaml up -d
```

## Développement local

Nécessite Node.js 24 ou supérieur.

```sh
npm ci
npm run dev
```

Le dashboard est disponible sur [http://localhost:3100](http://localhost:3100).

Lancer les tests :

```sh
npm test
```

## Données

Les comptes, sessions, réglages et sauvegardes sont conservés dans le volume Docker `manager-data`. Conservez ce volume lors des mises à jour ou migrations.

Les images Docker sont publiées pour les architectures AMD64 et ARM64 :

```text
ghcr.io/guiro28/nuvio-manager:latest
```
