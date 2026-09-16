# Thème Aurora et retour arrière

Le thème Aurora est isolé dans `public/aurora.css`. La feuille est chargée après le thème historique par `public/index.html`.

## Désactivation rapide

Pour retrouver immédiatement le design précédent, retirer cette ligne de `public/index.html` :

```html
<link rel="stylesheet" href="/aurora.css" />
```

La logique, les comptes, les profils et les données ne sont pas concernés.

## Restauration complète

Une copie complète vérifiée avant l’intégration d’Aurora est conservée localement à côté du dossier du projet. Elle n’est volontairement pas versionnée, car elle contient les données locales chiffrées présentes au moment de la copie.
