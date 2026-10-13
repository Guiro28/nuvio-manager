import { test } from "node:test";
import assert from "node:assert/strict";
import { createHistoryStore } from "../server/history-store.js";

// The addon map that feeds the library's "who uses this addon" view is refreshed
// on every sync, independently of the (heavy) watching-history feature toggle.
function makeStore({ enabled, addonsByPid }) {
  let saved = null;
  const accounts = [{ id: "acc", provider: "nuvio", email: "a@b.c", name: "Compte" }];
  const profiles = [
    { profile_index: 1, user_id: "u1", name: "Alice", uses_primary_addons: false, avatar_color_hex: "#111111" },
    { profile_index: 2, user_id: "u1", name: "Bob", uses_primary_addons: false, avatar_color_hex: "#222222" },
  ];
  let heavyCalls = 0;
  const store = createHistoryStore({
    load: () => saved,
    save: (value) => { saved = value; },
    getAccounts: () => accounts,
    getToken: async () => "token",
    getProfiles: async () => profiles,
    rpc: async () => [],
    call: async (path) => {
      if (path.startsWith("/rest/v1/addons")) {
        const pid = Number((/profile_id=eq\.(\d+)/.exec(path) || [])[1]);
        return addonsByPid[pid] || [];
      }
      heavyCalls++; // watched / progress / library history tables
      return [];
    },
    externalHistory: async () => [],
    getIntervalMinutes: () => 30,
    isEnabled: () => enabled,
    log: { error() {} },
  });
  return { store, heavyCalls: () => heavyCalls };
}

test("the addon map is cached even when history sync is disabled", async () => {
  const addonsByPid = {
    1: [{ url: "https://a.example/manifest.json", name: "A", enabled: true }],
    2: [],
  };
  const { store, heavyCalls } = makeStore({ enabled: false, addonsByPid });
  await store.syncAll();

  const usage = store.getAddonUsage([{ id: "acc" }]);
  assert.equal(usage.length, 2);
  const alice = usage.find((u) => u.ref === "acc:1");
  assert.equal(alice.addons.length, 1);
  assert.equal(alice.addons[0].url, "https://a.example/manifest.json");
  assert.equal(alice.identity.name, "Alice");
  assert.equal(usage.find((u) => u.ref === "acc:2").addons.length, 0);

  // History was never fetched (disabled): no heavy calls, stats dataset empty.
  assert.equal(heavyCalls(), 0);
  assert.equal(store.hasData([{ id: "acc" }]), false);
});

test("an enabled sync fetches history and still caches the addon map", async () => {
  const addonsByPid = { 1: [{ url: "https://a.example/manifest.json", name: "A", enabled: true }], 2: [] };
  const { store, heavyCalls } = makeStore({ enabled: true, addonsByPid });
  await store.syncAll();

  assert.ok(heavyCalls() > 0);
  assert.equal(store.hasData([{ id: "acc" }]), true);
  assert.equal(store.getAddonUsage([{ id: "acc" }]).find((u) => u.ref === "acc:1").addons.length, 1);
});

test("refreshAddons updates one profile's addon map without touching its history", async () => {
  const addonsByPid = { 1: [], 2: [] };
  const { store, heavyCalls } = makeStore({ enabled: false, addonsByPid });
  await store.syncAll();
  assert.equal(store.getAddonUsage([{ id: "acc" }]).find((u) => u.ref === "acc:1").addons.length, 0);

  addonsByPid[1] = [{ url: "https://b.example/manifest.json", name: "B", enabled: true }];
  await store.refreshAddons("acc:1");

  const alice = store.getAddonUsage([{ id: "acc" }]).find((u) => u.ref === "acc:1");
  assert.equal(alice.addons.length, 1);
  assert.equal(alice.addons[0].name, "B");
  assert.equal(heavyCalls(), 0); // still no history fetched
  assert.equal(store.hasData([{ id: "acc" }]), false);
});
