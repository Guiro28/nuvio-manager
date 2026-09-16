import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { schema } from "../public/settings-schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const raw = JSON.parse(
  await fs.readFile(path.join(root, "reference-public", "settings-extracted.json"), "utf8"),
);

const keyOf = (item) => `${item.feature}.${item.key}`;
const frByPlatform = Object.fromEntries(
  Object.entries(schema).map(([platform, items]) => [
    platform,
    new Map(items.map((item) => [keyOf(item), item])),
  ]),
);

const titleOverrides = {
  "tv:layout_settings.home_imdb_ratings_visibility": "Notes IMDb sur l’accueil",
  "tv:layout_settings.detail_imdb_ratings_visibility": "Notes IMDb sur la fiche",
  "tv:debrid_settings.cloud_library_enabled": "Bibliothèque cloud",
  "mobile:debrid_settings.debrid_cloud_library_enabled": "Bibliothèque cloud",
  "tv:mdblist_settings.mdblist_api_key": "Clé API MDBList",
  "mobile:mdblist_settings.mdblist_enabled": "Activer les notes MDBList",
  "mobile:mdblist_settings.mdblist_api_key": "Clé API MDBList",
  "mobile:theme_settings.selected_theme": "Thème de couleur",
  "mobile:meta_screen_settings_payload.items": "Ordre des sections",
};

const optionLabelOverrides = {
  "tv:layout_settings.home_imdb_ratings_visibility:SHOW_ALL": "Afficher",
  "tv:experience_settings.mode:ADVANCED": "Avancé",
  "tv:layout_settings.focused_poster_backdrop_trailer_playback_target:HERO_MEDIA": "Zone Hero",
};

const descriptionTranslations = new Map(Object.entries({
  "Automatically play trailers on the detail screen after a period of inactivity": "Lire automatiquement les bandes-annonces sur la fiche après une période d’inactivité.",
  "Import Fusion-style stream badge JSON from a URL.": "Importer depuis une URL un fichier JSON de badges de stream au format Fusion.",
  "Blur next episode thumbnails in Continue Watching to avoid spoilers.": "Flouter les miniatures du prochain épisode dans Continuer à regarder afin d’éviter les spoilers.",
  "Show source loading status while waiting for streams.": "Afficher l’état de chargement des sources pendant l’attente des streams.",
  "When stream selection is manual, automatically try the first source for the next episode.": "Quand la sélection est manuelle, essayer automatiquement la première source pour l’épisode suivant.",
  "How many auto-played episodes before prompting.": "Nombre d’épisodes lus automatiquement avant de demander une confirmation.",
  "Leave every option clear to allow all installed addons.": "Ne rien sélectionner pour autoriser tous les addons installés.",
  "Leave every option clear to allow all enabled plugins.": "Ne rien sélectionner pour autoriser tous les plugins activés.",
  "Transcode multichannel formats to Dolby Digital 5.1 for Optical/SPDIF connections.": "Transcoder les formats multicanaux en Dolby Digital 5.1 pour les connexions optiques/SPDIF.",
  "Hide sound descriptions and speaker labels from supported subtitle tracks.": "Masquer les descriptions sonores et les noms des intervenants dans les sous-titres compatibles.",
  "Connect your Premiumize account.": "Connecter votre compte Premiumize.",
  "Show MyAnimeList score": "Afficher la note MyAnimeList.",
  "Choose which library to use for saving and viewing your collection": "Choisir la bibliothèque utilisée pour enregistrer et consulter votre collection.",
  "Trakt history considered for continue watching. Use 0 for all history.": "Durée de l’historique Trakt utilisée pour Continuer à regarder ; 0 inclut tout l’historique.",
  "Show next episode based on the furthest watched episode.": "Déterminer l’épisode suivant à partir de l’épisode vu le plus avancé.",
  "Choosing MAL or Kitsu gives each anime season its own entry instead of grouping under one IMDb ID.": "Avec MAL ou Kitsu, chaque saison d’un anime possède sa propre entrée au lieu d’être regroupée sous un seul identifiant IMDb.",
  "Use installed addon order when arranging catalog rows.": "Utiliser l’ordre des addons installés pour organiser les rangées de catalogues.",
  "Use HTTP/2 for multiplexed network requests when Custom Network is enabled on TV.": "Utiliser HTTP/2 pour multiplexer les requêtes réseau lorsque le réseau personnalisé est activé sur TV.",
  "Show report buttons during playback, long loading, and playback errors.": "Afficher les boutons de signalement pendant la lecture, les chargements longs et les erreurs de lecture.",
  "Use pure black app backgrounds.": "Utiliser un noir pur pour les arrière-plans de l’application.",
  "Use the native translucent tab bar where available.": "Utiliser la barre d’onglets translucide native lorsqu’elle est disponible.",
  "Add dimensional edge lighting to supported cards.": "Ajouter un éclairage de bord donnant du relief aux cartes compatibles.",
  "Show artwork and details while the player prepares.": "Afficher l’illustration et les informations pendant la préparation du lecteur.",
  "Show parental guidance when playback starts.": "Afficher les indications de contrôle parental au démarrage de la lecture.",
  "Forward known skip-segment timestamps to supported external players.": "Transmettre les horodatages connus des segments à passer aux lecteurs externes compatibles.",
  "Use a broadly compatible pixel format for libmpv output.": "Utiliser un format de pixels largement compatible pour la sortie libmpv.",
  "Improve compatibility for Dolby Vision Profile 7 streams.": "Améliorer la compatibilité des streams Dolby Vision profil 7.",
  "Let compatible Android devices use tunneled audio/video playback.": "Autoriser les appareils Android compatibles à utiliser la lecture audio/vidéo tunnelisée.",
  "Render styled subtitles with libass on supported Android playback engines.": "Rendre les sous-titres stylisés avec libass sur les moteurs Android compatibles.",
  "Use app color strings such as #FFFFFFFF.": "Utiliser une couleur au format de l’application, par exemple #FFFFFFFF.",
  "Used when submitting intro and outro timestamps to IntroDB.": "Utilisée pour envoyer à IntroDB les horodatages d’introduction et de générique de fin.",
  "Advanced section order JSON. Preserve section keys, enabled state, order, and tab groups.": "Ordre avancé des sections au format JSON. Conserver les clés, l’état d’activation, l’ordre et les groupes d’onglets.",
  "Ask a connected service for playable links when a result needs it.": "Demander à un service connecté des liens lisibles lorsqu’un résultat le nécessite.",
}));

