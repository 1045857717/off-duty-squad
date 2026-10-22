import { startFixture as startGame, prepareFixture } from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  chooseUpgrade,
  gainExperience,
  setInput,
  tickGame,
} from "../server/simulation";
import { applyAugment, generateOffers } from "../shared/rogue";
import { EMPTY_INPUT } from "../shared/content";
test("host starts ready, attack offers remain hidden before deployment", () => {
  const g = createGame("ARSENA", "p", 2);
  addPlayer(g, "p", "房主", "scout");
  assert.equal(g.state.players[0].ready, true);
  assert.equal(g.state.players[0].offers.length, 0);
});
test("a drafted attack adds and upgrades itself without replacing the role signature", () => {
  const g = createGame("ARSENA", "p", 2);
  addPlayer(g, "p", "房主", "medic");
  const p = g.state.players[0];
  assert.equal(p.ability, "mend");
  assert.equal(Object.keys(p.arsenal).length, 0);
  g.state.phase = "draft";
  p.pendingUpgrades = 1;
  p.offers = [attackOffer(p, "pulse")];
  const first = p.offers[0];
  assert.ok(first.attackSkill);
  assert.equal(chooseUpgrade(g, "p", first.id), true);
  assert.equal(p.arsenal[first.attackSkill!], 1);
  p.ready = true;
  assert.equal(g.state.phase, "playing");
  gainExperience(g, 250);
  assert.ok(p.offers.some((c) => c.attackSkill === first.attackSkill));
  p.upgradeCd = 0;
  const card = p.offers.find((c) => c.attackSkill === first.attackSkill)!;
  assert.equal(chooseUpgrade(g, "p", card.id), true);
  assert.equal(p.arsenal[first.attackSkill!], 2);
  assert.equal(p.ability, "mend");
});
test("a player without random modules still has an ordinary attack with anticipation", () => {
  const g = createGame("ARSENA", "p", 2);
  addPlayer(g, "p", "房主", "scout");
  const p = g.state.players[0];
  g.state.phase = "playing";
  g.state.spawnCd = 999;
  setInput(g, p.id, { ...EMPTY_INPUT, fire: true });
  tickGame(g, 1 / 60);
  assert.ok(p.attackSeq > 0);
  assert.equal(g.state.bullets.length, 0);
  for (let frame = 0; frame < 20; frame++) tickGame(g, 1 / 60);
  assert.ok(g.state.bullets.some((b) => !b.enemy));
});
import { ATTACK_IDS, attackOffer, ROLE_SIGNATURE } from "../shared/arsenal";
import { gameKeyAction } from "../src/game/inputKeys";
test("all twelve attack modules cause real damage and upgrading preserves other modules", () => {
  for (const id of ATTACK_IDS) {
    const g = createGame("ATK123", "p", 12);
    addPlayer(g, "p", "测试", "scout");
    const p = g.state.players[0];
    p.ready = true;
    startGame(g, p.id);
    p.arsenal = { [id]: 1 };
    p.attackCooldowns = {};
    p.invulnerable = 999;
    g.state.spawnCd = 999;
    g.state.eventCd = 999;
    g.state.enemies = [
      {
        id: 999,
        kind: "tank",
        x: p.x + 55,
        y: p.y,
        hp: 10000,
        maxHp: 10000,
        speed: 0,
        cd: 99,
        angle: 0,
        hitFlash: 0,
      },
    ];
    setInput(g, p.id, { ...EMPTY_INPUT, fire: true });
    for (let i = 0; i < 70; i++) tickGame(g, 1 / 60);
    assert.ok(p.damageDealt > 0, id + ": no damage");
    const ability = p.ability;
    p.upgradeCd = 0;
    p.offers = [attackOffer(p, id)];
    p.pendingUpgrades = 1;
    chooseUpgrade(g, p.id, p.offers[0].id);
    assert.equal(p.arsenal[id], 2);
    p.upgradeCd = 0;
    p.offers = [attackOffer(p, id === "arc" ? "pulse" : "arc")];
    p.pendingUpgrades = 1;
    chooseUpgrade(g, p.id, p.offers[0].id);
    assert.equal(p.arsenal[id], 2);
    assert.equal(p.ability, ability);
  }
});
test("role skill identity is deterministic for all roles and attack offers never replace Q", () => {
  for (const [role, ability] of Object.entries(ROLE_SIGNATURE)) {
    const g = createGame("ROLE23", "p", 80);
    addPlayer(g, "p", "测试", role as any);
    const p = g.state.players[0];
    assert.equal(p.ability, ability);
    for (let i = 0; i < 120; i++) {
      p.offers = generateOffers(g, p);
      assert.ok(p.offers.every((o) => !o.ability));
      applyAugment(p, p.offers[0].id);
      assert.equal(p.ability, ability);
    }
  }
});
test("physical keys avoid Shift by default and composition cannot send Q or draft actions", () => {
  assert.equal(gameKeyAction({ code: "ShiftLeft" }), "ignore");
  assert.equal(gameKeyAction({ code: "KeyR" }), "dash");
  assert.equal(gameKeyAction({ code: "Space" }), "dash");
  assert.equal(gameKeyAction({ code: "ShiftLeft" }, true), "dash");
  assert.equal(gameKeyAction({ code: "KeyR", repeat: true }), "ignore");
  assert.equal(gameKeyAction({ code: "KeyQ", isComposing: true }), "ignore");
  assert.equal(gameKeyAction({ code: "KeyD", keyCode: 229 }), "ignore");
  assert.equal(gameKeyAction({ code: "KeyD" }), "hold");
});
import { createServer } from "../server/app";
import { io, type Socket } from "socket.io-client";
import { draftSocket } from "./support";
test("only lobby host may kick, invalidating removed identity and freeing a real slot", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const clients: Socket[] = [];
  const connect = async () => {
    const s = io(`http://127.0.0.1:${(app.http.address() as any).port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    clients.push(s);
    await new Promise<void>((r) => s.once("connect", () => r()));
    return s;
  };
  const ack = (s: Socket, e: string, d: unknown = {}) =>
    new Promise<any>((r) => s.emit(e, d, r));
  try {
    const host = await connect(),
      guest = await connect(),
      watcher = await connect();
    const r = await ack(host, "room:create", { name: "房主", role: "scout" });
    const j = await ack(guest, "room:join", {
      code: r.code,
      name: "队友",
      role: "medic",
    });
    await ack(watcher, "room:watch", { code: r.code, name: "旁观" });
    assert.equal(
      (await ack(guest, "room:kick", { playerId: r.playerId })).ok,
      false,
    );
    assert.equal(
      (await ack(watcher, "room:kick", { playerId: j.playerId })).ok,
      false,
    );
    assert.equal(
      (await ack(host, "room:kick", { playerId: r.playerId })).ok,
      false,
    );
    assert.equal(
      (await ack(host, "room:kick", { playerId: j.playerId })).ok,
      true,
    );
    assert.equal(app.rooms.get(r.code)!.state.players.length, 1);
    assert.equal(
      (await ack(guest, "room:resume", { token: j.token })).ok,
      false,
    );
    assert.equal((await ack(guest, "player:ready", { ready: true })).ok, false);
    await draftSocket(host, app.rooms.get(r.code)!, r.playerId);
    assert.equal((await ack(host, "game:start")).ok, true);
    assert.equal(
      (await ack(host, "room:kick", { playerId: j.playerId })).ok,
      false,
    );
  } finally {
    clients.forEach((s) => s.disconnect());
    await app.close();
  }
});
test("capped attributes never occupy random offers and multishot benefits every projectile module", () => {
  const g = createGame("CAP123", "p", 91);
  addPlayer(g, "p", "测试", "scout");
  const p = g.state.players[0];
  p.rate = 0.065;
  p.cooldownScale = 0.3;
  p.projectiles = 7;
  p.speed = 390;
  p.upgrades = Array(12).fill("speed");
  for (let i = 0; i < 100; i++) {
    const offers = generateOffers(g, p);
    assert.ok(
      offers.every(
        (o) => !["rate", "cooldown", "multishot", "speed"].includes(o.id),
      ),
      "capped card offered",
    );
  }
  for (const id of ["pulse", "frost", "blade", "drone", "seeker"] as const) {
    const counts = [];
    for (const projectiles of [1, 2]) {
      const game = createGame("FAN123", "p", 10);
      addPlayer(game, "p", "测试", "scout");
      const player = game.state.players[0];
      player.ready = true;
      startGame(game, "p");
      player.arsenal = { [id]: 1 };
      player.attackCooldowns = {};
      player.basicCd = 999;
      game.state.spawnCd = 999;
      player.projectiles = projectiles;
      setInput(game, "p", { ...EMPTY_INPUT, fire: true });
      for (let frame = 0; frame < 16; frame++) tickGame(game, 1 / 60);
      counts.push(game.state.bullets.length);
    }
    assert.ok(counts[1] > counts[0], id + " multishot ignored");
  }
});
