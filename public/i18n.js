// Lightweight i18n for the dashboard. The active language is resolved from a
// stored preference, then the browser, then French. Dictionaries live in
// ./i18n/<lang>.js and are loaded on demand; French is always kept as fallback.
const SUPPORTED = ["fr", "en", "es", "de", "it"];
const DEFAULT = "fr";
export const SUPPORTED_LANGS = SUPPORTED;
export const LANG_NAMES = { fr: "Français", en: "English", es: "Español", de: "Deutsch", it: "Italiano" };

const dicts = {};
let current = DEFAULT;

export function resolveLang() {
  try {
    const stored = localStorage.getItem("nm_lang");
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {}
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language || ""];
  for (const value of candidates) {
    const code = String(value || "").toLowerCase().slice(0, 2);
    if (SUPPORTED.includes(code)) return code;
  }
  return DEFAULT;
}

async function load(lang) {
  if (dicts[lang]) return dicts[lang];
  const merged = {};
  // Base chrome dictionary, then the bulkier settings/pages dictionary. Both are
  // optional so a language can ship progressively.
  for (const path of [`./i18n/${lang}.js`, `./i18n/x-${lang}.js`]) {
    try {
      const module = await import(path);
      Object.assign(merged, module.default || {});
    } catch {}
  }
  dicts[lang] = merged;
  return dicts[lang];
}

export async function initI18n() {
  current = resolveLang();
  await load(DEFAULT);
  if (current !== DEFAULT) await load(current);
  document.documentElement.lang = current;
}

export async function setLang(lang) {
  if (!SUPPORTED.includes(lang) || lang === current) return;
  await load(lang);
  current = lang;
  try { localStorage.setItem("nm_lang", lang); } catch {}
  document.documentElement.lang = lang;
}

export function getLang() {
  return current;
}

// Translate a key, with optional {var} interpolation. Falls back to French,
// then to the key itself so missing strings stay visible rather than blank.
export function t(key, vars) {
  let value = dicts[current]?.[key] ?? dicts[DEFAULT]?.[key] ?? key;
  if (vars) for (const name in vars) value = value.split(`{${name}}`).join(String(vars[name]));
  return value;
}
