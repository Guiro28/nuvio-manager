import { schema } from "./settings-schema.js";
import { t } from "./i18n.js";
import {
  appOnlySettingKeys,
  settingDescription,
  settingIsVisible,
  settingOptionDescription,
  settingsSections,
} from "./settings-layout.js";

export {
  appOnlySettingKeys,
  schema,
  settingDescription,
  settingIsVisible,
  settingOptionDescription,
  settingsSections,
};

const esc = (value) => String(value ?? "").replace(
  /[&<>"']/g,
  (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
);
const clone = (value) => value === undefined
  ? undefined
  : typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
const settingKey = (item) => `${item.feature}.${item.key}`;

export const descriptor = (platform, feature, key) =>
  schema[platform]?.find((item) => item.feature === feature && item.key === key);

export function settingsLeaves(draft, platform) {
  const output = [];
  function walk(value, path, encodedPath) {
    if (path.length === 1 && path[0] === "version") return;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (Object.hasOwn(value, "type") && Object.hasOwn(value, "value")) {
        output.push({ path: [...path, "value"], value: value.value, type: value.type, label: path.at(-1), meta: descriptor(platform, path[1], path[2]), encodedPath, platform });
        return;
      }
      for (const [key, child] of Object.entries(value)) walk(child, [...path, key], encodedPath);
      return;
    }
    if (path.length === 2 && path[1].endsWith("_payload") && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          walk(parsed, path, path);
          return;
        }
      } catch {}
    }
    output.push({ path, value, label: path.at(-1), meta: descriptor(platform, path[1], path[2]), encodedPath, platform });
  }
  walk(draft, []);
  return output;
}

export function officialSettingsItems(draft, platform) {
  const existing = settingsLeaves(draft, platform);
  const known = new Map(existing.filter((item) => item.meta).map((item) => [settingKey(item.meta), item]));
  const official = schema[platform].map((meta) => {
    const current = known.get(settingKey(meta));
    if (current) return { ...current, present: true, platform };
    const fallback = meta.defaultValue ?? (meta.type === "boolean" ? false : meta.type === "string_set" ? [] : meta.type === "string" ? "" : 0);
    return { path: ["features", meta.feature, meta.key], value: clone(fallback), type: meta.type, label: meta.key, meta, platform, present: false, virtual: true };
  });
  return { official, extra: existing.filter((item) => !item.meta) };
}

function setPath(object, path, value) {
  if (path.some((key) => ["__proto__", "constructor", "prototype"].includes(key))) throw Error("Chemin invalide");
  let reference = object;
  for (const key of path.slice(0, -1)) {
    if (!reference[key] || typeof reference[key] !== "object") reference[key] = {};
    reference = reference[key];
  }
  reference[path.at(-1)] = value;
}

function payloadValue(draft, feature) {
  const current = draft.features?.[feature];
  if (current && typeof current === "object" && !Array.isArray(current)) return clone(current);
  if (typeof current === "string" && current.trim()) {
    try {
      const parsed = JSON.parse(current);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      throw Error(`Le bloc ${feature} contient un JSON invalide.`);
    }
  }
  return {};
}

function insertSetting(draft, platform, meta, value) {
  draft.version ??= 1;
  draft.features ??= {};
  if (meta.feature.endsWith("_payload")) {
    const existing = draft.features[meta.feature];
    const payload = payloadValue(draft, meta.feature);
    payload[meta.key] = value;
    draft.features[meta.feature] = existing && typeof existing === "object" && !Array.isArray(existing) ? payload : JSON.stringify(payload);
    return;
  }
  draft.features[meta.feature] ??= {};
  if (platform === "mobile" && meta.feature === "notifications_settings") draft.features[meta.feature][meta.key] = value;
  else draft.features[meta.feature][meta.key] = { type: meta.type, value };
}

export function setSettingValue(draft, item, value) {
  if (item.virtual) insertSetting(draft, item.platform, item.meta, value);
  else if (item.encodedPath) {
    const [root, feature] = item.encodedPath;
    const payload = JSON.parse(draft[root][feature]);
    setPath(payload, item.path.slice(2), value);
    draft[root][feature] = JSON.stringify(payload);
  } else setPath(draft, item.path, value);
  for (const extra of item.meta?.onChangeAlso || []) {
    const extraMeta = descriptor(item.platform, extra.feature, extra.key) || extra;
    const present = settingsLeaves(draft, item.platform).find((candidate) => candidate.path[1] === extra.feature && candidate.path[2] === extra.key);
    if (present) setSettingValue(draft, { ...present, meta: extraMeta }, extra.value);
    else insertSetting(draft, item.platform, extraMeta, extra.value);
  }
}

export function choices(meta, value, context = {}) {
  let options = (meta?.options || []).map((option) => ({ ...option }));
  if (meta?.runtimeOptions) options = (context[meta.runtimeOptions] || [])
    .filter((item) => item.enabled !== false)
    .map((item) => String(item.name || item.addon_name || item.plugin_name || "").trim())
    .filter(Boolean)
    .map((name) => ({ value: name, label: name }));
  const values = meta?.control === "multiselect" ? (Array.isArray(value) ? value : []) : [value];
  for (const current of values) if (!options.some((option) => Object.is(option.value, current))) options.push({ value: current, label: current === "" ? "Aucune / valeur vide" : `Valeur actuelle : ${String(current)}` });
  return options.filter((option, index, all) => all.findIndex((candidate) => Object.is(candidate.value, option.value)) === index);
}

const isSelected = (value, optionValue, multiple) => multiple ? Array.isArray(value) && value.includes(optionValue) : Object.is(value, optionValue);

