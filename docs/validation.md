# Validation — 14 septembre 2026

## Vérifié

- Dashboard lancé avec `npm run dev` sur localhost:3100.
- Appairage réel approuvé par le propriétaire sur nuvio.tv ; chargement des deux profils, des paramètres TV et Mobile et des 12 addons du profil principal.
- Aperçu de copie TV réel entre les deux profils, sans application des changements.
- Export de sauvegarde réel créé avec succès et stocké chiffré localement.
- Quatre tests automatisés : copie sélective sans perte des autres champs, protection des prototypes, chiffrement et détection de corruption, scénario API complet sur faux backend.
- Le scénario API couvre authentification du dashboard, refus d’origine externe, appairage, catalogue, copie, conflit, sauvegarde, écritures partielles et héritage.
- Vérification syntaxique des fichiers JavaScript.

## Limites de cette vérification

- Aucun enregistrement de réglages n’a été effectué sur le compte Nuvio réel. Les écritures sont testées sur un backend simulant les contrats officiels.
- Docker n’est pas installé dans l’environnement : les images, le streaming vidéo et la sortie WARP doivent encore être testés sur le VPS ou sur une machine Docker.
- Le catalogue des paramètres est extrait du code des clients : 165 clés TV et 116 clés Mobile. Il complète l’édition des clés déjà présentes ; il ne représente pas une promesse de compatibilité de toutes les valeurs sur toutes les versions d’application.
- Les visuels dans `docs/design` sont des propositions graphiques, pas des captures du produit implémenté.
