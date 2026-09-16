import { schema } from "./settings-schema.js";

const blueprints = {
  tv: [
    { id: "appearance", title: "Apparence", description: "Thème de couleur, police et style de l’écran des paramètres.", groups: [
      [0, 2, "Thème", "Choisissez la couleur d’accent et le rendu AMOLED."],
      [3, 3, "Police de l’application", "Choisissez la police utilisée par l’application."],
      [4, 4, "Style des paramètres", "Choisissez l’organisation de l’application Paramètres sur TV."],
    ] },
    { id: "experience", title: "Expérience", description: "Choisissez une expérience essentielle ou avancée.", groups: [
      [5, 5, "Mode d’expérience", "Commencez simplement ou déverrouillez toutes les personnalisations."],
    ] },
    { id: "layout", title: "Disposition", description: "Structure de l’accueil et styles des affiches.", groups: [
      [6, 9, "Disposition de l’accueil", "Choisissez la structure de l’accueil et le rendu du Hero."],
      [10, 19, "Contenu de l’accueil", "Contrôlez ce qui apparaît sur l’accueil et dans la recherche."],
      [20, 26, "Page de détail", "Réglages des fiches de contenu et des écrans d’épisodes."],
      [27, 30, "Streams", "Réglez les informations visuelles affichées sur les sources."],
      [31, 37, "Continuer à regarder", "Réglez l’affichage et l’ordre des éléments à reprendre."],
      [38, 42, "Affiche sélectionnée", "Réglez l’extension de l’affiche sélectionnée et l’aperçu vidéo."],
      [43, 45, "Style des cartes d’affiche", "Réglez les dimensions et les coins des cartes."],
      [46, 54, "Relief des cartes", "Ajoutez une lumière de bord et un reflet aux cartes."],
    ] },
    { id: "playback", title: "Lecture", description: "Lecteur, sous-titres et lecture automatique.", groups: [
      [55, 61, "Général", "Comportement général du lecteur et informations affichées."],
      [62, 78, "Lecteur et sélection des streams", "Réutilisation des liens, sélection automatique et épisode suivant."],
      [79, 82, "Audio et vidéo", "Préférences de langue audio et compatibilité de sortie."],
      [83, 96, "Sous-titres", "Sélection, organisation et style des sous-titres."],
    ] },
    { id: "integrations", title: "Intégrations", description: "Services connectés et fournisseurs de métadonnées.", groups: [
      [97, 111, "Services connectés", "Connectez des comptes pour obtenir des liens et accéder à une bibliothèque cloud."],
      [112, 126, "Enrichissement TMDB", "Choisissez les champs de métadonnées fournis par TMDB."],
      [127, 136, "Notes MDBList", "Choisissez les notes externes affichées sur les fiches."],
      [137, 144, "Traking", "Choisissez les sources de bibliothèque, progression, recommandations et commentaires."],
      [145, 146, "Anime Skip", "Récupérez les horodatages de segments depuis anime-skip.com."],
    ] },
    { id: "advanced", title: "Avancé", description: "Performances, navigation, réseau et diagnostics.", groups: [
      [147, 152, "Performances et navigation", "Comportements avancés partagés par les appareils TV."],
    ] },
  ],
  mobile: [
    { id: "layout", title: "Disposition", description: "Thème, affichage, cartes d’affiche et Continuer à regarder.", groups: [
      [0, 2, "Thème", "Choisissez le thème de couleur utilisé dans l’application."],
      [3, 6, "Style des cartes d’affiche", "Réglez les dimensions et les étiquettes des cartes."],
      [7, 15, "Relief des cartes", "Ajoutez une lumière de bord et un léger reflet aux cartes."],
      [16, 23, "Continuer à regarder", "Réglez la visibilité, le style et le comportement de l’épisode suivant."],
    ] },
    { id: "playback", title: "Lecture", description: "Lecteur, sous-titres, sélection des streams et épisode suivant.", groups: [
      [24, 33, "Lecteur", "Comportement principal du lecteur."],
      [34, 42, "Décodeur Android", "Moteur de lecture et comportement du décodeur Android."],
      [43, 57, "Sortie vidéo iOS", "HDR, tone mapping, décodeur et réglages d’image sur iOS."],
      [58, 64, "Sous-titres et audio", "Comportement des langues audio et de sous-titres préférées."],
      [65, 72, "Rendu des sous-titres", "Personnalisez le style des sous-titres."],
      [73, 80, "Sélection des streams", "Réutilisez les liens et réglez la sélection automatique."],
      [81, 87, "Épisode suivant", "Contrôlez la lecture automatique de l’épisode suivant."],
      [88, 91, "Passage des segments", "Utilisez les fournisseurs de segments pris en charge."],
    ] },
    { id: "streams", title: "Streams", description: "Badges de stream et règles d’affichage.", groups: [
      [92, 94, "Badges de stream", "Contrôlez les badges de taille et les URL de badges personnalisés."],
    ] },
    { id: "content", title: "Contenu et découverte", description: "Présentation de la page de détail.", groups: [
      [95, 100, "Page de détail", "Réglez l’écran de métadonnées et les cartes d’épisodes."],
    ] },
    { id: "integrations", title: "Intégrations", description: "Services connectés et fournisseurs de métadonnées.", groups: [
      [101, 115, "Services connectés", "Connectez des comptes pour obtenir des liens et accéder à une bibliothèque cloud."],
      [116, 130, "Enrichissement TMDB", "Choisissez les champs de métadonnées fournis par TMDB."],
      [131, 140, "Notes MDBList", "Configurez les notes externes affichées sur les fiches."],
    ] },
    { id: "trakt", title: "Traking", description: "Progression, bibliothèque, contenus similaires et commentaires.", groups: [
      [141, 146, "Réglages Trakt", "Choisissez la manière dont les données Trakt participent à l’application."],
    ] },
    { id: "notifications", title: "Notifications", description: "Préférences de notifications mobiles.", groups: [
      [147, 147, "Notifications", "Choisissez les alertes mobiles activées."],
    ] },
    { id: "app_only", title: "Fonctions de l’application", description: "Réglages présents dans le code Mobile officiel mais absents de nuvio.tv.", experimental: true, groups: [
      [148, 149, "Réglages non exposés sur le site", "Leur synchronisation doit être considérée comme expérimentale."],
    ] },
  ],
};

