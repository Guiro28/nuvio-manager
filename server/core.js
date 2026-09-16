import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const clone = (value) => structuredClone(value);
export const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function assert(ok, message, status = 400) {
  if (!ok) throw Object.assign(new Error(message), { status });
}
export function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      assert(
        !["__proto__", "prototype", "constructor"].includes(key),
        "Clé non autorisée",
      );
      result[key] = clean(child);
    }
    return result;
  }
  return value;
}
export function copyPaths(source, target, paths) {
  const result = clone(target);
  for (const parts of paths) {
    assert(
      Array.isArray(parts) &&
        parts.length > 0 &&
        parts.every(
          (k) =>
            typeof k === "string" &&
            !["__proto__", "constructor", "prototype"].includes(k),
        ),
      "Chemin invalide",
    );
    let src = source,
      dst = result;
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i];
      assert(src && Object.hasOwn(src, key), "Paramètre source introuvable");
      if (i === parts.length - 1) dst[key] = clone(src[key]);
      else {
        src = src[key];
        if (!dst[key] || typeof dst[key] !== "object") dst[key] = {};
        dst = dst[key];
      }
    }
  }
  return result;
}
export function changes(before, after, trail = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    return [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].flatMap((k) => changes(before[k], after[k], [...trail, k]));
  }
  return [{ path: trail, before, after }];
}
export function vault(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const keyFile = path.join(directory, "master.key");
  if (!fs.existsSync(keyFile))
    fs.writeFileSync(keyFile, crypto.randomBytes(32), {
      mode: 0o600,
      flag: "wx",
    });
  const key = fs.readFileSync(keyFile);
  function write(name, value) {
    const iv = crypto.randomBytes(12),
      cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value)),
      cipher.final(),
    ]);
    const file = path.join(directory, name + ".enc");
    fs.writeFileSync(
      file + ".tmp",
      Buffer.concat([iv, cipher.getAuthTag(), encrypted]),
      { mode: 0o600 },
    );
    fs.renameSync(file + ".tmp", file);
  }
  function read(name, fallback) {
    const file = path.join(directory, name + ".enc");
    if (!fs.existsSync(file)) return clone(fallback);
    const bytes = fs.readFileSync(file),
      decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        bytes.subarray(0, 12),
      );
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]),
    );
  }
  function remove(name) {
    const file = path.join(directory, name + ".enc");
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  return { write, read, remove };
}
