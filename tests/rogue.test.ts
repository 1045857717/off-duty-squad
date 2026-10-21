import { prepareFixture, startFixture as startGame } from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import { generateWorld, worldBlocked } from "../shared/world";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
  gainExperience,
  chooseUpgrade,
} from "../server/simulation";
import { EMPTY_INPUT } from "../shared/content";
test("procedural worlds are reproducible, large, varied, connected and objectives walkable", () => {
  for (const mode of ["expedition", "survival"] as const) {
    const w = generateWorld(81, mode);
    assert.deepEqual(w, generateWorld(81, mode));
    assert.ok(w.w >= 2560 && w.h >= 1792);
    assert.notDeepEqual(w.tiles, generateWorld(82, mode).tiles);
    const start =
        Math.floor(w.spawn.y / w.tile) * w.cols +
        Math.floor(w.spawn.x / w.tile),
      seen = new Set([start]),
      q = [start];
    for (let i = 0; i < q.length; i++) {
      const n = q[i],
        x = n % w.cols,
        y = Math.floor(n / w.cols);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = ny * w.cols + nx;
        if (
          nx < 0 ||
          nx >= w.cols ||
          ny < 0 ||
          ny >= w.rows ||
          !w.tiles[k] ||
          seen.has(k)
        )
          continue;
        seen.add(k);
        q.push(k);
      }
    }
    for (const p of w.points) {
      assert.equal(worldBlocked(w, p.x, p.y, 20), false);
      assert.ok(
        seen.has(Math.floor(p.y / w.tile) * w.cols + Math.floor(p.x / w.tile)),
      );
    }
  }
});
function game() {
  const g = createGame("ROGUE1", "a", 321);
  addPlayer(g, "a", "同行者", "scout");
  prepareFixture(g);
  startGame(g, "a");
  g.state.enemies = [];
  g.state.spawnCd = 999;
  return g;
}
test("shared XP produces three unique random offers; forged choice rejected and chosen effect applies", () => {
  const g = game();
  const p = g.state.players[0];
  gainExperience(g, 200);
  assert.equal(g.state.level, 2);
  assert.equal(p.offers.length, 3);
  assert.equal(new Set(p.offers.map((o) => o.id)).size, 3);
  assert.equal(chooseUpgrade(g, p.id, "forged"), false);
  const pending = p.pendingUpgrades;
  assert.equal(chooseUpgrade(g, p.id, p.offers[0].id), true);
  assert.equal(p.pendingUpgrades, pending - 1);
});
test("dash is continuous for several simulation steps instead of one-frame teleport", () => {
  const g = game(),
    p = g.state.players[0],
    start = p.x;
  setInput(g, p.id, { ...EMPTY_INPUT, dash: true, x: 1 });
  tickGame(g, 1 / 60);
  assert.ok(p.x - start > 0 && p.x - start < 30);
  const x = p.x;
  setInput(g, p.id, EMPTY_INPUT);
  tickGame(g, 1 / 60);
  assert.ok(p.x > x);
  assert.ok(p.dashTime > 0);
  for (let i = 0; i < 20; i++) tickGame(g, 1 / 60);
  assert.equal(p.dashTime, 0);
});
test("midrun player joins catch up to team level and appears near team without resetting progress", () => {
  const g = game();
  gainExperience(g, 300);
  g.state.coins = 90;
  addPlayer(g, "b", "新同事", "medic");
  const p = g.state.players[1];
  assert.equal(g.state.phase, "playing");
  assert.equal(g.state.coins, 90);
  assert.ok(p.pendingUpgrades > 0);
  assert.ok(
    Math.hypot(p.x - g.state.players[0].x, p.y - g.state.players[0].y) < 150,
  );
  assert.ok(p.invulnerable >= 3);
});
test("survival progresses beyond six stages and scales enemy pressure without ending", () => {
  const g = game();
  g.state.mode = "survival";
  g.state.wave = 12;
  g.state.stageTime = 100;
  g.state.waveEnds = 75;
  g.state.players[0].invulnerable = 1000;
  tickGame(g, 1 / 60);
  assert.ok(g.state.wave >= 13);
  assert.equal(g.state.phase, "playing");
  assert.ok(g.state.breakTime > 0);
});
import { ABILITIES, AUGMENTS, applyAugment } from "../shared/rogue";
import type { Ability } from "../shared/types";
test("all eight random abilities execute safely; each augment changes a real build property", () => {
  for (const ability of Object.keys(ABILITIES) as Ability[]) {
    const g = game(),
      p = g.state.players[0];
    p.ability = ability;
    p.hp = 25;
    g.state.enemies = [
      {
        id: 999,
        kind: "tank",
        x: p.x + 30,
        y: p.y,
        hp: 200,
        maxHp: 200,
        speed: 0,
        cd: 100,
        angle: 0,
        hitFlash: 0,
        windup: 0,
      },
    ];
    setInput(g, p.id, { ...EMPTY_INPUT, skill: true });
    tickGame(g, 1 / 60);
    assert.ok(p.skillCd > 0, ability);
    assert.ok(Number.isFinite(p.hp));
    assert.ok(g.state.effects.length > 0);
  }
  for (const card of AUGMENTS) {
    const g = game(),
      p = g.state.players[0];
    p.offers = [{ ...card }];
    p.pendingUpgrades = 1;
    const before = JSON.stringify(p);
    assert.equal(applyAugment(p, card.id), true, card.id);
    assert.notEqual(JSON.stringify(p), before);
    assert.ok(p.upgrades.includes(card.id));
    assert.ok(p.maxHp > 0 && p.rate > 0 && p.speed > 0);
  }
});
test("infinite director increases pressure and produces attack telegraphs, elite modifiers and random events", () => {
  const g = game();
  g.state.mode = "survival";
  g.state.wave = 18;
  g.state.players[0].invulnerable = 999;
  g.state.spawnCd = 0;
  g.state.eventCd = 0;
  for (let i = 0; i < 240; i++) tickGame(g, 1 / 60);
  assert.ok(g.state.enemies.length >= 10);
  assert.ok(g.state.enemies.some((e) => e.kind !== "mite"));
  assert.notEqual(g.state.event.kind, "none");
  assert.ok(g.state.waveTarget > 20);
});

test("escort drone follows a collision-free path across the generated dungeon until exit", () => {
  const g = game(),
    w = g.state.world,
    p = g.state.players[0];
  p.invulnerable = 999;
  g.state.eventCd = 999;
  g.state.objective = {
    type: "escort",
    target: 100,
    progress: 0,
    done: false,
    relays: [],
    drone: { ...w.spawn, hp: 100, progress: 0 },
  };
  for (let i = 0; i < 15000 && !g.state.objective.done; i++) {
    g.state.enemies = [];
    g.state.spawnCd = 999;
    const d = g.state.objective.drone;
    p.x = d.x;
    p.y = d.y;
    tickGame(g, 1 / 60);
    assert.equal(
      worldBlocked(w, d.x, d.y, 17),
      false,
      `drone embedded at ${d.x},${d.y}`,
    );
  }
  assert.equal(g.state.objective.done, true);
  assert.equal(g.state.exitOpen, true);
});