// La couleur du profil est déjà gérée dans l’onglet Profil et synchronisée
// avec l’identité Nuvio. Conserver la clé dans le schéma protège la valeur
// existante, mais évite de présenter deux contrôles concurrents.
const dashboardHiddenSettingKeys = new Set(["theme_settings.selected_theme"]);

export const settingsSections = Object.fromEntries(
  Object.entries(blueprints).map(([platform, sections]) => [
    platform,
    sections.map((section) => ({
      ...section,
      groups: section.groups.map(([start, end, title, description]) => ({
        title,
        description,
        keys: schema[platform]
          .slice(start, end + 1)
          .map((item) => `${item.feature}.${item.key}`)
          .filter((key) => !dashboardHiddenSettingKeys.has(key)),
      })),
    })),
  ]),
);

const descriptions = {
  "trailer_settings.trailer_enabled": "Lire automatiquement les bandes-annonces sur la fiche après une période d’inactivité.",
  "stream_badge_settings.stream_badge_rules": "Importer depuis une URL un fichier JSON de badges de stream au format Fusion.",
  "layout_settings.blur_continue_watching_next_up": "Flouter les miniatures du prochain épisode afin d’éviter les spoilers.",
  "player_settings.show_player_loading_status": "Afficher l’état de chargement des sources pendant l’attente des streams.",
  "player_settings.stream_auto_play_next_episode_fallback_enabled": "En mode manuel, essayer automatiquement la première source pour l’épisode suivant.",
  "player_settings.still_watching_episode_threshold": "Nombre d’épisodes lus automatiquement avant de demander une confirmation.",
  "player_settings.stream_auto_play_selected_addons": "Ne rien sélectionner pour autoriser tous les addons installés.",
  "player_settings.stream_auto_play_selected_plugins": "Ne rien sélectionner pour autoriser tous les plugins activés.",
  "player_settings.force_optical_passthrough": "Transcoder les formats multicanaux en Dolby Digital 5.1 pour les connexions optiques/SPDIF.",
  "player_settings.subtitle_strip_sdh": "Masquer les descriptions sonores et les noms des intervenants dans les sous-titres compatibles.",
  "debrid_settings.premiumize_api_key": "Connecter votre compte Premiumize.",
  "mdblist_settings.mdblist_show_mal": "Afficher la note MyAnimeList.",
  "trakt_settings.library_source_mode": "Choisir la bibliothèque utilisée pour enregistrer et consulter votre collection.",
  "trakt_settings.continue_watching_days_cap": "Durée de l’historique Trakt utilisée pour Continuer à regarder ; 0 inclut tout l’historique.",
  "trakt_settings.next_up_from_furthest_episode": "Déterminer l’épisode suivant à partir de l’épisode vu le plus avancé.",
  "trakt_settings.simkl_anime_id_preference": "Avec MAL ou Kitsu, chaque saison d’un anime possède sa propre entrée au lieu d’être regroupée sous un seul identifiant IMDb.",
  "layout_settings.follow_addons_order": "Utiliser l’ordre des addons installés pour organiser les rangées de catalogues.",
  "player_settings.enable_http2": "Utiliser HTTP/2 lorsque le réseau personnalisé est activé sur TV.",
  "player_settings.playback_issue_reports_enabled": "Afficher les boutons de signalement pendant la lecture, les chargements longs et les erreurs.",
  "theme_settings.amoled_enabled": "Utiliser un noir pur pour les arrière-plans de l’application.",
  "theme_settings.liquid_glass_native_tab_bar_enabled": "Utiliser la barre d’onglets translucide native lorsqu’elle est disponible.",
  "card_depth_style_settings_payload.enabled": "Ajouter un éclairage de bord donnant du relief aux cartes compatibles.",
  "player_settings.show_loading_overlay": "Afficher l’illustration et les informations pendant la préparation du lecteur.",
  "player_settings.show_parental_guide": "Afficher les indications de contrôle parental au démarrage de la lecture.",
  "player_settings.external_player_send_skip_segments": "Transmettre les horodatages connus aux lecteurs externes compatibles.",
  "player_settings.android_libmpv_yuv420p_enabled": "Utiliser un format de pixels largement compatible pour la sortie libmpv.",
  "player_settings.map_dv7_to_hevc": "Améliorer la compatibilité des streams Dolby Vision profil 7.",
  "player_settings.tunneling_enabled": "Autoriser les appareils Android compatibles à utiliser la lecture audio/vidéo tunnelisée.",
  "player_settings.use_libass": "Rendre les sous-titres stylisés avec libass sur les moteurs Android compatibles.",
  "player_settings.subtitle_text_color": "Utiliser une couleur au format de l’application, par exemple #FFFFFFFF.",
  "player_settings.introdb_api_key": "Utilisée pour envoyer à IntroDB les horodatages d’introduction et de générique de fin.",
  "meta_screen_settings_payload.items": "Ordre avancé des sections au format JSON. Conserver les clés, l’état, l’ordre et les groupes d’onglets.",
  "debrid_settings.debrid_enabled": "Demander à un service connecté des liens lisibles lorsqu’un résultat le nécessite.",
  "debrid_settings.debrid_premiumize_api_key": "Connecter votre compte Premiumize.",
  "trakt_settings_payload.simklAnimeIdPreference": "Avec MAL ou Kitsu, chaque saison d’un anime possède sa propre entrée au lieu d’être regroupée sous un seul identifiant IMDb.",
  "theme_settings.nav_bar_style": "Choisir la manière dont la barre de navigation Mobile se déploie.",
  "meta_screen_settings_payload.background_mode": "Choisir comment les visuels apparaissent derrière les pages de métadonnées.",
};

