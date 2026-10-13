# Déploiement derrière oauth2-proxy (Traefik ForwardAuth)

Le manager peut fonctionner derrière un portail d'authentification externe
(oauth2-proxy, Authelia, Authentik, Cloudflare Access…). Cette page décrit la
configuration supportée et lève les incompatibilités classiques.

## Principe

Deux authentifications cohabitent (« mode hybride ») :

1. **Proxy d'auth de confiance** — si la requête arrive d'une IP de proxy de
   confiance **et** porte un en-tête d'identité (`X-Auth-Request-User`,
   `X-Auth-Request-Email` ou `X-Forwarded-User`), elle est traitée comme
   l'administrateur, **sans** session locale : pas de double connexion.
2. **Login local du manager** — dans tous les autres cas, le comportement
   habituel s'applique (page de connexion, sessions `nm_session`).

Seules les requêtes venant d'une source de confiance peuvent poser ces
en-têtes : un client externe ne peut pas les falsifier.

## Variables d'environnement

| Variable            | Défaut                         | Rôle |
|---------------------|--------------------------------|------|
| `AUTH_PROXY`        | *désactivé*                    | `true` pour faire confiance à l'identité injectée par le proxy. |
| `TRUST_PROXY_IPS`   | boucle locale + réseau privé   | IPs/CIDR autorisés à poser `X-Forwarded-*` / `X-Auth-Request-*`. Laisse vide pour n'en faire confiance à aucune. |
| `PUBLIC_URL`        | *aucun*                        | Origine publique `https://…`. Recommandé ; sinon déduite de `X-Forwarded-Proto`/`X-Forwarded-Host` pour les proxys de confiance. |
| `SESSION_SAMESITE`  | `lax`                          | `lax` \| `strict` \| `none` pour le cookie `nm_session`. `lax` est nécessaire au retour OAuth. |
| `SESSION_DOMAIN`    | *aucun*                        | Attribut `Domain` du cookie (ex. `.example.com`). |
| `RELAY_PORT`        | *désactivé*                    | Port d'un second écouteur servant **uniquement** `/relay/**` (relais d'addons public), hors proxy d'auth. |
| `DISABLE_LOGIN`     | *désactivé*                    | Désactive complètement le login local (délégation totale au proxy). |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | —               | Créent l'admin sans passer par l'écran de première configuration. |

`AUTH_PROXY` et `DISABLE_LOGIN` peuvent être combinés : `AUTH_PROXY` conserve un
login local de repli, `DISABLE_LOGIN` le supprime entièrement.

## Exemple compose

```yaml
services:
  manager:
    image: ghcr.io/guiro28/nuvio-manager:latest
    environment:
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: change-moi-12-caracteres-minimum
      PUBLIC_URL: https://manager.example.com
      AUTH_PROXY: "true"
      TRUST_PROXY_IPS: "172.16.0.0/12"   # réseau du proxy (ici Docker)
      SESSION_SAMESITE: lax
    volumes:
      - manager-data:/app/data
volumes:
  manager-data:
```

## Traefik ForwardAuth (oauth2-proxy)

Configuration type :

```toml
[http.middlewares.middlewares-oauth2-proxy.forwardAuth]
  address = "http://oauth2-proxy:4180/oauth2/auth"
  trustForwardHeader = true
  authResponseHeaders = [
    "X-Auth-Request-User",
    "X-Auth-Request-Email",
    "X-Auth-Request-Preferred-Username"
  ]
```

Le service du manager doit **conserver l'en-tête `Host` d'origine**
(`passHostHeader = true`, défaut Traefik). Le manager accepte aussi
`X-Forwarded-Host`.

### Points spécifiques au manager

1. **Relais d'addons public** — les URL `/relay/**` sont consommées par les
   clients Nuvio/Tuvora **sans cookie d'authentification**. Elles doivent
   échapper au proxy d'auth, sinon les addons proxyfiés renvoient la page de
   connexion OAuth. Deux approches :

   - Exempter le chemin côté oauth2-proxy :

     ```text
     --skip-auth-route=^/relay/
     ```

     ou un routeur Traefik dédié sans la chaîne d'auth :

     ```toml
     [http.routers.manager-relay]
       rule = "Host(`manager.example.com`) && PathPrefix(`/relay/`)"
       service = "manager@docker"
       middlewares = ["chain-no-auth@file"]
     ```

   - Ou exposer le relais sur un port séparé avec `RELAY_PORT` et publier ce
     port **sans** passer par le proxy d'auth.

2. **Ne pas appliquer de middleware `errors` 401-403 au manager.** Certaines
   configurations Traefik réécrivent les réponses 401/403 par la page de
   connexion OAuth. Le manager utilise volontairement ces codes (connexion
   requise, accès refusé) ; un tel middleware masque les erreurs réelles et
   provoque des boucles. Retirez-le du routeur du manager (il reste utile pour
   les autres services).

3. **`X-Forwarded-Host` de confiance** — le manager ne déduit l'origine/hôte
   public des en-têtes `X-Forwarded-*` que si la requête vient d'une IP listée
   dans `TRUST_PROXY_IPS`.

## Dépannage

| Symptôme | Cause probable | Correctif |
|----------|----------------|-----------|
| Erreur JSON illisible dans l'interface | Un proxy remplace le corps 401/403 par du HTML | Retirer le middleware `errors` du manager (le front gère désormais le non-JSON). |
| Double authentification | Login local encore exigé derrière l'OAuth | `AUTH_PROXY=true` (repli conservé) ou `DISABLE_LOGIN=true` (délégation totale). |
| « Hôte non autorisé » / « Origine non autorisée » | `PUBLIC_URL` absent ou différent de l'origine navigateur | Définir `PUBLIC_URL` ; sinon vérifier `X-Forwarded-Proto`/`X-Forwarded-Host` et `TRUST_PROXY_IPS`. |
| Redirection/boucle OAuth | Middleware `errors` 401-403 sur le manager | Le retirer du routeur du manager. |
| Relais/addons cassés | `/relay/**` protégé par l'OAuth | `--skip-auth-route=^/relay/`, routeur dédié, ou `RELAY_PORT`. |

## Sécurité

- N'exposez jamais le port du manager directement : `AUTH_PROXY` et
  `DISABLE_LOGIN` supposent qu'un proxy amont contrôle **tous** les accès.
- `TRUST_PROXY_IPS` doit être le plus étroit possible (l'IP/réseau du proxy
  uniquement). Laissez-le vide pour désactiver la confiance.
- `SESSION_SAMESITE=none` exige HTTPS (le flag `Secure` est alors forcé).
