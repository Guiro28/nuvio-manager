# Rapport complet des paramètres Nuvio TV et Mobile

**Audit effectué le 15 septembre 2026.** Ce document recense les contrôles de la page Compte de Nuvio, puis les recoupe avec le schéma extrait du site et le code officiel des applications. Les valeurs personnelles du compte, les jetons et les clés API ne sont jamais reproduits.

## Résultat de l’inventaire

| Plateforme | Onglets visibles sur nuvio.tv | Réglages exposés | Réglages supplémentaires trouvés dans le code de l’app |
|---|---:|---:|---:|
| TV | 6 | 153 | 0 |
| Mobile | 7 | 148 | 2 |
| **Total** | **13** | **301** | **2** |

Les 301 réglages ci-dessous correspondent à l’interface web actuelle. Les deux réglages Mobile uniquement présents dans le code sont placés dans une annexe séparée. Les lignes marquées « Condition » sont bien prises en charge, mais le site les masque tant que leur réglage parent n’est pas activé ou que le mode correspondant n’est pas choisi.

Constats importants : le réglage **Version** n’existe dans aucune des deux listes officielles actuelles ; l’onglet TV Appearance mentionne une langue dans son texte d’introduction mais n’affiche aucun sélecteur de langue ; la clé API TMDB est exposée dans les réglages Mobile, tandis que les réglages TV n’affichent que l’activation et les options d’enrichissement.

La colonne **Clé interne** est destinée à l’intégration dans le dashboard. Elle ne doit pas être affichée à l’utilisateur dans l’interface finale.

# Paramètres TV

## Apparence (5)

Nom actuel sur le site : **Appearance**. Le site annonce le thème de couleur, la police et la langue. L’interface actuelle ne contient toutefois aucun sélecteur de langue dans cet onglet.

### Thème de couleur

