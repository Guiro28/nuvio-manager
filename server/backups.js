// Backup snapshots, read profile by profile.
//
// A backup is a whole-account snapshot ("nuvio_account_backup" v1): Nuvio's own
// export, or one the manager builds from the per-profile pulls for providers
// without an export RPC (Tuvora, scope "manager"). Every row carries a
// profile_id, so any backup can be restored for a single profile — or only some
// parts of it — while the account-wide restore stays available.

// Automatic backups kept per profile (manual ones are never pruned).
export const MAX_AUTO_BACKUPS_PER_PROFILE = 15;
// What a profile restore can bring back. Watch history, progress and library are
// deliberately out of scope: a restore must never erase recent viewing.
export const RESTORE_PARTS = ["identity", "addons", "plugins", "tv", "mobile", "catalogs", "collections"];

const rowsOf = (data, key) => (Array.isArray(data?.[key]) ? data[key] : []);
const profileIdOf = (row) => Number(row?.profile_id);
const identityIdOf = (row) => Number(row?.profile_index ?? row?.profile_id);
const ordered = (rows) =>
  [...rows]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((row, index) => ({ url: row.url, name: String(row.name || ""), enabled: row.enabled !== false, sort_order: index }));
const collectionList = (value) => (Array.isArray(value) ? value : Array.isArray(value?.collections) ? value.collections : []);

// A manager-built snapshot records the sections it could not read ("2:addons"):
// those are unknown, never "empty" (restoring them would wipe the profile).
const missingSet = (snapshot) => new Set(Array.isArray(snapshot?.data?.missing) ? snapshot.data.missing : []);

// Everything a backup holds for one profile, ready to push. A part is null when
// the backup has nothing to restore for it (unknown or never set).
export function profileSlice(snapshot, profileId) {
  const data = snapshot?.data || {};
  const missing = missingSet(snapshot);
  const known = (part) => !missing.has(`${profileId}:${part}`);
  const mine = (key) => rowsOf(data, key).filter((row) => profileIdOf(row) === profileId);
  const blob = (platform) => mine("profile_settings_blobs").find((row) => row.platform === platform)?.settings_json ?? null;
  const catalogs = mine("home_catalog_settings")[0];
  const collections = mine("collections")[0];
  return {
    identity: rowsOf(data, "profiles").find((row) => identityIdOf(row) === profileId) || null,
    addons: known("addons") ? ordered(mine("addons")) : null,
    plugins: known("plugins") ? ordered(mine("plugins")) : null,
    tv: known("tv") ? blob("tv") : null,
    mobile: known("mobile") ? blob("mobile") : null,
    catalogs: known("catalogs") && catalogs ? catalogs.settings_json ?? null : null,
    collections: known("collections") && collections ? collections.collections_json ?? [] : null,
  };
}

// Light per-profile summary stored with each backup entry (for the UI): which
// profiles it holds and what each part contains.
export function profilesInSnapshot(snapshot) {
  return rowsOf(snapshot?.data, "profiles")
    .map((row) => {
      const profileId = identityIdOf(row);
      const slice = profileSlice(snapshot, profileId);
      return {
        profileId,
        name: String(row.name || `Profil ${profileId}`),
        parts: {
          identity: Boolean(slice.identity),
          addons: slice.addons ? slice.addons.length : null,
          plugins: slice.plugins ? slice.plugins.length : null,
          tv: Boolean(slice.tv),
          mobile: Boolean(slice.mobile),
          catalogs: slice.catalogs ? (Array.isArray(slice.catalogs.items) ? slice.catalogs.items.length : 0) : null,
          collections: slice.collections ? collectionList(slice.collections).length : null,
        },
      };
    })
    .filter((profile) => Number.isFinite(profile.profileId))
    .sort((a, b) => a.profileId - b.profileId);
}

// A backup always holds every profile of the account, but an automatic one is
// tagged with the profile whose change triggered it. A profile's automatic
// backups are its own (tagged) plus the account-wide ones (untagged: account
// restore, older backups) — so changes on one profile never push another
// profile's restore points out.
const holds = (item, profileId) => (item.profiles || []).some((p) => p.profileId === profileId);
export function profileWindow(backups, accountId, profileId, max = MAX_AUTO_BACKUPS_PER_PROFILE) {
  return backups
    .filter((item) => item.accountId === accountId && !item.manual && holds(item, profileId) && (item.profileId == null || item.profileId === profileId))
    .slice(0, max);
}

// Entries to drop for an account (newest first in `backups`): automatic backups
// outside every current profile's window. Manual ones are kept until deleted by
// hand. Current profiles = those of the newest backup (a deleted profile's
// backups expire with it).
export function expiredBackups(backups, accountId, max = MAX_AUTO_BACKUPS_PER_PROFILE) {
  const auto = backups.filter((item) => item.accountId === accountId && !item.manual);
  const newest = backups.find((item) => item.accountId === accountId && Array.isArray(item.profiles) && item.profiles.length);
  const profileIds = newest ? newest.profiles.map((p) => p.profileId) : [];
  if (!profileIds.length) return auto.slice(max);
  const keep = new Set();
  for (const profileId of profileIds) for (const item of profileWindow(backups, accountId, profileId, max)) keep.add(item.id);
  return auto.filter((item) => !keep.has(item.id));
}