const optionDescriptionTranslations = new Map(Object.entries({
  "Standard settings layout with cards.": "Disposition standard des paramètres avec des cartes.",
  "A simple, flatter settings layout.": "Disposition simple et plus plate des paramètres.",
  "Move settings navigation into tabs at the top.": "Placer la navigation des paramètres dans des onglets en haut.",
  "Focused setup, add-ons, playback basics, Trakt, and account settings.": "Configuration ciblée : addons, lecture essentielle, Trakt et compte.",
  "Full settings, layout controls, catalog order, collections, plug-ins, and diagnostics.": "Tous les paramètres : disposition, ordre des catalogues, collections, plugins et diagnostics.",
  "Scroll through categories horizontally": "Parcourir les catégories horizontalement.",
  "Browse everything in a vertical grid with a hero section": "Tout parcourir dans une grille verticale avec une section Hero.",
  "Fixed hero with a single active row for faster browsing": "Hero fixe avec une seule rangée active pour accélérer la navigation.",
  "Discover appears inside the Search tab.": "Découvrir apparaît dans l’onglet Recherche.",
  "Discover gets its own item in the side panel.": "Découvrir possède sa propre entrée dans le panneau latéral.",
  "Sort all items by recency": "Trier tous les éléments par date d’activité.",
  "Released items first, upcoming at the end": "Placer les éléments sortis en premier et ceux à venir à la fin.",
  "Move upcoming episodes into a separate row.": "Déplacer les épisodes à venir dans une rangée séparée.",
  "Skip intros and anime openings automatically.": "Passer automatiquement les introductions et génériques d’ouverture d’anime.",
  "Skip recap segments automatically.": "Passer automatiquement les récapitulatifs.",
  "Skip outros and anime endings automatically.": "Passer automatiquement les génériques de fin.",
  "Always show source list and let me choose.": "Toujours afficher la liste des sources pour choisir manuellement.",
  "Play the first available source automatically.": "Lire automatiquement la première source disponible.",
  "Play first source whose text matches your regex pattern.": "Lire la première source dont le texte correspond à l’expression régulière.",
  "Show by playback percent when no outro timestamp is available.": "Afficher selon le pourcentage de lecture lorsqu’aucun horodatage de fin n’est disponible.",
  "Show this many minutes before episode end when no outro timestamp is available.": "Afficher ce nombre de minutes avant la fin lorsqu’aucun horodatage de fin n’est disponible.",
  "Auto-play can use both installed addons and enabled plugins.": "La lecture automatique peut utiliser les addons installés et les plugins activés.",
  "Auto-play only considers streams coming from your installed addons.": "La lecture automatique ne considère que les streams des addons installés.",
  "Auto-play only considers streams coming from enabled plugins.": "La lecture automatique ne considère que les streams des plugins activés.",
  "Show subtitles in default addon result order.": "Afficher les sous-titres dans l’ordre par défaut fourni par les addons.",
  "Group subtitles by language.": "Regrouper les sous-titres par langue.",
  "Group subtitles by addon source.": "Regrouper les sous-titres par addon source.",
  "Modern renderer with higher-quality processing.": "Moteur moderne avec un traitement de meilleure qualité.",
  "Compatibility renderer for devices with GPU next issues.": "Moteur de compatibilité pour les appareils rencontrant des problèmes avec GPU next.",
  "Best for HDR-capable iPhones and iPads.": "Recommandé pour les iPhone et iPad compatibles HDR.",
  "Predictable whites and blacks on SDR-style output.": "Blancs et noirs prévisibles sur une sortie de type SDR.",
  "Closest to the older iOS MPV behavior.": "Comportement le plus proche de l’ancien lecteur MPV sur iOS.",
  "Use the advanced values below.": "Utiliser les valeurs avancées ci-dessous.",
}));