Choisir la couleur d’accent et le rendu AMOLED.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 1 | **Thème de couleur**<br><code>theme_settings.selected_theme</code> | — | Pastilles : Cramoisi (#E53935) ; Océan (#1E88E5) ; Violet (#7E57C2) ; Émeraude (#43A047) ; Ambre (#FFB300) ; Rose (#EC407A) ; Blanc (#F7F7F4) ; Or (Supporter) (#FFD45C) ; Jade (Supporter) (#7BF08D) ; Or rose (Supporter) (#FFB37A) ; Bleu arctique (Supporter) (#4DE3FF) ; Graphite (Supporter) (#AAB2BE)<br>Défaut : Blanc |
| 2 | **Mode AMOLED**<br><code>theme_settings.amoled_mode</code> | Utiliser un noir pur pour les arrière-plans de l’application | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 3 | **Surfaces noir pur**<br><code>theme_settings.amoled_surfaces_mode</code> | Mettre aussi les cartes, panneaux et conteneurs en noir pur | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé<br>Condition : Affiché lorsque le mode AMOLED est activé. |

### Police de l’application

Choisir la police utilisée par l’application.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 4 | **Police de l’application**<br><code>theme_settings.selected_font</code> | Choisissez votre police préférée | Liste déroulante : Inter ; DM Sans ; Open Sans<br>Défaut : Inter |

### Style des paramètres

Choisir l’organisation de l’application Paramètres sur TV.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 5 | **Style des paramètres**<br><code>theme_settings.settings_ui_style</code> | — | Boutons de choix : Par défaut — Disposition standard des paramètres avec des cartes. ; Minimal — Disposition simple et plus plate des paramètres. ; Barre supérieure — Placer la navigation des paramètres dans des onglets en haut.<br>Défaut : Par défaut |

## Expérience (1)

Nom actuel sur le site : **Experience**. Choisir une expérience Essentielle ou Avancée.

### Mode d’expérience

Commencer simplement ou déverrouiller toutes les personnalisations ; ce choix peut être modifié à tout moment.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 6 | **Mode d’expérience**<br><code>experience_settings.mode</code> | — | Boutons de choix : Essentiel — Configuration ciblée : addons, lecture essentielle, Trakt et compte. ; Avancé — Tous les paramètres : disposition, ordre des catalogues, collections, plugins et diagnostics.<br>Défaut : Avancé |

## Disposition (49)

Nom actuel sur le site : **Layout**. Structure de l’accueil et styles des affiches.

### Disposition de l’accueil

Choisir la structure de l’accueil et la source du Hero.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 7 | **Disposition de l’accueil**<br><code>layout_settings.selected_layout</code> | — | Boutons de choix : Vue classique — Parcourir les catégories horizontalement. ; Vue en grille — Tout parcourir dans une grille verticale avec une section Hero. ; Vue moderne — Hero fixe avec une seule rangée active pour accélérer la navigation.<br>Défaut : Vue moderne |
| 8 | **Affiches en mode paysage**<br><code>layout_settings.modern_landscape_posters_enabled</code> | Alterner entre les cartes portrait et paysage pour la vue moderne. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 9 | **Arrière-plan en plein écran**<br><code>layout_settings.modern_hero_full_screen_backdrop</code> | Étendre l’arrière-plan pour couvrir la totalité de l’écran. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 10 | **Dégradé de l’élément sélectionné**<br><code>layout_settings.classic_focus_gradient_enabled</code> | Mélanger les couleurs de l’illustration vers la droite de l’accueil classique. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |

### Contenu de l’accueil

Contrôler ce qui apparaît sur l’accueil et dans la recherche.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 11 | **Réduire la barre latérale**<br><code>layout_settings.sidebar_collapsed_by_default</code> | Masquer la barre latérale par défaut ; l’afficher à la sélection. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 12 | **Barre latérale moderne**<br><code>layout_settings.modern_sidebar_enabled</code> | Activer la navigation par barre latérale flottante. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 13 | **Flou de la barre latérale moderne**<br><code>layout_settings.modern_sidebar_blur_enabled</code> | Activer l’effet de flou pour les surfaces de la barre latérale moderne. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé<br>Condition : Affiché lorsque la barre latérale moderne est activée. |
| 14 | **Afficher le Hero**<br><code>layout_settings.hero_section_enabled</code> | Afficher un carrousel Hero en vedette en haut de l’accueil. Choisissez jusqu’à 2 catalogues sources ci-dessous. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 15 | **Emplacement de Découvrir**<br><code>layout_settings.discover_location</code> | Afficher la section navigation quand la recherche est vide. | Liste déroulante : Désactivé ; Afficher dans Recherche — Découvrir apparaît dans l’onglet Recherche. ; Afficher dans le panneau latéral — Découvrir possède sa propre entrée dans le panneau latéral.<br>Défaut : Afficher dans Recherche |
| 16 | **Afficher les titres des affiches**<br><code>layout_settings.poster_labels_enabled</code> | Afficher les titres sous les affiches dans les rangées, la grille et la vue complète. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 17 | **Afficher le nom de l’addon**<br><code>layout_settings.catalog_addon_name_enabled</code> | Afficher le nom de la source sous les titres de catalogue. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 18 | **Afficher le type de catalogue**<br><code>layout_settings.catalog_type_suffix_enabled</code> | Afficher le suffixe de type à côté du nom du catalogue (film/série). | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 19 | **Masquer le contenu non sorti**<br><code>layout_settings.hide_unreleased_content</code> | Masque les films et séries qui ne sont pas encore sortis. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 20 | **Notes IMDb sur l’accueil**<br><code>layout_settings.home_imdb_ratings_visibility</code> | — | Boutons de choix : Afficher ; Masquer<br>Défaut : Afficher |

### Page de détail

Réglages des fiches de contenu et des écrans d’épisodes.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 21 | **Flouter les épisodes non vus**<br><code>layout_settings.blur_unwatched_episodes</code> | Floute les vignettes d’épisodes jusqu’à leur visionnage pour éviter les spoilers. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 22 | **Lecture automatique des bandes-annonces**<br><code>trailer_settings.trailer_enabled</code> | Lire automatiquement les bandes-annonces sur la fiche après une période d’inactivité. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 23 | **Délai de la bande-annonce**<br><code>trailer_settings.trailer_delay_seconds</code> | — | Champ numérique : min. 0, pas 1<br>Défaut : 7<br>Condition : Affiché lorsque la lecture automatique des bandes-annonces est activée. |
| 24 | **Afficher le bouton bande-annonce**<br><code>layout_settings.detail_page_trailer_button_enabled</code> | Afficher le bouton bande-annonce sur la page de détail (uniquement quand une bande-annonce est disponible). | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 25 | **Préférer les métadonnées de l’addon externe**<br><code>layout_settings.prefer_external_meta_addon_detail</code> | Utiliser les métadonnées de l’addon externe au lieu de l’addon de catalogue. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 26 | **Afficher la date de sortie complète**<br><code>layout_settings.show_full_release_date</code> | Pour les films, afficher la date de sortie complète au lieu de l’année seulement. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 27 | **Notes IMDb sur la fiche**<br><code>layout_settings.detail_imdb_ratings_visibility</code> | — | Liste déroulante : Tout afficher ; Masquer les notes des épisodes ; Masquer les notes des épisodes non vus<br>Défaut : Tout afficher |

### Streams

Régler les informations visuelles affichées sur les sources.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 28 | **Badges de taille**<br><code>stream_badge_settings.show_file_size_badges</code> | Affiche les badges de taille de fichier dans les résultats de flux et les panneaux de source du lecteur. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 29 | **Logo de l’addon**<br><code>stream_badge_settings.show_addon_logo</code> | Affiche le logo et le nom de l’addon à côté des sources de streams. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 30 | **Position des badges**<br><code>stream_badge_settings.stream_badge_placement</code> | Choisissez si les badges Fusion et de taille apparaissent au-dessus ou en dessous des cartes de flux. | Boutons de choix : En haut ; En bas<br>Défaut : En bas |
| 31 | **URL de badges Fusion**<br><code>stream_badge_settings.stream_badge_rules</code> | Importer depuis une URL un fichier JSON de badges de stream au format Fusion. | URL d’import JSON Fusion, avec actions Importer et Effacer<br>Défaut : Vide |

### Continuer à regarder

Régler l’affichage et l’ordre des éléments à reprendre.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 32 | **Afficher Continuer à regarder**<br><code>layout_settings.continue_watching_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 33 | **Style des cartes**<br><code>layout_settings.continue_watching_card_style</code> | — | Boutons de choix : Carte ; Large ; Affiche<br>Défaut : Carte |
| 34 | **Utiliser les miniatures d’épisodes dans Continuer à regarder**<br><code>layout_settings.use_episode_thumbnails_in_cw</code> | Utilise les miniatures d’épisodes comme image par défaut. Quand désactivé, utilise l’image de fond. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 35 | **Flouter le contenu non vu dans Continuer à regarder**<br><code>layout_settings.blur_continue_watching_next_up</code> | Flouter les miniatures du prochain épisode dans Continuer à regarder afin d’éviter les spoilers. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 36 | **Suivant à partir de l’épisode le plus avancé**<br><code>layout_settings.next_up_from_furthest_episode</code> | Quand activé, La suite reprend toujours depuis l’épisode le plus avancé vu. Quand désactivé, suit l’épisode le plus récemment visionné. Utile si vous revoyez des épisodes précédents. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 37 | **Afficher les épisodes à venir non diffusés**<br><code>layout_settings.show_unaired_next_up</code> | Incluez les épisodes à venir dans Continuer à regarder avant leur diffusion. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 38 | **Ordre de tri**<br><code>layout_settings.continue_watching_sort_mode</code> | Comment les éléments Continuer à regarder sont organisés | Liste déroulante : Par défaut — Trier tous les éléments par date d’activité. ; Style streaming — Placer les éléments sortis en premier et ceux à venir à la fin. ; Séparer les épisodes à venir — Déplacer les épisodes à venir dans une rangée séparée.<br>Défaut : Par défaut |

### Affiche sélectionnée

Régler l’extension de l’affiche sélectionnée et l’aperçu vidéo.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 39 | **Étendre l’affiche sélectionnée en arrière-plan**<br><code>layout_settings.focused_poster_backdrop_expand_enabled</code> | Étendre l’affiche sélectionnée après un délai d’inactivité. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 40 | **Délai d’expansion de l’arrière-plan**<br><code>layout_settings.focused_poster_backdrop_expand_delay_seconds</code> | Temps d’attente avant d’étendre les cartes sélectionnées. | Champ numérique : min. 0, pas 1<br>Défaut : 3 |
| 41 | **Lecture auto de la bande-annonce**<br><code>layout_settings.focused_poster_backdrop_trailer_enabled</code> | Lire l’aperçu de la bande-annonce pour le contenu sélectionné si disponible. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 42 | **Lire la bande-annonce en sourdine**<br><code>layout_settings.focused_poster_backdrop_trailer_muted</code> | Couper le son de la bande-annonce pendant l’aperçu automatique. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 43 | **Emplacement de la bande-annonce (moderne)**<br><code>layout_settings.focused_poster_backdrop_trailer_playback_target</code> | Choisir où la bande-annonce est lue dans l’accueil moderne. | Boutons de choix : Carte étendue ; Zone Hero<br>Défaut : Zone Hero |

### Style des cartes d’affiche

Régler les dimensions et les coins des cartes.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 44 | **Largeur de carte**<br><code>layout_settings.poster_card_width_dp</code> | — | Curseur : 104 à 140, pas 1 dp<br>Défaut : 126 dp |
| 45 | **Hauteur**<br><code>layout_settings.poster_card_height_dp</code> | — | Champ numérique : min. 120, pas 1 dp<br>Défaut : 189 dp |
| 46 | **Rayon de carte**<br><code>layout_settings.poster_card_corner_radius_dp</code> | — | Curseur : 0 à 16, pas 1 dp<br>Défaut : 12 dp |

### Relief des cartes

Ajouter une lumière de bord et un reflet aux cartes.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 47 | **Activer le relief des cartes**<br><code>layout_settings.card_depth_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 48 | **Lueur des bordures**<br><code>layout_settings.card_depth_edge_strength</code> | — | Boutons de choix : Subtil ; Équilibré ; Gras<br>Défaut : Subtil<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 49 | **Reflet supérieur**<br><code>layout_settings.card_depth_sheen_strength</code> | — | Boutons de choix : Désactivé ; Doux ; Lumineux<br>Défaut : Doux<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 50 | **Étendue des bordures**<br><code>layout_settings.card_depth_edge_coverage</code> | — | Boutons de choix : Haut uniquement ; Moitié ; Contour complet<br>Défaut : Haut uniquement<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 51 | **Affiches**<br><code>layout_settings.card_depth_posters_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 52 | **Continuer à regarder**<br><code>layout_settings.card_depth_continue_watching_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 53 | **Cartes d’épisodes**<br><code>layout_settings.card_depth_episode_cards_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 54 | **Casting**<br><code>layout_settings.card_depth_cast_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 55 | **Bandes-annonces**<br><code>layout_settings.card_depth_trailers_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |

## Lecture (42)

Nom actuel sur le site : **Playback**. Lecteur, sous-titres et lecture automatique.

### Général

Comportement général du lecteur et informations affichées.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 56 | **Afficher la superposition de chargement**<br><code>player_settings.loading_overlay_enabled</code> | Afficher la superposition de chargement initiale pendant le démarrage d’un stream. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 57 | **Afficher l’état de chargement**<br><code>player_settings.show_player_loading_status</code> | Afficher l’état de chargement des sources pendant l’attente des streams. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 58 | **Superposition en pause**<br><code>player_settings.pause_overlay_enabled</code> | Afficher les détails après 5 secondes de pause. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 59 | **Horloge OSD**<br><code>player_settings.osd_clock_enabled</code> | Afficher l’heure actuelle et l’heure de fin lorsque les contrôles sont visibles. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 60 | **Passer l’intro**<br><code>player_settings.skip_intro_enabled</code> | Afficher un bouton de saut lors des segments d’intro, d’outro et de récapitulatif détectés. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 61 | **Avertissements de contenu**<br><code>player_settings.parental_guide_enabled</code> | Afficher l’avertissement de contrôle parental au démarrage de la lecture. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 62 | **Saut automatique**<br><code>player_settings.auto_skip_segment_types</code> | Choisissez les segments à passer automatiquement. | Sélection multiple : Intro / Générique de début ; Récap ; Outro / Générique de fin<br>Défaut : Aucune sélection |

### Lecteur et sélection des streams

Réutilisation des liens, sélection automatique et passage à l’épisode suivant.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 63 | **Réutiliser le dernier lien**<br><code>player_settings.stream_reuse_last_link_enabled</code> | Lire automatiquement votre dernier stream fonctionnel pour ce même film/épisode lorsque le cache est encore valide. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 64 | **Durée du cache du dernier lien**<br><code>player_settings.stream_reuse_last_link_cache_hours</code> | — | Champ numérique : min. 1, max. 168, pas 1 h<br>Défaut : 24 h<br>Condition : Affiché lorsque la réutilisation du dernier lien est activée. |
| 65 | **Mode de sélection du stream**<br><code>player_settings.stream_auto_play_mode</code> | — | Liste déroulante : Manuel — Toujours afficher la liste des sources pour choisir manuellement. ; Premier stream disponible — Lire automatiquement la première source disponible. ; Correspondance regex — Lire la première source dont le texte correspond à l’expression régulière.<br>Défaut : Manuel |
| 66 | **Délai d’expiration du stream**<br><code>player_settings.stream_auto_play_timeout_seconds</code> | Combien de temps attendre les streams avant la sélection automatique. | Liste déroulante : Instantané ; 1 s ; 2 s ; 3 s ; 4 s ; 5 s ; 6 s ; 7 s ; 8 s ; 9 s ; 10 s ; 15 s ; 20 s ; 25 s ; 30 s ; Illimité<br>Défaut : 3 s |
| 67 | **Lecture automatique de l’épisode suivant**<br><code>player_settings.stream_auto_play_next_episode_enabled</code> | Rechercher et lire automatiquement l’épisode suivant lorsque le seuil est atteint. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 68 | **Utiliser le premier flux en secours**<br><code>player_settings.stream_auto_play_next_episode_fallback_enabled</code> | Quand la sélection est manuelle, essayer automatiquement la première source pour l’épisode suivant. | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Dépend de la lecture automatique de l’épisode suivant et du mode manuel. |
| 69 | **Vous regardez toujours ?**<br><code>player_settings.still_watching_enabled</code> | Demander après plusieurs épisodes lus automatiquement à la suite. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 70 | **Nombre d’épisodes avant confirmation**<br><code>player_settings.still_watching_episode_threshold</code> | Nombre d’épisodes lus automatiquement avant de demander une confirmation. | Curseur : 2 à 6, pas 1<br>Défaut : 3<br>Condition : Affiché lorsque « Vous regardez toujours ? » est activé. |
| 71 | **Préférer le groupe binge**<br><code>player_settings.stream_auto_play_prefer_bingegroup_next_episode</code> | Lors de la lecture automatique, préférer un stream du même groupe binge que le stream actuel. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 72 | **Réutiliser le groupe de binge**<br><code>player_settings.stream_auto_play_reuse_binge_group</code> | Mémorise et réutilise le dernier groupe de binge entre les sessions (Continuer à regarder, Détails, etc.). | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 73 | **Mode de seuil**<br><code>player_settings.next_episode_threshold_mode</code> | — | Boutons de choix : Pourcentage — Afficher selon le pourcentage de lecture lorsqu’aucun horodatage de fin n’est disponible. ; Minutes avant la fin — Afficher ce nombre de minutes avant la fin lorsqu’aucun horodatage de fin n’est disponible.<br>Défaut : Pourcentage |
| 74 | **Pourcentage de seuil**<br><code>player_settings.next_episode_threshold_percent_v2</code> | Afficher la carte de l’épisode suivant lorsque la lecture atteint ce pourcentage. | Curseur : 97 à 100, pas 0.5 %<br>Défaut : 99 %<br>Condition : Affiché avec le mode de seuil Pourcentage. |
| 75 | **Minutes avant la fin**<br><code>player_settings.next_episode_threshold_minutes_before_end_v2</code> | Afficher la carte de l’épisode suivant lorsque la lecture atteint ce pourcentage. | Curseur : 0 à 3.5, pas 0.5 min<br>Défaut : 2 min<br>Condition : Affiché avec le mode Minutes avant la fin. |
| 76 | **Périmètre des sources**<br><code>player_settings.stream_auto_play_source</code> | — | Liste déroulante : Toutes les sources — La lecture automatique peut utiliser les addons installés et les plugins activés. ; Addons installés uniquement — La lecture automatique ne considère que les streams des addons installés. ; Plugins activés uniquement — La lecture automatique ne considère que les streams des plugins activés.<br>Défaut : Toutes les sources |
| 77 | **Addons autorisés**<br><code>player_settings.stream_auto_play_selected_addons</code> | Ne rien sélectionner pour autoriser tous les addons installés. | Sélection multiple dynamique : addons installés sur le profil<br>Défaut : Aucune sélection<br>Condition : Liste dynamique des addons du profil ; pertinente pour le périmètre Addons. |
| 78 | **Plugins autorisés**<br><code>player_settings.stream_auto_play_selected_plugins</code> | Ne rien sélectionner pour autoriser tous les plugins activés. | Sélection multiple dynamique : plugins activés sur le profil<br>Défaut : Aucune sélection<br>Condition : Liste dynamique des plugins du profil ; pertinente pour le périmètre Plugins. |
| 79 | **Modèle regex**<br><code>player_settings.stream_auto_play_regex</code> | Correspond au nom du stream, à l’étiquette, à la description, à l’addon et à l’URL. | Champ texte<br>Défaut : Vide<br>Condition : Utilisé avec le mode Correspondance regex. |

### Audio et vidéo

Préférences de langue audio et compatibilité de sortie.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 80 | **Langue audio préférée**<br><code>player_settings.preferred_audio_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : Langue de l’appareil |
| 81 | **Langue des sous-titres secondaire**<br><code>player_settings.secondary_preferred_audio_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : Vide |
| 82 | **Passer les silences**<br><code>player_settings.skip_silence</code> | Passer les passages silencieux de l’audio pendant la lecture | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 83 | **Forcer le transcodage AC-3**<br><code>player_settings.force_optical_passthrough</code> | Transcoder les formats multicanaux en Dolby Digital 5.1 pour les connexions optiques/SPDIF. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |

### Sous-titres

Sélection, organisation et style des sous-titres.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 84 | **Langue des sous-titres préférée**<br><code>player_settings.subtitle_preferred_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : anglais |
| 85 | **Langue des sous-titres secondaire**<br><code>player_settings.subtitle_secondary_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : Vide |
| 86 | **Utiliser les sous-titres forcés**<br><code>player_settings.subtitle_use_forced_subtitles</code> | Préférer les sous-titres forcés lorsque l’audio correspond à la langue des sous-titres ; si indisponibles, ne rien sélectionner | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 87 | **Afficher uniquement les langues préférées**<br><code>player_settings.subtitle_show_only_preferred_languages</code> | Masquer toutes les autres langues de sous-titres dans la liste de sélection | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 88 | **Retirer les indications pour malentendants**<br><code>player_settings.subtitle_strip_sdh</code> | Masquer les descriptions sonores et les noms des intervenants dans les sous-titres compatibles. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 89 | **Organisation des sous-titres**<br><code>player_settings.subtitle_organization_mode</code> | — | Liste déroulante : Aucun (ordre par défaut) — Afficher les sous-titres dans l’ordre par défaut fourni par les addons. ; Par langue — Regrouper les sous-titres par langue. ; Par addon — Regrouper les sous-titres par addon source.<br>Défaut : Aucun (ordre par défaut) |
| 90 | **Taille**<br><code>player_settings.subtitle_size</code> | — | Curseur : 50 à 200, pas 10 %<br>Défaut : 100 % |
| 91 | **Décalage vertical**<br><code>player_settings.subtitle_vertical_offset</code> | — | Curseur : -20 à 50, pas 1 %<br>Défaut : 5 % |
| 92 | **Gras**<br><code>player_settings.subtitle_bold</code> | Utiliser une police en gras pour les sous-titres | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 93 | **Couleur du texte**<br><code>player_settings.subtitle_text_color</code> | — | Sélecteur/couleur ARGB au format hexadécimal<br>Défaut : -1 |
| 94 | **Couleur d’arrière-plan**<br><code>player_settings.subtitle_background_color</code> | — | Sélecteur/couleur ARGB au format hexadécimal<br>Défaut : 0 |
| 95 | **Contour**<br><code>player_settings.subtitle_outline_enabled</code> | Ajouter un contour autour du texte des sous-titres pour une meilleure visibilité | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 96 | **Couleur du contour**<br><code>player_settings.subtitle_outline_color</code> | — | Sélecteur/couleur ARGB au format hexadécimal<br>Défaut : -16777216 |
| 97 | **Épaisseur du contour**<br><code>player_settings.subtitle_outline_width</code> | — | Curseur : 1 à 5, pas 1<br>Défaut : 2 |

## Intégrations (50)

Nom actuel sur le site : **Integrations**. Services connectés et fournisseurs de métadonnées.

### Services connectés

Connecter des comptes pour obtenir des liens et accéder à une bibliothèque cloud.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 98 | **Bibliothèque cloud**<br><code>debrid_settings.cloud_library_enabled</code> | Parcourez et lisez les fichiers déjà présents dans vos comptes connectés. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 99 | **Résoudre les liens lisibles**<br><code>debrid_settings.debrid_enabled</code> | Demande à un service connecté des liens lisibles quand un résultat le nécessite. Cela peut ajouter l’élément à ce service. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 100 | **Résoudre avec**<br><code>debrid_settings.preferred_resolver_provider_id</code> | Choisissez quel compte connecté gère les liens lisibles. | Liste déroulante : Connectez d’abord un compte. ; TorBox ; Premiumize<br>Défaut : Connectez d’abord un compte.<br>Condition : Affiché lorsque la résolution de liens est activée ; options disponibles selon les comptes connectés. |
| 101 | **TorBox**<br><code>debrid_settings.torbox_api_key</code> | Connectez votre compte Torbox. | Champ secret masqué |
| 102 | **Premiumize**<br><code>debrid_settings.premiumize_api_key</code> | Connecter votre compte Premiumize. | Champ secret masqué |
| 103 | **Liens à préparer**<br><code>debrid_settings.instant_playback_preparation_limit</code> | Résoudre les liens lisibles avant le démarrage de la lecture. | Champ numérique : min. 0, max. 20, pas 1<br>Défaut : 0 |
| 104 | **Nombre max de résultats**<br><code>debrid_settings.stream_max_results</code> | Limiter le nombre de sources Direct Debrid affichées. | Champ numérique : min. 0, max. 500, pas 1<br>Défaut : 0 |
| 105 | **Tri des résultats**<br><code>debrid_settings.stream_sort_mode</code> | Choisissez l’ordre dans lequel les résultats apparaissent. | Liste déroulante : Ordre original ; Meilleure qualité d’abord ; Plus gros d’abord ; Plus petits d’abord<br>Défaut : Ordre original |
| 106 | **Qualité minimale**<br><code>debrid_settings.stream_minimum_quality</code> | Masquer les sources sous la résolution sélectionnée. | Liste déroulante : Toutes qualités ; 720p et plus ; 1080p et plus ; 4K uniquement<br>Défaut : Toutes qualités |
| 107 | **Dolby Vision**<br><code>debrid_settings.stream_dolby_vision_filter</code> | Afficher, masquer ou exiger les sources Dolby Vision. | Boutons de choix : Tous ; Masquer ; Uniquement<br>Défaut : Tous |
| 108 | **HDR**<br><code>debrid_settings.stream_hdr_filter</code> | Afficher, masquer ou exiger les sources HDR. | Boutons de choix : Tous ; Masquer ; Uniquement<br>Défaut : Tous |
| 109 | **Codec**<br><code>debrid_settings.stream_codec_filter</code> | Filtrer les sources par codec vidéo. | Liste déroulante : Tout codec ; H.264 / AVC ; HEVC / H.265 ; AV1<br>Défaut : Tout codec |
| 110 | **Modèle de nom**<br><code>debrid_settings.debrid_stream_name_template</code> | — | Champ texte<br>Défaut : Vide |
| 111 | **Modèle de description**<br><code>debrid_settings.debrid_stream_description_template</code> | — | Zone de texte multiligne<br>Défaut : Vide |
| 112 | **Règles de flux**<br><code>debrid_settings.stream_preferences</code> | — | Éditeur JSON avancé<br>Défaut : Vide |

### Enrichissement TMDB

Choisir les champs de métadonnées fournis par TMDB.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 113 | **Activer l’enrichissement TMDB**<br><code>tmdb_settings.tmdb_enabled</code> | Utiliser votre clé API TMDB pour enrichir les métadonnées de l’addon sur l’écran de détails lorsqu’un ID TMDB ou IMDb est disponible. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 114 | **Activer sur l’accueil moderne**<br><code>tmdb_settings.tmdb_modern_home_enabled</code> | Appliquer également l’enrichissement TMDB aux hero et aux cartes sélectionnées de l’accueil moderne | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 115 | **Enrichir Continuer à regarder**<br><code>tmdb_settings.tmdb_enrich_continue_watching</code> | Appliquer l’enrichissement TMDB aux éléments de Continuer à regarder | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 116 | **Langue préférée**<br><code>tmdb_settings.tmdb_language</code> | Configurez le code de langue TMDB utilisé pour les métadonnées localisées, ex. `en`, `en-US` ou `pt-BR`. | Liste déroulante de langues — voir l’annexe A<br>Défaut : anglais |
| 117 | **Visuels**<br><code>tmdb_settings.tmdb_use_artwork</code> | Remplacer le fond, l’affiche et le logo par les visuels TMDB. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 118 | **Informations de base**<br><code>tmdb_settings.tmdb_use_basic_info</code> | Utiliser le titre, le synopsis, les genres et la note de TMDB. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 119 | **Détails**<br><code>tmdb_settings.tmdb_use_details</code> | Utiliser les informations de sortie, durée, classification, statut, pays et langue de TMDB. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 120 | **Dates de sortie**<br><code>tmdb_settings.tmdb_use_release_dates</code> | Dates de sortie et de diffusion depuis TMDB | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 121 | **Crédits**<br><code>tmdb_settings.tmdb_use_credits</code> | Utiliser les créateurs, réalisateurs, scénaristes et photos du casting de TMDB. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 122 | **Sociétés de production**<br><code>tmdb_settings.tmdb_use_productions</code> | Utiliser les métadonnées des sociétés de production TMDB sur l’écran de détails. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 123 | **Chaînes**<br><code>tmdb_settings.tmdb_use_networks</code> | Utiliser les métadonnées des chaînes TMDB pour les titres TV. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 124 | **Épisodes**<br><code>tmdb_settings.tmdb_use_episodes</code> | Utiliser les titres, miniatures, descriptions et durées des épisodes de TMDB pour les séries. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 125 | **Bandes-annonces**<br><code>tmdb_settings.tmdb_use_trailers</code> | Récupérer et afficher la section des bandes-annonces TMDB sur les pages de détails. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 126 | **À voir aussi**<br><code>tmdb_settings.tmdb_use_more_like_this</code> | Visuels de recommandations TMDB sur la page de détail. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 127 | **Collections**<br><code>tmdb_settings.tmdb_use_collections</code> | Afficher des rayons de franchise et de collection pour les films lorsque TMDB les fournit. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |

### Notes MDBList

Choisir les notes externes affichées sur les fiches.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 128 | **Activer les notes MDBList**<br><code>mdblist_settings.mdblist_enabled</code> | Afficher les notes externes de MDBList sur les pages de métadonnées lorsqu’un ID IMDb est disponible. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 129 | **Clé API MDBList**<br><code>mdblist_settings.mdblist_api_key</code> | Obtenez une clé sur https://mdblist.com/preferences et collez-la ici. | Champ secret masqué |
| 130 | **Trakt**<br><code>mdblist_settings.mdblist_show_trakt</code> | Afficher la note Trakt | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 131 | **IMDb**<br><code>mdblist_settings.mdblist_show_imdb</code> | Afficher la note IMDb (et masquer la ligne IMDb par défaut si disponible) | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 132 | **TMDB**<br><code>mdblist_settings.mdblist_show_tmdb</code> | Afficher la note TMDB | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 133 | **Letterboxd**<br><code>mdblist_settings.mdblist_show_letterboxd</code> | Afficher la note Letterboxd | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 134 | **Rotten Tomatoes**<br><code>mdblist_settings.mdblist_show_tomatoes</code> | Afficher la note des critiques | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 135 | **Score du public**<br><code>mdblist_settings.mdblist_show_audience</code> | Afficher la note du public | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 136 | **Metacritic**<br><code>mdblist_settings.mdblist_show_metacritic</code> | Afficher la note Metacritic | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 137 | **MyAnimeList**<br><code>mdblist_settings.mdblist_show_mal</code> | Afficher la note MyAnimeList. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |

### Trakt

Choisir les sources de bibliothèque, progression, recommandations et commentaires.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 138 | **Source de la bibliothèque**<br><code>trakt_settings.library_source_mode</code> | Choisir la bibliothèque utilisée pour enregistrer et consulter votre collection. | Boutons de choix : Trakt ; Bibliothèque Nuvio<br>Défaut : Trakt |
| 139 | **Progression de visionnage**<br><code>trakt_settings.watch_progress_source</code> | Choisissez quelle source de progression alimente la reprise et Continuer à regarder | Boutons de choix : Trakt ; Nuvio Sync<br>Défaut : Trakt |
| 140 | **Fenêtre de Continuer à regarder**<br><code>trakt_settings.continue_watching_days_cap</code> | Durée de l’historique Trakt utilisée pour Continuer à regarder ; 0 inclut tout l’historique. | Champ numérique : min. 0, max. 365, pas 1<br>Défaut : 60 |
| 141 | **Épisodes suivants non diffusés**<br><code>trakt_settings.show_unaired_next_up</code> | Afficher les épisodes à venir avant leur diffusion | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 142 | **Suivant à partir de l’épisode le plus avancé**<br><code>trakt_settings.next_up_from_furthest_episode</code> | Déterminer l’épisode suivant à partir de l’épisode vu le plus avancé. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 143 | **Commentaires**<br><code>trakt_settings.show_meta_comments</code> | Afficher les commentaires Trakt dans les détails des films et séries | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 144 | **Source de la section Similaires**<br><code>trakt_settings.more_like_this_source</code> | Choisissez la provenance des recommandations sur les pages de détails | Boutons de choix : Trakt ; TMDB<br>Défaut : Trakt |
| 145 | **Identifiant préféré pour les animes**<br><code>trakt_settings.simkl_anime_id_preference</code> | Avec MAL ou Kitsu, chaque saison d’un anime possède sa propre entrée au lieu d’être regroupée sous un seul identifiant IMDb. | Boutons de choix : Préférer IMDb ; Préférer MyAnimeList ; Préférer Kitsu<br>Défaut : Préférer IMDb |

### Anime Skip

Récupérer les horodatages de segments depuis anime-skip.com.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 146 | **Activer Anime Skip**<br><code>animeskip_settings.animeskip_enabled</code> | Récupérer les horodatages de saut depuis anime-skip.com | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 147 | **ID client**<br><code>animeskip_settings.animeskip_client_id</code> | Requis pour récupérer les horodatages de saut depuis anime-skip.com | Champ secret masqué<br>Condition : Requis lorsque Anime Skip est activé. |

## Avancé (6)

Nom actuel sur le site : **Advanced**. Performances, navigation, cache et diagnostics.

### Performances et navigation

Comportements avancés de navigation, réseau et diagnostic sur TV.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 148 | **Navigation horizontale rapide**<br><code>layout_settings.fast_horizontal_navigation_enabled</code> | Augmenter la vitesse de répétition du D-pad dans les rangées tout en conservant la limitation de répétition. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 149 | **Défilement de la sélection Nuvio**<br><code>layout_settings.smooth_bring_into_view_enabled</code> | Utiliser l’animation et le positionnement globaux personnalisés du défilement de sélection de Nuvio. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 150 | **Suivre l’ordre des addons**<br><code>layout_settings.follow_addons_order</code> | Utiliser l’ordre des addons installés pour organiser les rangées de catalogues. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 151 | **Surligneur Compose**<br><code>layout_settings.compose_highlighter_enabled</code> | Faire clignoter les bordures autour des éléments d’interface en recomposition pour le débogage des performances. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 152 | **Activer HTTP/2**<br><code>player_settings.enable_http2</code> | Utiliser HTTP/2 pour multiplexer les requêtes réseau lorsque le réseau personnalisé est activé sur TV. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 153 | **Rapports de problèmes de lecture**<br><code>player_settings.playback_issue_reports_enabled</code> | Afficher les boutons de signalement pendant la lecture, les chargements longs et les erreurs de lecture. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |

# Paramètres Mobile

## Disposition (24)

Nom actuel sur le site : **Layout**. Thème, affichage, cartes d’affiche et Continuer à regarder.

### Thème

Choisir le thème de couleur utilisé dans l’application.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 1 | **Thème de couleur**<br><code>theme_settings.selected_theme</code> | — | Pastilles : Cramoisi (#E53935) ; Océan (#1E88E5) ; Violet (#7E57C2) ; Émeraude (#43A047) ; Ambre (#FFB300) ; Rose (#EC407A) ; Blanc (#F7F7F4) ; Or (Supporter) (#FFD45C) ; Jade (Supporter) (#7BF08D) ; Or rose (Supporter) (#FFB37A) ; Bleu arctique (Supporter) (#4DE3FF) ; Graphite (Supporter) (#AAB2BE)<br>Défaut : Blanc |
| 2 | **Noir AMOLED**<br><code>theme_settings.amoled_enabled</code> | Utiliser un noir pur pour les arrière-plans de l’application. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 3 | **Liquid Glass**<br><code>theme_settings.liquid_glass_native_tab_bar_enabled</code> | Utiliser la barre d’onglets translucide native lorsqu’elle est disponible. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |

### Style des cartes d’affiche

Régler les dimensions et les étiquettes des cartes.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 4 | **Largeur de carte**<br><code>poster_card_style_settings_payload.widthDp</code> | — | Boutons de choix : Compact ; Dense ; Standard ; Équilibré ; Confortable ; Grand<br>Défaut : Équilibré |
| 5 | **Rayon de carte**<br><code>poster_card_style_settings_payload.cornerRadiusDp</code> | — | Boutons de choix : Marqué ; Subtil ; Classique ; Arrondi ; Pilule<br>Défaut : Arrondi |
| 6 | **Affiches en mode paysage**<br><code>poster_card_style_settings_payload.catalogLandscapeModeEnabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 7 | **Masquer les étiquettes**<br><code>poster_card_style_settings_payload.hideLabelsEnabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |

### Relief des cartes

Ajouter une lumière de bord et un léger reflet aux cartes de l’application.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 8 | **Activer le relief des cartes**<br><code>card_depth_style_settings_payload.enabled</code> | Ajouter un éclairage de bord donnant du relief aux cartes compatibles. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 9 | **Lueur des bordures**<br><code>card_depth_style_settings_payload.edgeStrength</code> | — | Boutons de choix : Subtil ; Équilibré ; Gras<br>Défaut : Subtil<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 10 | **Reflet supérieur**<br><code>card_depth_style_settings_payload.sheenStrength</code> | — | Boutons de choix : Désactivé ; Doux ; Lumineux<br>Défaut : Doux<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 11 | **Étendue des bordures**<br><code>card_depth_style_settings_payload.edgeCoverage</code> | — | Boutons de choix : Haut uniquement ; Moitié ; Contour complet<br>Défaut : Haut uniquement<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 12 | **Affiches**<br><code>card_depth_style_settings_payload.postersEnabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 13 | **Continuer à regarder**<br><code>card_depth_style_settings_payload.continueWatchingEnabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 14 | **Cartes d’épisodes**<br><code>card_depth_style_settings_payload.episodeCardsEnabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 15 | **Casting**<br><code>card_depth_style_settings_payload.castEnabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |
| 16 | **Bandes-annonces**<br><code>card_depth_style_settings_payload.trailersEnabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Affiché lorsque le relief des cartes est activé. |

### Continuer à regarder

Régler la visibilité, le style des cartes et le comportement de l’épisode suivant.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 17 | **Afficher Continuer à regarder**<br><code>continue_watching_settings_payload.isVisible</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 18 | **Style des cartes**<br><code>continue_watching_settings_payload.style</code> | — | Boutons de choix : Carte ; Large ; Affiche<br>Défaut : Carte |
| 19 | **Préférer les vignettes d’épisode dans Continuer à regarder**<br><code>continue_watching_settings_payload.use_episode_thumbnails_in_cw</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 20 | **Suivant à partir de l’épisode le plus avancé**<br><code>continue_watching_settings_payload.upNextFromFurthestEpisode</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 21 | **Afficher les épisodes à venir non diffusés**<br><code>continue_watching_settings_payload.show_unaired_next_up</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 22 | **Flouter le contenu non vu dans Continuer à regarder**<br><code>continue_watching_settings_payload.blur_continue_watching_next_up</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 23 | **Invite de reprise au démarrage**<br><code>continue_watching_settings_payload.showResumePromptOnLaunch</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 24 | **Ordre de tri**<br><code>continue_watching_settings_payload.sort_mode</code> | — | Boutons de choix : Par défaut ; Style streaming ; Séparer les épisodes à venir<br>Défaut : Par défaut |

## Lecture (68)

Nom actuel sur le site : **Playback**. Lecteur, sous-titres, sélection des streams et épisode suivant.

### Lecteur

Comportement principal du lecteur.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 25 | **Afficher la superposition de chargement**<br><code>player_settings.show_loading_overlay</code> | Afficher l’illustration et les informations pendant la préparation du lecteur. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 26 | **Avertissements de contenu**<br><code>player_settings.show_parental_guide</code> | Afficher les indications de contrôle parental au démarrage de la lecture. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 27 | **Mode de redimensionnement**<br><code>player_settings.resize_mode</code> | — | Boutons de choix : Ajuster ; Remplir ; Zoom<br>Défaut : Ajuster |
| 28 | **Maintenir pour accélérer**<br><code>player_settings.hold_to_speed_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 29 | **Gestes tactiles**<br><code>player_settings.touch_gestures_enabled</code> | Autorise les balayages et les doubles appuis sur le lecteur pour avancer ou reculer, ajuster la luminosité ou le volume. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 30 | **Vitesse de lecture**<br><code>player_settings.hold_to_speed_value</code> | — | Curseur : 1.25 à 3, pas 0.25 x<br>Défaut : 2 x |
| 31 | **Lecteur externe**<br><code>player_settings.external_player_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 32 | **Transmettre les sous-titres**<br><code>player_settings.external_player_forward_subtitles</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé<br>Condition : Affiché lorsque le lecteur externe est activé. |
| 33 | **Envoyer les horodatages d’intro et d’outro**<br><code>player_settings.external_player_send_skip_segments</code> | Transmettre les horodatages connus des segments à passer aux lecteurs externes compatibles. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé<br>Condition : Affiché lorsque le lecteur externe est activé. |
| 34 | **App de lecteur externe**<br><code>player_settings.external_player_id</code> | — | Champ texte<br>Défaut : Vide<br>Condition : Affiché lorsque le lecteur externe est activé. |

### Décodeur Android

Moteur de lecture et comportement du décodeur utilisés par Android.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 35 | **Moteur de lecture**<br><code>player_settings.android_playback_engine</code> | — | Boutons de choix : Automatique ; ExoPlayer ; libmpv<br>Défaut : Automatique |
| 36 | **Sortie vidéo libmpv**<br><code>player_settings.android_libmpv_video_output</code> | — | Boutons de choix : GPU nouvelle génération — Moteur moderne avec un traitement de meilleure qualité. ; GPU — Moteur de compatibilité pour les appareils rencontrant des problèmes avec GPU next.<br>Défaut : GPU nouvelle génération |
| 37 | **Décodage matériel libmpv**<br><code>player_settings.android_libmpv_hardware_decoding_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 38 | **Forcer la sortie YUV420p**<br><code>player_settings.android_libmpv_yuv420p_enabled</code> | Utiliser un format de pixels largement compatible pour la sortie libmpv. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 39 | **Priorité du décodeur**<br><code>player_settings.decoder_priority</code> | — | Boutons de choix : Appareil uniquement ; Préférer l’appareil ; Préférer l’application<br>Défaut : Préférer l’appareil |
| 40 | **Convertir Dolby Vision profil 7 en HEVC**<br><code>player_settings.map_dv7_to_hevc</code> | Améliorer la compatibilité des streams Dolby Vision profil 7. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 41 | **Lecture tunnelisée**<br><code>player_settings.tunneling_enabled</code> | Autoriser les appareils Android compatibles à utiliser la lecture audio/vidéo tunnelisée. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 42 | **Utiliser libass**<br><code>player_settings.use_libass</code> | Rendre les sous-titres stylisés avec libass sur les moteurs Android compatibles. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 43 | **Mode de rendu libass**<br><code>player_settings.libass_render_type</code> | — | Liste déroulante : Superposition (OpenGL) ; Superposition (Canvas) ; Effets (OpenGL) ; Effets (Canvas) ; Repères<br>Défaut : Repères<br>Condition : Affiché lorsque libass est activé. |

### Sortie vidéo iOS

HDR, tone mapping, décodeur et réglages d’image utilisés par iOS.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 44 | **Préréglage de sortie vidéo**<br><code>player_settings.ios_video_output_preset</code> | — | Liste déroulante : Native EDR — Recommandé pour les iPhone et iPad compatibles HDR. ; SDR tone mapped — Blancs et noirs prévisibles sur une sortie de type SDR. ; Compatibilité — Comportement le plus proche de l’ancien lecteur MPV sur iOS. ; Personnalisé — Utiliser les valeurs avancées ci-dessous.<br>Défaut : Native EDR |
| 45 | **Tone mapping**<br><code>player_settings.ios_tone_mapping_mode</code> | — | Liste déroulante : Automatique ; BT.2390 ; Mobius ; Reinhard ; Hable ; Gamma ; Écrêtage<br>Défaut : Automatique |
| 46 | **Primaires cibles**<br><code>player_settings.ios_target_primaries</code> | — | Liste déroulante : Automatique ; BT.709 ; Display P3 ; BT.2020<br>Défaut : Automatique |
| 47 | **Transfert cible**<br><code>player_settings.ios_target_transfer</code> | — | Liste déroulante : Automatique ; sRGB ; BT.1886 ; Gamma 2.2 ; Gamma 2.4 ; PQ ; HLG<br>Défaut : Automatique |
| 48 | **Décodeur matériel**<br><code>player_settings.ios_hardware_decoder_mode</code> | — | Boutons de choix : Automatique ; VideoToolbox ; Désactivé<br>Défaut : VideoToolbox |
| 49 | **Sortie audio**<br><code>player_settings.ios_audio_output_mode</code> | — | Boutons de choix : Automatique ; AudioUnit<br>Défaut : Automatique |
| 50 | **Plage dynamique étendue**<br><code>player_settings.ios_extended_dynamic_range_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 51 | **Indication d’espace colorimétrique cible**<br><code>player_settings.ios_target_colorspace_hint_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 52 | **Calculer le pic HDR**<br><code>player_settings.ios_hdr_compute_peak_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 53 | **Atténuer les bandes de couleur**<br><code>player_settings.ios_deband_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 54 | **Interpolation d’images**<br><code>player_settings.ios_interpolation_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 55 | **Luminosité**<br><code>player_settings.ios_brightness</code> | — | Curseur : -50 à 50, pas 1<br>Défaut : 0 |
| 56 | **Contraste**<br><code>player_settings.ios_contrast</code> | — | Curseur : -50 à 50, pas 1<br>Défaut : 0 |
| 57 | **Saturation**<br><code>player_settings.ios_saturation</code> | — | Curseur : -50 à 50, pas 1<br>Défaut : 0 |
| 58 | **Gamma**<br><code>player_settings.ios_gamma</code> | — | Curseur : -50 à 50, pas 1<br>Défaut : 0 |

### Sous-titres et audio

Comportement des langues audio et de sous-titres préférées.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 59 | **Langue audio préférée**<br><code>player_settings.preferred_audio_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : Langue de l’appareil |
| 60 | **Langue audio secondaire**<br><code>player_settings.secondary_preferred_audio_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : Vide |
| 61 | **Langue préférée des sous-titres**<br><code>player_settings.preferred_subtitle_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : Aucune |
| 62 | **Langue des sous-titres secondaire**<br><code>player_settings.secondary_preferred_subtitle_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : Vide |
| 63 | **Utiliser les sous-titres forcés**<br><code>player_settings.subtitle_use_forced_subtitles</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 64 | **Afficher uniquement les langues préférées**<br><code>player_settings.subtitle_show_only_preferred_languages</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 65 | **Retirer les indications pour malentendants**<br><code>player_settings.subtitle_strip_sdh</code> | Masquer les descriptions sonores et les noms des intervenants dans les sous-titres compatibles. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |

### Rendu des sous-titres

Personnaliser le style des sous-titres tout en conservant les valeurs par défaut de l’application.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 66 | **Taille des sous-titres**<br><code>player_settings.subtitle_font_size_sp</code> | — | Curseur : 10 à 32, pas 1 sp<br>Défaut : 18 sp |
| 67 | **Décalage vertical**<br><code>player_settings.subtitle_bottom_offset</code> | — | Curseur : 0 à 120, pas 2<br>Défaut : 20 |
| 68 | **Gras**<br><code>player_settings.subtitle_bold</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 69 | **Couleur du texte**<br><code>player_settings.subtitle_text_color</code> | Utiliser une couleur au format de l’application, par exemple #FFFFFFFF. | Champ texte<br>Défaut : Vide |
| 70 | **Couleur d’arrière-plan**<br><code>player_settings.subtitle_background_color</code> | — | Champ texte<br>Défaut : Vide |
| 71 | **Contour**<br><code>player_settings.subtitle_outline_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 72 | **Couleur du contour**<br><code>player_settings.subtitle_outline_color</code> | — | Champ texte<br>Défaut : Vide |
| 73 | **Épaisseur du contour**<br><code>player_settings.subtitle_outline_width</code> | — | Curseur : 1 à 8, pas 1<br>Défaut : 2 |

### Sélection des streams

Réutiliser les liens et régler la sélection automatique des sources.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 74 | **Réutiliser le dernier lien**<br><code>player_settings.stream_reuse_last_link_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 75 | **Durée de réutilisation du cache (heures)**<br><code>player_settings.stream_reuse_last_link_cache_hours</code> | — | Champ numérique : min. 1, max. 168, pas 1<br>Défaut : 24<br>Condition : Affiché lorsque la réutilisation du dernier lien est activée. |
| 76 | **Mode de sélection du stream**<br><code>player_settings.stream_auto_play_mode</code> | — | Boutons de choix : Manuel ; Premier flux ; Correspondance par expression régulière<br>Défaut : Manuel |
| 77 | **Périmètre des sources**<br><code>player_settings.stream_auto_play_source</code> | — | Liste déroulante : Toutes les sources ; Addons installés uniquement ; Plugins activés uniquement<br>Défaut : Toutes les sources |
| 78 | **Addons autorisés**<br><code>player_settings.stream_auto_play_selected_addons</code> | Ne rien sélectionner pour autoriser tous les addons installés. | Sélection multiple dynamique : addons installés sur le profil<br>Défaut : Aucune sélection<br>Condition : Liste dynamique des addons du profil ; pertinente pour le périmètre Addons. |
| 79 | **Plugins autorisés**<br><code>player_settings.stream_auto_play_selected_plugins</code> | Ne rien sélectionner pour autoriser tous les plugins activés. | Sélection multiple dynamique : plugins activés sur le profil<br>Défaut : Aucune sélection<br>Condition : Liste dynamique des plugins du profil ; pertinente pour le périmètre Plugins. |
| 80 | **Modèle regex**<br><code>player_settings.stream_auto_play_regex</code> | — | Champ texte<br>Défaut : Vide<br>Condition : Utilisé avec le mode Correspondance par expression régulière. |
| 81 | **Délai d’expiration du stream**<br><code>player_settings.stream_auto_play_timeout_seconds</code> | — | Liste déroulante : Instantané ; 1 s ; 2 s ; 3 s ; 4 s ; 5 s ; 6 s ; 7 s ; 8 s ; 9 s ; 10 s ; 15 s ; 20 s ; 25 s ; 30 s ; Illimité<br>Défaut : 3 s |

### Épisode suivant

Contrôler la lecture automatique de l’épisode suivant.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 82 | **Lecture automatique de l’épisode suivant**<br><code>player_settings.stream_auto_play_next_episode_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 83 | **Utiliser le premier flux en secours**<br><code>player_settings.stream_auto_play_next_episode_fallback_enabled</code> | Quand la sélection est manuelle, essayer automatiquement la première source pour l’épisode suivant. | Interrupteur : Activé / Désactivé<br>Défaut : Activé<br>Condition : Dépend de la lecture automatique de l’épisode suivant et du mode manuel. |
| 84 | **Préférer le même groupe de lecture**<br><code>player_settings.stream_auto_play_prefer_binge_group</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 85 | **Réutiliser le groupe de binge**<br><code>player_settings.stream_auto_play_reuse_binge_group</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 86 | **Mode de seuil**<br><code>player_settings.next_episode_threshold_mode</code> | — | Boutons de choix : Pourcentage ; Minutes avant la fin<br>Défaut : Pourcentage |
| 87 | **Pourcentage de seuil**<br><code>player_settings.next_episode_threshold_percent_v2</code> | — | Curseur : 50 à 100, pas 1 %<br>Défaut : 99 %<br>Condition : Affiché avec le mode de seuil Pourcentage. |
| 88 | **Minutes avant la fin**<br><code>player_settings.next_episode_threshold_minutes_before_end_v2</code> | — | Curseur : 0 à 20, pas 0.5<br>Défaut : 2<br>Condition : Affiché avec le mode Minutes avant la fin. |

### Passage des segments

Utiliser les fournisseurs de segments pris en charge par l’application.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 89 | **Passer l’intro**<br><code>player_settings.skip_intro_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 90 | **Anime Skip**<br><code>player_settings.animeskip_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 91 | **ID client AnimeSkip**<br><code>player_settings.animeskip_client_id</code> | — | Champ secret masqué<br>Condition : Requis lorsque Anime Skip est activé. |
| 92 | **Clé API IntroDB**<br><code>player_settings.introdb_api_key</code> | Utilisée pour envoyer à IntroDB les horodatages d’introduction et de générique de fin. | Champ secret masqué |

## Streams (3)

Nom actuel sur le site : **Streams**. Badges de stream et règles d’affichage.

### Badges de stream

Contrôler les badges de taille et les URL de badges personnalisés.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 93 | **Position des badges**<br><code>stream_badge_settings.stream_badge_placement</code> | — | Boutons de choix : En haut ; En bas<br>Défaut : En bas |
| 94 | **Badges de taille des fichiers**<br><code>stream_badge_settings.show_file_size_badges</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 95 | **URL des badges**<br><code>stream_badge_settings.stream_badge_rules</code> | Importer depuis une URL un fichier JSON de badges de stream au format Fusion. | URL d’import JSON Fusion, avec actions Importer et Effacer<br>Défaut : Vide |

## Contenu et découverte (6)

Nom actuel sur le site : **Content & Discovery**. Présentation de la page de détail.

### Page de détail

Régler la disposition de l’écran de métadonnées et les cartes d’épisodes.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 96 | **Fond cinématographique**<br><code>meta_screen_settings_payload.cinematicBackground</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 97 | **Lecture des bandes-annonces dans le Hero**<br><code>meta_screen_settings_payload.hero_trailer_playback</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 98 | **Disposition des onglets**<br><code>meta_screen_settings_payload.tvStyleLayout</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 99 | **Cartes d’épisodes**<br><code>meta_screen_settings_payload.episodeCardStyle</code> | — | Boutons de choix : Horizontal ; Liste<br>Défaut : Horizontal |
| 100 | **Flouter les épisodes non vus**<br><code>meta_screen_settings_payload.blur_unwatched_episodes</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 101 | **Ordre des sections**<br><code>meta_screen_settings_payload.items</code> | Ordre avancé des sections au format JSON. Conserver les clés, l’état d’activation, l’ordre et les groupes d’onglets. | Éditeur JSON avancé<br>Défaut : [] |

## Intégrations (40)

Nom actuel sur le site : **Integrations**. Services connectés et fournisseurs de métadonnées.

### Services connectés

Connecter des comptes pour obtenir des liens et accéder à une bibliothèque cloud.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 102 | **Bibliothèque cloud**<br><code>debrid_settings.debrid_cloud_library_enabled</code> | Parcourez et lisez les fichiers déjà présents dans vos comptes connectés. | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 103 | **Résoudre les liens lisibles**<br><code>debrid_settings.debrid_enabled</code> | Demander à un service connecté des liens lisibles lorsqu’un résultat le nécessite. | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 104 | **Résoudre avec**<br><code>debrid_settings.debrid_preferred_resolver_provider_id</code> | — | Liste déroulante : Connectez d’abord un compte. ; TorBox ; Premiumize<br>Défaut : Connectez d’abord un compte.<br>Condition : Affiché lorsque la résolution de liens est activée ; options disponibles selon les comptes connectés. |
| 105 | **TorBox**<br><code>debrid_settings.debrid_torbox_api_key</code> | Connectez votre compte Torbox. | Champ secret masqué |
| 106 | **Premiumize**<br><code>debrid_settings.debrid_premiumize_api_key</code> | Connecter votre compte Premiumize. | Champ secret masqué |
| 107 | **Liens à préparer**<br><code>debrid_settings.debrid_instant_playback_preparation_limit</code> | — | Champ numérique : min. 0, max. 20, pas 1<br>Défaut : 0 |
| 108 | **Nombre max de résultats**<br><code>debrid_settings.debrid_stream_max_results</code> | — | Champ numérique : min. 0, max. 500, pas 1<br>Défaut : 0 |
| 109 | **Tri des résultats**<br><code>debrid_settings.debrid_stream_sort_mode</code> | — | Liste déroulante : Ordre original ; Meilleure qualité d’abord ; Plus gros d’abord ; Plus petits d’abord<br>Défaut : Ordre original |
| 110 | **Qualité minimale**<br><code>debrid_settings.debrid_stream_minimum_quality</code> | — | Liste déroulante : Toutes qualités ; 720p et plus ; 1080p et plus ; 4K uniquement<br>Défaut : Toutes qualités |
| 111 | **Dolby Vision**<br><code>debrid_settings.debrid_stream_dolby_vision_filter</code> | — | Boutons de choix : Tous ; Masquer ; Uniquement<br>Défaut : Tous |
| 112 | **HDR**<br><code>debrid_settings.debrid_stream_hdr_filter</code> | — | Boutons de choix : Tous ; Masquer ; Uniquement<br>Défaut : Tous |
| 113 | **Codec**<br><code>debrid_settings.debrid_stream_codec_filter</code> | — | Liste déroulante : Tout codec ; H.264 / AVC ; HEVC / H.265 ; AV1<br>Défaut : Tout codec |
| 114 | **Modèle de nom**<br><code>debrid_settings.debrid_stream_name_template</code> | — | Champ texte<br>Défaut : Vide |
| 115 | **Modèle de description**<br><code>debrid_settings.debrid_stream_description_template</code> | — | Zone de texte multiligne<br>Défaut : Vide |
| 116 | **Règles de flux**<br><code>debrid_settings.debrid_stream_preferences</code> | — | Éditeur JSON avancé<br>Défaut : Vide |

### Enrichissement TMDB

Choisir les champs de métadonnées fournis par TMDB.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 117 | **Activer l’enrichissement TMDB**<br><code>tmdb_settings.tmdb_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 118 | **Clé API TMDB**<br><code>tmdb_settings.tmdb_api_key</code> | — | Champ secret masqué |
| 119 | **Langue préférée**<br><code>tmdb_settings.tmdb_language</code> | — | Liste déroulante de langues — voir l’annexe A<br>Défaut : anglais |
| 120 | **Bandes-annonces**<br><code>tmdb_settings.tmdb_use_trailers</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 121 | **Visuels**<br><code>tmdb_settings.tmdb_use_artwork</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 122 | **Informations de base**<br><code>tmdb_settings.tmdb_use_basic_info</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 123 | **Détails**<br><code>tmdb_settings.tmdb_use_details</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 124 | **Crédits**<br><code>tmdb_settings.tmdb_use_credits</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 125 | **Sociétés de production**<br><code>tmdb_settings.tmdb_use_productions</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 126 | **Chaînes**<br><code>tmdb_settings.tmdb_use_networks</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 127 | **Épisodes**<br><code>tmdb_settings.tmdb_use_episodes</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 128 | **Affiches de saison**<br><code>tmdb_settings.tmdb_use_season_posters</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 129 | **À voir aussi**<br><code>tmdb_settings.tmdb_use_more_like_this</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 130 | **Collections**<br><code>tmdb_settings.tmdb_use_collections</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 131 | **Dates de sortie**<br><code>tmdb_settings.tmdb_use_release_dates</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |

### Notes MDBList

Configurer les notes externes affichées dans le Hero de la fiche.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 132 | **Activer les notes MDBList**<br><code>mdblist_settings.mdblist_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |
| 133 | **Clé API MDBList**<br><code>mdblist_settings.mdblist_api_key</code> | — | Champ secret masqué |
| 134 | **IMDb**<br><code>mdblist_settings.mdblist_use_imdb</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 135 | **TMDB**<br><code>mdblist_settings.mdblist_use_tmdb</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 136 | **Rotten Tomatoes**<br><code>mdblist_settings.mdblist_use_tomatoes</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 137 | **Metacritic**<br><code>mdblist_settings.mdblist_use_metacritic</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 138 | **Trakt**<br><code>mdblist_settings.mdblist_use_trakt</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 139 | **Letterboxd**<br><code>mdblist_settings.mdblist_use_letterboxd</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 140 | **Public**<br><code>mdblist_settings.mdblist_use_audience</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |
| 141 | **MyAnimeList**<br><code>mdblist_settings.mdblist_use_mal</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |

## Trakt (6)

Nom actuel sur le site : **Trakt**. Progression, bibliothèque, contenus similaires et commentaires.

### Réglages Trakt

Choisir la manière dont les données Trakt participent à l’application.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 142 | **Source de progression de lecture**<br><code>trakt_settings_payload.watchProgressSource</code> | — | Boutons de choix : Trakt ; Nuvio Sync<br>Défaut : Trakt |
| 143 | **Période de l’historique de reprise**<br><code>trakt_settings_payload.continueWatchingDaysCap</code> | — | Liste déroulante : 14 jours ; 30 jours ; 60 jours ; 90 jours ; 180 jours ; 365 jours ; Tout l’historique<br>Défaut : 60 jours |
| 144 | **Source de la bibliothèque**<br><code>trakt_settings_payload.librarySourceMode</code> | — | Boutons de choix : Trakt ; Local<br>Défaut : Trakt |
| 145 | **Source de la section Similaires**<br><code>trakt_settings_payload.moreLikeThisSource</code> | — | Boutons de choix : Trakt ; TMDB<br>Défaut : Trakt |
| 146 | **Identifiant préféré pour les animes**<br><code>trakt_settings_payload.simklAnimeIdPreference</code> | Avec MAL ou Kitsu, chaque saison d’un anime possède sa propre entrée au lieu d’être regroupée sous un seul identifiant IMDb. | Boutons de choix : Préférer IMDb ; Préférer MyAnimeList ; Préférer Kitsu<br>Défaut : Préférer IMDb |
| 147 | **Commentaires**<br><code>trakt_comments_settings.comments_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Activé |

## Notifications (1)

Nom actuel sur le site : **Notifications**. Préférences de notifications mobiles.

### Notifications

Choisir les alertes mobiles activées.

| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |
|---:|---|---|---|
| 148 | **Alertes de sortie d’épisodes**<br><code>notifications_settings.episode_release_alerts_enabled</code> | — | Interrupteur : Activé / Désactivé<br>Défaut : Désactivé |

# Annexe A — Langues proposées

Les menus de langue audio contiennent les choix suivants :

Langue de l’appareil · Version originale · Aucune · afrikaans · albanais · amharique · arabe · arménien · azerbaïdjanais · basque · biélorusse · bengali · bosniaque · bulgare · birman · catalan · chinois · chinois (Chine) · chinois (Taïwan) · croate · tchèque · danois · néerlandais · anglais · estonien · filipino · finnois · français · galicien · géorgien · allemand · grec · goudjarati · hébreu · hindi · hongrois · islandais · indonésien · irlandais · italien · japonais · kannada · kazakh · khmer · coréen · lao · letton · lituanien · macédonien · malais · malayalam · maltais · marathi · mongol · népalais · norvégien · pendjabi · persan · polonais · portugais · portugais brésilien · roumain · russe · serbe · cingalais · slovaque · slovène · espagnol · espagnol d’Amérique latine · swahili · suédois · tamoul · télougou · thaï · turc · ukrainien · ourdou · ouzbek · vietnamien · gallois · zoulou

Les langues secondaires et les langues de sous-titres utilisent la même liste sans « Langue de l’appareil » ni « Version originale ». Les menus TMDB reprennent les langues ordinaires et ajoutent : anglais australien, anglais canadien et anglais britannique.

# Annexe B — Réglages Mobile trouvés dans le code, absents du site actuel

Ces deux réglages sont modélisés par l’application Mobile, mais aucun contrôle correspondant n’apparaissait sur nuvio.tv pendant l’audit. Ils peuvent être ajoutés au dashboard avec une mention « expérimental » jusqu’à validation de leur synchronisation côté API.

| Paramètre et clé interne | Contrôle et choix |
|---|---|
| **Style de la barre de navigation**<br><code>theme_settings.nav_bar_style</code> | Liste déroulante : Adaptatif ; Toujours déployée ; Toujours compacte ; Classique<br>Défaut : Adaptatif |
| **Mode d’arrière-plan**<br><code>meta_screen_settings_payload.background_mode</code> | Liste déroulante : Normal ; Cinématographique ; Couleur dominante<br>Défaut : Normal |

# Annexe C — Points d’intégration pour le dashboard

1. Reproduire les 6 onglets TV et les 7 onglets Mobile tels qu’ils sont séparés sur le site actuel.
2. Utiliser des interrupteurs pour les booléens, des boutons segmentés pour les petits ensembles de choix, des listes déroulantes pour les longues listes et des curseurs bornés pour les valeurs numériques adaptées.
3. Appliquer la visibilité conditionnelle indiquée dans les tableaux afin que les réglages enfants n’encombrent pas l’écran avant activation de leur parent.
4. Construire les choix « Addons autorisés », « Plugins autorisés » et « Résoudre avec » à partir des données réelles du profil, car ces listes sont dynamiques.
5. Masquer les clés TorBox, Premiumize, TMDB, MDBList, AnimeSkip et IntroDB ; ne jamais renvoyer leur valeur complète après enregistrement.
6. Conserver un éditeur avancé avec validation JSON pour les règles de streams et l’ordre des sections de la fiche Mobile.
7. Traiter les thèmes Supporter comme des choix visibles mais verrouillés lorsque le compte n’a pas d’abonnement actif, comme sur le site officiel.

# Sources vérifiées

- Interface authentifiée : `https://nuvio.tv/account?tab=settings` et `https://nuvio.tv/account?tab=mobile_settings`, parcourues sans modifier ni enregistrer de valeur.
- Schéma extrait du site : `reference-public/settings-extracted.json`.
- Bundle de la page Compte : `reference-public/page-09c8c711fef692db.js`.
- Application TV officielle : révision `e54a74904b7ee40e5c748e156a70749f89e8decf`.
- Application Mobile officielle : révision `157a2375d32adc98bb9126c5601e459815b49450`.
