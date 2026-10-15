// Central logger for the manager. Human-readable text by default, JSON with
// LOG_FORMAT=json. Verbosity is controlled by LOG_LEVEL (error < warn < info <
// debug, default info). Everything goes to stdout/stderr so Docker captures it.
//
// SECURITY: this logger never prints request/response bodies, passwords, tokens
// or API keys. URLs are logged origin+path only (userinfo and query string are
// stripped), and any field whose name looks secret is replaced with "***".

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const readLevel = () => {
  const name = String(process.env.LOG_LEVEL || "info").toLowerCase();
  return name in LEVELS ? LEVELS[name] : LEVELS.info;
};
let threshold = readLevel();
const asJson = String(process.env.LOG_FORMAT || "").toLowerCase() === "json";

// Field names that must never have their value printed.
const SECRET_KEY = /(pass|password|token|secret|api[-_]?key|apikey|authorization|cookie|refresh|access|anon|credential|bearer)/i;

// Strip credentials and query string from a URL so it is safe to log.
export function redactUrl(value) {
  const raw = String(value ?? "");
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    // Not an absolute URL (e.g. a REST path): drop query + any userinfo.
    return raw.split(/[?#]/)[0].replace(/\/\/[^/@]*@/, "//");
  }
}

const scalar = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
};

// Render `{k: v}` as `k=v`, redacting secret-looking keys and quoting values
// that contain whitespace. `url`/`route`/`endpoint` keys are passed through
// redactUrl so a logged address can never carry credentials.
const renderFields = (fields) => {
  const parts = [];
  for (const [key, raw] of Object.entries(fields || {})) {
    if (raw === undefined) continue;
    let value;
    if (SECRET_KEY.test(key)) value = "***";
    else if (/^(url|route|endpoint|target|location|href)$/i.test(key)) value = redactUrl(raw);
    else value = scalar(raw);
    value = String(value).replace(/[\r\n]+/g, " ");
    parts.push(/\s/.test(value) ? `${key}="${value.replace(/"/g, "'")}"` : `${key}=${value}`);
  }
  return parts.join(" ");
};

const LEVEL_LABEL = { error: "ERROR", warn: "WARN ", info: "INFO ", debug: "DEBUG" };

function emit(level, category, message, fields) {
  if (LEVELS[level] > threshold) return;
  const at = new Date().toISOString();
  let line;
  if (asJson) {
    const safe = {};
    for (const [key, raw] of Object.entries(fields || {})) {
      if (raw === undefined) continue;
      if (SECRET_KEY.test(key)) safe[key] = "***";
      else if (/^(url|route|endpoint|target|location|href)$/i.test(key)) safe[key] = redactUrl(raw);
      else safe[key] = raw;
    }
    line = JSON.stringify({ at, level, category, message, ...safe });
  } else {
    const rendered = renderFields(fields);
    line = `${at} ${LEVEL_LABEL[level]} ${category} ${message}${rendered ? " " + rendered : ""}`;
  }
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const log = {
  error: (category, message, fields) => emit("error", category, message, fields),
  warn: (category, message, fields) => emit("warn", category, message, fields),
  info: (category, message, fields) => emit("info", category, message, fields),
  debug: (category, message, fields) => emit("debug", category, message, fields),
  redactUrl,
  get levelName() {
    return Object.keys(LEVELS).find((k) => LEVELS[k] === threshold) || "info";
  },
  isDebug: () => threshold >= LEVELS.debug,
  setLevel(name) {
    const key = String(name || "").toLowerCase();
    if (key in LEVELS) threshold = LEVELS[key];
    return log.levelName;
  },
};

export default log;