const sectionDefinitions = {
  tv: [
    { name: "Apparence", source: "Appearance", intro: "Le site annonce le thème de couleur, la police et la langue. L’interface actuelle ne contient toutefois aucun sélecteur de langue dans cet onglet.", groups: [
      [1, 3, "Thème de couleur", "Choisir la couleur d’accent et le rendu AMOLED."],
      [4, 4, "Police de l’application", "Choisir la police utilisée par l’application."],
      [5, 5, "Style des paramètres", "Choisir l’organisation de l’application Paramètres sur TV."],
    ] },
    { name: "Expérience", source: "Experience", intro: "Choisir une expérience Essentielle ou Avancée.", groups: [
      [6, 6, "Mode d’expérience", "Commencer simplement ou déverrouiller toutes les personnalisations ; ce choix peut être modifié à tout moment."],
    ] },
    { name: "Disposition", source: "Layout", intro: "Structure de l’accueil et styles des affiches.", groups: [
      [7, 10, "Disposition de l’accueil", "Choisir la structure de l’accueil et la source du Hero."],
      [11, 20, "Contenu de l’accueil", "Contrôler ce qui apparaît sur l’accueil et dans la recherche."],
      [21, 27, "Page de détail", "Réglages des fiches de contenu et des écrans d’épisodes."],
      [28, 31, "Streams", "Régler les informations visuelles affichées sur les sources."],
      [32, 38, "Continuer à regarder", "Régler l’affichage et l’ordre des éléments à reprendre."],
      [39, 43, "Affiche sélectionnée", "Régler l’extension de l’affiche sélectionnée et l’aperçu vidéo."],
      [44, 46, "Style des cartes d’affiche", "Régler les dimensions et les coins des cartes."],
      [47, 55, "Relief des cartes", "Ajouter une lumière de bord et un reflet aux cartes."],
    ] },
    { name: "Lecture", source: "Playback", intro: "Lecteur, sous-titres et lecture automatique.", groups: [
      [56, 62, "Général", "Comportement général du lecteur et informations affichées."],
      [63, 79, "Lecteur et sélection des streams", "Réutilisation des liens, sélection automatique et passage à l’épisode suivant."],
      [80, 83, "Audio et vidéo", "Préférences de langue audio et compatibilité de sortie."],
      [84, 97, "Sous-titres", "Sélection, organisation et style des sous-titres."],
    ] },
    { name: "Intégrations", source: "Integrations", intro: "Services connectés et fournisseurs de métadonnées.", groups: [
      [98, 112, "Services connectés", "Connecter des comptes pour obtenir des liens et accéder à une bibliothèque cloud."],
      [113, 127, "Enrichissement TMDB", "Choisir les champs de métadonnées fournis par TMDB."],
      [128, 137, "Notes MDBList", "Choisir les notes externes affichées sur les fiches."],
      [138, 145, "Trakt", "Choisir les sources de bibliothèque, progression, recommandations et commentaires."],
      [146, 147, "Anime Skip", "Récupérer les horodatages de segments depuis anime-skip.com."],
    ] },
    { name: "Avancé", source: "Advanced", intro: "Performances, navigation, cache et diagnostics.", groups: [
      [148, 153, "Performances et navigation", "Comportements avancés de navigation, réseau et diagnostic sur TV."],
    ] },
  ],
  mobile: [
    { name: "Disposition", source: "Layout", intro: "Thème, affichage, cartes d’affiche et Continuer à regarder.", groups: [
      [1, 3, "Thème", "Choisir le thème de couleur utilisé dans l’application."],
      [4, 7, "Style des cartes d’affiche", "Régler les dimensions et les étiquettes des cartes."],
      [8, 16, "Relief des cartes", "Ajouter une lumière de bord et un léger reflet aux cartes de l’application."],
      [17, 24, "Continuer à regarder", "Régler la visibilité, le style des cartes et le comportement de l’épisode suivant."],
    ] },
    { name: "Lecture", source: "Playback", intro: "Lecteur, sous-titres, sélection des streams et épisode suivant.", groups: [
      [25, 34, "Lecteur", "Comportement principal du lecteur."],
      [35, 43, "Décodeur Android", "Moteur de lecture et comportement du décodeur utilisés par Android."],
      [44, 58, "Sortie vidéo iOS", "HDR, tone mapping, décodeur et réglages d’image utilisés par iOS."],
      [59, 65, "Sous-titres et audio", "Comportement des langues audio et de sous-titres préférées."],
      [66, 73, "Rendu des sous-titres", "Personnaliser le style des sous-titres tout en conservant les valeurs par défaut de l’application."],
      [74, 81, "Sélection des streams", "Réutiliser les liens et régler la sélection automatique des sources."],
      [82, 88, "Épisode suivant", "Contrôler la lecture automatique de l’épisode suivant."],
      [89, 92, "Passage des segments", "Utiliser les fournisseurs de segments pris en charge par l’application."],
    ] },
    { name: "Streams", source: "Streams", intro: "Badges de stream et règles d’affichage.", groups: [
      [93, 95, "Badges de stream", "Contrôler les badges de taille et les URL de badges personnalisés."],
    ] },
    { name: "Contenu et découverte", source: "Content & Discovery", intro: "Présentation de la page de détail.", groups: [
      [96, 101, "Page de détail", "Régler la disposition de l’écran de métadonnées et les cartes d’épisodes."],
    ] },
    { name: "Intégrations", source: "Integrations", intro: "Services connectés et fournisseurs de métadonnées.", groups: [
      [102, 116, "Services connectés", "Connecter des comptes pour obtenir des liens et accéder à une bibliothèque cloud."],
      [117, 131, "Enrichissement TMDB", "Choisir les champs de métadonnées fournis par TMDB."],
      [132, 141, "Notes MDBList", "Configurer les notes externes affichées dans le Hero de la fiche."],
    ] },
    { name: "Trakt", source: "Trakt", intro: "Progression, bibliothèque, contenus similaires et commentaires.", groups: [
      [142, 147, "Réglages Trakt", "Choisir la manière dont les données Trakt participent à l’application."],
    ] },
    { name: "Notifications", source: "Notifications", intro: "Préférences de notifications mobiles.", groups: [
      [148, 148, "Notifications", "Choisir les alertes mobiles activées."],
    ] },
  ],
};

