import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

test("appairage, catalogue, aperçu, copie protégée, sauvegarde et erreurs partielles", async (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "nuvio-integration-"));
  const rows = [
    {
      profile_index: 1,
      name: "Source test",
      user_id: "test-user",
      avatar_color_hex: "#1E88E5",
      avatar_id: "avatar_test",
      avatar_url: null,
      uses_primary_addons: false,
      uses_primary_plugins: false,
    },
    {
      profile_index: 2,
      name: "Destination test",
      user_id: "test-user",
      avatar_color_hex: "#43A047",
      avatar_id: null,
      avatar_url: null,
      uses_primary_addons: false,
      uses_primary_plugins: false,
    },
  ];
  const settings = {
    1: {
      tv: { theme: "ocean", nested: { size: 2 } },
      mobile: { language: "fr" },
    },
    2: {
      tv: { theme: "white", nested: { size: 8 } },
      mobile: { language: "en" },
    },
  };
  const versions = { 1: "2026-01-01T00:00:00Z", 2: "2026-01-02T00:00:00Z" };
  let writes = 0,
    failPlugins = false,
    profilePatch,
    restoredBackup;
  const mock = http.createServer(async (req, res) => {
    const parts = [];
    for await (const p of req) parts.push(p);
    const b = JSON.parse(Buffer.concat(parts).toString() || "{}");
    const route = new URL(req.url, "http://local").pathname;
    const reply = (value, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    if (route.endsWith("start_tv_login_session"))
      return reply([
        {
          code: "TEST12",
          web_url: "https://nuvio.tv/tv-login?code=TEST12",
          expires_at: new Date(Date.now() + 300000).toISOString(),
          poll_interval_seconds: 3,
        },
      ]);
    if (route.endsWith("poll_tv_login_session"))
      return reply([{ status: "approved" }]);
    if (route.endsWith("tv-logins-exchange"))
      return reply({
        access_token: "secret-test",
        refresh_token: "refresh-test",
        expires_in: 3600,
      });
    if (route === "/auth/v1/user")
      return reply({ id: "test-user", email: "test@example.invalid" });
    if (route.endsWith("sync_pull_profiles")) return reply(rows);
    if (route.endsWith("get_avatar_catalog"))
      return reply([{ id: "avatar_test", display_name: "Avatar test", storage_path: "avatar-test.png", category: "test", bg_color: "#1E88E5" }]);
    if (route.endsWith("sync_patch_profile")) {
      profilePatch = b;
      return reply([rows.find((row) => row.profile_index === b.p_profile_id)]);
    }
    if (route.endsWith("sync_pull_watched_items"))
      return reply(b.p_profile_id === 1 ? [
        { content_id: "tt-common", content_type: "movie", title: "Film commun", season: null, episode: null, watched_at: "2026-09-13T20:00:00Z" },
      ] : [
        { content_id: "tt-common", content_type: "movie", title: "Film commun", season: null, episode: null, watched_at: "2026-09-12T20:00:00Z" },
        { content_id: "tt-series", content_type: "series", title: "Série test", season: 1, episode: 2, watched_at: "2026-09-11T20:00:00Z" },
      ]);
    if (route.endsWith("sync_pull_watch_progress"))
      return reply(b.p_profile_id === 1 ? [
        { content_id: "tt-common", season: null, episode: null, position: 3600000, duration: 7200000, last_watched: "2026-09-13T20:00:00Z" },
      ] : []);
    if (route.endsWith("sync_pull_profile_settings_blob"))
      return reply([
        {
          settings_json: settings[b.p_profile_id][b.p_platform],
          updated_at: versions[b.p_profile_id],
        },
      ]);
    if (route === "/rest/v1/addons" || route === "/rest/v1/plugins")
      return reply([]);
    if (route.endsWith("sync_export_account_backup"))
      return reply({ format: "nuvio_account_backup", version: 1, data: { settings } });
    if (route.endsWith("sync_restore_account_backup")) {
      restoredBackup = b.p_backup;
      return reply({ restored: true });
    }
    if (route.endsWith("sync_push_profile_settings_blob_guarded")) {
      if (b.p_expected_updated_at !== versions[b.p_profile_id])
        return reply({ message: "Concurrent update" }, 409);
      settings[b.p_profile_id][b.p_platform] = b.p_settings_json;
      writes++;
      return reply(versions[b.p_profile_id]);
    }
    if (route.endsWith("sync_push_plugins"))
      return failPlugins
        ? reply({ message: "Simulated plugin failure" }, 500)
        : reply(null);
    return reply({ message: "Unexpected mock route: " + route }, 404);
  });
  mock.listen(0, "127.0.0.1");
  await once(mock, "listening");
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: "0",
      HOST: "127.0.0.1",
      DATA_DIR: folder,
      MANAGER_PASSWORD: "test-password",
      NUVIO_API_URL: `http://127.0.0.1:${mock.address().port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    child.kill();
    await once(child, "exit");
    await new Promise((r) => mock.close(r));
    fs.rmSync(folder, { recursive: true, force: true });
  });
  const base = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(Error("Server startup timeout")),
      10000,
    );
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const m = output.match(/http:\/\/localhost:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve("http://127.0.0.1:" + m[1]);
      }
    });
    child.once("error", reject);
  });
  let cookie = "";
  const call = async (route, data, extra = {}) => {
    const res = await fetch(base + "/api/" + route, {
      headers: {
        Cookie: cookie,
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...extra,
      },
      ...(data ? { method: "POST", body: JSON.stringify(data) } : {}),
    });
    return {
      status: res.status,
      data: await res.json(),
      cookie: res.headers.get("set-cookie"),
    };
  };
  assert.equal((await call("state")).status, 401);
  const login = await call("login", {
    user: "admin",
    password: "test-password",
  });
  assert.equal(login.status, 200);
  cookie = login.cookie.split(";")[0];
  assert.equal(
    (await call("pair/start", {}, { Origin: "https://evil.example" })).status,
    403,
  );
  const pairing = await call("pair/start", {});
  assert.equal(pairing.status, 200);
  assert.equal(
    (await call("pair/poll", { id: pairing.data.id })).data.status,
    "connected",
  );
  const state = await call("state");
  assert.equal(state.data.accounts.length, 1);
  assert.equal(JSON.stringify(state.data).includes("secret-test"), false);
  const profileRows = await call("profiles?accountId=test-user");
  assert.match(profileRows.data[0].avatar_image_url, /storage\/v1\/object\/public\/avatars\/avatar-test\.png$/);
  const identity = await call("profile/identity", {
    accountId: "test-user",
    profileId: 1,
    name: "Source test",
    color: "#8E24AA",
    avatarId: "avatar_test",
    avatarUrl: "",
    inheritAddons: false,
    inheritPlugins: false,
  });
  assert.equal(identity.status, 200);
  assert.equal(profilePatch.p_avatar_color_hex, "#8E24AA");
  assert.equal(profilePatch.p_avatar_id, "avatar_test");
  assert.equal(profilePatch.p_avatar_id_provided, true);
  assert.equal(profilePatch.p_avatar_url_provided, false);
  const statistics = await call("statistics?days=0");
  assert.equal(statistics.status, 200);
  assert.deepEqual(statistics.data.totals, { profiles: 2, plays: 3, uniqueTitles: 2, trackedMinutes: 60 });
  assert.equal(statistics.data.overlap[0].common, 1);
  const oneProfile = await call("statistics?days=0&profiles=test-user%3A1");
  assert.equal(oneProfile.data.totals.profiles, 1);
  assert.equal(oneProfile.data.availableProfiles.length, 2);
  const lib = await call("library/save", {
    name: "Test addon",
    url: "https://example.invalid/addon",
  });
  assert.equal(lib.data.url, "https://example.invalid/addon/manifest.json");
  const plan = await call("preview", {
    accountId: "test-user",
    profileId: 2,
    source: { accountId: "test-user", profileId: 1 },
    selection: { tv: [["theme"]] },
  });
  assert.equal(plan.data.count, 1);
  assert.equal(writes, 0);
  const applied = await call("apply", { id: plan.data.id });
  assert.equal(applied.status, 200);
  assert.equal(settings[2].tv.theme, "ocean");
  assert.equal(settings[2].tv.nested.size, 8);
  assert.equal(writes, 1);
  const stale = await call("preview", {
    accountId: "test-user",
    profileId: 2,
    desired: { tv: { theme: "crimson" } },
  });
  settings[2].tv.theme = "changed-elsewhere";
  assert.equal((await call("apply", { id: stale.data.id })).status, 409);
  assert.equal(writes, 1);
  const failing = await call("preview", {
    accountId: "test-user",
    profileId: 2,
    desired: { mobile: { language: "de" }, plugins: [] },
  });
  failPlugins = true;
  const partial = await call("apply", { id: failing.data.id });
  assert.equal(partial.data.partial, true);
  assert.deepEqual(partial.data.completed, ["mobile"]);
  assert.ok(partial.data.backupId);
  const backup = await call("backup/download?id=" + applied.data.backupId);
  assert.equal(backup.status, 200);
  assert.equal(backup.data.data.settings[2].tv.theme, "white");
  for (let index = 0; index < 4; index++)
    assert.equal((await call("backup/create", { accountId: "test-user" })).status, 200);
  const limitedBackups = await call("state");
  assert.equal(limitedBackups.data.backups.filter((item) => item.accountId === "test-user").length, 3);
  const deletedBackupId = limitedBackups.data.backups[0].id;
  assert.equal((await call("backup/delete", { id: deletedBackupId })).status, 200);
  assert.equal((await call("backup/download?id=" + deletedBackupId)).status, 404);
  const uploadedBackup = {
    format: "nuvio_account_backup",
    version: 1,
    data: { profiles: [], addons: [], plugins: [] },
  };
  const restored = await call("backup/restore-file", {
    accountId: "test-user",
    backup: uploadedBackup,
  });
  assert.equal(restored.status, 200);
  assert.deepEqual(restoredBackup, uploadedBackup);
  assert.ok(restored.data.safetyBackupId);
  const notPublic = await fetch(base + "/relay/direct/api/state");
  assert.equal(notPublic.status, 404);
  assert.equal(
    (await call("library/save", { name: "evil", url: "javascript:alert(1)" }))
      .status,
    400,
  );
  rows[1].uses_primary_addons = true;
  assert.equal(
    (
      await call("preview", {
        accountId: "test-user",
        profileId: 2,
        desired: { addons: [] },
      })
    ).status,
    400,
  );
  // Panel settings never expose stored secrets and require reauthentication.
  assert.equal((await call('settings')).data.username, 'admin');
  assert.equal((await call('settings/tmdb',{key:'tmdb-test-secret'})).status,200);
  assert.equal((await call('settings/trackers',{traktClientId:'trakt-client',traktClientSecret:'trakt-secret',simklClientId:'simkl-client'})).status,200);
  assert.equal((await call('settings/proxy',{url:'ftp://proxy.invalid:21'})).status,400);
  assert.equal((await call('settings/proxy',{url:'socks5://proxy-user:proxy-secret@proxy.example:1080'})).status,200);
  const panelSettings = await call('settings');
  assert.equal(panelSettings.data.tmdbConfigured,true);
  assert.equal(panelSettings.data.externalProxy.configured,true);
  assert.equal(panelSettings.data.externalProxy.type,'SOCKS');
  assert.equal(panelSettings.data.externalProxy.display,'socks5://proxy.example:1080');
  assert.equal(panelSettings.data.trackers.trakt.configured,true);
  assert.equal(panelSettings.data.trackers.trakt.clientId,'trakt-client');
  assert.equal(panelSettings.data.trackers.simkl.clientId,'simkl-client');
  assert.equal(JSON.stringify(panelSettings.data).includes('trakt-secret'),false);
  assert.equal(JSON.stringify(panelSettings.data).includes('tmdb-test-secret'),false);
  assert.equal(JSON.stringify(panelSettings.data).includes('proxy-secret'),false);
  assert.equal((await call('settings/admin',{username:'owner',currentPassword:'wrong',newPassword:'new-test-password'})).status,403);
  assert.equal((await call('settings/admin',{username:'owner',currentPassword:'test-password',newPassword:'short'})).status,400);
  const updatedAdmin=await call('settings/admin',{username:'owner',currentPassword:'test-password',newPassword:'new-test-password'});
  assert.equal(updatedAdmin.status,200);
  assert.equal((await call('state')).status,401); // Old session is revoked.
  cookie=updatedAdmin.cookie.split(';')[0];
  assert.equal((await call('settings')).data.username,'owner');
  assert.equal((await call('login',{user:'admin',password:'test-password'})).status,401);
  assert.equal((await call('login',{user:'owner',password:'new-test-password'})).status,200);
  const {vault}=await import('../server/core.js');
  const {verifyPassword}=await import('../server/panel-auth.js');
  const stored=vault(folder).read('panel-settings');
  assert.equal(stored.tmdbKey,'tmdb-test-secret');
  assert.equal(stored.proxyUrl,'socks5://proxy-user:proxy-secret@proxy.example:1080');
  assert.equal(stored.trackerApps.trakt.clientSecret,'trakt-secret');
  assert.equal(verifyPassword('new-test-password',stored.admin),true);
  assert.equal(JSON.stringify(stored).includes('new-test-password'),false);
  assert.equal(fs.readFileSync(path.join(folder,'panel-settings.enc')).includes(Buffer.from('tmdb-test-secret')),false);
  assert.equal(fs.readFileSync(path.join(folder,'panel-settings.enc')).includes(Buffer.from('trakt-secret')),false);
  assert.equal(fs.readFileSync(path.join(folder,'panel-settings.enc')).includes(Buffer.from('proxy-secret')),false);

});