export const settingDescription = (meta) => meta?.description || descriptions[`${meta?.feature}.${meta?.key}`] || "";

const optionDescriptions = {
  "theme_settings.settings_ui_style.CLASSIC": "Disposition standard avec des cartes.",
  "theme_settings.settings_ui_style.ZEN": "Disposition simple et plus plate.",
  "theme_settings.settings_ui_style.HORIZON": "Navigation dans des onglets en haut.",
  "experience_settings.mode.ESSENTIAL": "Addons, lecture essentielle, Trakt et compte.",
  "experience_settings.mode.ADVANCED": "Tous les réglages, catalogues, collections, plugins et diagnostics.",
  "layout_settings.selected_layout.CLASSIC": "Catégories parcourues horizontalement.",
  "layout_settings.selected_layout.GRID": "Grille verticale avec une section Hero.",
  "layout_settings.selected_layout.MODERN": "Hero fixe et une seule rangée active.",
  "player_settings.android_libmpv_video_output.GpuNext": "Moteur moderne avec un traitement de meilleure qualité.",
  "player_settings.android_libmpv_video_output.Gpu": "Moteur de compatibilité pour les appareils rencontrant des problèmes avec GPU next.",
  "meta_screen_settings_payload.background_mode.normal": "Utiliser l’arrière-plan standard de l’application.",
  "meta_screen_settings_payload.background_mode.cinematic": "Afficher un fond légèrement flou derrière la page.",
  "meta_screen_settings_payload.background_mode.dominant_color": "Adapter l’arrière-plan de la page à la couleur principale du fond.",
};