const conditionalNotes = {
  "tv:theme_settings.amoled_surfaces_mode": "Affiché lorsque le mode AMOLED est activé.",
  "tv:layout_settings.modern_sidebar_blur_enabled": "Affiché lorsque la barre latérale moderne est activée.",
  "tv:trailer_settings.trailer_delay_seconds": "Affiché lorsque la lecture automatique des bandes-annonces est activée.",
  "tv:layout_settings.card_depth_edge_strength": "Affiché lorsque le relief des cartes est activé.",
  "tv:layout_settings.card_depth_sheen_strength": "Affiché lorsque le relief des cartes est activé.",
  "tv:layout_settings.card_depth_edge_coverage": "Affiché lorsque le relief des cartes est activé.",
  "tv:layout_settings.card_depth_posters_enabled": "Affiché lorsque le relief des cartes est activé.",
  "tv:layout_settings.card_depth_continue_watching_enabled": "Affiché lorsque le relief des cartes est activé.",
  "tv:layout_settings.card_depth_episode_cards_enabled": "Affiché lorsque le relief des cartes est activé.",
  "tv:layout_settings.card_depth_cast_enabled": "Affiché lorsque le relief des cartes est activé.",
  "tv:layout_settings.card_depth_trailers_enabled": "Affiché lorsque le relief des cartes est activé.",
  "tv:player_settings.stream_reuse_last_link_cache_hours": "Affiché lorsque la réutilisation du dernier lien est activée.",
  "tv:player_settings.stream_auto_play_next_episode_fallback_enabled": "Dépend de la lecture automatique de l’épisode suivant et du mode manuel.",
  "tv:player_settings.still_watching_episode_threshold": "Affiché lorsque « Vous regardez toujours ? » est activé.",
  "tv:player_settings.next_episode_threshold_percent_v2": "Affiché avec le mode de seuil Pourcentage.",
  "tv:player_settings.next_episode_threshold_minutes_before_end_v2": "Affiché avec le mode Minutes avant la fin.",
  "tv:player_settings.stream_auto_play_selected_addons": "Liste dynamique des addons du profil ; pertinente pour le périmètre Addons.",
  "tv:player_settings.stream_auto_play_selected_plugins": "Liste dynamique des plugins du profil ; pertinente pour le périmètre Plugins.",
  "tv:player_settings.stream_auto_play_regex": "Utilisé avec le mode Correspondance regex.",
  "tv:debrid_settings.preferred_resolver_provider_id": "Affiché lorsque la résolution de liens est activée ; options disponibles selon les comptes connectés.",
  "tv:animeskip_settings.animeskip_client_id": "Requis lorsque Anime Skip est activé.",
  "mobile:card_depth_style_settings_payload.edgeStrength": "Affiché lorsque le relief des cartes est activé.",
  "mobile:card_depth_style_settings_payload.sheenStrength": "Affiché lorsque le relief des cartes est activé.",
  "mobile:card_depth_style_settings_payload.edgeCoverage": "Affiché lorsque le relief des cartes est activé.",
  "mobile:card_depth_style_settings_payload.postersEnabled": "Affiché lorsque le relief des cartes est activé.",
  "mobile:card_depth_style_settings_payload.continueWatchingEnabled": "Affiché lorsque le relief des cartes est activé.",
  "mobile:card_depth_style_settings_payload.episodeCardsEnabled": "Affiché lorsque le relief des cartes est activé.",
  "mobile:card_depth_style_settings_payload.castEnabled": "Affiché lorsque le relief des cartes est activé.",
  "mobile:card_depth_style_settings_payload.trailersEnabled": "Affiché lorsque le relief des cartes est activé.",
  "mobile:player_settings.external_player_forward_subtitles": "Affiché lorsque le lecteur externe est activé.",
  "mobile:player_settings.external_player_send_skip_segments": "Affiché lorsque le lecteur externe est activé.",
  "mobile:player_settings.external_player_id": "Affiché lorsque le lecteur externe est activé.",
  "mobile:player_settings.libass_render_type": "Affiché lorsque libass est activé.",
  "mobile:player_settings.stream_reuse_last_link_cache_hours": "Affiché lorsque la réutilisation du dernier lien est activée.",
  "mobile:player_settings.stream_auto_play_selected_addons": "Liste dynamique des addons du profil ; pertinente pour le périmètre Addons.",
  "mobile:player_settings.stream_auto_play_selected_plugins": "Liste dynamique des plugins du profil ; pertinente pour le périmètre Plugins.",
  "mobile:player_settings.stream_auto_play_regex": "Utilisé avec le mode Correspondance par expression régulière.",
  "mobile:player_settings.stream_auto_play_next_episode_fallback_enabled": "Dépend de la lecture automatique de l’épisode suivant et du mode manuel.",
  "mobile:player_settings.next_episode_threshold_percent_v2": "Affiché avec le mode de seuil Pourcentage.",
  "mobile:player_settings.next_episode_threshold_minutes_before_end_v2": "Affiché avec le mode Minutes avant la fin.",
  "mobile:player_settings.animeskip_client_id": "Requis lorsque Anime Skip est activé.",
  "mobile:debrid_settings.debrid_preferred_resolver_provider_id": "Affiché lorsque la résolution de liens est activée ; options disponibles selon les comptes connectés.",
};

