import test from "node:test";
import assert from "node:assert/strict";
import { createAddonHealth, manifestFingerprint } from "../server/addon-health.js";

const quietLog = { info() {}, warn() {} };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A health checker over a fake network: answers[url][mode] = result or function.
function setup({ library, modes = () => ["direct"], answers }) {
  let saved = null;
  const changes = [];
  const health = createAddonHealth({
    load: () => null,
    persist: (value) => { saved = value; },
    getLibrary: () => library,
    getModes: modes,
    probe: async (url, mode) => {
      const answer = answers[url]?.[mode];
      return typeof answer === "function" ? answer() : answer || { ok: false, ms: 1, error: "Erreur réseau" };
    },
    log: quietLog,
    onChange: (change) => changes.push(`${change.before}>${change.after}`),
    retryMs: 20,
  });
  return { health, changes, saved: () => saved };
}
const ok = (version = "1.0.0", extra = {}) => ({ ok: true, ms: 42, status: 200, manifest: { id: "org.test", version, types: ["movie"], resources: ["stream"], catalogs: [], ...extra } });
const down = { ok: false, ms: 15000, error: "Délai dépassé (15 s)" };

test("a healthy addon is online with its version and a 7-day availability", async () => {
  const library = [{ id: "a", name: "A", url: "https://a.example/manifest.json" }];
  const { health, saved } = setup({ library, answers: { [library[0].url]: { direct: ok("1.2.0") } } });
  await health.checkAll();
  const view = health.snapshot().items.a;
  assert.equal(view.status, "ok");
  assert.equal(view.version, "1.2.0");
  assert.equal(view.availability, 100);
  assert.equal(view.paths.direct.ms, 42);
  assert.ok(saved().items.a);
  health.stop();
});

test("a failure is confirmed by a second check before the addon is reported down", async () => {
  const library = [{ id: "a", name: "A", url: "https://a.example/manifest.json" }];
  const { health, changes } = setup({ library, answers: { [library[0].url]: { direct: down } } });
  await health.checkAll();
  assert.equal(health.snapshot().items.a.status, "unknown"); // first failure: not reported yet
  await wait(60);
  const view = health.snapshot().items.a;
  assert.equal(view.status, "down");
  assert.ok(view.failingSince > 0);
  assert.equal(view.paths.direct.error, "Délai dépassé (15 s)");
  assert.deepEqual(changes, ["unknown>down"]);
  health.stop();
});

test("a passing blip never raises an alert", async () => {
  const library = [{ id: "a", name: "A", url: "https://a.example/manifest.json" }];
  let calls = 0;
  const { health, changes } = setup({ library, answers: { [library[0].url]: { direct: () => (calls++ === 1 ? down : ok()) } } });
  await health.checkAll(); // ok
  await health.checkAll(); // blip
  await wait(60); // confirmation: ok again
  assert.equal(health.snapshot().items.a.status, "ok");
  assert.deepEqual(changes, ["unknown>ok"]);
  health.stop();
});

test("an addon reachable from the server but not through the external proxy is partial", async () => {
  const library = [{ id: "a", name: "A", url: "https://a.example/manifest.json" }];
  const { health } = setup({ library, modes: () => ["direct", "warp"], answers: { [library[0].url]: { direct: ok(), warp: { ok: false, ms: 3, error: "Proxy externe injoignable ou refusé" } } } });
  assert.equal((await health.check("a")).status, "partial"); // explicit check: no confirmation delay
  const view = health.snapshot().items.a;
  assert.equal(view.paths.direct.ok, true);
  assert.equal(view.paths.warp.ok, false);
  health.stop();
});

test("version and manifest content changes are tracked; a new URL starts afresh; removed addons are forgotten", async () => {
  const library = [{ id: "a", name: "A", url: "https://a.example/manifest.json" }, { id: "b", name: "B", url: "https://b.example/manifest.json" }];
  let answer = ok("1.0.0");
  const { health } = setup({ library, answers: { [library[0].url]: { direct: () => answer }, [library[1].url]: { direct: ok() }, "https://a.example/new/manifest.json": { direct: ok("9.0.0") } } });
  await health.checkAll();
  answer = ok("1.1.0");
  await health.checkAll();
  let view = health.snapshot().items.a;
  assert.equal(view.previousVersion, "1.0.0");
  assert.ok(view.versionChangedAt > 0);
  answer = ok("1.1.0", { catalogs: [{ type: "movie", id: "top" }] });
  await health.checkAll();
  assert.ok(health.snapshot().items.a.contentChangedAt > 0);

  library[0].url = "https://a.example/new/manifest.json";
  assert.equal(health.snapshot().items.a, null); // old record does not describe the new URL
  await health.check("a");
  view = health.snapshot().items.a;
  assert.equal(view.version, "9.0.0");
  assert.equal(view.previousVersion, "");

  library.splice(1, 1);
  await health.checkAll();
  assert.deepEqual(Object.keys(health.snapshot().items), ["a"]);
  health.stop();
});

test("the fingerprint ignores cosmetic manifest fields", () => {
  const base = { id: "x", types: ["movie", "series"], resources: ["stream", { name: "meta" }], catalogs: [{ type: "movie", id: "top" }] };
  assert.equal(manifestFingerprint(base), manifestFingerprint({ ...base, name: "Renamed", logo: "https://x/logo.png", types: ["series", "movie"] }));
  assert.notEqual(manifestFingerprint(base), manifestFingerprint({ ...base, catalogs: [] }));
});

test("a check asked from the UI reports failures without waiting for confirmation", async () => {
  const library = [{ id: "a", name: "A", url: "https://a.example/manifest.json" }];
  const { health } = setup({ library, answers: { [library[0].url]: { direct: down } } });
  await health.checkAll({ explicit: true });
  assert.equal(health.snapshot().items.a.status, "down");
  health.stop();
});
