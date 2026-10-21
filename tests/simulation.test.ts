import { prepareFixture, startFixture as startGame } from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
  chooseUpgrade,
  removePlayer,
  restartGame,
  rescueCall,
} from "../server/simulation";
import { EMPTY_INPUT } from "../shared/content";
import { worldBlocked } from "../shared/world";
function playing() {
  const g = createGame("ABC123", "p1", 42);
  addPlayer(g, "p1", "同行者", "scout");
  prepareFixture(g);
  startGame(g, "p1");
  g.state.enemies = [];
  g.state.spawnCd = 999;
  return g;
}
test("only host starts a nonempty room; capacity and identity limits hold", () => {
  const g = createGame("ABC123", "p1");
  assert.equal(startGame(g, "p1"), false);
  for (let i = 1; i <= 4; i++)
    assert.ok(addPlayer(g, "p" + i, "同事", "medic"));
  assert.equal(addPlayer(g, "p5", "多余", "medic"), false);
  assert.equal(addPlayer(g, "p1", "重复", "medic"), false);
  assert.equal(startGame(g, "p2"), false);
  prepareFixture(g);
  assert.equal(startGame(g, "p1"), true);
});
test("diagonal normalization and generated-world collision preserve playable space", () => {
  const g = playing(),
    p = g.state.players[0],
    x = p.x,
    y = p.y;
  setInput(g, p.id, { ...EMPTY_INPUT, x: 1, y: 1 });
  tickGame(g, 0.05);
  assert.ok(Math.abs(Math.hypot(p.x - x, p.y - y) - p.speed * 0.05) < 0.01);
  for (let i = 0; i < 500; i++) tickGame(g, 1 / 60);
  assert.equal(worldBlocked(g.state.world, p.x, p.y, 14), false);
});
test("invalid input cannot poison the authoritative world", () => {
  const g = playing();
  setInput(g, "p1", {
    x: NaN,
    y: Infinity,
    aimX: Infinity,
    aimY: NaN,
    fire: true,
  } as any);
  tickGame(g, 1 / 60);
  assert.ok(
    g.state.players.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  );
  assert.ok(g.state.bullets.every((b) => Number.isFinite(b.vx)));
});
test("disconnected players stop, and fully disconnected games pause", () => {
  const g = playing(),
    p = g.state.players[0];
  setInput(g, p.id, { ...EMPTY_INPUT, x: 1 });
  p.connected = false;
  const x = p.x,
    t = g.state.elapsed;
  tickGame(g, 0.05);
  assert.equal(p.x, x);
  assert.equal(g.state.elapsed, t);
  assert.equal(g.state.phase, "playing");
});
test("bullet damage credits a kill once and crystals unlock the generated exit", () => {
  const g = playing(),
    p = g.state.players[0];
  g.state.enemies.push({
    id: 999,
    kind: "mite",
    x: p.x + 45,
    y: p.y,
    hp: 5,
    maxHp: 5,
    speed: 0,
    cd: 100,
    angle: 0,
    hitFlash: 0,
  });
  setInput(g, p.id, { ...EMPTY_INPUT, fire: true });
  for (let i = 0; i < 12; i++) tickGame(g, 1 / 60);
  assert.equal(p.kills, 1);
  assert.equal(g.state.stats.kills, 1);
  g.state.objective.target = 1;
  g.state.pickups = [{ id: 1999, kind: "crystal", x: p.x, y: p.y }];
  tickGame(g, 1 / 60);
  assert.equal(g.state.exitOpen, true);
  assert.equal(g.state.objective.progress, 1);
});
test("random mend ability heals and respects cooldown; downed teammate can be rescued with E", () => {
  const g = playing();
  addPlayer(g, "p2", "军医", "medic");
  const [p, m] = g.state.players;
  m.x = p.x + 25;
  m.y = p.y;
  m.ability = "mend";
  p.hp = 20;
  setInput(g, m.id, { ...EMPTY_INPUT, skill: true });
  tickGame(g, 1 / 60);
  const hp = p.hp;
  assert.ok(hp > 20);
  tickGame(g, 1 / 60);
  assert.equal(p.hp, hp);
  assert.ok(m.skillCd > 0);
  p.hp = 0;
  p.alive = false;
  p.downTime = 80;
  setInput(g, m.id, { ...EMPTY_INPUT, interact: true });
  for (let i = 0; i < 180; i++) tickGame(g, 1 / 60);
  assert.equal(p.alive, true);
  assert.equal(g.state.stats.rescued, 1);
});
test("all downed loses; host can restart while mode and spectators survive", () => {
  const g = playing();
  g.state.mode = "survival";
  g.state.spectators = [{ id: "s", name: "观众", connected: true }];
  g.state.players[0].alive = false;
  g.state.players[0].hp = 0;
  tickGame(g, 1 / 60);
  assert.equal(g.state.phase, "lost");
  assert.equal(restartGame(g, "stranger"), false);
  assert.equal(restartGame(g, "p1"), true);
  assert.equal(g.state.mode, "survival");
  assert.equal(g.state.spectators.length, 1);
  assert.equal(g.state.phase, "lobby");
});
test("rescue ping is only available to downed players and is rate limited", () => {
  const g = playing(),
    p = g.state.players[0];
  assert.equal(rescueCall(g, p.id), false);
  p.alive = false;
  p.hp = 0;
  assert.equal(rescueCall(g, p.id), true);
  assert.equal(rescueCall(g, p.id), false);
  assert.equal(g.state.rescuePing?.name, p.name);
});
test("six expedition chapters rebuild seeds, gate by exit and finish only after sixth extraction", () => {
  const g = playing();
  let seed = g.state.world.seed;
  for (let stage = 0; stage < 6; stage++) {
    const p = g.state.players[0];
    assert.equal(g.state.mission, stage);
    g.state.enemies = [];
    g.state.objective.progress = g.state.objective.target;
    g.state.objective.done = true;
    p.invulnerable = 999;
    tickGame(g, 1 / 60);
    p.x = g.state.world.exit.x;
    p.y = g.state.world.exit.y;
    setInput(g, p.id, EMPTY_INPUT);
    for (let i = 0; i < 100; i++) tickGame(g, 1 / 60);
    if (stage < 5) {
      assert.equal(g.state.phase, "upgrade");
      assert.ok(p.offers.length);
      assert.equal(chooseUpgrade(g, p.id, p.offers[0].id), true);
      for (let i = 0; i < 500 && g.state.phase === "upgrade"; i++)
        tickGame(g, 1 / 60);
      assert.equal(g.state.phase, "playing");
      assert.notEqual(g.state.world.seed, seed);
      seed = g.state.world.seed;
    } else assert.equal(g.state.phase, "won");
  }
});
test("telegraphed melee waits before damaging and shields absorb before health", () => {
  const g = playing(),
    p = g.state.players[0];
  p.invulnerable = 0;
  p.shield = 40;
  g.state.enemies = [
    {
      id: 999,
      kind: "tank",
      x: p.x + 35,
      y: p.y,
      hp: 500,
      maxHp: 500,
      speed: 0,
      cd: 0,
      angle: 0,
      hitFlash: 0,
      windup: 0,
    },
  ];
  tickGame(g, 1 / 60);
  assert.equal(p.hp, p.maxHp);
  assert.ok(g.state.enemies[0].windup! > 0);
  for (let i = 0; i < 65; i++) tickGame(g, 1 / 60);
  assert.ok(p.shield < 40);
  assert.equal(p.hp, p.maxHp);
});
test("host leaves transfer ownership; interaction faster for engineer", () => {
  const g = playing();
  addPlayer(g, "p2", "工程师", "engineer");
  const [a, b] = g.state.players;
  g.state.objective = {
    type: "relay",
    target: 1,
    progress: 0,
    done: false,
    relays: [{ x: a.x, y: a.y, active: false, charge: 0 }],
    drone: { x: a.x, y: a.y, hp: 100, progress: 0 },
  };
  b.x = a.x + 15;
  b.y = a.y;
  setInput(g, a.id, { ...EMPTY_INPUT, interact: true });
  tickGame(g, 0.05);
  const normal = g.state.objective.relays[0].charge;
  g.state.objective.relays[0].charge = 0;
  setInput(g, a.id, EMPTY_INPUT);
  setInput(g, b.id, { ...EMPTY_INPUT, interact: true });
  tickGame(g, 0.05);
  assert.ok(g.state.objective.relays[0].charge > normal);
  removePlayer(g, a.id);
  assert.equal(g.state.host, b.id);
});