function choiceCards(meta, value, options, attributes) {
  const swatches = meta.control === "swatches";
  return `<div class="${swatches ? "swatch-control" : "segmented-control"}" role="radiogroup" aria-label="${esc(t(meta.title))}">${options.map((option, index) => {
    const description = settingOptionDescription(meta, option);
    const optionLabel = t(option.label);
    const swatchClass = String(option.value || "custom").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    return `<label class="choice-card${option.supporterOnly ? " supporter-choice" : ""}"${description ? ` title="${esc(description)}"` : ""}><input ${attributes} data-kind="choice" type="radio" name="${esc(`${meta.feature}-${meta.key}`)}" value="${index}" ${isSelected(value, option.value, false) ? "checked" : ""} aria-label="${esc(`${t(meta.title)} : ${optionLabel}`)}"><span${swatches ? ` class="theme-swatch swatch-${esc(swatchClass)}"` : ""}>${swatches ? "" : esc(optionLabel)}</span>${swatches ? `<span class="choice-label">${esc(optionLabel)}</span>` : ""}${option.supporterOnly ? "<small>Supporter</small>" : ""}${description ? `<small>${esc(description)}</small>` : ""}</label>`;
  }).join("")}</div>`;
}

const argbToRgb = (value) => {
  const match = String(value || "").match(/^#([0-9a-f]{2})([0-9a-f]{6})$/i);
  if (match) return `#${match[2]}`;
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : "#777777";
};

export function settingControl(item, attributes, context = {}) {
  const meta = item.meta, value = item.value, label = meta?.title ? t(meta.title) : item.label;
  const attrs = `${attributes} aria-label="${esc(label)}"`;
  if (meta?.options || meta?.runtimeOptions) {
    const options = choices(meta, value, context);
    if (["segmented", "swatches"].includes(meta.control)) return choiceCards(meta, value, options, attributes);
    const multiple = meta.control === "multiselect";
    return `<select ${attrs} data-kind="choice" ${multiple ? 'multiple size="5"' : ""}>${options.map((option, index) => `<option value="${index}" ${isSelected(value, option.value, multiple) ? "selected" : ""}>${esc(t(option.label))}${option.supporterOnly ? " · Supporter" : ""}</option>`).join("")}</select>${multiple ? `<small class="muted">${esc(t("Plusieurs choix possibles. Aucun choix signifie aucune restriction."))}</small>` : ""}`;
  }
  if (typeof value === "boolean") return `<input ${attrs} type="checkbox" ${value ? "checked" : ""}>`;
  if (Array.isArray(value) || value === null || typeof value === "object") return `<textarea ${attrs} data-kind="json">${esc(JSON.stringify(value, null, 2))}</textarea>`;
  if (["json", "textarea", "fusion_badge_rules"].includes(meta?.control)) return `<textarea ${attrs}${meta?.control === "json" ? ' data-kind="json-text"' : ""}>${esc(value)}</textarea>`;
  if (typeof value === "number") {
    const bounds = meta ? `${meta.min !== undefined ? `min="${meta.min}"` : ""} ${meta.max !== undefined ? `max="${meta.max}"` : ""} step="${meta.step ?? (["int", "long"].includes(meta.type) ? 1 : "any")}"` : 'step="any"';
    if (meta?.control === "slider" && value >= meta.min && value <= meta.max) return `<div class="range-control"><input ${attrs} type="range" ${bounds} value="${value}"><output>${esc(value)} ${esc(meta.unit || "")}</output></div>`;
    return `<input ${attrs} type="number" ${bounds} value="${value}">`;
  }
  if (meta?.control === "color") return `<div class="color-setting"><input class="color-preview" type="color" value="${esc(argbToRgb(value))}" disabled tabindex="-1" aria-hidden="true"><input ${attrs} type="text" value="${esc(value)}" spellcheck="false"></div>`;
  const secret = meta?.control === "secret" || /key|token|secret|password/i.test(item.path?.join(".") || item.label);
  return `<input ${attrs} type="text" value="${esc(value)}"${secret ? ' class="secret-setting" autocomplete="off" data-form-type="other" data-1p-ignore data-lpignore="true" spellcheck="false"' : ""}>`;
}

export function readSettingControl(element, item, context = {}) {
  let value;
  if (element.dataset.kind === "choice") {
    const options = choices(item.meta, item.value, context);
    const read = (option) => {
      const choice = options[Number(option.value)];
      if (!choice) throw Error("Choix invalide");
      return choice.value;
    };
    value = element.multiple ? Array.from(element.selectedOptions, read) : read(element);
  } else if (element.type === "checkbox") value = element.checked;
  else if (element.type === "number" || element.type === "range") {
    if (element.value.trim() === "") throw Error("Nombre requis");
    value = Number(element.value);
    if (!Number.isFinite(value)) throw Error("Nombre invalide");
    if (["int", "long"].includes(item.meta?.type || item.type) && !Number.isInteger(value)) throw Error("Nombre entier attendu");
    if (!element.checkValidity()) throw Error("La valeur dépasse les limites autorisées.");
  } else if (element.dataset.kind === "json") value = JSON.parse(element.value);
  else {
    value = element.value;
    if (item.meta?.control === "json") JSON.parse(value);
  }
  return value;
}

export const valuesBySetting = (items) => new Map(items.filter((item) => item.meta).map((item) => [settingKey(item.meta), item.value]));
export const visibleOfficialSettings = (platform, items) => {
  const values = valuesBySetting(items);
  return items.filter((item) => settingIsVisible(platform, item.meta, values));
};
