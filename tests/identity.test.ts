import {
  prepareFixture,
  draftSocket,
  startFixture as startGame,
} from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, addPlayer } from "../server/simulation";
import { generateWorld } from "../shared/world";

test("host must wait for every real teammate; bots are immediately ready", () => {
  const g = createGame("READY2", "host", 884);
  addPlayer(g, "host", "房主", "scout");
  addPlayer(g, "guest", "队友", "medic");
  addPlayer(g, "bot", "AI", "guardian", true);
  assert.equal(
    startGame(g, "host"),
    false,
    "unready human cannot be forced into action",
  );
  assert.equal(g.state.players[2].ready, true);
  prepareFixture(g);
  assert.equal(startGame(g, "host"), true);
});

test("survival has a distinct catastrophe biome and broad connected combat space", () => {
  const a = generateWorld(884, "expedition"),
    b = generateWorld(884, "survival");
  assert.equal(a.biome, "facility");
  assert.equal(b.biome, "cataclysm");
  assert.ok(
    b.rooms.length < a.rooms.length,
    "ruins use irregular pockets rather than fixed room grid",
  );
  assert.ok(
    b.tiles.filter(Boolean).length / b.tiles.length > 0.55,
    "survival supports open kiting routes",
  );
});
import { worldBlocked } from "../shared/world";
test("catastrophe layouts remain reachable across 100 seeds with clear arrival and objective points", () => {
  for (let seed = 0; seed < 100; seed++) {
    const w = generateWorld(seed, "survival"),
      start = Math.floor(w.spawn.y / 64) * w.cols + Math.floor(w.spawn.x / 64);
    const seen = new Set([start]),
      q = [start];
    for (let i = 0; i < q.length; i++)
      for (const n of [q[i] - 1, q[i] + 1, q[i] - w.cols, q[i] + w.cols])
        if (w.tiles[n] && !seen.has(n)) {
          seen.add(n);
          q.push(n);
        }
    assert.equal(
      seen.size,
      w.tiles.filter(Boolean).length,
      `seed ${seed}: disconnected floor`,
    );
    for (const p of w.points) {
      assert.equal(worldBlocked(w, p.x, p.y, 24), false);
      assert.ok(seen.has(Math.floor(p.y / 64) * w.cols + Math.floor(p.x / 64)));
    }
  }
});
import { createServer } from "../server/app";
import { io, type Socket } from "socket.io-client";
test("role/rule changes invalidate human readiness; reconnect keeps identity; spectators cannot prepare", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const peers: Socket[] = [];
  const join = async () => {
    const s = io(`http://127.0.0.1:${(app.http.address() as any).port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    peers.push(s);
    await new Promise<void>((r) => s.once("connect", () => r()));
    return s;
  };
  const ack = (s: Socket, event: string, data: unknown = {}) =>
    new Promise<any>((r) => s.emit(event, data, r));
  try {
    const host = await join(),
      guest = await join(),
      spectator = await join();
    const room = await ack(host, "room:create", {
      name: "房主",
      role: "scout",
    });
    const joined = await ack(guest, "room:join", {
      code: room.code,
      name: "队友",
      role: "medic",
    });
    await ack(spectator, "room:watch", { code: room.code, name: "观战" });
    assert.equal(
      (await ack(spectator, "player:ready", { ready: true })).ok,
      false,
    );
    await draftSocket(host, app.rooms.get(room.code)!, room.playerId);
    await draftSocket(guest, app.rooms.get(room.code)!, joined.playerId);
    assert.equal(app.rooms.get(room.code)!.state.players[1].ready, true);
    await ack(guest, "player:role", { role: "engineer" });
    assert.equal(app.rooms.get(room.code)!.state.players[1].ready, false);
    await ack(guest, "player:ready", { ready: true });
    await ack(host, "room:options", { mode: "survival" });
    assert.equal(app.rooms.get(room.code)!.state.players[1].ready, false);
    await ack(guest, "player:ready", { ready: true });
    guest.disconnect();
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(app.rooms.get(room.code)!.state.players[1].ready, false);
    assert.equal((await ack(host, "game:start")).ok, false);
    await ack(host, "player:ready", { ready: true });
    const resumed = await join();
    const r = await ack(resumed, "room:resume", { token: joined.token });
    assert.equal(r.playerId, joined.playerId);
    await ack(resumed, "player:ready", { ready: true });
    assert.equal((await ack(host, "game:start")).ok, true);
  } finally {
    peers.forEach((s) => s.disconnect());
    await app.close();
  }
});
