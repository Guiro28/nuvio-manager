import test from "node:test";
import assert from "node:assert/strict";
import { expiredBackups, profileSlice, profilesInSnapshot, profileWindow } from "../server/backups.js";

const snapshot = {
  format: "nuvio_account_backup",
  version: 1,
  data: {
    profiles: [
      { profile_index: 1, profile_id: 1, name: "Guillaume", avatar_id: "nuvio-1", avatar_color_hex: "#7cb342" },
      { profile_index: 2, profile_id: 2, name: "Charlie", avatar_url: "https://cdn.example/charlie.webp" },
    ],
    addons: [
      { profile_id: 1, url: "https://b/manifest.json", name: "B", sort_order: 1 },
      { profile_id: 1, url: "https://a/manifest.json", name: "A", sort_order: 0, enabled: false },
      { profile_id: 2, url: "https://c/manifest.json", name: "C", sort_order: 0 },
    ],
    plugins: [],
    profile_settings_blobs: [
      { profile_id: 1, platform: "tv", settings_json: { theme: "dark" } },
      { profile_id: 2, platform: "mobile", settings_json: { grid: 3 } },
    ],
    home_catalog_settings: [{ profile_id: 1, platform: "home_catalog_shared", settings_json: { items: [{}, {}, {}] } }],
    collections: [{ profile_id: 2, collections_json: [{ id: "x" }, { id: "y" }] }],
    watched_items: [{ profile_id: 1, content_id: "tt1" }],
  },
};

test("a profile slice holds only that profile's rows, ordered and ready to push", () => {
  const one = profileSlice(snapshot, 1);
  assert.equal(one.identity.name, "Guillaume");
  assert.deepEqual(one.addons.map((a) => [a.name, a.sort_order, a.enabled]), [["A", 0, false], ["B", 1, true]]);
  assert.deepEqual(one.plugins, []);
  assert.deepEqual(one.tv, { theme: "dark" });
  assert.equal(one.mobile, null);
  assert.equal(one.catalogs.items.length, 3);
  assert.equal(one.collections, null);
  const two = profileSlice(snapshot, 2);
  assert.deepEqual(two.addons.map((a) => a.name), ["C"]);
  assert.equal(two.collections.length, 2);
  assert.equal(two.tv, null);
});

test("the per-profile summary lists every profile and what each part holds", () => {
  assert.deepEqual(profilesInSnapshot(snapshot), [
    { profileId: 1, name: "Guillaume", parts: { identity: true, addons: 2, plugins: 0, tv: true, mobile: false, catalogs: 3, collections: null } },
    { profileId: 2, name: "Charlie", parts: { identity: true, addons: 1, plugins: 0, tv: false, mobile: true, catalogs: null, collections: 2 } },
  ]);
  assert.deepEqual(profilesInSnapshot(null), []);
});

test("sections a manager-built backup could not read are unknown, never empty", () => {
  const partial = { ...snapshot, scope: "manager", data: { ...snapshot.data, missing: ["1:addons", "2:collections"] } };
  assert.equal(profileSlice(partial, 1).addons, null); // would otherwise wipe the profile's addons
  assert.equal(profileSlice(partial, 2).collections, null);
  assert.equal(profileSlice(partial, 2).addons.length, 1);
  assert.equal(profilesInSnapshot(partial)[0].parts.addons, null);
});

test("15 automatic backups per profile: one profile's changes never evict another's", () => {
  const two = [{ profileId: 1 }, { profileId: 2 }];
  // Newest first: 20 changes on profile 2, then 3 on profile 1, 1 account-wide, 1 manual.
  const backups = [
    ...Array.from({ length: 20 }, (_, i) => ({ id: `p2-${i}`, accountId: "a", manual: false, profileId: 2, profiles: two })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `p1-${i}`, accountId: "a", manual: false, profileId: 1, profiles: two })),
    { id: "account", accountId: "a", manual: false, profileId: null, profiles: two },
    { id: "manual", accountId: "a", manual: true, profileId: null, profiles: two },
    { id: "other", accountId: "b", manual: false, profileId: 1, profiles: two },
  ];
  // Profile 1 keeps its 3 + the account-wide one; profile 2 keeps its 15 newest.
  assert.deepEqual(profileWindow(backups, "a", 1).map((b) => b.id), ["p1-0", "p1-1", "p1-2", "account"]);
  assert.equal(profileWindow(backups, "a", 2).length, 15);
  assert.deepEqual(expiredBackups(backups, "a").map((b) => b.id), ["p2-15", "p2-16", "p2-17", "p2-18", "p2-19"]);
  assert.deepEqual(expiredBackups(backups, "b"), []);
});

test("backups of a deleted profile expire; untagged ones count for every profile", () => {
  const now = [{ profileId: 1 }];
  const backups = [
    ...Array.from({ length: 16 }, (_, i) => ({ id: `acct-${i}`, accountId: "a", manual: false, profileId: null, profiles: now })),
    { id: "gone", accountId: "a", manual: false, profileId: 3, profiles: [{ profileId: 1 }, { profileId: 3 }] },
  ];
  assert.deepEqual(expiredBackups(backups, "a").map((b) => b.id), ["acct-15", "gone"]);
});
