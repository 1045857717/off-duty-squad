import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  startGame,
  tickGame,
  chooseUpgrade,
  gainExperience,
} from "../server/simulation";
test("host launches without preparing, offers stay hidden until countdown enters map draft", () => {
  const g = createGame("LAUNCH", "h", 71);
  addPlayer(g, "h", "房主", "scout");
  addPlayer(g, "p", "队友", "medic");
  const p = g.state.players[1];
  assert.equal(g.state.players[0].offers.length, 0);
  p.ready = true;
  assert.equal(startGame(g, "h"), true);
  assert.equal(g.state.phase, "countdown");
  for (let i = 0; i < 190; i++) tickGame(g, 1 / 60);
  assert.equal(g.state.phase, "draft");
  assert.equal(g.state.elapsed, 0);
  assert.equal(g.state.enemies.length, 0);
  for (const p of g.state.players) assert.equal(p.offers.length, 3);
  const first = g.state.players[0];
  chooseUpgrade(g, first.id, first.offers[0].id);
  assert.equal(g.state.phase, "draft");
  chooseUpgrade(g, p.id, p.offers[0].id);
  assert.equal(g.state.phase, "playing");
});
test("huge XP grant advances at most one level immediately and banks overflow", () => {
  const g = createGame("SLOWXP", "h", 71);
  addPlayer(g, "h", "房主", "scout");
  gainExperience(g, 50000);
  assert.equal(g.state.level, 2);
  assert.ok(g.state.xp > 1000);
  gainExperience(g, 1);
  assert.equal(g.state.level, 2);
});
import { cancelLaunch, setInput } from "../server/simulation";
import { startFixture } from "./support";
import { EMPTY_INPUT } from "../shared/content";
import { attackStats } from "../shared/arsenal";
test("unready during countdown cancels without revealing a new draft", () => {
  const g = createGame("CANCEL", "h", 21);
  addPlayer(g, "h", "房主", "scout");
  addPlayer(g, "p", "队友", "medic");
  g.state.players[1].ready = true;
  assert.ok(startGame(g, "h"));
  tickGame(g, 0.08);
  g.state.players[1].ready = false;
  tickGame(g, 0.08);
  assert.equal(g.state.phase, "lobby");
  assert.ok(g.state.players.every((p) => !p.offers.length));
  assert.equal(startGame(g, "h"), false);
});
test("orbital range persists without attack input, poison remains for its actual lifetime", () => {
  const g = createGame("AREAS1", "h", 21);
  addPlayer(g, "h", "房主", "scout");
  startFixture(g, "h");
  const p = g.state.players[0];
  p.arsenal = { orbit: 4, venom: 1 };
  p.invulnerable = 999;
  g.state.spawnCd = 999;
  g.state.enemies = [
    {
      id: 999,
      kind: "tank",
      x: p.x + 50,
      y: p.y,
      hp: 10000,
      maxHp: 10000,
      speed: 0,
      cd: 99,
      angle: 0,
      hitFlash: 0,
    },
  ];
  tickGame(g, 0.05);
  assert.ok(g.state.areas.find((a) => a.kind === "orbit"));
  assert.equal(g.state.areas[0].radius, attackStats("orbit", 4).radius + 25);
  assert.ok(p.damageDealt > 0);
  setInput(g, p.id, { ...EMPTY_INPUT, fire: true });
  for (let frame = 0; frame < 4; frame++) tickGame(g, 0.05);
  assert.ok(g.state.areas.find((a) => a.kind === "venom"));
  setInput(g, p.id, EMPTY_INPUT);
  for (let i = 0; i < 20; i++) tickGame(g, 0.05);
  assert.ok(g.state.areas.some((a) => a.kind === "venom" && a.life > 2));
});
test("E channel reports blocked cost, progressing use and resource deduction", () => {
  const g = createGame("PARTS1", "h", 21);
  addPlayer(g, "h", "房主", "scout");
  startFixture(g, "h");
  const p = g.state.players[0];
  g.state.spawnCd = 999;
  g.state.objects = [
    {
      id: 888,
      kind: "chest",
      x: p.x,
      y: p.y,
      used: false,
      label: "遗物匣",
      cost: 20,
      progress: 0,
    },
  ];
  setInput(g, p.id, { ...EMPTY_INPUT, interact: true });
  tickGame(g, 0.08);
  assert.equal(p.interaction?.status, "blocked");
  g.state.coins = 50;
  tickGame(g, 0.08);
  assert.equal(p.interaction?.status, "charging");
  assert.ok(p.interaction!.progress > 0 && p.interaction!.progress < 1);
  for (let i = 0; i < 9; i++) tickGame(g, 0.08);
  assert.equal(g.state.objects[0].used, true);
  assert.equal(g.state.coins, 30);
  assert.equal(p.interaction?.status, "complete");
});
test("overflow XP waits sixteen seconds before another level", () => {
  const g = createGame("PACE24", "h", 21);
  addPlayer(g, "h", "房主", "scout");
  startFixture(g, "h");
  g.state.spawnCd = 999;
  gainExperience(g, 50000);
  assert.equal(g.state.level, 2);
  for (let i = 0; i < 160; i++) tickGame(g, 0.05);
  assert.equal(g.state.level, 2);
  for (let i = 0; i < 162; i++) tickGame(g, 0.05);
  assert.equal(g.state.level, 3);
});
import { evaluateCell } from "../src/WorkExtras";
test("local Excel formulas evaluate ranges, precedence and reject executable text", () => {
  const cells = { A1: "2", A2: "3", B1: "=SUM(A1:A2)" };
  assert.equal(evaluateCell("=SUM(A1:A2)", cells), "5");
  assert.equal(evaluateCell("=B1*2+3", cells), "13");
  assert.equal(evaluateCell("=alert(1)", cells), "#公式错误");
  assert.equal(evaluateCell("=1/0", cells), "#公式错误");
});
