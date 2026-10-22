import { interactionTarget } from "../shared/interactions";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
} from "../server/simulation";
import { EMPTY_INPUT, ROLES } from "../shared/content";
import { startFixture, prepareFixture } from "./support";
import { useOffice } from "../server/office";
import type { Role } from "../shared/types";
function fixture(n = 1) {
  const g = createGame("PACE41", "h", 41);
  g.state.mode = "survival";
  for (let i = 0; i < n; i++)
    addPlayer(g, i ? "p" + i : "h", "测试", i ? "medic" : "scout");
  prepareFixture(g);
  startFixture(g, "h");
  g.state.officeProps = [];
  g.state.objects = [];
  g.state.enemies = [];
  g.state.eventCd = 999;
  g.state.spawnCd = 999;
  for (const p of g.state.players) p.invulnerable = 999;
  return g;
}
function channel(g: ReturnType<typeof fixture>) {
  const p = g.state.players[0];
  setInput(g, p.id, { ...EMPTY_INPUT, interact: true });
  for (let i = 0; i < 49; i++) tickGame(g, 1 / 60);
  setInput(g, p.id, EMPTY_INPUT);
}
test("E reward chest explains the real pending choice and exact shared parts cost", () => {
  const g = fixture(),
    p = g.state.players[0];
  g.state.coins = 50;
  g.state.objects = [
    {
      id: 900,
      kind: "chest",
      label: "应急物资柜",
      ...{ x: p.x, y: p.y },
      cost: 20,
      progress: 0,
      used: false,
    },
  ];
  const before = p.pendingUpgrades;
  channel(g);
  assert.equal(p.pendingUpgrades, before + 1);
  assert.equal(g.state.coins, 30);
  assert.equal(p.interactionFeedback?.status, "complete");
  assert.match(p.interactionFeedback!.message, /强化.*1.*1.*2.*3/);
  assert.match(p.interactionFeedback!.message, /20/);
});
test("E fountain reports actual individual HP/shield changes to both nearby recipients", () => {
  const g = fixture(2),
    [p, q] = g.state.players;
  q.x = p.x + 35;
  q.y = p.y;
  p.hp = p.maxHp - 40;
  p.shield = 0;
  q.hp = q.maxHp - 12;
  q.shield = 0;
  g.state.objects = [
    {
      id: 900,
      kind: "fountain",
      label: "医药补给点",
      x: p.x,
      y: p.y,
      cost: 0,
      progress: 0,
      used: false,
    },
  ];
  const hp = p.hp;
  channel(g);
  assert.ok(p.hp > hp);
  assert.equal(p.shield, 20);
  for (const r of [p, q]) {
    assert.equal(r.interactionFeedback?.status, "complete");
    assert.match(r.interactionFeedback!.message, /生命.*护盾/);
  }
  assert.match(q.interactionFeedback!.message, /12/);
});
test("full-health capped-shield fountain is retained instead of consumed without benefit", () => {
  const g = fixture(),
    p = g.state.players[0];
  p.hp = p.maxHp;
  p.shield = p.shieldCap + 20;
  g.state.objects = [
    {
      id: 900,
      kind: "fountain",
      label: "医药补给点",
      x: p.x,
      y: p.y,
      cost: 0,
      progress: 0,
      used: false,
    },
  ];
  channel(g);
  assert.equal(g.state.objects[0].used, false);
  assert.equal(p.interactionFeedback?.status, "failed");
  assert.match(p.interactionFeedback!.message, /充足|已满/);
});
test("closer reward item wins over nearby office tool so HUD and actual use agree", () => {
  const g = fixture(),
    p = g.state.players[0];
  g.state.objects = [
    {
      id: 900,
      kind: "chest",
      label: "应急物资柜",
      x: p.x,
      y: p.y,
      cost: 0,
      progress: 0,
      used: false,
    },
  ];
  g.state.officeProps = [
    {
      id: 901,
      kind: "printer",
      label: "打印机",
      x: p.x + 60,
      y: p.y,
      progress: 0,
      active: 0,
      cd: 0,
      used: 0,
    },
  ];
  channel(g);
  assert.equal(g.state.objects[0].used, true);
  assert.equal(g.state.officeProps[0].used, 0);
});
test("office tools tell what they actually do, including empty-target and blocked placement", () => {
  for (const kind of ["printer", "sprinkler", "cabinet", "shutter"] as const) {
    const g = fixture(),
      p = g.state.players[0];
    g.state.officeProps = [
      {
        id: 901,
        kind,
        label: kind,
        x: p.x,
        y: p.y,
        progress: 0,
        active: 0,
        cd: 0,
        used: 0,
      },
    ];
    useOffice(g, p, 1, () => {});
    assert.equal(p.interactionFeedback?.status, "complete", kind);
    assert.match(
      p.interactionFeedback!.message,
      kind === "printer"
        ? /吸引.*8.*不造成伤害/
        : kind === "sprinkler"
          ? /减速.*10/
          : /未命中/,
    );
    assert.match(p.interaction?.message || "", /8|10|5/);
  }
});
test("wave one only introduces common enemies; every profession can kill a normal one with innate attack", () => {
  for (const role of Object.keys(ROLES) as Role[]) {
    // Use real role initialization and the real director's first spawn.
    const r = createGame("TTK41", "h", 41);
    r.state.mode = "survival";
    addPlayer(r, "h", "测试", role);
    startFixture(r, "h");
    const p = r.state.players[0];
    r.state.officeProps = [];
    r.state.objects = [];
    r.state.eventCd = 999;
    r.state.enemies = [];
    r.random = () => 0.5;
    r.state.spawnCd = 0;
    tickGame(r, 1 / 60);
    const e = r.state.enemies[0];
    assert.ok(["mite", "hound"].includes(e.kind));
    assert.equal(e.elite, undefined);
    r.state.spawnCd = 999;
    e.x = p.x + 52;
    e.y = p.y;
    e.speed = 0;
    e.cd = 999;
    p.arsenal = {};
    p.attackCooldowns = {};
    p.invulnerable = 999;
    p.crit = 0;
    setInput(r, p.id, { ...EMPTY_INPUT, fire: true, aimX: 1, aimY: 0 });
    let elapsed = 0;
    while (
      r.state.enemies.some((v) => v.id === e.id && v.hp > 0) &&
      elapsed < 3.5
    ) {
      tickGame(r, 1 / 60);
      elapsed += 1 / 60;
    }
    assert.ok(
      e.hp <= 0,
      role + " cannot kill first common in3.5s using only basic",
    );
  }
});
test("first-wave group HP is sublinear and later waves grow; early diversity is introduced gradually", () => {
  const hp = (n: number, wave: number, random = 0.5) => {
    const g = fixture(n);
    g.state.wave = wave;
    g.random = () => random;
    g.state.spawnCd = 0;
    tickGame(g, 1 / 60);
    return g.state.enemies[0];
  };
  const solo = hp(1, 1),
    group = hp(4, 1);
  assert.ok(group.maxHp > solo.maxHp);
  assert.ok(group.maxHp < solo.maxHp * 2);
  const later = hp(4, 12);
  assert.ok(later.maxHp > group.maxHp * 2);
  for (let i = 1; i < 100; i++) {
    const e = hp(1, 1, i / 100);
    assert.ok(["mite", "hound"].includes(e.kind));
    assert.equal(e.elite, undefined);
  }
});

