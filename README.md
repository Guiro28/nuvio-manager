# Nuvio Manager

Dashboard auto-hébergé pour gérer plusieurs comptes et profils [Nuvio](https://nuvio.tv).

> Projet communautaire indépendant, non affilié à Nuvio.

## Fonctionnalités

- Gestion de plusieurs comptes et profils Nuvio.
- Réglages ATV et Mobile en français.
- Copie complète ou partielle des paramètres entre profils.
- Bibliothèque d’addons avec attribution par profil.
- Proxy direct ou proxy externe HTTP/SOCKS par addon.
- Historique, progression, bibliothèque et statistiques.
- Connexion facultative à Trakt et Simkl.
- Enrichissement des contenus avec TMDB.
- Sauvegardes chiffrées.
- Thème sombre et clair.

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
