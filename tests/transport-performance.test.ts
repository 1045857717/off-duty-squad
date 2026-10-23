import test from "node:test";
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
import { seededRandom } from "../shared/world";
import type { GameState } from "../shared/types";
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const ack = (socket: Socket, event: string, data: unknown) =>
  socket.timeout(3000).emitWithAck(event, data);

test("late-run snapshots reduce real WebSocket traffic without changing authoritative combat or legacy clients", async (t) => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + (app.http.address() as any).port;
  const clients: Socket[] = [];
  try {
    for (let i = 0; i < 4; i++) {
      const socket = io(base, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
        transportOptions: {
          websocket: {
            perMessageDeflate: i === 3 ? false : { threshold: 1024 },
          },
        },
      });
      clients.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
    }
    const host = await ack(clients[0], "room:create", {
      name: "Transport host",
      role: "engineer",
    });
    for (let i = 1; i < 4; i++)
      assert.equal(
        (
          await ack(clients[i], "room:join", {
            code: host.code,
            name: "Peer " + i,
            role: "medic",
          })
        ).ok,
        true,
      );
    const g = app.rooms.get(host.code)!,
      random = seededRandom(424242),
      damage = 19.123456789;
    g.state.enemies = Array.from({ length: 150 }, (_, i) => ({
      id: ++g.state.serial,
      kind: i % 2 ? ("shooter" as const) : ("tank" as const),
      x: 100 + random() * 2000,
      y: 100 + random() * 2000,
      hp: 130.123456789,
      maxHp: 160,
      speed: 40,
      cd: random(),
      angle: random() * Math.PI * 2,
      hitFlash: 0,
      windup: 0.6123456789,
    }));
    g.state.bullets = Array.from({ length: 350 }, () => ({
      id: ++g.state.serial,
      x: random() * 2200,
      y: random() * 2200,
      vx: (random() - 0.5) * 600,
      vy: (random() - 0.5) * 600,
      owner: host.playerId,
      damage,
      life: random() * 2,
      enemy: false,
      color: "#eca860",
      attackSkill: "pulse" as const,
      level: 5,
    }));
    const original = structuredClone(g.state),
      latest: (GameState | undefined)[] = [],
      counts = [0, 0, 0, 0],
      logical = [0, 0, 0, 0];
    let measuring = false;
    clients.forEach((socket, index) =>
      socket.on("state", (state: GameState) => {
        if (state.enemies.length !== 150 || state.bullets.length !== 350)
          return;
        latest[index] = state;
        if (measuring) {
          counts[index]++;
          logical[index] += Buffer.byteLength(JSON.stringify(state));
        }
      }),
    );
    await delay(150);
    const ws = clients.map((socket) => (socket.io.engine.transport as any).ws);
    const before = ws.map((socket) => socket._socket.bytesRead);
    measuring = true;
    await delay(900);
    measuring = false;
    const wire = ws.map(
      (socket, index) => socket._socket.bytesRead - before[index],
    );
    console.log(
      "LATE_RUN_TRANSPORT",
      JSON.stringify({
        frames: counts,
        logicalBytes: logical,
        wireBytes: wire,
        ratio: wire.map((n, i) => n / logical[i]),
      }),
    );
    await t.test(
      "compression is negotiated and reduces dense traffic by at least half",
      () => {
        assert.match(ws[0].extensions, /permessage-deflate/);
        assert.ok(
          counts.every((n) => n >= 12),
          "all clients keep receiving fresh snapshots",
        );
        assert.ok(
          wire.slice(0, 3).every((n, i) => n / logical[i] < 0.5),
          "compressed wire size must be below half the decoded snapshot",
        );
      },
    );
    await t.test(
      "clients that disable compression still receive complete state",
      () => {
        assert.equal(ws[3].extensions, "");
        assert.equal(latest[3]?.enemies.length, 150);
        assert.equal(latest[3]?.players.length, 4);
        assert.ok(wire[3] / logical[3] > 0.9);
      },
    );
    await t.test(
      "wire coordinates avoid meaningless float tails with subpixel error only",
      () => {
        const received = latest[0]!;
        assert.ok(received);
        assert.equal(
          received.enemies[0].x,
          Math.round(original.enemies[0].x * 100) / 100,
        );
        for (let i = 0; i < 150; i++) {
          const value = received.enemies[i],
            source = original.enemies[i];
          assert.ok(Math.abs(value.x - source.x) <= 0.00501);
          assert.ok(Math.abs(value.y - source.y) <= 0.00501);
          assert.ok(Math.abs(value.angle - source.angle) <= 0.000051);
          assert.equal(value.hp, source.hp);
          assert.equal(value.windup, source.windup);
        }
        assert.equal(received.bullets[0].damage, damage);
        assert.deepEqual(
          g.state,
          original,
          "serialization must not mutate authoritative state",
        );
      },
    );
    await t.test(
      "acknowledged actions and latency probes remain responsive",
      async () => {
        for (const socket of clients) {
          const start = performance.now();
          await ack(socket, "ping:latency", {});
          assert.ok(performance.now() - start < 1000);
          assert.equal((await ack(socket, "rooms:list", {})).ok, true);
        }
      },
    );
  } finally {
    clients.forEach((socket) => socket.disconnect());
    await app.close();
  }
});
