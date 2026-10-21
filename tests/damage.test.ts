import { prepareFixture, startFixture as startGame } from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
} from "../server/simulation";
import { EMPTY_INPUT } from "../shared/content";
import { rankDamage } from "../shared/ranking";
function setup() {
  const g = createGame("DAMAGE", "a", 13);
  addPlayer(g, "a", "游侠", "scout");
  addPlayer(g, "b", "工程师", "engineer");
  g.state.players[1].ready = true;
  prepareFixture(g);
  startGame(g, "a");
  g.state.enemies = [];
  g.state.spawnCd = 100;
  return g;
}
test("damage board records effective bullet damage, not overkill, with attacker ownership", () => {
  const g = setup();
  const [a, b] = g.state.players;
  b.x = 220;
  b.y = a.y;
  g.state.enemies.push({
    id: 999,
    kind: "mite",
    x: 165,
    y: a.y,
    hp: 7,
    maxHp: 42,
    speed: 0,
    cd: 100,
    angle: 0,
    hitFlash: 0,
  });
  setInput(g, "b", { ...EMPTY_INPUT, aimX: -1, fire: true });
  for (let i = 0; i < 15; i++) tickGame(g, 1 / 60);
  assert.equal(b.damageDealt, 7);
  assert.equal(a.damageDealt, 0);
  assert.equal(b.kills, 1);
  assert.ok(g.state.effects.some((e) => e.amount === 7 && e.owner === "b"));
});
test("area skill credits actual damage to each target exactly once", () => {
  const g = setup();
  const p = g.state.players[1];
  p.ability = "nova";
  for (let i = 0; i < 2; i++)
    g.state.enemies.push({
      id: 999 + i,
      kind: "mite",
      x: p.x + 30 + i * 20,
      y: p.y,
      hp: 5 + i * 5,
      maxHp: 42,
      speed: 0,
      cd: 100,
      angle: 0,
      hitFlash: 0,
    });
  setInput(g, p.id, { ...EMPTY_INPUT, skill: true });
  tickGame(g, 1 / 60);
  assert.equal(p.damageDealt, 15);
  assert.equal(p.kills, 2);
  tickGame(g, 1 / 60);
  assert.equal(p.damageDealt, 15);
});
test("damage rankings sort by damage, then kills, and report shares without NaN", () => {
  const g = setup();
  const [a, b] = g.state.players;
  assert.deepEqual(
    rankDamage(g.state.players).map((r) => r.share),
    [0, 0],
  );
  a.damageDealt = 30;
  b.damageDealt = 70;
  assert.equal(rankDamage(g.state.players)[0].player.id, "b");
  assert.equal(rankDamage(g.state.players)[0].share, 70);
  a.damageDealt = 70;
  a.kills = 2;
  assert.equal(rankDamage(g.state.players)[0].player.id, "a");
});

test("each hit emits a unique numeric visual event even against the same enemy", () => {
  const g = setup();
  g.state.players = g.state.players.slice(0, 1);
  const p = g.state.players[0];
  g.state.enemies = [
    {
      id: 999,
      kind: "mite",
      x: p.x + 70,
      y: p.y,
      hp: 1000,
      maxHp: 1000,
      speed: 0,
      cd: 100,
      angle: 0,
      hitFlash: 0,
    },
  ];
  setInput(g, p.id, { ...EMPTY_INPUT, fire: true, aimX: 1 });
  const ids = new Set<number>();
  for (let i = 0; i < 110; i++) {
    tickGame(g, 1 / 60);
    for (const e of g.state.effects)
      if (e.amount) {
        assert.equal(typeof e.id, "number");
        ids.add(e.id);
      }
  }
  assert.ok(ids.size >= 3, `hit event ids: ${[...ids]}`);
});