test("holding E after completion cannot spend twice or replace its receipt with a spurious failure", () => {
  const g = fixture(),
    p = g.state.players[0];
  g.state.coins = 80;
  g.state.objects = [0, 1].map((i) => ({
    id: 900 + i,
    kind: "chest" as const,
    label: "应急物资柜",
    x: p.x + i * 20,
    y: p.y,
    cost: 20,
    progress: 0,
    used: false,
  }));
  setInput(g, p.id, { ...EMPTY_INPUT, interact: true });
  for (let i = 0; i < 200; i++) tickGame(g, 1 / 60);
  assert.equal(g.state.coins, 60);
  assert.equal(g.state.objects.filter((o) => o.used).length, 1);
  assert.equal(p.interactionFeedback?.status, "complete");
  setInput(g, p.id, EMPTY_INPUT);
  tickGame(g, 1 / 60);
  channel(g);
  assert.equal(g.state.coins, 40);
});
test("endless late join retains enemy health fraction and peak pressure without the old x2 jump", () => {
  const g = fixture();
  g.random = () => 0.5;
  g.state.spawnCd = 0;
  tickGame(g, 1 / 60);
  const e = g.state.enemies[0],
    before = e.maxHp;
  e.hp = before * 0.5;
  addPlayer(g, "late", "中途加入", "medic");
  assert.ok(e.maxHp > before && e.maxHp < before * 1.5);
  assert.ok(Math.abs(e.hp / e.maxHp - 0.5) < 0.01);
});