const sectionForIndex = (platform, oneBasedIndex) =>
  sectionDefinitions[platform].find((section) =>
    section.groups.some(([start, end]) => oneBasedIndex >= start && oneBasedIndex <= end),
  );

const frenchItem = (platform, item) => frByPlatform[platform].get(keyOf(item)) ?? item;

const clean = (value) => String(value ?? "")
  .replaceAll("|", "\\|")
  .replaceAll("\n", " ")
  .replace(/\s+/g, " ")
  .trim();

const translateDescription = (platform, item, frItem) => {
  if (frItem.description) return frItem.description;
  if (!item.description) return "—";
  return descriptionTranslations.get(item.description) ?? item.description;
};

const getOptionLabel = (platform, item, option) => {
  const frItem = frenchItem(platform, item);
  const translated = frItem.options?.find((candidate) => candidate.value === option.value);
  let label = optionLabelOverrides[`${platform}:${keyOf(item)}:${option.value}`]
    ?? translated?.label
    ?? option.label
    ?? String(option.value);
  if (option.supporterOnly) label += " (Supporter)";
  return label;
};

const formatDefault = (platform, item) => {
  const value = item.defaultValue;
  if (value === undefined) return "";
  if (item.control === "secret" || item.type === "secret") return "";
  if (typeof value === "boolean") return value ? "Activé" : "Désactivé";
  if (Array.isArray(value)) {
    if (!value.length) return "Aucune sélection";
    return value.map((entry) => {
      const option = item.options?.find((candidate) => candidate.value === entry);
      return option ? getOptionLabel(platform, item, option) : String(entry);
    }).join(", ");
  }
  const option = item.options?.find((candidate) => candidate.value === value);
  if (option) return getOptionLabel(platform, item, option);
  if (value === "") return "Vide";
  return `${value}${item.unit ? ` ${item.unit === "hours" ? "h" : item.unit}` : ""}`;
};

