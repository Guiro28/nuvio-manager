import test from "node:test";
import assert from "node:assert/strict";
import { readManifestLogo } from "../server/manifest.js";

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
