import test from "node:test";
import assert from "node:assert/strict";
import {
  createDiscordNotifier, normalizeWebhookUrl, healthEmbed, summaryEmbed, relayEmbed, loginEmbed, profileList, COLORS, AVATAR_URL,
} from "../server/notifier.js";

const HOOK = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_ABCDEF-123";

test("webhook URLs are limited to Discord and normalised", () => {
  assert.equal(normalizeWebhookUrl(HOOK.replace("discord.com", "ptb.discordapp.com")), HOOK);
  assert.equal(normalizeWebhookUrl(`${HOOK}/`), HOOK);
  for (const bad of ["", "https://evil.example/api/webhooks/1/2", "http://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz", `${HOOK}?wait=true`])
    assert.throws(() => normalizeWebhookUrl(bad), /webhook Discord invalide/);
});

test("an unreachable addon gives a red embed with paths, relative time and profiles", () => {
  const now = Date.parse("2026-11-15T10:00:00Z");
  const embed = healthEmbed(
    {
      item: { name: "Lumio", logo: "https://lumio.example/logo.png" },
      after: "down",
      failingSince: now - 3600e3,
      record: { paths: { direct: { ok: false, ms: 15000, error: "Délai dépassé (15 s)" } }, lastOkAt: now - 4000e3 },
    },
    { profiles: ["Alice", "Bob"], origin: "https://manager.example", now },
  );
  assert.equal(embed.color, COLORS.down);
  assert.equal(embed.title, "🔴 Lumio est injoignable");
  assert.equal(embed.thumbnail.url, "https://lumio.example/logo.png");
  assert.equal(embed.url, "https://manager.example");
  assert.match(embed.fields.find((f) => f.name === "Vérification").value, /❌ Depuis le serveur — Délai dépassé/);
  assert.equal(embed.fields.find((f) => f.name === "Depuis").value, `<t:${(now - 3600e3) / 1000}:R>`);
  assert.equal(embed.fields.find((f) => f.name.startsWith("Profils")).value, "Alice, Bob");
  assert.equal(embed.footer.icon_url, AVATAR_URL);

  const back = healthEmbed({ item: { name: "Lumio" }, after: "ok", failingSince: now - 5400e3, record: { paths: { direct: { ok: true, ms: 80 } }, version: "2.3.0" } }, { now });
  assert.equal(back.color, COLORS.ok);
  assert.equal(back.fields.find((f) => f.name === "Indisponible pendant").value, "1 h 30 min");
  assert.equal(back.thumbnail.url, AVATAR_URL); // no addon logo: the manager logo
  assert.equal(back.author.name, "Santé des addons");
  assert.equal(back.author.icon_url, AVATAR_URL);
  const svg = healthEmbed({ item: { name: "X", logo: "https://x.example/logo.svg" }, after: "ok", record: { paths: {} } }, { now });
  assert.equal(svg.thumbnail.url, AVATAR_URL); // Discord does not render SVG
});

test("summary, relay and login embeds read well", () => {
  const now = Date.parse("2026-11-15T20:00:00Z");
  const summary = summaryEmbed({ dateLabel: "samedi 15 novembre", since: now - 864e5, watched: 5, opens: 7, bandwidth: 3.5 * 1024 ** 3, profiles: [{ name: "Alice", count: 3, titles: ["Dune", "Severance S2E1"] }], failing: [] }, { now });
  assert.equal(summary.title, "📊 Résumé du samedi 15 novembre");
  assert.equal(summary.fields.find((f) => f.name === "Bande passante relayée").value, "3,5 Go");
  assert.match(summary.fields.find((f) => f.name === "Profils les plus actifs").value, /🥇 \*\*Alice\*\* — 3 titres · Dune, Severance S2E1/);
  assert.equal(summary.fields.find((f) => f.name === "Addons").value, "✅ Tous les addons répondent");

  const relay = relayEmbed([{ at: now, addon: "Lumio", profile: "Alice", reason: "Erreur HTTP 403" }, { at: now, addon: "Lumio", profile: "Bob", reason: "Erreur HTTP 403" }, { at: now, addon: "WAStream", profile: "", reason: "Délai dépassé" }], { now });
  assert.equal(relay.title, "⚠️ 3 lectures ont échoué à la suite");
  assert.match(relay.fields[0].value, /❌ \*\*Lumio\*\* · Alice — Erreur HTTP 403/);

  assert.equal(loginEmbed({ ip: "203.0.113.9", count: 5, minutes: 15, users: ["admin"] }, { now }).fields[1].value, "`admin`");
  assert.equal(profileList(["a", "b", "c", "d", "e", "f", "g"]), "a, b, c, d, e et 2 autres");
});

test("sends are queued, retried once on 429 and report clean errors", async () => {
  const calls = [];
  const answers = [{ status: 429, body: { retry_after: 0.01 } }, { status: 204 }, { status: 404 }];
  const fetchImpl = async (url, options) => {
    calls.push({ url, payload: JSON.parse(options.body) });
    const answer = answers.shift();
    return { ok: answer.status < 300, status: answer.status, json: async () => answer.body || {} };
  };
  const warnings = [];
  let webhook = HOOK;
  const discord = createDiscordNotifier({ getWebhook: () => webhook, log: { warn: (...args) => warnings.push(args) }, fetchImpl, wait: async () => {} });
  assert.equal(await discord.send({ title: "Hello" }), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `${HOOK}?wait=true`);
  assert.equal(calls[1].payload.username, "Nuvio Manager");
  assert.deepEqual(calls[1].payload.allowed_mentions, { parse: [] });
  await assert.rejects(discord.send({ title: "Gone" }), /webhook supprimé ou invalide/);

  answers.push({ status: 500 });
  discord.notify({ title: "x" }, "test");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(warnings.length, 1);
  assert.equal(JSON.stringify(warnings).includes("abcdefghijklmnop"), false); // never the webhook token

  webhook = "";
  assert.equal(await discord.send({ title: "nowhere" }), false);
});
