import { test } from "node:test";
import assert from "node:assert/strict";
import { createProxyDiagnostics } from "../server/proxy-diagnostics.js";

test("diagnostics distinguish WARP+, reachable ordinary proxies and unavailable addresses, and cache probes", async () => {
  let calls = 0, clock = 0;
  const diagnostic = createProxyDiagnostics({
    now: () => clock,
    getProxyUrl: () => "http://proxy.example:8080",
    readAll: async res => Buffer.from(res.text),
    request: async (_, { upstream }) => {
      calls++;
      if (upstream.url.includes("127.0.0.1")) throw Error("connection refused");
      return { res: { statusCode: 200, text: `ip=203.0.113.8\nwarp=${upstream.url.includes("warp") ? "plus" : "off"}\n` } };
    },
  });
  const result = await diagnostic.detect();
  assert.equal(result.suggestedUrl, "socks5://warp:1080");
  assert.equal(result.results[0].available, true);
  assert.equal(result.results[0].warp, "off");
  assert.equal(result.results[2].available, false);
  await diagnostic.detect();
  assert.equal(calls, 3);
  clock = 30001;
  await diagnostic.detect();
  assert.equal(calls, 6);
});

test("diagnostics never expose proxy credentials or errors containing them", async () => {
  const diagnostic = createProxyDiagnostics({
    getProxyUrl: () => "socks5://user:secret@proxy.example:1080",
    readAll: async () => Buffer.from("ip=203.0.113.1\nwarp=on\n"),
    request: async () => ({ res: { statusCode: 200 } }),
  });
  const result = await diagnostic.detect();
  assert.equal(result.results[0].usableUrl, "");
  assert.ok(!JSON.stringify(result).includes("secret"));
  const broken = createProxyDiagnostics({ getProxyUrl: () => "", readAll: async () => {}, request: async () => { throw Error("user:secret"); } });
  assert.ok(!JSON.stringify(await broken.probe("http://user:secret@proxy.example:80")).includes("secret"));
});
