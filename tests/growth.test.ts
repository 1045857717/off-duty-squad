import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  gainExperience,
  tickGame,
} from "../server/simulation";
import { generateOffers } from "../shared/rogue";
import { startFixture } from "./support";
test("non-projectile builds never roll projectile-only upgrades", () => {
  const g = createGame("TREE25", "h", 52);
  addPlayer(g, "h", "测试", "scout");
  startFixture(g, "h");
  const p = g.state.players[0];
  p.arsenal = { orbit: 2 };
  for (let i = 0; i < 200; i++) {
    const cards = generateOffers(g, p);
    assert.ok(
      cards.every((c) => !["multishot", "pierce"].includes(c.id)),
      "unusable projectile card",
    );
    assert.ok(
      cards.every((c) => !c.attackSkill || c.attackSkill === "orbit"),
      "unlocked unrelated branch",
    );
  }
});
test("two-person enemy endurance scales to at least double solo at same seed", () => {
  const spawn = (n: number) => {
    const g = createGame("TEAM25", "h", 52);
    g.state.mode = "survival";
    for (let i = 0; i < n; i++)
      addPlayer(g, i ? "p" + i : "h", "测试", "scout");
    g.state.players.forEach((p) => (p.ready = true));
    startFixture(g, "h");
    g.random = () => 0.5;
    g.state.spawnCd = 0;
    tickGame(g, 0.05);
    return g.state.enemies[0].maxHp;
  };
  assert.ok(spawn(2) >= spawn(1) * 1.95);
});
import {
  attackAvailable,
  ATTACK_BRANCHES,
  augmentAvailable,
} from "../shared/growth";
import { BALANCE, squadPressure, whole, ledger } from "../shared/balance";
test("growth branches unlock only after their parent and squad level; modules cap at four", () => {
  const g = createGame("BRANCH", "h", 7);
  addPlayer(g, "h", "测试", "medic");
  const p = g.state.players[0];
  p.arsenal = { arc: 2 };
  assert.equal(attackAvailable(p, "gravity", 10), false);
  p.arsenal.arc = 3;
  assert.equal(attackAvailable(p, "gravity", 3), false);
  assert.equal(attackAvailable(p, "gravity", 4), true);
  assert.equal(attackAvailable(p, "pulse", 20), false);
  p.arsenal = { arc: 3, gravity: 3, venom: 3, meteor: 3 };
  assert.equal(attackAvailable(p, "flame", 20), false);
  for (let i = 0; i < 100; i++) {
    g.state.level = 8;
    const cards = generateOffers(g, p);
    assert.ok(cards.every((c) => !c.attackSkill || !!p.arsenal[c.attackSkill]));
    assert.ok(cards.every((c) => !!c.growthPath));
  }
});
test("irrelevant support/specialized leaves are excluded and unlock with prerequisites", () => {
  const g = createGame("LEAF25", "h", 7);
  addPlayer(g, "h", "测试", "scout");
  const p = g.state.players[0];
  p.arsenal = { arc: 1 };
  for (const id of [
    "multishot",
    "pierce",
    "orbiting",
    "explosive",
    "guardian",
    "vampire",
    "execution",
  ])
    assert.equal(augmentAvailable(p, id, 1, 1), false, id);
  p.arsenal.pulse = 1;
  assert.equal(augmentAvailable(p, "multishot", 1, 1), true);
  assert.equal(augmentAvailable(p, "pierce", 1, 1), true);
  p.arsenal.blade = 3;
  assert.equal(augmentAvailable(p, "orbiting", 4, 1), true);
  p.arsenal.flame = 3;
  assert.equal(augmentAvailable(p, "explosive", 4, 1), true);
});
test("team pressure uses peak slots, heal drops/parts are scarce and ledger formatting is finite", () => {
  const g = createGame("ECON25", "h", 7);
  addPlayer(g, "h", "测试", "scout");
  startFixture(g, "h");
  g.state.teamPeak = 4;
  assert.equal(squadPressure(g.state).hp, 4);
  assert.ok(squadPressure(g.state).damage > 1);
  g.random = () => 0.05;
  g.state.spawnCd = 999;
  g.state.enemies = Array.from({ length: 30 }, (_, i) => ({
    id: 1000 + i,
    kind: "mite" as const,
    x: 1000,
    y: 1000,
    hp: 0,
    maxHp: 100,
    speed: 0,
    cd: 99,
    angle: 0,
    hitFlash: 0,
  }));
  tickGame(g, 0.01);
  assert.equal(g.state.pickups.filter((p) => p.kind === "heal").length, 0);
  assert.equal(g.state.coins, 30 * BALANCE.normalParts);
  assert.ok(BALANCE.normalParts < 5 && BALANCE.healDrop < 0.1);
  assert.equal(whole(1234.56789), "1,235");
  assert.equal(whole(NaN), "0");
  assert.equal(ledger(0.1 + 0.2), 0.3);
});
import { createServer } from "../server/app";
import { io, type Socket } from "socket.io-client";
test("last human leaving deletes AI room immediately even if watched", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const peers: Socket[] = [];
  const connect = async () => {
    const s = io(`http://127.0.0.1:${(app.http.address() as any).port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    peers.push(s);
    await new Promise<void>((r) => s.once("connect", () => r()));
    return s;
  };
  const ack = (s: Socket, e: string, d: unknown = {}) =>
    new Promise<any>((r) => s.emit(e, d, r));
  try {
    const host = await connect(),
      watcher = await connect();
    const room = await ack(host, "room:create", {
      name: "房主",
      role: "scout",
    });
    await ack(host, "room:options", { botCount: 3 });
    await ack(watcher, "room:watch", { code: room.code, name: "观众" });
    const closed = new Promise<any>((r) => watcher.once("room:closed", r));
    await ack(host, "room:leave");
    assert.equal(app.rooms.has(room.code), false);
    assert.match((await closed).message, /关闭/);
    assert.equal(
      (await ack(host, "rooms:list")).rooms.some(
        (r: any) => r.code === room.code,
      ),
      false,
    );
    assert.equal((await ack(watcher, "chat:send", { text: "测试" })).ok, false);
  } finally {
    peers.forEach((s) => s.disconnect());
    await app.close();
  }
});
test("late join increases existing enemy HP while departure keeps peak pressure", () => {
  const g = createGame("LATE25", "h", 44);
  addPlayer(g, "h", "测试", "scout");
  startFixture(g, "h");
  g.state.spawnCd = 0;
  tickGame(g, 0.05);
  const e = g.state.enemies[0],
    before = e.maxHp;
  e.hp = before * 0.5;
  addPlayer(g, "p", "队友", "medic");
  assert.equal(e.maxHp, before * 2);
  assert.equal(e.hp, before);
  assert.equal(g.state.teamPeak, 2);
});