const formatOptions = (platform, item) => {
  const frItem = frenchItem(platform, item);
  if (item.control === "toggle") return "Interrupteur : Activé / Désactivé";
  if (item.control === "language") return "Liste déroulante de langues — voir l’annexe A";
  if (item.control === "multiselect") {
    if (item.options?.length) return `Sélection multiple : ${item.options.map((o) => getOptionLabel(platform, item, o)).join(" ; ")}`;
    return item.key.includes("addons")
      ? "Sélection multiple dynamique : addons installés sur le profil"
      : "Sélection multiple dynamique : plugins activés sur le profil";
  }
  if (item.options?.length) {
    const choices = item.options.map((option) => {
      const baseLabel = getOptionLabel(platform, item, option);
      const label = item.control === "swatches" && option.color
        ? `${baseLabel} (${option.color})`
        : baseLabel;
      const optionDescription = option.description
        ? optionDescriptionTranslations.get(option.description) ?? option.description
        : "";
      return optionDescription ? `${label} — ${optionDescription}` : label;
    });
    const control = item.control === "swatches"
      ? "Pastilles"
      : item.control === "segmented"
        ? "Boutons de choix"
        : "Liste déroulante";
    return `${control} : ${choices.join(" ; ")}`;
  }
  if (item.control === "slider") {
    return `Curseur : ${item.min ?? "?"} à ${item.max ?? "?"}, pas ${item.step ?? 1}${item.unit ? ` ${item.unit === "hours" ? "h" : item.unit}` : ""}`;
  }
  if (item.control === "number") {
    const bounds = [item.min !== undefined ? `min. ${item.min}` : "", item.max !== undefined ? `max. ${item.max}` : "", item.step !== undefined ? `pas ${item.step}` : ""].filter(Boolean).join(", ");
    return `Champ numérique${bounds ? ` : ${bounds}` : ""}${item.unit ? ` ${item.unit === "hours" ? "h" : item.unit}` : ""}`;
  }
  if (item.control === "secret" || item.type === "secret") return "Champ secret masqué";
  if (item.control === "textarea") return "Zone de texte multiligne";
  if (item.control === "json") return "Éditeur JSON avancé";
  if (item.control === "fusion_badge_rules") return "URL d’import JSON Fusion, avec actions Importer et Effacer";
  if (item.control === "color") return "Sélecteur/couleur ARGB au format hexadécimal";
  if (item.control === "text") return "Champ texte";
  return clean(frItem.control ?? item.control ?? item.type);
};

