// Read-only extraction of setting names/types from official source references.
import fs from "node:fs";
import path from "node:path";
const read = (p) => fs.readFileSync(p, "utf8");
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((x) =>
      x.isDirectory() ? walk(path.join(p, x.name)) : [path.join(p, x.name)],
    );
const tvRoot = "reference-nuvio-tv/app/src/main/java/com/nuvio/tv";
const sync = read(tvRoot + "/core/sync/ProfileSettingsSyncService.kt");
const set = (name) =>
  [
    ...(
      sync.match(
        new RegExp("(?:val " + name + " = setOf\\()([\\s\\S]*?)\\n\\)"),
      )?.[1] || ""
    ).matchAll(/"([^"]+)"/g),
  ].map((x) => x[1]);
const excluded = new Set([
  ...set("localOnlyPlayerProfileSettingsKeys"),
  ...set("catalogKeysExcludedFromProfileSettingsBlob"),
  ...set("localOnlyLayoutProfileSettingsKeys"),
  "search_discover_enabled",
  "torbox_api_key",
  "premiumize_api_key",
  "real_debrid_api_key",
  "mdblist_api_key",
  "animeskip_client_id",
]);
const allowed = new Set([
  "theme_settings",
  "layout_settings",
  "experience_settings",
  "player_settings",
  "stream_badge_settings",
  "trailer_settings",
  "tmdb_settings",
  "mdblist_settings",
  "trakt_settings",
  "debrid_settings",
  "animeskip_settings",
  "track_preference",
]);
const tv = [];
for (const file of walk(tvRoot + "/data/local").filter((f) =>
  f.endsWith(".kt"),
)) {
  const text = read(file),
    feature = text.match(/const val FEATURE\s*=\s*"([^"]+)"/)?.[1];
  if (!allowed.has(feature)) continue;
  for (const m of text.matchAll(
    /(stringSet|string|boolean|int|long|float|double)PreferencesKey\("([^"]+)"\)/g,
  )) {
    if (excluded.has(m[2]) || m[2].startsWith("migration_")) continue;
    tv.push({
      feature,
      key: m[2],
      type: m[1] === "stringSet" ? "string_set" : m[1],
    });
  }
}
const mobile = [];
const featureMap = {
  ThemeSettingsStorage: "theme_settings",
  PlayerSettingsStorage: "player_settings",
  TmdbSettingsStorage: "tmdb_settings",
  MdbListSettingsStorage: "mdblist_settings",
  DebridSettingsStorage: "debrid_settings",
  StreamBadgeSettingsStorage: "stream_badge_settings",
};
for (const file of walk("reference-mobile/composeApp/src/androidMain").filter(
  (f) => f.endsWith(".kt"),
)) {
  const name = path.basename(file).split(".")[0],
    feature = featureMap[name];
  if (!feature) continue;
  const text = read(file),
    keys = Object.fromEntries(
      [...text.matchAll(/const val (\w+)\s*=\s*"([^"]+)"/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );
  for (const m of text.matchAll(
    /put\((\w+),\s*encodeSync(String|Boolean|Int|Long|Float|Double|StringSet)\(/g,
  )) {
    if (keys[m[1]])
      mobile.push({
        feature,
        key: keys[m[1]],
        type: m[2] === "StringSet" ? "string_set" : m[2].toLowerCase(),
      });
  }
}
const unique = (xs) =>
  [...new Map(xs.map((x) => [x.feature + "." + x.key, x])).values()].sort(
    (a, b) => (a.feature + a.key).localeCompare(b.feature + b.key),
  );
fs.writeFileSync(
  "public/settings-catalog.json",
  JSON.stringify({ tv: unique(tv), mobile: unique(mobile) }, null, 2) + "\n",
);
console.log(
  `Catalogue : ${unique(tv).length} clés TV, ${unique(mobile).length} clés Mobile`,
);
