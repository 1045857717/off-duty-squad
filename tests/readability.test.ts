import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ScoreStore } from "../server/scores";
import { createServer } from "../server/app";
import { io, type Socket } from "socket.io-client";
import {
  createGame,
  addPlayer,
  setInput,
  tickGame,
} from "../server/simulation";
import { startFixture } from "./support";
import { directionView } from "../src/game/actorPose";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
test("upper-left and upper-right use genuine rear-quarter columns instead of straight-back aliases", () => {
  assert.equal(directionView((-Math.PI * 3) / 4).column, 5);
  assert.equal(directionView(-Math.PI / 4).column, 4);
  assert.equal(directionView(-Math.PI / 2).column, 3);
});
test("calendar ranking excludes old-day records before applying top50 and preserves mode filters", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "period34-"));
  try {
    const at = (v: string) => ({
      id: v,
      squadName: v,
      members: ["工友"],
      mode: "survival",
      difficulty: "normal",
      score: v.startsWith("2026-10-20") ? 9999 : 10,
      elapsed: 30,
      at: v,
    });
    writeFileSync(
      path.join(dir, "squad-scores.json"),
      JSON.stringify([
        at("2026-10-20T15:59:59Z"),
        at("2026-10-20T16:00:00Z"),
        at("2026-10-21T04:00:00Z"),
        at("2025-10-21T04:00:00Z"),
      ]),
    );
    const store = new ScoreStore(dir);
    assert.equal(
      (store.list as any)(
        "survival",
        "normal",
        "day",
        Date.parse("2026-10-21T08:00:00Z"),
      ).length,
      2,
    );
    assert.equal(
      (store.list as any)(
        "survival",
        "normal",
        "year",
        Date.parse("2026-10-21T08:00:00Z"),
      ).length,
      3,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("presence includes lobby and spectators and removes disconnected clients without counting AI", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "presence34-")),
    app = createServer({ dataDir: dir }),
    clients: Socket[] = [];
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
  try {
    for (let i = 0; i < 3; i++) {
      const s = io(url, { transports: ["websocket"], forceNew: true });
      clients.push(s);
      await new Promise<void>((r) => s.once("connect", () => r()));
    }
    const response = await fetch(url + "/api/presence");
    assert.equal(response.status, 200);
    const before = await response.json();
    assert.equal(before.online, 3);
    clients[2].disconnect();
    await pause(50);
    assert.equal((await (await fetch(url + "/api/presence")).json()).online, 2);
  } finally {
    clients.forEach((s) => s.disconnect());
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("actual enemy strikes serialize the damage source and exact shield absorption for feedback", () => {
  const g = createGame("HIT34", "p", 67);
  addPlayer(g, "p", "工友", "scout");
  startFixture(g, "p");
  const p = g.state.players[0];
  p.invulnerable = 0;
  p.shield = 5;
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.enemies = [
    {
      id: 456,
      kind: "mite",
      x: p.x + 25,
      y: p.y,
      hp: 1e6,
      maxHp: 1e6,
      speed: 0,
      cd: 0,
      windup: 0.01,
      angle: Math.PI,
      attackX: p.x,
      attackY: p.y,
      hitFlash: 0,
    },
  ];
  tickGame(g, 1 / 60);
  assert.equal((p as any).lastHit?.sourceKind, "mite");
  assert.equal((p as any).lastHit?.sourceId, 456);
  assert.equal((p as any).lastHit?.shieldAbsorbed, 5);
  assert.ok((p as any).lastHit?.amount > 0);
});
test("each equipped attack serializes its weapon identity for the visible attack timeline", () => {
  const g = createGame("ACT34", "p", 14);
  addPlayer(g, "p", "同事", "scout");
  startFixture(g, "p");
  const p = g.state.players[0];
  p.arsenal = { mop: 1 };
  p.basicCd = 999;
  p.attackCooldowns = {};
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  setInput(g, "p", { x: 0, y: 0, aimX: 1, aimY: 0, fire: true });
  tickGame(g, 0.016);
  assert.equal((p as any).attackMotion?.id, "mop");
  assert.equal((p as any).attackMotion?.seq, p.attackSeq);
});
import { AttackTimeline } from "../src/game/joints";
import { ATTACK_IDS } from "../shared/arsenal";
import { ATTACK_MOTIONS } from "../shared/combatProfiles";
import { rankingWindow } from "../shared/rankPeriod";
test("rapid new firing packets queue without resetting the current visible strike", () => {
  for (const id of ATTACK_IDS) {
    const clock = new AttackTimeline();
    const phases: number[] = [];
    for (let n = 0; n < 100; n++) {
      const s = clock.sample(id, n, n * 16);
      phases.push(s.progress);
      assert.equal(s.kind, ATTACK_MOTIONS[id].kind);
    }
    assert.ok(
      phases.some((p) => p > 0.8),
      id + " never finishes a strike",
    );
  }
});
test("calendar weeks start on Monday in Shanghai, including year boundaries", () => {
  const now = Date.parse("2026-01-01T03:00:00Z"),
    w = rankingWindow("week", now),
    m = rankingWindow("month", now);
  assert.equal(new Date(w.start).toISOString(), "2025-12-28T16:00:00.000Z");
  assert.equal(new Date(m.start).toISOString(), "2025-12-31T16:00:00.000Z");
});
test("visible preparation is replicated before projectile release", () => {
  const g = createGame("PREP", "p", 89);
  addPlayer(g, "p", "工友", "scout");
  startFixture(g, "p");
  const p = g.state.players[0];
  p.arsenal = { pulse: 1 };
  p.attackCooldowns = {};
  g.state.bullets = [];
  g.state.enemies = [];
  g.state.spawnCd = 999;
  setInput(g, "p", { fire: true, aimX: 1, aimY: 0 });
  tickGame(g, 0.016);
  assert.equal(p.attackMotion?.id, "pulse");
  assert.equal(g.state.bullets.filter((b) => !b.enemy).length, 0);
  for (
    let i = 0;
    i < Math.ceil((ATTACK_MOTIONS.pulse.duration * 0.3) / 16) + 1;
    i++
  )
    tickGame(g, 0.016);
  assert.ok(g.state.bullets.some((b) => !b.enemy));
});

import { articulatedPose, JOINT_PARTS } from "../src/game/joints";
test("attack start and recovery blend into locomotion without a joint snap", () => {
  for (const id of ATTACK_IDS) {
    const kind = ATTACK_MOTIONS[id].kind,
      empty = {
        id,
        kind,
        active: false,
        progress: 1,
        windup: 0,
        strike: 0,
        recovery: 0,
      },
      rest = articulatedPose(0.7, 1, 1000, empty, 0, false),
      start = articulatedPose(
        0.7,
        1,
        1000,
        { ...empty, active: true, progress: 0 },
        0,
        false,
      ),
      end = articulatedPose(
        0.7,
        1,
        1000,
        { ...empty, active: true, progress: 0.999, recovery: 0.003 },
        0,
        false,
      );
    assert.ok(Math.abs(rest.rightUpperArm - start.rightUpperArm) < 0.001, id);
    assert.ok(Math.abs(rest.rightUpperArm - end.rightUpperArm) < 0.01, id);
  }
});
test("elbows, knees, hands and feet remain attached to a complete14joint parent hierarchy", () => {
  assert.equal(JOINT_PARTS.length, 14);
  for (const part of JOINT_PARTS) {
    if (part.parent !== "root")
      assert.ok(
        JOINT_PARTS.some((p) => p.name === part.parent),
        part.name,
      );
  }
  assert.equal(
    JOINT_PARTS.find((p) => p.name === "leftForearm")?.parent,
    "leftUpperArm",
  );
  assert.equal(
    JOINT_PARTS.find((p) => p.name === "rightShin")?.parent,
    "rightUpperLeg",
  );
});
test("E failure is rate limited and never deducts shared resources", () => {
  const g = createGame("FAIL", "p", 12);
  addPlayer(g, "p", "工友", "scout");
  startFixture(g, "p");
  const p = g.state.players[0];
  g.state.officeProps = [];
  g.state.coins = 0;
  g.state.objects = [
    {
      id: 400,
      kind: "chest",
      label: "缺零件",
      x: p.x + 10,
      y: p.y,
      cost: 45,
      used: false,
      progress: 0,
    },
  ];
  setInput(g, "p", { interact: true });
  for (let i = 0; i < 20; i++) tickGame(g, 1 / 60);
  assert.equal(p.interactionFeedback?.seq, 1);
  assert.match(p.interactionFeedback?.message || "", /45/);
  assert.equal(g.state.coins, 0);
  assert.equal(g.state.objects[0].used, false);
});
test("floating-window handoff counts the same online person once, while preserving observer and lobby counts", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "handoffcount34-")),
    app = createServer({ dataDir: dir }),
    clients: Socket[] = [];
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(app.http.address() as any).port}`,
    connect = async () => {
      const s = io(base, { transports: ["websocket"], forceNew: true });
      clients.push(s);
      await new Promise<void>((r) => s.once("connect", () => r()));
      return s;
    },
    ack = (s: Socket, e: string, d: unknown = {}) =>
      new Promise<any>((r) => s.emit(e, d, r));
  try {
    const host = await connect(),
      watch = await connect();
    await connect();
    const room = await ack(host, "room:create", {
      name: "房主",
      role: "scout",
    });
    await ack(host, "room:options", { bots: 2 });
    await ack(watch, "room:watch", { code: room.code, name: "观战" });
    const floating = await connect();
    assert.equal(
      (
        await ack(floating, "room:resume", {
          token: room.token,
          floating: true,
        })
      ).ok,
      true,
    );
    const p = await (await fetch(base + "/api/presence")).json();
    assert.equal(p.online, 3);
    assert.equal(p.players, 1);
    assert.equal(p.spectators, 1);
    assert.equal(p.lobby, 1);
  } finally {
    clients.forEach((s) => s.disconnect());
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("recent low scores remain eligible for period boards even after3000 high historical scores", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "retention34-"));
  try {
    const oldAt = new Date(Date.now() - 400 * 86400000).toISOString();
    writeFileSync(
      path.join(dir, "squad-scores.json"),
      JSON.stringify(
        Array.from({ length: 3000 }, (_, i) => ({
          id: "old" + i,
          score: 999999,
          elapsed: 20,
          mode: "survival",
          difficulty: "normal",
          at: oldAt,
        })),
      ),
    );
    const store = new ScoreStore(dir),
      g = createGame("FRESH", "p", 6);
    addPlayer(g, "p", "新工友", "scout");
    g.state.mode = "survival";
    g.state.phase = "lost";
    g.state.elapsed = 30;
    store.record(g.state);
    assert.equal(store.list("survival", "normal", "day").length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

import { windupProgress } from "../src/game/actorPose";
test("enemy anticipation advances smoothly between authoritative snapshots", () => {
  const a = windupProgress(0.5, 1, 0),
    b = windupProgress(0.5, 1, 0.01),
    c = windupProgress(0.5, 1, 0.02);
  assert.ok(a < b && b < c);
  assert.equal(windupProgress(0.01, 1, 0.1), 1);
  assert.equal(windupProgress(1, 1, -1), 0);
});
