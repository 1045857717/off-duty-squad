import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
  restartGame,
} from "../server/simulation";
import { ROLES, EMPTY_INPUT } from "../shared/content";
import type { Role } from "../shared/types";
import { startFixture } from "./support";
import { ATTACK_MOTIONS } from "../shared/combatProfiles";
const basicFixture = (role: Role) => {
  const g = createGame("BASIC1", "p", 41);
  addPlayer(g, "p", "普攻测试", role);
  startFixture(g, "p");
  const p = g.state.players[0];
  p.arsenal = {};
  p.attackCooldowns = {};
  p.fireCd = 0;
  p.invulnerable = 999;
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.enemies = [
    {
      id: 999,
      kind: "tank",
      x: p.x + 58,
      y: p.y,
      hp: 100000,
      maxHp: 100000,
      speed: 0,
      cd: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  setInput(g, p.id, { ...EMPTY_INPUT, fire: true });
  return { g, p };
};
test("all28 professions have a damaging ordinary attack independent of random modules and Q", () => {
  for (const role of Object.keys(ROLES) as Role[]) {
    const { g, p } = basicFixture(role);
    const signature = p.ability;
    for (let i = 0; i < 70; i++) tickGame(g, 1 / 60);
    assert.ok(p.attackSeq > 0, role + ": no ordinary animation");
    assert.ok(p.damageDealt > 0, role + ": no ordinary damage");
    assert.deepEqual(
      p.arsenal,
      {},
      role + ": ordinary attack consumes module slot",
    );
    assert.equal(p.ability, signature);
  }
});
test("ordinary attack has visible anticipation before damage and owns its continuous action", () => {
  const { g, p } = basicFixture("guardian");
  tickGame(g, 1 / 60);
  assert.equal((p.attackMotion as any)?.source, "basic");
  const at = p.attackMotion!.at,
    seq = p.attackMotion!.seq;
  assert.equal(p.damageDealt, 0);
  for (let i = 0; i < 4; i++) tickGame(g, 1 / 60);
  assert.equal(p.damageDealt, 0);
  assert.equal(p.attackMotion!.at, at);
  assert.equal(p.attackMotion!.seq, seq);
  for (let i = 0; i < 25; i++) tickGame(g, 1 / 60);
  assert.ok(p.damageDealt > 0);
});
test("four modules cannot overwrite an active ordinary windup and startup survives module removal", () => {
  const { g, p } = basicFixture("scout");
  p.arsenal = { pulse: 1, bat: 1, orbit: 1, meteor: 1 };
  tickGame(g, 1 / 60);
  const motion = { ...p.attackMotion };
  assert.equal((motion as any).source, "basic");
  for (let i = 0; i < 4; i++) tickGame(g, 1 / 60);
  assert.equal(p.attackMotion!.seq, motion.seq);
  assert.equal(p.attackMotion!.at, motion.at);
  p.arsenal = {};
  for (let i = 0; i < 75; i++) tickGame(g, 1 / 60);
  assert.ok(p.damageDealt > 0);
  assert.ok((p as any).basicCd >= 0);
});
test("ordinary attacks remain available after restart, late joining and AI creation", () => {
  const { g, p } = basicFixture("medic");
  g.state.phase = "lost";
  assert.equal(restartGame(g, p.id), true);
  const next = g.state.players[0];
  assert.ok((next as any).basicCd >= 0);
  g.state.phase = "playing";
  addPlayer(g, "late", "中途工友", "cleaner");
  addPlayer(g, "ai", "电子牛马", "workhorse", true);
  for (const player of g.state.players)
    assert.ok((player as any).basicCd >= 0, player.role);
  assert.ok(ATTACK_MOTIONS.bat.duration >= 380);
});