const formatRow = (platform, item, index) => {
  const frItem = frenchItem(platform, item);
  const title = titleOverrides[`${platform}:${keyOf(item)}`] ?? frItem.title ?? item.title;
  const description = translateDescription(platform, item, frItem);
  const defaultValue = formatDefault(platform, item);
  const condition = conditionalNotes[`${platform}:${keyOf(item)}`];
  const notes = [formatOptions(platform, item), defaultValue ? `Défaut : ${defaultValue}` : "", condition ? `Condition : ${condition}` : ""]
    .filter(Boolean)
    .join("<br>");
  return `| ${index} | **${clean(title)}**<br><code>${clean(keyOf(item))}</code> | ${clean(description)} | ${clean(notes)} |`;
};

const lines = [];
lines.push("# Rapport complet des paramètres Nuvio TV et Mobile");
lines.push("");
lines.push("**Audit effectué le 15 septembre 2026.** Ce document recense les contrôles de la page Compte de Nuvio, puis les recoupe avec le schéma extrait du site et le code officiel des applications. Les valeurs personnelles du compte, les jetons et les clés API ne sont jamais reproduits.");
lines.push("");
lines.push("## Résultat de l’inventaire");
lines.push("");
lines.push("| Plateforme | Onglets visibles sur nuvio.tv | Réglages exposés | Réglages supplémentaires trouvés dans le code de l’app |");
lines.push("|---|---:|---:|---:|");
lines.push("| TV | 6 | 153 | 0 |");
lines.push("| Mobile | 7 | 148 | 2 |");
lines.push("| **Total** | **13** | **301** | **2** |");
lines.push("");
lines.push("Les 301 réglages ci-dessous correspondent à l’interface web actuelle. Les deux réglages Mobile uniquement présents dans le code sont placés dans une annexe séparée. Les lignes marquées « Condition » sont bien prises en charge, mais le site les masque tant que leur réglage parent n’est pas activé ou que le mode correspondant n’est pas choisi.");
lines.push("");
lines.push("Constats importants : le réglage **Version** n’existe dans aucune des deux listes officielles actuelles ; l’onglet TV Appearance mentionne une langue dans son texte d’introduction mais n’affiche aucun sélecteur de langue ; la clé API TMDB est exposée dans les réglages Mobile, tandis que les réglages TV n’affichent que l’activation et les options d’enrichissement.");
lines.push("");
lines.push("La colonne **Clé interne** est destinée à l’intégration dans le dashboard. Elle ne doit pas être affichée à l’utilisateur dans l’interface finale.");
lines.push("");

for (const platform of ["tv", "mobile"]) {
  lines.push(`# Paramètres ${platform === "tv" ? "TV" : "Mobile"}`);
  lines.push("");
  const items = raw[platform];
  for (const section of sectionDefinitions[platform]) {
    const sectionCount = section.groups.reduce((sum, [start, end]) => sum + end - start + 1, 0);
    lines.push(`## ${section.name} (${sectionCount})`);
    lines.push("");
    lines.push(`Nom actuel sur le site : **${section.source}**. ${section.intro}`);
    lines.push("");
    for (const [start, end, groupName, groupDescription] of section.groups) {
      lines.push(`### ${groupName}`);
      lines.push("");
      lines.push(groupDescription);
      lines.push("");
      lines.push("| N° | Paramètre et clé interne | Description officielle traduite | Contrôle, choix, défaut et condition |");
      lines.push("|---:|---|---|---|");
      for (let index = start; index <= end; index += 1) {
        lines.push(formatRow(platform, items[index - 1], index));
      }
      lines.push("");
    }
  }
}

