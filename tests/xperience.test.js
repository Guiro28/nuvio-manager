import test from "node:test";
import assert from "node:assert/strict";
import { normalizeXperienceAvatars, getXperienceAvatars, XPERIENCE_AVATARS_URL } from "../server/xperience.js";

test("Xperience avatars keep categories and accept only the official HTTPS CDN", () => {
  const avatars = normalizeXperienceAvatars({ avatars: [
    { id: "two", name: "Second", url: "https://cdn.xperience-app.com/avatars/two.webp", category: "Pixar", sort_order: 2 },
    { id: "one", name: "First", url: "https://cdn.xperience-app.com/avatars/one.webp", category: "Marvel", sort_order: 1 },
    { id: "bad", name: "Bad", url: "https://example.com/avatar.webp", category: "Other" },
  ] });
  assert.deepEqual(avatars.map(({ id, category }) => ({ id, category })), [
    { id: "one", category: "Marvel" },
    { id: "two", category: "Pixar" },
  ]);
});

test("Xperience avatar source returns the complete normalized catalogue", async () => {
  let requested;
  const result = await getXperienceAvatars(async (url) => {
    requested = url;
    return { ok: true, json: async () => ({ avatars: [
      { id: "a", name: "Avatar A", url: "https://cdn.xperience-app.com/avatars/a.webp", category: "Disney", sort_order: 1 },
    ] }) };
  }, 1);
  assert.equal(requested, XPERIENCE_AVATARS_URL);
  assert.deepEqual(result.categories, ["Disney"]);
  assert.equal(result.avatars.length, 1);
  assert.equal(result.sourceUrl, "https://xperience-app.com/avatars");
});