test("opening deployment is a small pack and the first random event supports the build", () => {
  for (const n of [1, 4]) {
    const g = createGame("OPEN41", "h", 41);
    g.state.mode = "survival";
    for (let i = 0; i < n; i++)
      addPlayer(g, i ? "p" + i : "h", "工友", "scout");
    prepareFixture(g);
    startFixture(g, "h");
    for (let i = 0; i < 180; i++) tickGame(g, 1 / 60);
    assert.ok(
      g.state.enemies.length <= 4,
      "initial deployment immediately overran the party",
    );
    g.state.eventCd = 0;
    g.random = () => 0.25;
    for (const p of g.state.players) p.invulnerable = 999;
    tickGame(g, 1 / 60);
    assert.ok(["bonus", "fortune"].includes(g.state.event.kind));
  }
});

test("a fresh E press may immediately use another target after a completed action", () => {
  const g = fixture(),
    p = g.state.players[0];
  g.state.objects = [0, 1].map((i) => ({
    id: 900 + i,
    kind: "chest" as const,
    label: "应急物资柜",
    x: p.x + i * 20,
    y: p.y,
    cost: 0,
    progress: 0,
    used: false,
  }));
  channel(g);
  tickGame(g, 1 / 60);
  channel(g);
  assert.equal(g.state.objects.filter((o) => o.used).length, 2);
});
test("HUD extended preview never hides an already actionable target", () => {
  const g = fixture(2),
    [p, q] = g.state.players;
  q.alive = false;
  q.hp = 0;
  q.x = p.x + 80;
  q.y = p.y;
  g.state.objects = [
    {
      id: 900,
      kind: "chest",
      label: "应急物资柜",
      x: p.x,
      y: p.y,
      cost: 0,
      progress: 0,
      used: false,
    },
  ];
  assert.equal(interactionTarget(g.state, p)?.kind, "reward");
  assert.equal(interactionTarget(g.state, p, 25)?.kind, "reward");
});
test("one E press rescuing an ally cannot simultaneously charge a nearby relay", () => {
  const g = fixture(2),
    [p, q] = g.state.players;
  g.state.mode = "expedition";
  q.alive = false;
  q.hp = 0;
  q.x = p.x + 10;
  q.y = p.y;
  g.state.objective = {
    ...g.state.objective,
    type: "relay",
    target: 3,
    progress: 0,
    relays: [{ x: p.x, y: p.y, active: false, charge: 0 }],
  };
  setInput(g, p.id, { ...EMPTY_INPUT, interact: true });
  for (let i = 0; i < 230; i++) tickGame(g, 1 / 60);
  assert.equal(q.alive, true);
  assert.equal(g.state.objective.relays[0].charge, 0);
});
test("relay completion emits a personal objective and experience receipt", () => {
  const g = fixture(),
    p = g.state.players[0];
  g.state.mode = "expedition";
  g.state.objective = {
    ...g.state.objective,
    type: "relay",
    target: 3,
    progress: 0,
    relays: [{ x: p.x, y: p.y, active: false, charge: 0.99 }],
  };
  setInput(g, p.id, { ...EMPTY_INPUT, interact: true });
  for (let i = 0; i < 10; i++) tickGame(g, 1 / 60);
  assert.equal(g.state.objective.relays[0].active, true);
  assert.equal(p.interactionFeedback?.status, "complete");
  assert.match(p.interactionFeedback!.message, /任务进度.*1.*经验.*20/);
});
test("AI may rescue after previously completing an interaction without needing a physical E release", () => {
  const g = fixture(2),
    [human, bot] = g.state.players;
  bot.bot = true;
  bot.x = human.x + 12;
  bot.y = human.y;
  bot.interactionLatched = true;
  human.alive = false;
  human.hp = 0;
  human.revive = 0;
  for (let i = 0; i < 260; i++) tickGame(g, 1 / 60);
  assert.equal(human.alive, true);
});
