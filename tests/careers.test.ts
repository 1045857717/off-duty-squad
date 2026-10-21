import test from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "../shared/content";
import { ROLE_SIGNATURE } from "../shared/arsenal";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
} from "../server/simulation";
import { startFixture, prepareFixture } from "./support";
import { EMPTY_INPUT } from "../shared/content";
import {
  CAREER_CATEGORIES,
  careerCategory,
  skillMetrics,
} from "../shared/careers";
test("24 careers support actual categories and unique abstract signatures", () => {
  assert.equal(Object.keys(ROLES).length, 28);
  assert.equal(new Set(Object.values(ROLE_SIGNATURE)).size, 28);
  assert.equal(CAREER_CATEGORIES.length, 8);
  for (const r of Object.keys(ROLES)) assert.ok(careerCategory(r as any));
  for (const r of [
    "workhorse",
    "blametaker",
    "slacker",
    "intern",
    "duck",
    "deadline",
    "barista",
    "qa",
  ])
    assert.ok(r in ROLES);
});
test("skill UI damage and cooldown match the actual simulation and upgrades", () => {
  for (const role of [
    "scout",
    "engineer",
    "accountant",
    "hr",
    "workhorse",
    "blametaker",
    "intern",
    "duck",
    "deadline",
    "barista",
    "qa",
  ] as const) {
    const g = createGame("C31", "h", 51);
    addPlayer(g, "h", "同事", role);
    startFixture(g, "h");
    const p = g.state.players[0];
    p.arsenal = {};
    p.signatureLevel = 3;
    p.crit = 0;
    g.state.spawnCd = 999;
    g.state.eventCd = 999;
    const e = {
      id: 990,
      kind: "tank" as const,
      x: p.x + 55,
      y: p.y,
      hp: 100000,
      maxHp: 100000,
      speed: 0,
      cd: 999,
      angle: 0,
      hitFlash: 0,
    };
    g.state.enemies = [e];
    const stats = skillMetrics(p);
    assert.ok(stats.damage > 0 && stats.cooldown > 0);
    assert.ok(stats.rows.length >= 3);
    setInput(g, p.id, { ...EMPTY_INPUT, skill: true });
    tickGame(g, 0.016);
    assert.ok(Math.abs(p.skillCd - stats.cooldown) < 0.03, role);
    if (
      [
        "engineer",
        "accountant",
        "workhorse",
        "blametaker",
        "intern",
        "deadline",
        "qa",
      ].includes(role)
    )
      assert.ok(
        Math.abs(100000 - e.hp - stats.damage) < 0.02,
        `${role}: ${100000 - e.hp}/${stats.damage}`,
      );
  }
});
test("abstract support actually heals allies and spawns a timed lure", () => {
  const g = createGame("S31", "h", 31);
  addPlayer(g, "h", "摸鱼", "slacker");
  addPlayer(g, "a", "队友", "scout");
  prepareFixture(g);
  startFixture(g, "h");
  const p = g.state.players[0],
    q = g.state.players[1];
  p.arsenal = {};
  q.x = p.x + 35;
  q.y = p.y;
  q.hp = 20;
  setInput(g, "h", { ...EMPTY_INPUT, skill: true });
  tickGame(g, 0.016);
  assert.ok(q.hp > 20);
  assert.ok(g.state.noises.some((n) => n.label.includes("摸鱼")));
});
