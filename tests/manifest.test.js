import test from "node:test";
import assert from "node:assert/strict";
import { configureUrl, readManifestInfo, readManifestLogo } from "../server/manifest.js";

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

test("manifest logo resolves relative image URLs", async () => {
  const logo = await readManifestLogo("https://addon.example/config/manifest.json", {
    lookupImpl: publicLookup,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "46" }),
      text: async () => JSON.stringify({ logo: "../assets/logo.png" }),
    }),
  });
  assert.equal(logo, "https://addon.example/assets/logo.png");
});

test("manifest logo rejects private hosts and unsafe image protocols", async () => {
  await assert.rejects(() => readManifestLogo("http://127.0.0.1/manifest.json"), /privée/);
  const logo = await readManifestLogo("https://addon.example/manifest.json", {
    lookupImpl: publicLookup,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({ logo: "javascript:alert(1)" }),
    }),
  });
  assert.equal(logo, null);
});

const manifestReply = (payload) => async () => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  text: async () => JSON.stringify(payload),
});

test("manifest info reads the Stremio configure hints and a logo", async () => {
  const configurable = await readManifestInfo("https://addon.example/abc/manifest.json", {
    lookupImpl: publicLookup,
    fetchImpl: manifestReply({ id: "x", logo: "/logo.png", behaviorHints: { configurable: true } }),
  });
  assert.deepEqual(configurable, { id: "x", logo: "https://addon.example/logo.png", configurable: true, configurationRequired: false });
  const required = await readManifestInfo("https://addon.example/manifest.json", {
    lookupImpl: publicLookup,
    fetchImpl: manifestReply({ id: "x", behaviorHints: { configurationRequired: true } }),
  });
  assert.deepEqual(required, { id: "x", logo: null, configurable: true, configurationRequired: true }); // no logo → null, not the manifest URL
  const plain = await readManifestInfo("https://addon.example/manifest.json", {
    lookupImpl: publicLookup,
    fetchImpl: manifestReply({ id: "x" }),
  });
  assert.equal(plain.configurable, false);
});

test("the configure page sits next to the manifest and keeps the configuration", () => {
  assert.equal(configureUrl("https://torrentio.strem.fun/providers=yts|qualityfilter=4k/manifest.json"), "https://torrentio.strem.fun/providers=yts|qualityfilter=4k/configure");
  assert.equal(configureUrl("https://addon.example/manifest.json?x=1"), "https://addon.example/configure?x=1");
});
