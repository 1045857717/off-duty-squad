import { draftSocket } from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
import { gainExperience } from "../server/simulation";
import { ScoreStore } from "../server/scores";
const ack = (s: Socket, event: string, data: unknown = {}) =>
  new Promise<any>((r) => s.emit(event, data, r));
const wait = (s: Socket, event: string) =>
  new Promise<any>((r) => s.once(event, r));
test("public discovery, all-room spectators, chat, late join, XP catchup, rescue and server rankings persist", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "abyss-test-")),
    server = createServer({ dataDir: dir });
  await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.http.address() as any).port}`,
    sockets: Socket[] = [];
  const connect = async () => {
    const s = io(url, { transports: ["websocket"], forceNew: true });
    sockets.push(s);
    await wait(s, "connect");
    return s;
  };
  try {
    const host = await connect(),
      watcher = await connect(),
      late = await connect();
    const created = await ack(host, "room:create", {
      name: "房主",
      role: "scout",
      mode: "survival",
      difficulty: "nightmare",
      squadName: "测试小队",
    });
    assert.ok(created.ok);
    const list = await ack(watcher, "rooms:list");
    assert.equal(list.rooms[0].mode, "survival");
    await draftSocket(host, server.rooms.get(created.code)!, created.playerId);
    await ack(host, "game:start");
    const g = server.rooms.get(created.code)!;
    while (g.state.phase !== "playing")
      await new Promise((r) => setTimeout(r, 20));
    gainExperience(g, 300);
    const watched = await ack(watcher, "room:watch", {
      code: created.code,
      name: "观众",
    });
    assert.ok(watched.spectator);
    assert.equal(
      (
        await ack(watcher, "game:upgrade", {
          id: g.state.players[0].offers[0].id,
        })
      ).ok,
      false,
    );
    assert.equal((await ack(watcher, "game:start")).ok, false);
    const chatWait = wait(host, "chat");
    assert.equal(
      (await ack(watcher, "chat:send", { text: "观察到右侧有敌人 <script>" }))
        .ok,
      true,
    );
    const chat = await chatWait;
    assert.equal(chat.spectator, true);
    assert.ok(chat.text.includes("<script>"));
    const joined = await ack(late, "room:join", {
      code: created.code,
      name: "中途加入",
      role: "medic",
    });
    assert.equal(joined.ok, true);
    const p = g.state.players.find((p) => p.id === joined.playerId)!;
    assert.ok(p.pendingUpgrades >= 2);
    assert.ok(p.offers.length === 3);
    p.alive = false;
    p.hp = 0;
    p.downTime = 60;
    assert.equal((await ack(late, "player:rescue")).ok, true);
    assert.equal((await ack(late, "player:rescue")).ok, false);
    assert.equal(g.state.rescuePing?.name, "中途加入");
    g.state.elapsed = 120;
    g.state.wave = 9;
    g.state.stats.kills = 130;
    g.state.players.forEach((p) => {
      p.alive = false;
      p.hp = 0;
    });
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(g.state.phase, "lost");
    const rankings = await ack(watcher, "scores:list", {
      mode: "survival",
      difficulty: "nightmare",
    });
    assert.equal(rankings.scores.length, 1);
    assert.equal(rankings.scores[0].squadName, "测试小队");
    assert.equal(new ScoreStore(dir).list("survival", "nightmare").length, 1);
    assert.equal(new ScoreStore(dir).list("expedition").length, 0);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
