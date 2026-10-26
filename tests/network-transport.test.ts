import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
import { networkOptions, sendLatencyProbe } from "../src/networkTransport";
import { NetworkHealth } from "../src/networkHealth";

async function fixture(
  run: (
    app: ReturnType<typeof createServer>,
    url: string,
    clients: Socket[],
  ) => Promise<void>,
) {
  const dir = await mkdtemp(path.join(tmpdir(), "offduty-transport413-"));
  const app = createServer({ dataDir: dir });
  const clients: Socket[] = [];
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  try {
    await run(
      app,
      `http://127.0.0.1:${(app.http.address() as any).port}`,
      clients,
    );
  } finally {
    clients.forEach((s) => s.disconnect());
    await app.close();
    const target = path.resolve(dir);
    if (
      !target.startsWith(path.resolve(tmpdir()) + path.sep) ||
      !path.basename(target).startsWith("offduty-transport413-")
    )
      throw Error("Unsafe cleanup");
    await rm(target, { recursive: true, force: true });
  }
}
const connect = (url: string, clients: Socket[]) =>
  new Promise<Socket>((r, j) => {
    const s = io(url, {
      ...networkOptions(),
      autoConnect: true,
      reconnection: false,
      timeout: 700,
    });
    clients.push(s);
    s.once("connect", () => r(s));
    s.once("connect_error", j);
  });

test("a latency probe survives a briefly busy sender rather than reporting a false network outage", async () =>
  fixture(async (_app, url, clients) => {
    const s = await connect(url, clients);
    const health = new NetworkHealth();
    health.setConnected(true);
    // Real SDK writes mark the transport busy until its drain event. No packet
    // loss or network failure is introduced: only two sends in the same turn.
    s.emit("input", {});
    assert.equal(s.io.engine.transport.writable, false);
    const reading = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(Error("Latency probe never completed")),
        3000,
      );
      sendLatencyProbe(s, health, () => {
        clearTimeout(timeout);
        resolve(health.read());
      });
    });
    assert.notEqual(reading.status, "no-response");
    assert.ok(reading.rttMs > 0);
  }));

test("HTTP polling remains usable when WebSocket is unavailable, including acknowledged requests", async () =>
  fixture(async (app, url, clients) => {
    app.io.engine.opts.transports = ["polling"];
    const s = await connect(url, clients);
    assert.equal(s.io.engine.transport.name, "polling");
    const reply = await s.timeout(1000).emitWithAck("rooms:list", {});
    assert.equal(reply.ok, true);
    assert.ok(Array.isArray(reply.rooms));
    const health = new NetworkHealth();
    health.setConnected(true);
    const reading = await new Promise<any>((resolve) =>
      sendLatencyProbe(s, health, () => resolve(health.read())),
    );
    assert.ok(reading.rttMs > 0);
    assert.notEqual(reading.status, "no-response");
  }));

test("a silently hanging WebSocket upgrade cannot delay initial connection or room requests", async () =>
  fixture(async (app, url, clients) => {
    const held = new Set<import("node:stream").Duplex>();
    app.http.removeAllListeners("upgrade");
    app.http.on("upgrade", (_request, socket) => {
      held.add(socket);
      socket.once("close", () => held.delete(socket));
    });
    try {
      const s = await connect(url, clients);
      const reply = await s.timeout(1000).emitWithAck("rooms:list", {});
      assert.equal(reply.ok, true);
      assert.equal(s.io.engine.transport.name, "polling");
    } finally {
      for (const socket of held) socket.destroy();
    }
  }));

test("healthy connections upgrade from HTTP to WebSocket without losing acknowledgements", async () =>
  fixture(async (_app, url, clients) => {
    const s = await connect(url, clients);
    if (s.io.engine.transport.name !== "websocket")
      await new Promise<void>((resolve, reject) => {
        const deadline = setTimeout(
          () => reject(Error("WebSocket upgrade missing")),
          1500,
        );
        s.io.engine.once("upgrade", () => {
          clearTimeout(deadline);
          resolve();
        });
      });
    assert.equal(s.io.engine.transport.name, "websocket");
    assert.equal(
      (await s.timeout(1000).emitWithAck("rooms:list", {})).ok,
      true,
    );
  }));
