import test from "node:test";
import assert from "node:assert/strict";
import { ROLES, EMPTY_INPUT } from "../shared/content";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
} from "../server/simulation";
import { startFixture, prepareFixture } from "./support";
import { skillMetrics, careerCategory } from "../shared/careers";
test("capitalist parody jobs have independent Qs, real damage and shared readable stats", () => {
  const abilities = new Set();
  for (const role of ["director", "investor", "ppt", "landlord"] as const) {
    const g = createGame("CAP32", "h", 71);
    addPlayer(g, "h", "老板", role);
    startFixture(g, "h");
    const p = g.state.players[0];
    p.arsenal = {};
    p.crit = 0;
    g.state.spawnCd = 999;
    g.state.eventCd = 999;
    g.state.enemies = [
      {
        id: 999,
        kind: "tank",
        hp: 99999,
        maxHp: 99999,
        x: p.x + 50,
        y: p.y,
        speed: 0,
        angle: 0,
        cd: 999,
        hitFlash: 0,
      },
    ];
    const m = skillMetrics(p);
    assert.ok(m.damage > 0);
    setInput(g, "h", { ...EMPTY_INPUT, skill: true });
    tickGame(g, 0.02);
    assert.ok(p.skillCd > 0);
    assert.ok(g.state.enemies[0].hp < 99999 || g.state.bullets.length);
    assert.equal(careerCategory(role), "capital");
    abilities.add(p.ability);
  }
  assert.equal(abilities.size, 4);
  assert.equal(Object.keys(ROLES).length, 28);
});

test("bonus event raises actual movement and fire cadence then expires cleanly", () => {
  function sample(bonus: boolean) {
    const g = createGame("BONUS", "h", 1);
    addPlayer(g, "h", "打工人", "scout");
    startFixture(g, "h");
    const p = g.state.players[0];
    g.state.enemies = [];
    g.state.spawnCd = 999;
    g.state.eventCd = 999;
    p.arsenal = { pulse: 1 };
    p.attackCooldowns = {};
    if (bonus)
      g.state.event = {
        kind: "bonus",
        name: "老板不在",
        desc: "爽刷",
        remaining: 16,
      };
    const x = p.x;
    setInput(g, "h", { ...EMPTY_INPUT, x: 1, fire: true });
    tickGame(g, 0.05);
    return { distance: p.x - x, cd: p.attackCooldowns.pulse || 0, g, p };
  }
  const normal = sample(false),
    bonus = sample(true);
  assert.ok(bonus.distance > normal.distance * 1.15);
  assert.ok(bonus.cd < normal.cd * 0.7);
  bonus.g.state.event.remaining = 0.01;
  tickGame(bonus.g, 0.05);
  assert.equal(bonus.g.state.event.kind, "none");
});
