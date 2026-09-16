// Official Nuvio web controls, supplemented by NuvioMobile NavBarStyle and MetaScreenBackgroundMode.
export const schema = {
  "tv": [
    {
      "feature": "theme_settings",
      "key": "selected_theme",
      "type": "string",
      "control": "swatches",
      "title": "Thème de couleur",
      "defaultValue": "WHITE",
      "options": [
        {
          "value": "CRIMSON",
          "label": "Cramoisi",
          "color": "#E53935"
        },
        {
          "value": "OCEAN",
          "label": "Océan",
          "color": "#1E88E5"
        },
        {
          "value": "VIOLET",
          "label": "Violet",
          "color": "#7E57C2"
        },
        {
          "value": "EMERALD",
          "label": "Émeraude",
          "color": "#43A047"
        },
        {
          "value": "AMBER",
          "label": "Ambre",
          "color": "#FFB300"
        },
        {
          "value": "ROSE",
          "label": "Rose",
          "color": "#EC407A"
        },
        {
          "value": "WHITE",
          "label": "Blanc",
          "color": "#F7F7F4"
        },
        {
          "value": "GOLD",
          "label": "Or",
          "color": "#FFD45C",
          "supporterOnly": true
        },
        {
          "value": "JADE",
          "label": "Jade",
          "color": "#7BF08D",
          "supporterOnly": true
        },
        {
          "value": "ROSE_GOLD",
          "label": "Or rose",
          "color": "#FFB37A",
          "supporterOnly": true
        },
        {
          "value": "ARCTIC_BLUE",
          "label": "Bleu arctique",
          "color": "#4DE3FF",
          "supporterOnly": true
        },
        {
          "value": "GRAPHITE",
          "label": "Graphite",
          "color": "#AAB2BE",
          "supporterOnly": true
        }
      ],
      "description": ""
    },
    {
      "feature": "theme_settings",
      "key": "amoled_mode",
      "type": "boolean",
      "control": "toggle",
      "title": "Mode AMOLED",
      "description": "Utiliser un noir pur pour les arrière-plans de l’application",
      "defaultValue": false
    },
    {
      "feature": "theme_settings",
      "key": "amoled_surfaces_mode",
      "type": "boolean",
      "control": "toggle",
      "title": "Surfaces noir pur",
      "description": "Mettre aussi les cartes, panneaux et conteneurs en noir pur",
      "defaultValue": false
    },
    {
      "feature": "theme_settings",
      "key": "selected_font",
      "type": "string",
      "control": "select",
      "title": "Police de l’application",
      "description": "Choisissez votre police préférée",
      "defaultValue": "INTER",
      "options": [
        {
          "value": "INTER",
          "label": "Inter"
        },
        {
          "value": "DM_SANS",
          "label": "DM Sans"
        },
        {
          "value": "OPEN_SANS",
          "label": "Open Sans"
        }
      ]
    },
    {
      "feature": "theme_settings",
      "key": "settings_ui_style",
      "type": "string",
      "control": "segmented",
      "title": "Style des paramètres",
      "defaultValue": "CLASSIC",
      "options": [
        {
          "value": "CLASSIC",
          "label": "Par défaut"
        },
        {
          "value": "ZEN",
          "label": "Minimal"
        },
        {
          "value": "HORIZON",
          "label": "Barre supérieure"
        }
      ],
      "description": ""
    },
    {
      "feature": "experience_settings",
      "key": "mode",
      "type": "string",
      "control": "segmented",
      "title": "Mode d’expérience",
      "defaultValue": "ADVANCED",
      "options": [
        {
          "value": "ESSENTIAL",
          "label": "Essentiel"
        },
        {
          "value": "ADVANCED",
          "label": "Avancé"
        }
      ],
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "selected_layout",
      "type": "string",
      "control": "segmented",
      "title": "Disposition de l’accueil",
      "defaultValue": "MODERN",
      "onChangeAlso": [
        {
          "feature": "layout_settings",
          "key": "has_chosen_layout",
          "type": "boolean",
          "value": true
        }
      ],
      "options": [
        {
          "value": "CLASSIC",
          "label": "Vue classique"
        },
        {
          "value": "GRID",
          "label": "Vue en grille"
        },
        {
          "value": "MODERN",
          "label": "Vue moderne"
        }
      ],
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "modern_landscape_posters_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Affiches en mode paysage",
      "description": "Alterner entre les cartes portrait et paysage pour la vue moderne.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "modern_hero_full_screen_backdrop",
      "type": "boolean",
      "control": "toggle",
      "title": "Arrière-plan en plein écran",
      "description": "Étendre l’arrière-plan pour couvrir la totalité de l’écran.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "classic_focus_gradient_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Dégradé de l’élément sélectionné",
      "description": "Mélanger les couleurs de l’illustration vers la droite de l’accueil classique.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "sidebar_collapsed_by_default",
      "type": "boolean",
      "control": "toggle",
      "title": "Réduire la barre latérale",
      "description": "Masquer la barre latérale par défaut ; l’afficher à la sélection.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "modern_sidebar_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Barre latérale moderne",
      "description": "Activer la navigation par barre latérale flottante.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "modern_sidebar_blur_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Flou de la barre latérale moderne",
      "description": "Activer l’effet de flou pour les surfaces de la barre latérale moderne.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "hero_section_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher le Hero",
      "description": "Afficher un carrousel Hero en vedette en haut de l’accueil. Choisissez jusqu’à 2 catalogues sources ci-dessous.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "discover_location",
      "type": "string",
      "control": "select",
      "title": "Emplacement de Découvrir",
      "description": "Afficher la section navigation quand la recherche est vide.",
      "defaultValue": "IN_SEARCH",
      "options": [
        {
          "value": "OFF",
          "label": "Désactivé"
        },
        {
          "value": "IN_SEARCH",
          "label": "Afficher dans Recherche"
        },
        {
          "value": "IN_SIDEBAR",
          "label": "Afficher dans le panneau latéral"
        }
      ]
    },
    {
      "feature": "layout_settings",
      "key": "poster_labels_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher les titres des affiches",
      "description": "Afficher les titres sous les affiches dans les rangées, la grille et la vue complète.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "catalog_addon_name_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher le nom de l’addon",
      "description": "Afficher le nom de la source sous les titres de catalogue.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "catalog_type_suffix_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher le type de catalogue",
      "description": "Afficher le suffixe de type à côté du nom du catalogue (film/série).",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "hide_unreleased_content",
      "type": "boolean",
      "control": "toggle",
      "title": "Masquer le contenu non sorti",
      "description": "Masque les films et séries qui ne sont pas encore sortis.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "home_imdb_ratings_visibility",
      "type": "string",
      "control": "segmented",
      "title": "Notes IMDb sur l’accueil",
      "defaultValue": "SHOW_ALL",
      "options": [
        {
          "value": "SHOW_ALL",
          "label": "Afficher"
        },
        {
          "value": "HIDE_ALL",
          "label": "Masquer"
        }
      ],
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "blur_unwatched_episodes",
      "type": "boolean",
      "control": "toggle",
      "title": "Flouter les épisodes non vus",
      "description": "Floute les vignettes d’épisodes jusqu’à leur visionnage pour éviter les spoilers.",
      "defaultValue": false
    },
    {
      "feature": "trailer_settings",
      "key": "trailer_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Lecture automatique des bandes-annonces",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "trailer_settings",
      "key": "trailer_delay_seconds",
      "type": "int",
      "control": "number",
      "title": "Délai de la bande-annonce",
      "defaultValue": 7,
      "min": 0,
      "step": 1,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "detail_page_trailer_button_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher le bouton bande-annonce",
      "description": "Afficher le bouton bande-annonce sur la page de détail (uniquement quand une bande-annonce est disponible).",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "prefer_external_meta_addon_detail",
      "type": "boolean",
      "control": "toggle",
      "title": "Préférer les métadonnées de l’addon externe",
      "description": "Utiliser les métadonnées de l’addon externe au lieu de l’addon de catalogue.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "show_full_release_date",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher la date de sortie complète",
      "description": "Pour les films, afficher la date de sortie complète au lieu de l’année seulement.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "detail_imdb_ratings_visibility",
      "type": "string",
      "control": "select",
      "title": "Notes IMDb sur la fiche",
      "defaultValue": "SHOW_ALL",
      "options": [
        {
          "value": "SHOW_ALL",
          "label": "Tout afficher"
        },
        {
          "value": "HIDE_EPISODES",
          "label": "Masquer les notes des épisodes"
        },
        {
          "value": "HIDE_UNWATCHED_EPISODES",
          "label": "Masquer les notes des épisodes non vus"
        }
      ],
      "description": ""
    },
    {
      "feature": "stream_badge_settings",
      "key": "show_file_size_badges",
      "type": "boolean",
      "control": "toggle",
      "title": "Badges de taille",
      "description": "Affiche les badges de taille de fichier dans les résultats de flux et les panneaux de source du lecteur.",
      "defaultValue": true
    },
    {
      "feature": "stream_badge_settings",
      "key": "show_addon_logo",
      "type": "boolean",
      "control": "toggle",
      "title": "Logo de l’addon",
      "description": "Affiche le logo et le nom de l’addon à côté des sources de streams.",
      "defaultValue": true
    },
    {
      "feature": "stream_badge_settings",
      "key": "stream_badge_placement",
      "type": "string",
      "control": "segmented",
      "title": "Position des badges",
      "description": "Choisissez si les badges Fusion et de taille apparaissent au-dessus ou en dessous des cartes de flux.",
      "defaultValue": "BOTTOM",
      "options": [
        {
          "value": "TOP",
          "label": "En haut"
        },
        {
          "value": "BOTTOM",
          "label": "En bas"
        }
      ]
    },
    {
      "feature": "stream_badge_settings",
      "key": "stream_badge_rules",
      "type": "string",
      "control": "fusion_badge_rules",
      "title": "URL de badges Fusion",
      "description": "",
      "defaultValue": "",
      "advanced": true
    },
    {
      "feature": "layout_settings",
      "key": "continue_watching_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher Continuer à regarder",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "continue_watching_card_style",
      "type": "string",
      "control": "segmented",
      "title": "Style des cartes",
      "defaultValue": "CARD",
      "options": [
        {
          "value": "CARD",
          "label": "Carte"
        },
        {
          "value": "WIDE",
          "label": "Large"
        },
        {
          "value": "POSTER",
          "label": "Affiche"
        }
      ],
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "use_episode_thumbnails_in_cw",
      "type": "boolean",
      "control": "toggle",
      "title": "Utiliser les miniatures d’épisodes dans Continuer à regarder",
      "description": "Utilise les miniatures d’épisodes comme image par défaut. Quand désactivé, utilise l’image de fond.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "blur_continue_watching_next_up",
      "type": "boolean",
      "control": "toggle",
      "title": "Flouter le contenu non vu dans Continuer à regarder",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "next_up_from_furthest_episode",
      "type": "boolean",
      "control": "toggle",
      "title": "Suivant à partir de l’épisode le plus avancé",
      "description": "Quand activé, La suite reprend toujours depuis l’épisode le plus avancé vu. Quand désactivé, suit l’épisode le plus récemment visionné. Utile si vous revoyez des épisodes précédents.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "show_unaired_next_up",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher les épisodes à venir non diffusés",
      "description": "Incluez les épisodes à venir dans Continuer à regarder avant leur diffusion.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "continue_watching_sort_mode",
      "type": "string",
      "control": "select",
      "title": "Ordre de tri",
      "description": "Comment les éléments Continuer à regarder sont organisés",
      "defaultValue": "DEFAULT",
      "options": [
        {
          "value": "DEFAULT",
          "label": "Par défaut"
        },
        {
          "value": "STREAMING_STYLE",
          "label": "Style streaming"
        },
        {
          "value": "SPLIT_UPCOMING",
          "label": "Séparer les épisodes à venir"
        }
      ]
    },
    {
      "feature": "layout_settings",
      "key": "focused_poster_backdrop_expand_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Étendre l’affiche sélectionnée en arrière-plan",
      "description": "Étendre l’affiche sélectionnée après un délai d’inactivité.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "focused_poster_backdrop_expand_delay_seconds",
      "type": "int",
      "control": "number",
      "title": "Délai d’expansion de l’arrière-plan",
      "description": "Temps d’attente avant d’étendre les cartes sélectionnées.",
      "defaultValue": 3,
      "min": 0,
      "step": 1
    },
    {
      "feature": "layout_settings",
      "key": "focused_poster_backdrop_trailer_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Lecture auto de la bande-annonce",
      "description": "Lire l’aperçu de la bande-annonce pour le contenu sélectionné si disponible.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "focused_poster_backdrop_trailer_muted",
      "type": "boolean",
      "control": "toggle",
      "title": "Lire la bande-annonce en sourdine",
      "description": "Couper le son de la bande-annonce pendant l’aperçu automatique.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "focused_poster_backdrop_trailer_playback_target",
      "type": "string",
      "control": "segmented",
      "title": "Emplacement de la bande-annonce (moderne)",
      "description": "Choisir où la bande-annonce est lue dans l’accueil moderne.",
      "defaultValue": "HERO_MEDIA",
      "options": [
        {
          "value": "EXPANDED_CARD",
          "label": "Carte étendue"
        },
        {
          "value": "HERO_MEDIA",
          "label": "Média hero"
        }
      ]
    },
    {
      "feature": "layout_settings",
      "key": "poster_card_width_dp",
      "type": "int",
      "control": "slider",
      "title": "Largeur de carte",
      "defaultValue": 126,
      "min": 104,
      "max": 140,
      "step": 1,
      "unit": "dp",
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "poster_card_height_dp",
      "type": "int",
      "control": "number",
      "title": "Hauteur",
      "defaultValue": 189,
      "min": 120,
      "step": 1,
      "unit": "dp",
      "advanced": true,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "poster_card_corner_radius_dp",
      "type": "int",
      "control": "slider",
      "title": "Rayon de carte",
      "defaultValue": 12,
      "min": 0,
      "max": 16,
      "step": 1,
      "unit": "dp",
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer le relief des cartes",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_edge_strength",
      "type": "int",
      "control": "segmented",
      "title": "Lueur des bordures",
      "defaultValue": 28,
      "options": [
        {
          "value": 28,
          "label": "Subtil"
        },
        {
          "value": 42,
          "label": "Équilibré"
        },
        {
          "value": 56,
          "label": "Gras"
        }
      ],
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_sheen_strength",
      "type": "int",
      "control": "segmented",
      "title": "Reflet supérieur",
      "defaultValue": 10,
      "options": [
        {
          "value": 0,
          "label": "Désactivé"
        },
        {
          "value": 10,
          "label": "Doux"
        },
        {
          "value": 16,
          "label": "Lumineux"
        }
      ],
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_edge_coverage",
      "type": "int",
      "control": "segmented",
      "title": "Étendue des bordures",
      "defaultValue": 0,
      "options": [
        {
          "value": 0,
          "label": "Haut uniquement"
        },
        {
          "value": 50,
          "label": "Moitié"
        },
        {
          "value": 100,
          "label": "Contour complet"
        }
      ],
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_posters_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Affiches",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_continue_watching_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Continuer à regarder",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_episode_cards_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Cartes d’épisodes",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_cast_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Casting",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "layout_settings",
      "key": "card_depth_trailers_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Bandes-annonces",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "loading_overlay_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher la superposition de chargement",
      "description": "Afficher la superposition de chargement initiale pendant le démarrage d’un stream.",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "show_player_loading_status",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher l’état de chargement",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "pause_overlay_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Superposition en pause",
      "description": "Afficher les détails après 5 secondes de pause.",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "osd_clock_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Horloge OSD",
      "description": "Afficher l’heure actuelle et l’heure de fin lorsque les contrôles sont visibles.",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "skip_intro_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Passer l’intro",
      "description": "Afficher un bouton de saut lors des segments d’intro, d’outro et de récapitulatif détectés.",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "parental_guide_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Avertissements de contenu",
      "description": "Afficher l’avertissement de contrôle parental au démarrage de la lecture.",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "auto_skip_segment_types",
      "type": "string_set",
      "control": "multiselect",
      "title": "Saut automatique",
      "description": "Choisissez les segments à passer automatiquement.",
      "defaultValue": [],
      "options": [
        {
          "value": "intro",
          "label": "Intro / Générique de début"
        },
        {
          "value": "recap",
          "label": "Récap"
        },
        {
          "value": "outro",
          "label": "Outro / Générique de fin"
        }
      ]
    },
    {
      "feature": "player_settings",
      "key": "stream_reuse_last_link_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Réutiliser le dernier lien",
      "description": "Lire automatiquement votre dernier stream fonctionnel pour ce même film/épisode lorsque le cache est encore valide.",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "stream_reuse_last_link_cache_hours",
      "type": "int",
      "control": "number",
      "title": "Durée du cache du dernier lien",
      "defaultValue": 24,
      "min": 1,
      "max": 168,
      "step": 1,
      "unit": "hours",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_mode",
      "type": "string",
      "control": "select",
      "title": "Mode de sélection du stream",
      "defaultValue": "MANUAL",
      "options": [
        {
          "value": "MANUAL",
          "label": "Manuel"
        },
        {
          "value": "FIRST_STREAM",
          "label": "Premier stream disponible"
        },
        {
          "value": "REGEX_MATCH",
          "label": "Correspondance regex"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_timeout_seconds",
      "type": "int",
      "control": "select",
      "title": "Délai d’expiration du stream",
      "description": "Combien de temps attendre les streams avant la sélection automatique.",
      "defaultValue": 3,
      "options": [
        {
          "value": 0,
          "label": "Instantané"
        },
        {
          "value": 1,
          "label": "1 s"
        },
        {
          "value": 2,
          "label": "2 s"
        },
        {
          "value": 3,
          "label": "3 s"
        },
        {
          "value": 4,
          "label": "4 s"
        },
        {
          "value": 5,
          "label": "5 s"
        },
        {
          "value": 6,
          "label": "6 s"
        },
        {
          "value": 7,
          "label": "7 s"
        },
        {
          "value": 8,
          "label": "8 s"
        },
        {
          "value": 9,
          "label": "9 s"
        },
        {
          "value": 10,
          "label": "10 s"
        },
        {
          "value": 15,
          "label": "15 s"
        },
        {
          "value": 20,
          "label": "20 s"
        },
        {
          "value": 25,
          "label": "25 s"
        },
        {
          "value": 30,
          "label": "30 s"
        },
        {
          "value": 2147483647,
          "label": "Illimité"
        }
      ]
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_next_episode_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Lecture automatique de l’épisode suivant",
      "description": "Rechercher et lire automatiquement l’épisode suivant lorsque le seuil est atteint.",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_next_episode_fallback_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Utiliser le premier flux en secours",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "still_watching_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Vous regardez toujours ?",
      "description": "Demander après plusieurs épisodes lus automatiquement à la suite.",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "still_watching_episode_threshold",
      "type": "int",
      "control": "slider",
      "title": "Nombre d’épisodes avant confirmation",
      "description": "",
      "defaultValue": 3,
      "min": 2,
      "max": 6,
      "step": 1
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_prefer_bingegroup_next_episode",
      "type": "boolean",
      "control": "toggle",
      "title": "Préférer le groupe binge",
      "description": "Lors de la lecture automatique, préférer un stream du même groupe binge que le stream actuel.",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_reuse_binge_group",
      "type": "boolean",
      "control": "toggle",
      "title": "Réutiliser le groupe de binge",
      "description": "Mémorise et réutilise le dernier groupe de binge entre les sessions (Continuer à regarder, Détails, etc.).",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "next_episode_threshold_mode",
      "type": "string",
      "control": "segmented",
      "title": "Mode de seuil",
      "defaultValue": "PERCENTAGE",
      "options": [
        {
          "value": "PERCENTAGE",
          "label": "Pourcentage"
        },
        {
          "value": "MINUTES_BEFORE_END",
          "label": "Minutes avant la fin"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "next_episode_threshold_percent_v2",
      "type": "float",
      "control": "slider",
      "title": "Pourcentage de seuil",
      "description": "Afficher la carte de l’épisode suivant lorsque la lecture atteint ce pourcentage.",
      "defaultValue": 99,
      "min": 97,
      "max": 100,
      "step": 0.5,
      "unit": "%"
    },
    {
      "feature": "player_settings",
      "key": "next_episode_threshold_minutes_before_end_v2",
      "type": "float",
      "control": "slider",
      "title": "Minutes avant la fin",
      "description": "Afficher la carte de l’épisode suivant lorsque la lecture atteint ce pourcentage.",
      "defaultValue": 2,
      "min": 0,
      "max": 3.5,
      "step": 0.5,
      "unit": "min"
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_source",
      "type": "string",
      "control": "select",
      "title": "Périmètre des sources",
      "defaultValue": "ALL_SOURCES",
      "options": [
        {
          "value": "ALL_SOURCES",
          "label": "Toutes les sources"
        },
        {
          "value": "INSTALLED_ADDONS_ONLY",
          "label": "Addons installés uniquement"
        },
        {
          "value": "ENABLED_PLUGINS_ONLY",
          "label": "Plugins activés uniquement"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_selected_addons",
      "type": "string_set",
      "control": "multiselect",
      "title": "Addons autorisés",
      "description": "",
      "defaultValue": [],
      "runtimeOptions": "addons"
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_selected_plugins",
      "type": "string_set",
      "control": "multiselect",
      "title": "Plugins autorisés",
      "description": "",
      "defaultValue": [],
      "runtimeOptions": "plugins"
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_regex",
      "type": "string",
      "control": "text",
      "title": "Modèle regex",
      "description": "Correspond au nom du stream, à l’étiquette, à la description, à l’addon et à l’URL.",
      "defaultValue": ""
    },
    {
      "feature": "player_settings",
      "key": "preferred_audio_language",
      "type": "string",
      "control": "language",
      "title": "Langue audio préférée",
      "defaultValue": "device",
      "includeAudioSpecials": true,
      "options": [
        {
          "value": "device",
          "label": "Langue de l’appareil"
        },
        {
          "value": "original",
          "label": "Version originale"
        },
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "secondary_preferred_audio_language",
      "type": "string",
      "control": "language",
      "title": "Langue des sous-titres secondaire",
      "defaultValue": "",
      "includeNone": true,
      "options": [
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "skip_silence",
      "type": "boolean",
      "control": "toggle",
      "title": "Passer les silences",
      "description": "Passer les passages silencieux de l’audio pendant la lecture",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "force_optical_passthrough",
      "type": "boolean",
      "control": "toggle",
      "title": "Forcer le transcodage AC-3",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "subtitle_preferred_language",
      "type": "string",
      "control": "language",
      "title": "Langue des sous-titres préférée",
      "defaultValue": "en",
      "includeNone": true,
      "options": [
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_secondary_language",
      "type": "string",
      "control": "language",
      "title": "Langue des sous-titres secondaire",
      "defaultValue": "",
      "includeNone": true,
      "options": [
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_use_forced_subtitles",
      "type": "boolean",
      "control": "toggle",
      "title": "Utiliser les sous-titres forcés",
      "description": "Préférer les sous-titres forcés lorsque l’audio correspond à la langue des sous-titres ; si indisponibles, ne rien sélectionner",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "subtitle_show_only_preferred_languages",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher uniquement les langues préférées",
      "description": "Masquer toutes les autres langues de sous-titres dans la liste de sélection",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "subtitle_strip_sdh",
      "type": "boolean",
      "control": "toggle",
      "title": "Retirer les indications pour malentendants",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "subtitle_organization_mode",
      "type": "string",
      "control": "select",
      "title": "Organisation des sous-titres",
      "defaultValue": "NONE",
      "options": [
        {
          "value": "NONE",
          "label": "Aucun (ordre par défaut)"
        },
        {
          "value": "BY_LANGUAGE",
          "label": "Par langue"
        },
        {
          "value": "BY_ADDON",
          "label": "Par addon"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_size",
      "type": "int",
      "control": "slider",
      "title": "Taille",
      "defaultValue": 100,
      "min": 50,
      "max": 200,
      "step": 10,
      "unit": "%",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_vertical_offset",
      "type": "int",
      "control": "slider",
      "title": "Décalage vertical",
      "defaultValue": 5,
      "min": -20,
      "max": 50,
      "step": 1,
      "unit": "%",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_bold",
      "type": "boolean",
      "control": "toggle",
      "title": "Gras",
      "description": "Utiliser une police en gras pour les sous-titres",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "subtitle_text_color",
      "type": "int",
      "control": "color",
      "title": "Couleur du texte",
      "defaultValue": -1,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_background_color",
      "type": "int",
      "control": "color",
      "title": "Couleur d’arrière-plan",
      "defaultValue": 0,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_outline_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Contour",
      "description": "Ajouter un contour autour du texte des sous-titres pour une meilleure visibilité",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "subtitle_outline_color",
      "type": "int",
      "control": "color",
      "title": "Couleur du contour",
      "defaultValue": -16777216,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_outline_width",
      "type": "int",
      "control": "slider",
      "title": "Épaisseur du contour",
      "defaultValue": 2,
      "min": 1,
      "max": 5,
      "step": 1,
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "cloud_library_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Bibliothèque cloud",
      "description": "Parcourez et lisez les fichiers déjà présents dans vos comptes connectés.",
      "defaultValue": true
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Résoudre les liens lisibles",
      "description": "Demande à un service connecté des liens lisibles quand un résultat le nécessite. Cela peut ajouter l’élément à ce service.",
      "defaultValue": false
    },
    {
      "feature": "debrid_settings",
      "key": "preferred_resolver_provider_id",
      "type": "string",
      "control": "select",
      "title": "Résoudre avec",
      "description": "Choisissez quel compte connecté gère les liens lisibles.",
      "defaultValue": "",
      "options": [
        {
          "value": "",
          "label": "Connectez d’abord un compte."
        },
        {
          "value": "torbox",
          "label": "TorBox"
        },
        {
          "value": "premiumize",
          "label": "Premiumize"
        }
      ]
    },
    {
      "feature": "debrid_settings",
      "key": "torbox_api_key",
      "type": "string",
      "control": "secret",
      "title": "TorBox",
      "description": "Connectez votre compte Torbox.",
      "defaultValue": ""
    },
    {
      "feature": "debrid_settings",
      "key": "premiumize_api_key",
      "type": "string",
      "control": "secret",
      "title": "Premiumize",
      "description": "",
      "defaultValue": ""
    },
    {
      "feature": "debrid_settings",
      "key": "instant_playback_preparation_limit",
      "type": "int",
      "control": "number",
      "title": "Liens à préparer",
      "description": "Résoudre les liens lisibles avant le démarrage de la lecture.",
      "defaultValue": 0,
      "min": 0,
      "max": 20,
      "step": 1
    },
    {
      "feature": "debrid_settings",
      "key": "stream_max_results",
      "type": "int",
      "control": "number",
      "title": "Nombre max de résultats",
      "description": "Limiter le nombre de sources Direct Debrid affichées.",
      "defaultValue": 0,
      "min": 0,
      "max": 500,
      "step": 1
    },
    {
      "feature": "debrid_settings",
      "key": "stream_sort_mode",
      "type": "string",
      "control": "select",
      "title": "Tri des résultats",
      "description": "Choisissez l’ordre dans lequel les résultats apparaissent.",
      "defaultValue": "DEFAULT",
      "options": [
        {
          "value": "DEFAULT",
          "label": "Ordre original"
        },
        {
          "value": "QUALITY_DESC",
          "label": "Meilleure qualité d’abord"
        },
        {
          "value": "SIZE_DESC",
          "label": "Plus gros d’abord"
        },
        {
          "value": "SIZE_ASC",
          "label": "Plus petits d’abord"
        }
      ]
    },
    {
      "feature": "debrid_settings",
      "key": "stream_minimum_quality",
      "type": "string",
      "control": "select",
      "title": "Qualité minimale",
      "description": "Masquer les sources sous la résolution sélectionnée.",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Toutes qualités"
        },
        {
          "value": "P720",
          "label": "720p et plus"
        },
        {
          "value": "P1080",
          "label": "1080p et plus"
        },
        {
          "value": "P2160",
          "label": "4K uniquement"
        }
      ]
    },
    {
      "feature": "debrid_settings",
      "key": "stream_dolby_vision_filter",
      "type": "string",
      "control": "segmented",
      "title": "Dolby Vision",
      "description": "Afficher, masquer ou exiger les sources Dolby Vision.",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Tous"
        },
        {
          "value": "EXCLUDE",
          "label": "Masquer"
        },
        {
          "value": "ONLY",
          "label": "Uniquement"
        }
      ]
    },
    {
      "feature": "debrid_settings",
      "key": "stream_hdr_filter",
      "type": "string",
      "control": "segmented",
      "title": "HDR",
      "description": "Afficher, masquer ou exiger les sources HDR.",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Tous"
        },
        {
          "value": "EXCLUDE",
          "label": "Masquer"
        },
        {
          "value": "ONLY",
          "label": "Uniquement"
        }
      ]
    },
    {
      "feature": "debrid_settings",
      "key": "stream_codec_filter",
      "type": "string",
      "control": "select",
      "title": "Codec",
      "description": "Filtrer les sources par codec vidéo.",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Tout codec"
        },
        {
          "value": "H264",
          "label": "H.264 / AVC"
        },
        {
          "value": "HEVC",
          "label": "HEVC / H.265"
        },
        {
          "value": "AV1",
          "label": "AV1"
        }
      ]
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_name_template",
      "type": "string",
      "control": "text",
      "title": "Modèle de nom",
      "defaultValue": "",
      "advanced": true,
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_description_template",
      "type": "string",
      "control": "textarea",
      "title": "Modèle de description",
      "defaultValue": "",
      "advanced": true,
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "stream_preferences",
      "type": "string",
      "control": "json",
      "title": "Règles de flux",
      "defaultValue": "",
      "advanced": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer l’enrichissement TMDB",
      "description": "Utiliser votre clé API TMDB pour enrichir les métadonnées de l’addon sur l’écran de détails lorsqu’un ID TMDB ou IMDb est disponible.",
      "defaultValue": false
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_modern_home_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer sur l’accueil moderne",
      "description": "Appliquer également l’enrichissement TMDB aux hero et aux cartes sélectionnées de l’accueil moderne",
      "defaultValue": false
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_enrich_continue_watching",
      "type": "boolean",
      "control": "toggle",
      "title": "Enrichir Continuer à regarder",
      "description": "Appliquer l’enrichissement TMDB aux éléments de Continuer à regarder",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_language",
      "type": "string",
      "control": "language",
      "title": "Langue préférée",
      "description": "Configurez le code de langue TMDB utilisé pour les métadonnées localisées, ex. `en`, `en-US` ou `pt-BR`.",
      "defaultValue": "en",
      "tmdbLanguages": true,
      "options": [
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        },
        {
          "value": "en-AU",
          "label": "anglais australien"
        },
        {
          "value": "en-CA",
          "label": "anglais canadien"
        },
        {
          "value": "en-GB",
          "label": "anglais britannique"
        }
      ]
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_artwork",
      "type": "boolean",
      "control": "toggle",
      "title": "Visuels",
      "description": "Remplacer le fond, l’affiche et le logo par les visuels TMDB.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_basic_info",
      "type": "boolean",
      "control": "toggle",
      "title": "Informations de base",
      "description": "Utiliser le titre, le synopsis, les genres et la note de TMDB.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_details",
      "type": "boolean",
      "control": "toggle",
      "title": "Détails",
      "description": "Utiliser les informations de sortie, durée, classification, statut, pays et langue de TMDB.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_release_dates",
      "type": "boolean",
      "control": "toggle",
      "title": "Dates de sortie",
      "description": "Dates de sortie et de diffusion depuis TMDB",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_credits",
      "type": "boolean",
      "control": "toggle",
      "title": "Crédits",
      "description": "Utiliser les créateurs, réalisateurs, scénaristes et photos du casting de TMDB.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_productions",
      "type": "boolean",
      "control": "toggle",
      "title": "Sociétés de production",
      "description": "Utiliser les métadonnées des sociétés de production TMDB sur l’écran de détails.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_networks",
      "type": "boolean",
      "control": "toggle",
      "title": "Chaînes",
      "description": "Utiliser les métadonnées des chaînes TMDB pour les titres TV.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_episodes",
      "type": "boolean",
      "control": "toggle",
      "title": "Épisodes",
      "description": "Utiliser les titres, miniatures, descriptions et durées des épisodes de TMDB pour les séries.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_trailers",
      "type": "boolean",
      "control": "toggle",
      "title": "Bandes-annonces",
      "description": "Récupérer et afficher la section des bandes-annonces TMDB sur les pages de détails.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_more_like_this",
      "type": "boolean",
      "control": "toggle",
      "title": "À voir aussi",
      "description": "Visuels de recommandations TMDB sur la page de détail.",
      "defaultValue": true
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_collections",
      "type": "boolean",
      "control": "toggle",
      "title": "Collections",
      "description": "Afficher des rayons de franchise et de collection pour les films lorsque TMDB les fournit.",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer les notes MDBList",
      "description": "Afficher les notes externes de MDBList sur les pages de métadonnées lorsqu’un ID IMDb est disponible.",
      "defaultValue": false
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_api_key",
      "type": "string",
      "control": "secret",
      "title": "Clé API MDBList",
      "description": "Obtenez une clé sur https://mdblist.com/preferences et collez-la ici.",
      "defaultValue": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_trakt",
      "type": "boolean",
      "control": "toggle",
      "title": "Trakt",
      "description": "Afficher la note Trakt",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_imdb",
      "type": "boolean",
      "control": "toggle",
      "title": "IMDb",
      "description": "Afficher la note IMDb (et masquer la ligne IMDb par défaut si disponible)",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_tmdb",
      "type": "boolean",
      "control": "toggle",
      "title": "TMDB",
      "description": "Afficher la note TMDB",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_letterboxd",
      "type": "boolean",
      "control": "toggle",
      "title": "Letterboxd",
      "description": "Afficher la note Letterboxd",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_tomatoes",
      "type": "boolean",
      "control": "toggle",
      "title": "Rotten Tomatoes",
      "description": "Afficher la note des critiques",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_audience",
      "type": "boolean",
      "control": "toggle",
      "title": "Score du public",
      "description": "Afficher la note du public",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_metacritic",
      "type": "boolean",
      "control": "toggle",
      "title": "Metacritic",
      "description": "Afficher la note Metacritic",
      "defaultValue": true
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_show_mal",
      "type": "boolean",
      "control": "toggle",
      "title": "MyAnimeList",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "trakt_settings",
      "key": "library_source_mode",
      "type": "string",
      "control": "segmented",
      "title": "Source de la bibliothèque",
      "description": "",
      "defaultValue": "TRAKT",
      "options": [
        {
          "value": "TRAKT",
          "label": "Trakt"
        },
        {
          "value": "NUVIO",
          "label": "Bibliothèque Nuvio"
        }
      ]
    },
    {
      "feature": "trakt_settings",
      "key": "watch_progress_source",
      "type": "string",
      "control": "segmented",
      "title": "Progression de visionnage",
      "description": "Choisissez quelle source de progression alimente la reprise et Continuer à regarder",
      "defaultValue": "TRAKT",
      "options": [
        {
          "value": "TRAKT",
          "label": "Trakt"
        },
        {
          "value": "NUVIO_SYNC",
          "label": "Nuvio Sync"
        }
      ]
    },
    {
      "feature": "trakt_settings",
      "key": "continue_watching_days_cap",
      "type": "int",
      "control": "number",
      "title": "Fenêtre de Continuer à regarder",
      "description": "",
      "defaultValue": 60,
      "min": 0,
      "max": 365,
      "step": 1
    },
    {
      "feature": "trakt_settings",
      "key": "show_unaired_next_up",
      "type": "boolean",
      "control": "toggle",
      "title": "Épisodes suivants non diffusés",
      "description": "Afficher les épisodes à venir avant leur diffusion",
      "defaultValue": true
    },
    {
      "feature": "trakt_settings",
      "key": "next_up_from_furthest_episode",
      "type": "boolean",
      "control": "toggle",
      "title": "Suivant à partir de l’épisode le plus avancé",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "trakt_settings",
      "key": "show_meta_comments",
      "type": "boolean",
      "control": "toggle",
      "title": "Commentaires",
      "description": "Afficher les commentaires Trakt dans les détails des films et séries",
      "defaultValue": true
    },
    {
      "feature": "trakt_settings",
      "key": "more_like_this_source",
      "type": "string",
      "control": "segmented",
      "title": "Source de la section Similaires",
      "description": "Choisissez la provenance des recommandations sur les pages de détails",
      "defaultValue": "TRAKT",
      "options": [
        {
          "value": "TRAKT",
          "label": "Trakt"
        },
        {
          "value": "TMDB",
          "label": "TMDB"
        }
      ]
    },
    {
      "feature": "trakt_settings",
      "key": "simkl_anime_id_preference",
      "type": "string",
      "control": "segmented",
      "title": "Identifiant préféré pour les animes",
      "description": "",
      "defaultValue": "IMDB",
      "options": [
        {
          "value": "IMDB",
          "label": "Préférer IMDb"
        },
        {
          "value": "MAL",
          "label": "Préférer MyAnimeList"
        },
        {
          "value": "KITSU",
          "label": "Préférer Kitsu"
        }
      ]
    },
    {
      "feature": "animeskip_settings",
      "key": "animeskip_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer Anime Skip",
      "description": "Récupérer les horodatages de saut depuis anime-skip.com",
      "defaultValue": false
    },
    {
      "feature": "animeskip_settings",
      "key": "animeskip_client_id",
      "type": "string",
      "control": "secret",
      "title": "ID client",
      "description": "Requis pour récupérer les horodatages de saut depuis anime-skip.com",
      "defaultValue": ""
    },
    {
      "feature": "layout_settings",
      "key": "fast_horizontal_navigation_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Navigation horizontale rapide",
      "description": "Augmenter la vitesse de répétition du D-pad dans les rangées tout en conservant la limitation de répétition.",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "smooth_bring_into_view_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Défilement de la sélection Nuvio",
      "description": "Utiliser l’animation et le positionnement globaux personnalisés du défilement de sélection de Nuvio.",
      "defaultValue": true
    },
    {
      "feature": "layout_settings",
      "key": "follow_addons_order",
      "type": "boolean",
      "control": "toggle",
      "title": "Suivre l’ordre des addons",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "layout_settings",
      "key": "compose_highlighter_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Surligneur Compose",
      "description": "Faire clignoter les bordures autour des éléments d’interface en recomposition pour le débogage des performances.",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "enable_http2",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer HTTP/2",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "playback_issue_reports_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Rapports de problèmes de lecture",
      "description": "",
      "defaultValue": false
    }
  ],
  "mobile": [
    {
      "feature": "theme_settings",
      "key": "selected_theme",
      "type": "string",
      "control": "swatches",
      "title": "Thème de couleur",
      "defaultValue": "WHITE",
      "options": [
        {
          "value": "CRIMSON",
          "label": "Cramoisi",
          "color": "#E53935"
        },
        {
          "value": "OCEAN",
          "label": "Océan",
          "color": "#1E88E5"
        },
        {
          "value": "VIOLET",
          "label": "Violet",
          "color": "#7E57C2"
        },
        {
          "value": "EMERALD",
          "label": "Émeraude",
          "color": "#43A047"
        },
        {
          "value": "AMBER",
          "label": "Ambre",
          "color": "#FFB300"
        },
        {
          "value": "ROSE",
          "label": "Rose",
          "color": "#EC407A"
        },
        {
          "value": "WHITE",
          "label": "Blanc",
          "color": "#F7F7F4"
        },
        {
          "value": "GOLD",
          "label": "Or",
          "color": "#FFD45C",
          "supporterOnly": true
        },
        {
          "value": "JADE",
          "label": "Jade",
          "color": "#7BF08D",
          "supporterOnly": true
        },
        {
          "value": "ROSE_GOLD",
          "label": "Or rose",
          "color": "#FFB37A",
          "supporterOnly": true
        },
        {
          "value": "ARCTIC_BLUE",
          "label": "Bleu arctique",
          "color": "#4DE3FF",
          "supporterOnly": true
        },
        {
          "value": "GRAPHITE",
          "label": "Graphite",
          "color": "#AAB2BE",
          "supporterOnly": true
        }
      ],
      "description": ""
    },
    {
      "feature": "theme_settings",
      "key": "amoled_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Noir AMOLED",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "theme_settings",
      "key": "liquid_glass_native_tab_bar_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Liquid Glass",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "poster_card_style_settings_payload",
      "key": "widthDp",
      "type": "int",
      "control": "segmented",
      "title": "Largeur de carte",
      "defaultValue": 126,
      "options": [
        {
          "value": 104,
          "label": "Compact"
        },
        {
          "value": 112,
          "label": "Dense"
        },
        {
          "value": 120,
          "label": "Standard"
        },
        {
          "value": 126,
          "label": "Équilibré"
        },
        {
          "value": 134,
          "label": "Confortable"
        },
        {
          "value": 140,
          "label": "Grand"
        }
      ],
      "description": ""
    },
    {
      "feature": "poster_card_style_settings_payload",
      "key": "cornerRadiusDp",
      "type": "int",
      "control": "segmented",
      "title": "Rayon de carte",
      "defaultValue": 12,
      "options": [
        {
          "value": 0,
          "label": "Marqué"
        },
        {
          "value": 4,
          "label": "Subtil"
        },
        {
          "value": 8,
          "label": "Classique"
        },
        {
          "value": 12,
          "label": "Arrondi"
        },
        {
          "value": 16,
          "label": "Pilule"
        }
      ],
      "description": ""
    },
    {
      "feature": "poster_card_style_settings_payload",
      "key": "catalogLandscapeModeEnabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Affiches en mode paysage",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "poster_card_style_settings_payload",
      "key": "hideLabelsEnabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Masquer les étiquettes",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer le relief des cartes",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "edgeStrength",
      "type": "int",
      "control": "segmented",
      "title": "Lueur des bordures",
      "defaultValue": 28,
      "options": [
        {
          "value": 28,
          "label": "Subtil"
        },
        {
          "value": 42,
          "label": "Équilibré"
        },
        {
          "value": 56,
          "label": "Gras"
        }
      ],
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "sheenStrength",
      "type": "int",
      "control": "segmented",
      "title": "Reflet supérieur",
      "defaultValue": 10,
      "options": [
        {
          "value": 0,
          "label": "Désactivé"
        },
        {
          "value": 10,
          "label": "Doux"
        },
        {
          "value": 16,
          "label": "Lumineux"
        }
      ],
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "edgeCoverage",
      "type": "int",
      "control": "segmented",
      "title": "Étendue des bordures",
      "defaultValue": 0,
      "options": [
        {
          "value": 0,
          "label": "Haut uniquement"
        },
        {
          "value": 50,
          "label": "Moitié"
        },
        {
          "value": 100,
          "label": "Contour complet"
        }
      ],
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "postersEnabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Affiches",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "continueWatchingEnabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Continuer à regarder",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "episodeCardsEnabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Cartes d’épisodes",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "castEnabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Casting",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "card_depth_style_settings_payload",
      "key": "trailersEnabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Bandes-annonces",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "isVisible",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher Continuer à regarder",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "style",
      "type": "string",
      "control": "segmented",
      "title": "Style des cartes",
      "defaultValue": "Card",
      "options": [
        {
          "value": "Card",
          "label": "Carte"
        },
        {
          "value": "Wide",
          "label": "Large"
        },
        {
          "value": "Poster",
          "label": "Affiche"
        }
      ],
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "use_episode_thumbnails_in_cw",
      "type": "boolean",
      "control": "toggle",
      "title": "Préférer les vignettes d’épisode dans Continuer à regarder",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "upNextFromFurthestEpisode",
      "type": "boolean",
      "control": "toggle",
      "title": "Suivant à partir de l’épisode le plus avancé",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "show_unaired_next_up",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher les épisodes à venir non diffusés",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "blur_continue_watching_next_up",
      "type": "boolean",
      "control": "toggle",
      "title": "Flouter le contenu non vu dans Continuer à regarder",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "showResumePromptOnLaunch",
      "type": "boolean",
      "control": "toggle",
      "title": "Invite de reprise au démarrage",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "continue_watching_settings_payload",
      "key": "sort_mode",
      "type": "string",
      "control": "segmented",
      "title": "Ordre de tri",
      "defaultValue": "DEFAULT",
      "options": [
        {
          "value": "DEFAULT",
          "label": "Par défaut"
        },
        {
          "value": "STREAMING_STYLE",
          "label": "Style streaming"
        },
        {
          "value": "SPLIT_UPCOMING",
          "label": "Séparer les épisodes à venir"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "show_loading_overlay",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher la superposition de chargement",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "show_parental_guide",
      "type": "boolean",
      "control": "toggle",
      "title": "Avertissements de contenu",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "resize_mode",
      "type": "string",
      "control": "segmented",
      "title": "Mode de redimensionnement",
      "defaultValue": "Fit",
      "options": [
        {
          "value": "Fit",
          "label": "Ajuster"
        },
        {
          "value": "Fill",
          "label": "Remplir"
        },
        {
          "value": "Zoom",
          "label": "Zoom"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "hold_to_speed_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Maintenir pour accélérer",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "touch_gestures_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Gestes tactiles",
      "description": "Autorise les balayages et les doubles appuis sur le lecteur pour avancer ou reculer, ajuster la luminosité ou le volume.",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "hold_to_speed_value",
      "type": "float",
      "control": "slider",
      "title": "Vitesse de lecture",
      "defaultValue": 2,
      "min": 1.25,
      "max": 3,
      "step": 0.25,
      "unit": "x",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "external_player_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Lecteur externe",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "external_player_forward_subtitles",
      "type": "boolean",
      "control": "toggle",
      "title": "Transmettre les sous-titres",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "external_player_send_skip_segments",
      "type": "boolean",
      "control": "toggle",
      "title": "Envoyer les horodatages d’intro et d’outro",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "external_player_id",
      "type": "string",
      "control": "text",
      "title": "App de lecteur externe",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "android_playback_engine",
      "type": "string",
      "control": "segmented",
      "title": "Moteur de lecture",
      "defaultValue": "Auto",
      "options": [
        {
          "value": "Auto",
          "label": "Automatique"
        },
        {
          "value": "ExoPlayer",
          "label": "ExoPlayer"
        },
        {
          "value": "Libmpv",
          "label": "libmpv"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "android_libmpv_video_output",
      "type": "string",
      "control": "segmented",
      "title": "Sortie vidéo libmpv",
      "defaultValue": "GpuNext",
      "options": [
        {
          "value": "GpuNext",
          "label": "GPU nouvelle génération"
        },
        {
          "value": "Gpu",
          "label": "GPU"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "android_libmpv_hardware_decoding_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Décodage matériel libmpv",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "android_libmpv_yuv420p_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Forcer la sortie YUV420p",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "decoder_priority",
      "type": "int",
      "control": "segmented",
      "title": "Priorité du décodeur",
      "defaultValue": 1,
      "options": [
        {
          "value": 0,
          "label": "Appareil uniquement"
        },
        {
          "value": 1,
          "label": "Préférer l’appareil"
        },
        {
          "value": 2,
          "label": "Préférer l’application"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "map_dv7_to_hevc",
      "type": "boolean",
      "control": "toggle",
      "title": "Convertir Dolby Vision profil 7 en HEVC",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "tunneling_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Lecture tunnelisée",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "use_libass",
      "type": "boolean",
      "control": "toggle",
      "title": "Utiliser libass",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "libass_render_type",
      "type": "string",
      "control": "select",
      "title": "Mode de rendu libass",
      "defaultValue": "CUES",
      "options": [
        {
          "value": "OVERLAY_OPEN_GL",
          "label": "Superposition (OpenGL)"
        },
        {
          "value": "OVERLAY_CANVAS",
          "label": "Superposition (Canvas)"
        },
        {
          "value": "EFFECTS_OPEN_GL",
          "label": "Effets (OpenGL)"
        },
        {
          "value": "EFFECTS_CANVAS",
          "label": "Effets (Canvas)"
        },
        {
          "value": "CUES",
          "label": "Repères"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_video_output_preset",
      "type": "string",
      "control": "select",
      "title": "Préréglage de sortie vidéo",
      "defaultValue": "NativeEdr",
      "options": [
        {
          "value": "NativeEdr",
          "label": "Native EDR"
        },
        {
          "value": "SdrToneMapped",
          "label": "SDR tone mapped"
        },
        {
          "value": "Compatibility",
          "label": "Compatibilité"
        },
        {
          "value": "Custom",
          "label": "Personnalisé"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_tone_mapping_mode",
      "type": "string",
      "control": "select",
      "title": "Tone mapping",
      "defaultValue": "Auto",
      "options": [
        {
          "value": "Auto",
          "label": "Automatique"
        },
        {
          "value": "Bt2390",
          "label": "BT.2390"
        },
        {
          "value": "Mobius",
          "label": "Mobius"
        },
        {
          "value": "Reinhard",
          "label": "Reinhard"
        },
        {
          "value": "Hable",
          "label": "Hable"
        },
        {
          "value": "Gamma",
          "label": "Gamma"
        },
        {
          "value": "Clip",
          "label": "Écrêtage"
        }
      ],
      "onChangeAlso": [
        {
          "feature": "player_settings",
          "key": "ios_video_output_preset",
          "type": "string",
          "value": "Custom"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_target_primaries",
      "type": "string",
      "control": "select",
      "title": "Primaires cibles",
      "defaultValue": "Auto",
      "options": [
        {
          "value": "Auto",
          "label": "Automatique"
        },
        {
          "value": "Bt709",
          "label": "BT.709"
        },
        {
          "value": "DisplayP3",
          "label": "Display P3"
        },
        {
          "value": "Bt2020",
          "label": "BT.2020"
        }
      ],
      "onChangeAlso": [
        {
          "feature": "player_settings",
          "key": "ios_video_output_preset",
          "type": "string",
          "value": "Custom"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_target_transfer",
      "type": "string",
      "control": "select",
      "title": "Transfert cible",
      "defaultValue": "Auto",
      "options": [
        {
          "value": "Auto",
          "label": "Automatique"
        },
        {
          "value": "Srgb",
          "label": "sRGB"
        },
        {
          "value": "Bt1886",
          "label": "BT.1886"
        },
        {
          "value": "Gamma22",
          "label": "Gamma 2.2"
        },
        {
          "value": "Gamma24",
          "label": "Gamma 2.4"
        },
        {
          "value": "Pq",
          "label": "PQ"
        },
        {
          "value": "Hlg",
          "label": "HLG"
        }
      ],
      "onChangeAlso": [
        {
          "feature": "player_settings",
          "key": "ios_video_output_preset",
          "type": "string",
          "value": "Custom"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_hardware_decoder_mode",
      "type": "string",
      "control": "segmented",
      "title": "Décodeur matériel",
      "defaultValue": "VideoToolbox",
      "options": [
        {
          "value": "Auto",
          "label": "Automatique"
        },
        {
          "value": "VideoToolbox",
          "label": "VideoToolbox"
        },
        {
          "value": "Off",
          "label": "Désactivé"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_audio_output_mode",
      "type": "string",
      "control": "segmented",
      "title": "Sortie audio",
      "defaultValue": "Auto",
      "options": [
        {
          "value": "Auto",
          "label": "Automatique"
        },
        {
          "value": "AudioUnit",
          "label": "AudioUnit"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_extended_dynamic_range_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Plage dynamique étendue",
      "defaultValue": true,
      "onChangeAlso": [
        {
          "feature": "player_settings",
          "key": "ios_video_output_preset",
          "type": "string",
          "value": "Custom"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_target_colorspace_hint_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Indication d’espace colorimétrique cible",
      "defaultValue": true,
      "onChangeAlso": [
        {
          "feature": "player_settings",
          "key": "ios_video_output_preset",
          "type": "string",
          "value": "Custom"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_hdr_compute_peak_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Calculer le pic HDR",
      "defaultValue": true,
      "onChangeAlso": [
        {
          "feature": "player_settings",
          "key": "ios_video_output_preset",
          "type": "string",
          "value": "Custom"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_deband_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Atténuer les bandes de couleur",
      "defaultValue": false,
      "onChangeAlso": [],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_interpolation_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Interpolation d’images",
      "defaultValue": false,
      "onChangeAlso": [],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_brightness",
      "type": "int",
      "control": "slider",
      "title": "Luminosité",
      "defaultValue": 0,
      "min": -50,
      "max": 50,
      "step": 1,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_contrast",
      "type": "int",
      "control": "slider",
      "title": "Contraste",
      "defaultValue": 0,
      "min": -50,
      "max": 50,
      "step": 1,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_saturation",
      "type": "int",
      "control": "slider",
      "title": "Saturation",
      "defaultValue": 0,
      "min": -50,
      "max": 50,
      "step": 1,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "ios_gamma",
      "type": "int",
      "control": "slider",
      "title": "Gamma",
      "defaultValue": 0,
      "min": -50,
      "max": 50,
      "step": 1,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "preferred_audio_language",
      "type": "string",
      "control": "language",
      "title": "Langue audio préférée",
      "defaultValue": "device",
      "includeAudioSpecials": true,
      "options": [
        {
          "value": "device",
          "label": "Langue de l’appareil"
        },
        {
          "value": "original",
          "label": "Version originale"
        },
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "secondary_preferred_audio_language",
      "type": "string",
      "control": "language",
      "title": "Langue audio secondaire",
      "defaultValue": "",
      "options": [
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "preferred_subtitle_language",
      "type": "string",
      "control": "language",
      "title": "Langue préférée des sous-titres",
      "defaultValue": "none",
      "options": [
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "secondary_preferred_subtitle_language",
      "type": "string",
      "control": "language",
      "title": "Langue des sous-titres secondaire",
      "defaultValue": "",
      "options": [
        {
          "value": "none",
          "label": "Aucune"
        },
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_use_forced_subtitles",
      "type": "boolean",
      "control": "toggle",
      "title": "Utiliser les sous-titres forcés",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_show_only_preferred_languages",
      "type": "boolean",
      "control": "toggle",
      "title": "Afficher uniquement les langues préférées",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_strip_sdh",
      "type": "boolean",
      "control": "toggle",
      "title": "Retirer les indications pour malentendants",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "player_settings",
      "key": "subtitle_font_size_sp",
      "type": "int",
      "control": "slider",
      "title": "Taille des sous-titres",
      "defaultValue": 18,
      "min": 10,
      "max": 32,
      "step": 1,
      "unit": "sp",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_bottom_offset",
      "type": "int",
      "control": "slider",
      "title": "Décalage vertical",
      "defaultValue": 20,
      "min": 0,
      "max": 120,
      "step": 2,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_bold",
      "type": "boolean",
      "control": "toggle",
      "title": "Gras",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_text_color",
      "type": "string",
      "control": "text",
      "title": "Couleur du texte",
      "description": "",
      "defaultValue": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_background_color",
      "type": "string",
      "control": "text",
      "title": "Couleur d’arrière-plan",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_outline_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Contour",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_outline_color",
      "type": "string",
      "control": "text",
      "title": "Couleur du contour",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "subtitle_outline_width",
      "type": "int",
      "control": "slider",
      "title": "Épaisseur du contour",
      "defaultValue": 2,
      "min": 1,
      "max": 8,
      "step": 1,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_reuse_last_link_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Réutiliser le dernier lien",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_reuse_last_link_cache_hours",
      "type": "int",
      "control": "number",
      "title": "Durée de réutilisation du cache (heures)",
      "defaultValue": 24,
      "min": 1,
      "max": 168,
      "step": 1,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_mode",
      "type": "string",
      "control": "segmented",
      "title": "Mode de sélection du stream",
      "defaultValue": "MANUAL",
      "options": [
        {
          "value": "MANUAL",
          "label": "Manuel"
        },
        {
          "value": "FIRST_STREAM",
          "label": "Premier flux"
        },
        {
          "value": "REGEX_MATCH",
          "label": "Correspondance par expression régulière"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_source",
      "type": "string",
      "control": "select",
      "title": "Périmètre des sources",
      "defaultValue": "ALL_SOURCES",
      "options": [
        {
          "value": "ALL_SOURCES",
          "label": "Toutes les sources"
        },
        {
          "value": "INSTALLED_ADDONS_ONLY",
          "label": "Addons installés uniquement"
        },
        {
          "value": "ENABLED_PLUGINS_ONLY",
          "label": "Plugins activés uniquement"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_selected_addons",
      "type": "string_set",
      "control": "multiselect",
      "title": "Addons autorisés",
      "description": "",
      "defaultValue": [],
      "runtimeOptions": "addons"
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_selected_plugins",
      "type": "string_set",
      "control": "multiselect",
      "title": "Plugins autorisés",
      "description": "",
      "defaultValue": [],
      "runtimeOptions": "plugins"
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_regex",
      "type": "string",
      "control": "text",
      "title": "Modèle regex",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_timeout_seconds",
      "type": "int",
      "control": "select",
      "title": "Délai d’expiration du stream",
      "defaultValue": 3,
      "options": [
        {
          "value": 0,
          "label": "Instantané"
        },
        {
          "value": 1,
          "label": "1 s"
        },
        {
          "value": 2,
          "label": "2 s"
        },
        {
          "value": 3,
          "label": "3 s"
        },
        {
          "value": 4,
          "label": "4 s"
        },
        {
          "value": 5,
          "label": "5 s"
        },
        {
          "value": 6,
          "label": "6 s"
        },
        {
          "value": 7,
          "label": "7 s"
        },
        {
          "value": 8,
          "label": "8 s"
        },
        {
          "value": 9,
          "label": "9 s"
        },
        {
          "value": 10,
          "label": "10 s"
        },
        {
          "value": 15,
          "label": "15 s"
        },
        {
          "value": 20,
          "label": "20 s"
        },
        {
          "value": 25,
          "label": "25 s"
        },
        {
          "value": 30,
          "label": "30 s"
        },
        {
          "value": 2147483647,
          "label": "Illimité"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_next_episode_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Lecture automatique de l’épisode suivant",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_next_episode_fallback_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Utiliser le premier flux en secours",
      "description": "",
      "defaultValue": true
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_prefer_binge_group",
      "type": "boolean",
      "control": "toggle",
      "title": "Préférer le même groupe de lecture",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "stream_auto_play_reuse_binge_group",
      "type": "boolean",
      "control": "toggle",
      "title": "Réutiliser le groupe de binge",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "next_episode_threshold_mode",
      "type": "string",
      "control": "segmented",
      "title": "Mode de seuil",
      "defaultValue": "PERCENTAGE",
      "options": [
        {
          "value": "PERCENTAGE",
          "label": "Pourcentage"
        },
        {
          "value": "MINUTES_BEFORE_END",
          "label": "Minutes avant la fin"
        }
      ],
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "next_episode_threshold_percent_v2",
      "type": "float",
      "control": "slider",
      "title": "Pourcentage de seuil",
      "defaultValue": 99,
      "min": 50,
      "max": 100,
      "step": 1,
      "unit": "%",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "next_episode_threshold_minutes_before_end_v2",
      "type": "float",
      "control": "slider",
      "title": "Minutes avant la fin",
      "defaultValue": 2,
      "min": 0,
      "max": 20,
      "step": 0.5,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "skip_intro_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Passer l’intro",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "animeskip_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Anime Skip",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "animeskip_client_id",
      "type": "string",
      "control": "secret",
      "title": "ID client AnimeSkip",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "player_settings",
      "key": "introdb_api_key",
      "type": "string",
      "control": "secret",
      "title": "Clé API IntroDB",
      "description": "",
      "defaultValue": ""
    },
    {
      "feature": "stream_badge_settings",
      "key": "stream_badge_placement",
      "type": "string",
      "control": "segmented",
      "title": "Position des badges",
      "defaultValue": "BOTTOM",
      "options": [
        {
          "value": "TOP",
          "label": "En haut"
        },
        {
          "value": "BOTTOM",
          "label": "En bas"
        }
      ],
      "description": ""
    },
    {
      "feature": "stream_badge_settings",
      "key": "show_file_size_badges",
      "type": "boolean",
      "control": "toggle",
      "title": "Badges de taille des fichiers",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "stream_badge_settings",
      "key": "stream_badge_rules",
      "type": "string",
      "control": "fusion_badge_rules",
      "title": "URL des badges",
      "description": "",
      "defaultValue": ""
    },
    {
      "feature": "meta_screen_settings_payload",
      "key": "cinematicBackground",
      "type": "boolean",
      "control": "toggle",
      "title": "Fond cinématographique",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "meta_screen_settings_payload",
      "key": "hero_trailer_playback",
      "type": "boolean",
      "control": "toggle",
      "title": "Lecture des bandes-annonces dans le Hero",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "meta_screen_settings_payload",
      "key": "tvStyleLayout",
      "type": "boolean",
      "control": "toggle",
      "title": "Disposition des onglets",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "meta_screen_settings_payload",
      "key": "episodeCardStyle",
      "type": "string",
      "control": "segmented",
      "title": "Cartes d’épisodes",
      "defaultValue": "horizontal",
      "options": [
        {
          "value": "horizontal",
          "label": "Horizontal"
        },
        {
          "value": "list",
          "label": "Liste"
        }
      ],
      "description": ""
    },
    {
      "feature": "meta_screen_settings_payload",
      "key": "blur_unwatched_episodes",
      "type": "boolean",
      "control": "toggle",
      "title": "Flouter les épisodes non vus",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "meta_screen_settings_payload",
      "key": "items",
      "type": "string",
      "control": "json",
      "title": "SECTIONS",
      "description": "",
      "defaultValue": "[]"
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_cloud_library_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Bibliothèque cloud",
      "description": "Parcourez et lisez les fichiers déjà présents dans vos comptes connectés.",
      "defaultValue": true
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Résoudre les liens lisibles",
      "description": "",
      "defaultValue": false
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_preferred_resolver_provider_id",
      "type": "string",
      "control": "select",
      "title": "Résoudre avec",
      "defaultValue": "",
      "options": [
        {
          "value": "",
          "label": "Connectez d’abord un compte."
        },
        {
          "value": "torbox",
          "label": "TorBox"
        },
        {
          "value": "premiumize",
          "label": "Premiumize"
        }
      ],
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_torbox_api_key",
      "type": "string",
      "control": "secret",
      "title": "TorBox",
      "description": "Connectez votre compte Torbox.",
      "defaultValue": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_premiumize_api_key",
      "type": "string",
      "control": "secret",
      "title": "Premiumize",
      "description": "",
      "defaultValue": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_instant_playback_preparation_limit",
      "type": "int",
      "control": "number",
      "title": "Liens à préparer",
      "defaultValue": 0,
      "min": 0,
      "max": 20,
      "step": 1,
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_max_results",
      "type": "int",
      "control": "number",
      "title": "Nombre max de résultats",
      "defaultValue": 0,
      "min": 0,
      "max": 500,
      "step": 1,
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_sort_mode",
      "type": "string",
      "control": "select",
      "title": "Tri des résultats",
      "defaultValue": "DEFAULT",
      "options": [
        {
          "value": "DEFAULT",
          "label": "Ordre original"
        },
        {
          "value": "QUALITY_DESC",
          "label": "Meilleure qualité d’abord"
        },
        {
          "value": "SIZE_DESC",
          "label": "Plus gros d’abord"
        },
        {
          "value": "SIZE_ASC",
          "label": "Plus petits d’abord"
        }
      ],
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_minimum_quality",
      "type": "string",
      "control": "select",
      "title": "Qualité minimale",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Toutes qualités"
        },
        {
          "value": "P720",
          "label": "720p et plus"
        },
        {
          "value": "P1080",
          "label": "1080p et plus"
        },
        {
          "value": "P2160",
          "label": "4K uniquement"
        }
      ],
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_dolby_vision_filter",
      "type": "string",
      "control": "segmented",
      "title": "Dolby Vision",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Tous"
        },
        {
          "value": "EXCLUDE",
          "label": "Masquer"
        },
        {
          "value": "ONLY",
          "label": "Uniquement"
        }
      ],
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_hdr_filter",
      "type": "string",
      "control": "segmented",
      "title": "HDR",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Tous"
        },
        {
          "value": "EXCLUDE",
          "label": "Masquer"
        },
        {
          "value": "ONLY",
          "label": "Uniquement"
        }
      ],
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_codec_filter",
      "type": "string",
      "control": "select",
      "title": "Codec",
      "defaultValue": "ANY",
      "options": [
        {
          "value": "ANY",
          "label": "Tout codec"
        },
        {
          "value": "H264",
          "label": "H.264 / AVC"
        },
        {
          "value": "HEVC",
          "label": "HEVC / H.265"
        },
        {
          "value": "AV1",
          "label": "AV1"
        }
      ],
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_name_template",
      "type": "string",
      "control": "text",
      "title": "Modèle de nom",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_description_template",
      "type": "string",
      "control": "textarea",
      "title": "Modèle de description",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "debrid_settings",
      "key": "debrid_stream_preferences",
      "type": "string",
      "control": "json",
      "title": "Règles de flux",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer l’enrichissement TMDB",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_api_key",
      "type": "string",
      "control": "secret",
      "title": "Clé API TMDB",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_language",
      "type": "string",
      "control": "language",
      "title": "Langue préférée",
      "defaultValue": "en",
      "options": [
        {
          "value": "af",
          "label": "afrikaans"
        },
        {
          "value": "sq",
          "label": "albanais"
        },
        {
          "value": "am",
          "label": "amharique"
        },
        {
          "value": "ar",
          "label": "arabe"
        },
        {
          "value": "hy",
          "label": "arménien"
        },
        {
          "value": "az",
          "label": "azerbaïdjanais"
        },
        {
          "value": "eu",
          "label": "basque"
        },
        {
          "value": "be",
          "label": "biélorusse"
        },
        {
          "value": "bn",
          "label": "bengali"
        },
        {
          "value": "bs",
          "label": "bosniaque"
        },
        {
          "value": "bg",
          "label": "bulgare"
        },
        {
          "value": "my",
          "label": "birman"
        },
        {
          "value": "ca",
          "label": "catalan"
        },
        {
          "value": "zh",
          "label": "chinois"
        },
        {
          "value": "zh-CN",
          "label": "chinois (Chine)"
        },
        {
          "value": "zh-TW",
          "label": "chinois (Taïwan)"
        },
        {
          "value": "hr",
          "label": "croate"
        },
        {
          "value": "cs",
          "label": "tchèque"
        },
        {
          "value": "da",
          "label": "danois"
        },
        {
          "value": "nl",
          "label": "néerlandais"
        },
        {
          "value": "en",
          "label": "anglais"
        },
        {
          "value": "et",
          "label": "estonien"
        },
        {
          "value": "tl",
          "label": "filipino"
        },
        {
          "value": "fi",
          "label": "finnois"
        },
        {
          "value": "fr",
          "label": "français"
        },
        {
          "value": "gl",
          "label": "galicien"
        },
        {
          "value": "ka",
          "label": "géorgien"
        },
        {
          "value": "de",
          "label": "allemand"
        },
        {
          "value": "el",
          "label": "grec"
        },
        {
          "value": "gu",
          "label": "goudjarati"
        },
        {
          "value": "he",
          "label": "hébreu"
        },
        {
          "value": "hi",
          "label": "hindi"
        },
        {
          "value": "hu",
          "label": "hongrois"
        },
        {
          "value": "is",
          "label": "islandais"
        },
        {
          "value": "id",
          "label": "indonésien"
        },
        {
          "value": "ga",
          "label": "irlandais"
        },
        {
          "value": "it",
          "label": "italien"
        },
        {
          "value": "ja",
          "label": "japonais"
        },
        {
          "value": "kn",
          "label": "kannada"
        },
        {
          "value": "kk",
          "label": "kazakh"
        },
        {
          "value": "km",
          "label": "khmer"
        },
        {
          "value": "ko",
          "label": "coréen"
        },
        {
          "value": "lo",
          "label": "lao"
        },
        {
          "value": "lv",
          "label": "letton"
        },
        {
          "value": "lt",
          "label": "lituanien"
        },
        {
          "value": "mk",
          "label": "macédonien"
        },
        {
          "value": "ms",
          "label": "malais"
        },
        {
          "value": "ml",
          "label": "malayalam"
        },
        {
          "value": "mt",
          "label": "maltais"
        },
        {
          "value": "mr",
          "label": "marathi"
        },
        {
          "value": "mn",
          "label": "mongol"
        },
        {
          "value": "ne",
          "label": "népalais"
        },
        {
          "value": "no",
          "label": "norvégien"
        },
        {
          "value": "pa",
          "label": "pendjabi"
        },
        {
          "value": "fa",
          "label": "persan"
        },
        {
          "value": "pl",
          "label": "polonais"
        },
        {
          "value": "pt",
          "label": "portugais"
        },
        {
          "value": "pt-br",
          "label": "portugais brésilien"
        },
        {
          "value": "ro",
          "label": "roumain"
        },
        {
          "value": "ru",
          "label": "russe"
        },
        {
          "value": "sr",
          "label": "serbe"
        },
        {
          "value": "si",
          "label": "cingalais"
        },
        {
          "value": "sk",
          "label": "slovaque"
        },
        {
          "value": "sl",
          "label": "slovène"
        },
        {
          "value": "es",
          "label": "espagnol"
        },
        {
          "value": "es-419",
          "label": "espagnol d’Amérique latine"
        },
        {
          "value": "sw",
          "label": "swahili"
        },
        {
          "value": "sv",
          "label": "suédois"
        },
        {
          "value": "ta",
          "label": "tamoul"
        },
        {
          "value": "te",
          "label": "télougou"
        },
        {
          "value": "th",
          "label": "thaï"
        },
        {
          "value": "tr",
          "label": "turc"
        },
        {
          "value": "uk",
          "label": "ukrainien"
        },
        {
          "value": "ur",
          "label": "ourdou"
        },
        {
          "value": "uz",
          "label": "ouzbek"
        },
        {
          "value": "vi",
          "label": "vietnamien"
        },
        {
          "value": "cy",
          "label": "gallois"
        },
        {
          "value": "zu",
          "label": "zoulou"
        },
        {
          "value": "en-AU",
          "label": "anglais australien"
        },
        {
          "value": "en-CA",
          "label": "anglais canadien"
        },
        {
          "value": "en-GB",
          "label": "anglais britannique"
        }
      ],
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_trailers",
      "type": "boolean",
      "control": "toggle",
      "title": "Bandes-annonces",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_artwork",
      "type": "boolean",
      "control": "toggle",
      "title": "Visuels",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_basic_info",
      "type": "boolean",
      "control": "toggle",
      "title": "Informations de base",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_details",
      "type": "boolean",
      "control": "toggle",
      "title": "Détails",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_credits",
      "type": "boolean",
      "control": "toggle",
      "title": "Crédits",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_productions",
      "type": "boolean",
      "control": "toggle",
      "title": "Sociétés de production",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_networks",
      "type": "boolean",
      "control": "toggle",
      "title": "Chaînes",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_episodes",
      "type": "boolean",
      "control": "toggle",
      "title": "Épisodes",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_season_posters",
      "type": "boolean",
      "control": "toggle",
      "title": "Affiches de saison",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_more_like_this",
      "type": "boolean",
      "control": "toggle",
      "title": "À voir aussi",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_collections",
      "type": "boolean",
      "control": "toggle",
      "title": "Collections",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "tmdb_settings",
      "key": "tmdb_use_release_dates",
      "type": "boolean",
      "control": "toggle",
      "title": "Dates de sortie",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Activer les notes MDBList",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_api_key",
      "type": "string",
      "control": "secret",
      "title": "Clé API MDBList",
      "defaultValue": "",
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_imdb",
      "type": "boolean",
      "control": "toggle",
      "title": "IMDb",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_tmdb",
      "type": "boolean",
      "control": "toggle",
      "title": "TMDB",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_tomatoes",
      "type": "boolean",
      "control": "toggle",
      "title": "Rotten Tomatoes",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_metacritic",
      "type": "boolean",
      "control": "toggle",
      "title": "Metacritic",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_trakt",
      "type": "boolean",
      "control": "toggle",
      "title": "Trakt",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_letterboxd",
      "type": "boolean",
      "control": "toggle",
      "title": "Letterboxd",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_audience",
      "type": "boolean",
      "control": "toggle",
      "title": "Score du public",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "mdblist_settings",
      "key": "mdblist_use_mal",
      "type": "boolean",
      "control": "toggle",
      "title": "MyAnimeList",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "trakt_settings_payload",
      "key": "watchProgressSource",
      "type": "string",
      "control": "segmented",
      "title": "Source de progression de lecture",
      "defaultValue": "TRAKT",
      "options": [
        {
          "value": "TRAKT",
          "label": "Trakt"
        },
        {
          "value": "NUVIO_SYNC",
          "label": "Nuvio Sync"
        }
      ],
      "description": ""
    },
    {
      "feature": "trakt_settings_payload",
      "key": "continueWatchingDaysCap",
      "type": "int",
      "control": "select",
      "title": "Période de l’historique de reprise",
      "defaultValue": 60,
      "options": [
        {
          "value": 14,
          "label": "14 jours"
        },
        {
          "value": 30,
          "label": "30 jours"
        },
        {
          "value": 60,
          "label": "60 jours"
        },
        {
          "value": 90,
          "label": "90 jours"
        },
        {
          "value": 180,
          "label": "180 jours"
        },
        {
          "value": 365,
          "label": "365 jours"
        },
        {
          "value": 0,
          "label": "Tout l’historique"
        }
      ],
      "description": ""
    },
    {
      "feature": "trakt_settings_payload",
      "key": "librarySourceMode",
      "type": "string",
      "control": "segmented",
      "title": "Source de la bibliothèque",
      "defaultValue": "TRAKT",
      "options": [
        {
          "value": "TRAKT",
          "label": "Trakt"
        },
        {
          "value": "LOCAL",
          "label": "Local"
        }
      ],
      "description": ""
    },
    {
      "feature": "trakt_settings_payload",
      "key": "moreLikeThisSource",
      "type": "string",
      "control": "segmented",
      "title": "Source de la section Similaires",
      "defaultValue": "TRAKT",
      "options": [
        {
          "value": "TRAKT",
          "label": "Trakt"
        },
        {
          "value": "TMDB",
          "label": "TMDB"
        }
      ],
      "description": ""
    },
    {
      "feature": "trakt_settings_payload",
      "key": "simklAnimeIdPreference",
      "type": "string",
      "control": "segmented",
      "title": "Identifiant préféré pour les animes",
      "description": "",
      "defaultValue": "IMDB",
      "options": [
        {
          "value": "IMDB",
          "label": "Préférer IMDb"
        },
        {
          "value": "MAL",
          "label": "Préférer MyAnimeList"
        },
        {
          "value": "KITSU",
          "label": "Préférer Kitsu"
        }
      ]
    },
    {
      "feature": "trakt_comments_settings",
      "key": "comments_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Commentaires",
      "defaultValue": true,
      "description": ""
    },
    {
      "feature": "notifications_settings",
      "key": "episode_release_alerts_enabled",
      "type": "boolean",
      "control": "toggle",
      "title": "Alertes de sortie d’épisodes",
      "defaultValue": false,
      "description": ""
    },
    {
      "feature": "theme_settings",
      "key": "nav_bar_style",
      "type": "string",
      "control": "select",
      "title": "Style de la barre de navigation",
      "defaultValue": "adaptive",
      "options": [
        {
          "value": "adaptive",
          "label": "Adaptatif"
        },
        {
          "value": "expanded",
          "label": "Toujours déployée"
        },
        {
          "value": "compact",
          "label": "Toujours compacte"
        },
        {
          "value": "classic",
          "label": "Classique"
        }
      ]
    },
    {
      "feature": "meta_screen_settings_payload",
      "key": "background_mode",
      "type": "string",
      "control": "select",
      "title": "Mode d’arrière-plan",
      "defaultValue": "normal",
      "options": [
        {
          "value": "normal",
          "label": "Normal"
        },
        {
          "value": "cinematic",
          "label": "Cinématographique"
        },
        {
          "value": "dominant_color",
          "label": "Couleur dominante"
        }
      ]
    }
  ]
};