const appOnly = schema.mobile.filter((item) => !raw.mobile.some((candidate) => keyOf(candidate) === keyOf(item)));
lines.push("# Annexe A — Langues proposées");
lines.push("");
const tvAudio = schema.tv.find((item) => item.key === "preferred_audio_language");
const allLanguageLabels = tvAudio.options.map((option) => option.label);
lines.push("Les menus de langue audio contiennent les choix suivants :");
lines.push("");
lines.push(allLanguageLabels.join(" · "));
lines.push("");
lines.push("Les langues secondaires et les langues de sous-titres utilisent la même liste sans « Langue de l’appareil » ni « Version originale ». Les menus TMDB reprennent les langues ordinaires et ajoutent : anglais australien, anglais canadien et anglais britannique.");
lines.push("");
lines.push("# Annexe B — Réglages Mobile trouvés dans le code, absents du site actuel");
lines.push("");
lines.push("Ces deux réglages sont modélisés par l’application Mobile, mais aucun contrôle correspondant n’apparaissait sur nuvio.tv pendant l’audit. Ils peuvent être ajoutés au dashboard avec une mention « expérimental » jusqu’à validation de leur synchronisation côté API.");
lines.push("");
lines.push("| Paramètre et clé interne | Contrôle et choix |");
lines.push("|---|---|");
for (const item of appOnly) {
  lines.push(`| **${clean(item.title)}**<br><code>${clean(keyOf(item))}</code> | ${clean(formatOptions("mobile", item))}<br>Défaut : ${clean(formatDefault("mobile", item))} |`);
}
lines.push("");
lines.push("# Annexe C — Points d’intégration pour le dashboard");
lines.push("");
lines.push("1. Reproduire les 6 onglets TV et les 7 onglets Mobile tels qu’ils sont séparés sur le site actuel.");
lines.push("2. Utiliser des interrupteurs pour les booléens, des boutons segmentés pour les petits ensembles de choix, des listes déroulantes pour les longues listes et des curseurs bornés pour les valeurs numériques adaptées.");
lines.push("3. Appliquer la visibilité conditionnelle indiquée dans les tableaux afin que les réglages enfants n’encombrent pas l’écran avant activation de leur parent.");
lines.push("4. Construire les choix « Addons autorisés », « Plugins autorisés » et « Résoudre avec » à partir des données réelles du profil, car ces listes sont dynamiques.");
lines.push("5. Masquer les clés TorBox, Premiumize, TMDB, MDBList, AnimeSkip et IntroDB ; ne jamais renvoyer leur valeur complète après enregistrement.");
lines.push("6. Conserver un éditeur avancé avec validation JSON pour les règles de streams et l’ordre des sections de la fiche Mobile.");
lines.push("7. Traiter les thèmes Supporter comme des choix visibles mais verrouillés lorsque le compte n’a pas d’abonnement actif, comme sur le site officiel.");
lines.push("");
lines.push("# Sources vérifiées");
lines.push("");
lines.push("- Interface authentifiée : `https://nuvio.tv/account?tab=settings` et `https://nuvio.tv/account?tab=mobile_settings`, parcourues sans modifier ni enregistrer de valeur.");
lines.push("- Schéma extrait du site : `reference-public/settings-extracted.json`.");
lines.push("- Bundle de la page Compte : `reference-public/page-09c8c711fef692db.js`.");
lines.push("- Application TV officielle : révision `e54a74904b7ee40e5c748e156a70749f89e8decf`.");
lines.push("- Application Mobile officielle : révision `157a2375d32adc98bb9126c5601e459815b49450`.");
lines.push("");

const reportPath = path.join(root, "docs", "rapport-parametres-nuvio-tv-mobile.md");
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

const englishDescriptionPattern = /\b(the|your|show|use|choose|when|with|from|for|and|or|play|stream|settings|account|enabled)\b/i;
const untranslated = [];
for (const platform of ["tv", "mobile"]) {
  for (const item of raw[platform]) {
    const frItem = frenchItem(platform, item);
    const description = translateDescription(platform, item, frItem);
    if (description !== "—" && englishDescriptionPattern.test(description)) untranslated.push(`${platform}:${keyOf(item)} => ${description}`);
  }
}

console.log(JSON.stringify({
  reportPath,
  tv: raw.tv.length,
  mobileWeb: raw.mobile.length,
  mobileAppOnly: appOnly.length,
  untranslated,
}, null, 2));
