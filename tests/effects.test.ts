import { prepareFixture, startFixture as startGame } from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
} from "../server/simulation";
import { ABILITIES } from "../shared/rogue";
import { EMPTY_INPUT } from "../shared/content";
import { isBlastWarning } from "../shared/effects";
import type { Ability, EnemyKind, Effect } from "../shared/types";
function game() {
  const g = createGame("FX1234", "p", 41);
  addPlayer(g, "p", "测试", "scout");
  prepareFixture(g);
  startGame(g, "p");
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.players[0].invulnerable = 999;
  return g;
}
test("all eight skills carry exact visual identity and facing to clients", () => {
  for (const ability of Object.keys(ABILITIES) as Ability[]) {
    const g = game(),
      p = g.state.players[0];
    p.ability = ability;
    setInput(g, p.id, { ...EMPTY_INPUT, skill: true, aimX: 0, aimY: 1 });
    tickGame(g, 1 / 60);
    const effect = g.state.effects.find((e) => e.ability === ability);
    assert.ok(effect, ability);
    assert.ok(Math.abs(effect.angle! - Math.PI / 2) < 0.01);
    assert.equal(effect.color, ABILITIES[ability].color);
  }
});
test("only bomber windup is eligible for hostile ground marker; other attack animations remain", () => {
  for (const kind of [
    "mite",
    "hound",
    "shooter",
    "tank",
    "boss",
    "bomber",
    "wraith",
  ] as EnemyKind[]) {
    const e = {
      id: 1,
      x: 1,
      y: 1,
      kind: "attack",
      color: "#f00",
      life: 0.5,
      maxLife: 0.5,
      size: 118,
      enemyKind: kind,
      warning: true,
    } as Effect;
    assert.equal(isBlastWarning(e), kind === "bomber");
    e.warning = false;
    assert.equal(isBlastWarning(e), false);
  }
});
test("bomber blast warning and damage are centered on the bomber, not player target", () => {
  const g = game(),
    p = g.state.players[0];
  g.state.enemies = [
    {
      id: 999,
      kind: "bomber",
      x: p.x + 50,
      y: p.y,
      hp: 100,
      maxHp: 100,
      speed: 0,
      cd: 0,
      angle: 0,
      hitFlash: 0,
      windup: 0,
    },
  ];
  tickGame(g, 1 / 60);
  const warning = g.state.effects.find(isBlastWarning)!;
  assert.ok(warning);
  assert.equal(warning.toX, g.state.enemies[0].x);
  assert.equal(warning.toY, g.state.enemies[0].y);
});
