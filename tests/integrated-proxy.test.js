import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";

const listen = async (server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
};

function socksServer() {
  return net.createServer((client) => {
    let stage = "greeting", buffer = Buffer.alloc(0);
    const consume = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (stage === "greeting") {
        if (buffer.length < 2) return;
        const length = 2 + buffer[1];
        if (buffer.length < length) return;
        buffer = buffer.subarray(length);
        client.write(Buffer.from([5, 0]));
        stage = "connect";
      }
      if (stage !== "connect" || buffer.length < 5) return;
      const atyp = buffer[3];
      let host, offset;
      if (atyp === 1) {
        if (buffer.length < 10) return;
        host = [...buffer.subarray(4, 8)].join(".");
        offset = 8;
      } else if (atyp === 3) {
        const size = buffer[4];
        if (buffer.length < 7 + size) return;
        host = buffer.subarray(5, 5 + size).toString("utf8");
        offset = 5 + size;
      } else {
        client.destroy();
        return;
      }
      const port = buffer.readUInt16BE(offset);
      const remaining = buffer.subarray(offset + 2);
      stage = "proxy";
      client.removeListener("data", consume);
      const upstream = net.connect(port, host, () => {
        client.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
        if (remaining.length) upstream.write(remaining);
        client.pipe(upstream).pipe(client);
      });
      upstream.on("error", () => client.destroy());
    };
    client.on("data", consume);
    client.on("error", () => {});
  });
}

test("integrated proxy serves direct and WARP addon routes from the dashboard", async (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "nuvio-integrated-proxy-"));
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = folder;

  const video = Buffer.from("video-through-integrated-proxy");
  let addonOrigin;
  const addonServer = http.createServer((req, res) => {
    if (req.url === "/manifest.json") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ id: "org.test.addon", name: "Addon test", resources: ["stream"], types: ["movie"] }));
    }
    if (req.url === "/stream/movie/tt1.json") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ streams: [
        { name: "HTTP", url: `${addonOrigin}/video.mp4`, behaviorHints: { proxyHeaders: { request: { "x-proxy-test": "ok" } } } },
        { name: "Torrent", infoHash: "0123456789abcdef" },
      ] }));
    }
    if (req.url === "/video.mp4") {
      assert.equal(req.headers["x-proxy-test"], "ok");
      res.writeHead(req.headers.range ? 206 : 200, {
        "Content-Type": "video/mp4",
        "Content-Length": video.length,
        "Accept-Ranges": "bytes",
      });
      return res.end(video);
    }
    res.writeHead(404).end();
  });
  const addonPort = await listen(addonServer);
  addonOrigin = `http://127.0.0.1:${addonPort}`;

  const socks = socksServer();
  const socksPort = await listen(socks);

  let proxy, dashboardOrigin;
  const dashboard = http.createServer(async (req, res) => {
    const handled = await proxy.handle(req, res, new URL(req.url, dashboardOrigin));
    if (!handled) res.writeHead(404).end();
  });
  const dashboardPort = await listen(dashboard);
  dashboardOrigin = `http://127.0.0.1:${dashboardPort}`;

  const state = {};
  let saves = 0;
  const { createIntegratedProxy } = await import(`../server/integrated-proxy.js?test=${Date.now()}`);
  proxy = createIntegratedProxy({
    state,
    save: () => { saves++; },
    origin: dashboardOrigin,
    warpUrl: `socks5://127.0.0.1:${socksPort}`,
  });

  t.after(async () => {
    await Promise.all([
      new Promise((resolve) => dashboard.close(resolve)),
      new Promise((resolve) => addonServer.close(resolve)),
      new Promise((resolve) => socks.close(resolve)),
    ]);
    fs.rmSync(folder, { recursive: true, force: true });
    if (previousDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = previousDataDir;
  });

  const addon = await proxy.register({ url: `${addonOrigin}/manifest.json`, name: "Addon test" }, "direct");
  assert.match(addon.id, /^[a-f0-9]{10}$/);
  assert.equal(state.proxyAddons.length, 1);
  assert.ok(saves >= 2);

  for (const mode of ["direct", "warp"]) {
    const manifestResponse = await fetch(`${dashboardOrigin}/relay/${mode}/${addon.id}/manifest.json`);
    assert.equal(manifestResponse.status, 200);
    assert.equal((await manifestResponse.json()).id, `org.test.addon.wproxy.${mode}`);

    const streamResponse = await fetch(`${dashboardOrigin}/relay/${mode}/${addon.id}/stream/movie/tt1.json`);
    assert.equal(streamResponse.status, 200);
    const streams = (await streamResponse.json()).streams;
    assert.match(streams[0].url, new RegExp(`^${dashboardOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/relay/${mode}/play\\?t=`));
    assert.equal(streams[0].behaviorHints?.proxyHeaders, undefined);
    assert.equal(streams[1].infoHash, "0123456789abcdef");

    const mediaResponse = await fetch(streams[0].url, { headers: { Range: "bytes=0-" } });
    assert.equal(mediaResponse.status, 206);
    assert.deepEqual(Buffer.from(await mediaResponse.arrayBuffer()), video);
  }

  assert.equal((await fetch(`${dashboardOrigin}/relay/direct/api/state`)).status, 404);
});
