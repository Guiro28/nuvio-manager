import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copyPaths, changes, vault, clean } from "../server/core.js";

test("selective copy preserves unselected destination fields and typed wrappers", () => {
  const source = {
    player: { language: { type: "string", value: "fr" }, volume: 50 },
  };
  const target = {
    player: { language: { type: "string", value: "en" }, volume: 80 },
    custom: true,
  };
  const result = copyPaths(source, target, [["player", "language", "value"]]);
  assert.deepEqual(result, {
    player: { language: { type: "string", value: "fr" }, volume: 80 },
    custom: true,
  });
  assert.equal(target.player.language.value, "en");
  assert.equal(changes(target, result).length, 1);
});
test("untrusted JSON and paths cannot change prototypes", () => {
  assert.throws(() => clean(JSON.parse('{"__proto__":{"polluted":true}}')));
  assert.throws(() => copyPaths({}, {}, [["constructor", "prototype"]]));
  assert.equal({}.polluted, undefined);
});
test("vault persists encrypted values and fails closed on tampering", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nuvio-vault-test-"));
  try {
    const v = vault(dir);
    v.write("state", { refresh: "private-token" });
    assert.equal(
      fs
        .readFileSync(path.join(dir, "state.enc"))
        .includes(Buffer.from("private-token")),
      false,
    );
    assert.deepEqual(vault(dir).read("state", {}), {
      refresh: "private-token",
    });
    const bytes = fs.readFileSync(path.join(dir, "state.enc"));
    bytes[bytes.length - 1] ^= 1;
    fs.writeFileSync(path.join(dir, "state.enc"), bytes);
    assert.throws(() => v.read("state", {}));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("vault can remove an encrypted backup", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nuvio-vault-remove-"));
  try {
    const v = vault(dir);
    v.write("backup-test", { version: 1 });
    assert.equal(fs.existsSync(path.join(dir, "backup-test.enc")), true);
    v.remove("backup-test");
    assert.equal(fs.existsSync(path.join(dir, "backup-test.enc")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