export const settingOptionDescription = (meta, option) =>
  optionDescriptions[`${meta?.feature}.${meta?.key}.${option?.value}`] || "";

const get = (values, feature, key) => values.get(`${feature}.${key}`);

export function settingIsVisible(platform, meta, values) {
  const feature = meta.feature;
  const key = meta.key;
  if (platform === "tv") {
    if (key === "amoled_surfaces_mode") return get(values, "theme_settings", "amoled_mode") === true;
    if (key === "modern_sidebar_blur_enabled") return get(values, "layout_settings", "modern_sidebar_enabled") === true;
    if (key === "trailer_delay_seconds") return get(values, "trailer_settings", "trailer_enabled") === true;
    if (key.startsWith("card_depth_") && key !== "card_depth_enabled") return get(values, "layout_settings", "card_depth_enabled") === true;
    if (key === "stream_reuse_last_link_cache_hours") return get(values, "player_settings", "stream_reuse_last_link_enabled") === true;
    if (key === "still_watching_episode_threshold") return get(values, "player_settings", "still_watching_enabled") === true;
  }
  if (platform === "mobile") {
    if (feature === "card_depth_style_settings_payload" && key !== "enabled") return get(values, feature, "enabled") === true;
    if (["external_player_forward_subtitles", "external_player_send_skip_segments", "external_player_id"].includes(key)) return get(values, "player_settings", "external_player_enabled") === true;
    if (key === "libass_render_type") return get(values, "player_settings", "use_libass") === true;
    if (key === "stream_reuse_last_link_cache_hours") return get(values, "player_settings", "stream_reuse_last_link_enabled") === true;
  }
  if (key === "next_episode_threshold_percent_v2") return get(values, "player_settings", "next_episode_threshold_mode") === "PERCENTAGE";
  if (key === "next_episode_threshold_minutes_before_end_v2") return get(values, "player_settings", "next_episode_threshold_mode") === "MINUTES_BEFORE_END";
  if (key === "stream_auto_play_regex") return get(values, "player_settings", "stream_auto_play_mode") === "REGEX_MATCH";
  if (key.includes("preferred_resolver_provider_id")) return get(values, "debrid_settings", platform === "mobile" ? "debrid_enabled" : "debrid_enabled") === true;
  if (platform === "tv" && feature === "animeskip_settings" && key === "animeskip_client_id") return get(values, feature, "animeskip_enabled") === true;
  if (platform === "mobile" && key === "animeskip_client_id") return get(values, "player_settings", "animeskip_enabled") === true;
  return true;
}

export const appOnlySettingKeys = new Set([
  "theme_settings.nav_bar_style",
  "meta_screen_settings_payload.background_mode",
]);
