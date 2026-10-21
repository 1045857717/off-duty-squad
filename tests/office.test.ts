import test from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "../shared/content";
import { ROLE_SIGNATURE, ATTACKS } from "../shared/arsenal";
import { createGame, addPlayer } from "../server/simulation";
test("office professions offer twenty-eight selectable occupations with unique fixed skills", () => {
  assert.equal(Object.keys(ROLES).length, 28);
  assert.equal(new Set(Object.values(ROLE_SIGNATURE)).size, 28);
  for (const role of Object.keys(ROLES)) {
    const g = createGame("JOBS30", "h", 31);
    assert.ok(addPlayer(g, "h", "同事", role as any));
    assert.equal(
      g.state.players[0].ability,
      ROLE_SIGNATURE[role as keyof typeof ROLE_SIGNATURE],
    );
  }
});
test("improvised melee and workplace tools are real attack options", () => {
  for (const id of ["bat", "mop", "wrench", "coffee"])
    assert.ok(Object.hasOwn(ATTACKS, id), id);
});
import { startFixture } from "./support";
import { setInput, tickGame } from "../server/simulation";
import { EMPTY_INPUT } from "../shared/content";
import {
  setupOffice,
  useOffice,
  officeNoise,
  openVote,
  voteRoute,
  tickOffice,
  pingTeam,
} from "../server/office";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
test("all twenty-eight office Qs execute and keep their occupational identity", () => {
  for (const role of Object.keys(ROLES)) {
    const g = createGame("JOBQ30", "h", 51);
    addPlayer(g, "h", "测试", role as any);
    startFixture(g, "h");
    const p = g.state.players[0];
    g.state.spawnCd = 999;
    g.state.eventCd = 999;
    p.invulnerable = 999;
    g.state.enemies = [
      {
        id: 999,
        kind: "tank",
        x: p.x + 55,
        y: p.y,
        hp: 9999,
        maxHp: 9999,
        speed: 0,
        cd: 999,
        angle: 0,
        hitFlash: 0,
      },
    ];
    setInput(g, p.id, { ...EMPTY_INPUT, skill: true });
    tickGame(g, 0.05);
    assert.ok(p.skillCd > 0, role);
    assert.ok(
      g.state.effects.some(
        (e) =>
          e.ability === ROLE_SIGNATURE[role as keyof typeof ROLE_SIGNATURE],
      ),
      role,
    );
    assert.equal(
      p.ability,
      ROLE_SIGNATURE[role as keyof typeof ROLE_SIGNATURE],
    );
  }
});
test("all melee/coffee tools deal real damage without requiring projectiles", () => {
  for (const id of ["bat", "mop", "wrench", "coffee"] as const) {
    const g = createGame("TOOLS3", "h", 51);
    addPlayer(g, "h", "测试", "cleaner");
    startFixture(g, "h");
    const p = g.state.players[0];
    p.arsenal = { [id]: 1 };
    g.state.spawnCd = 999;
    g.state.eventCd = 999;
    p.invulnerable = 999;
    g.state.enemies = [
      {
        id: 999,
        kind: "tank",
        x: p.x + 55,
        y: p.y,
        hp: 9999,
        maxHp: 9999,
        speed: 0,
        cd: 999,
        angle: 0,
        hitFlash: 0,
      },
    ];
    setInput(g, p.id, { ...EMPTY_INPUT, fire: true });
    for (let i = 0; i < 70; i++) tickGame(g, 1 / 60);
    assert.ok(p.damageDealt > 0, id);
    assert.equal(g.state.bullets.filter((b) => b.owner === p.id).length, 0, id);
  }
});
test("printer attracts zombies, environmental use and team decisions change actual state", () => {
  const g = createGame("ENV30", "h", 51);
  addPlayer(g, "h", "测试", "engineer");
  startFixture(g, "h");
  const p = g.state.players[0];
  g.state.officeProps = [
    {
      id: 100,
      kind: "printer",
      label: "打印机",
      x: p.x,
      y: p.y,
      progress: 0,
      active: 0,
      cd: 0,
      used: 0,
    },
  ];
  for (let i = 0; i < 12; i++) useOffice(g, p, 0.08, () => {});
  assert.ok(g.state.noises.some((n) => n.life > 0 && n.radius === 900));
  assert.ok(g.state.officeProps[0].cd > 0);
  assert.ok(pingTeam(g, p.id, "gather"));
  assert.equal(pingTeam(g, p.id, "danger"), false);
  openVote(g);
  assert.ok(voteRoute(g, p.id, "detour"));
  tickOffice(
    g,
    0.05,
    () => {},
    () => {},
  );
  assert.equal(g.state.route, "detour");
  assert.equal(g.state.routeVote?.resolved, "detour");
});
test("public lobby chat broadcasts before rooms, preserves history and enforces limits", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const peers: Socket[] = [];
  const connect = async () => {
    const s = io(`http://127.0.0.1:${(app.http.address() as any).port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    peers.push(s);
    await new Promise<void>((r) => s.once("connect", () => r()));
    return s;
  };
  const ack = (s: Socket, e: string, d: unknown = {}) =>
    new Promise<any>((r) => s.emit(e, d, r));
  try {
    const a = await connect(),
      b = await connect();
    const seen = new Promise<any>((r) => b.once("lobby:message", r));
    assert.ok(
      (
        await ack(a, "lobby:chat", {
          name: "同事",
          text: "今天不加班 <script>",
        })
      ).ok,
    );
    assert.equal((await seen).text, "今天不加班 <script>");
    assert.equal((await ack(b, "lobby:history")).messages.length, 1);
    for (let i = 0; i < 3; i++)
      await ack(a, "lobby:chat", { name: "同事", text: "测试" });
    assert.equal(
      (await ack(a, "lobby:chat", { name: "同事", text: "太快" })).ok,
      false,
    );
  } finally {
    peers.forEach((s) => s.disconnect());
    await app.close();
  }
});
test("sprinkler slows, cabinet and shutter create temporary collision, boss transitions summon", () => {
  const g = createGame("PROPS3", "h", 61);
  addPlayer(g, "h", "同事", "engineer");
  startFixture(g, "h");
  const p = g.state.players[0];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.enemies = [];
  for (const kind of ["sprinkler", "cabinet", "shutter"] as const) {
    g.state.officeProps = [
      {
        id: 100,
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
    for (let i = 0; i < 12; i++) useOffice(g, p, 0.08, () => {});
    const o = g.state.officeProps[0];
    assert.ok(o.active > 0);
    if (kind !== "sprinkler") assert.ok(g.state.world.dynamicWalls!.length > 0);
    tickOffice(
      g,
      11,
      () => {},
      () => {},
    );
    assert.equal(g.state.world.dynamicWalls!.length, 0);
  }
  const boss = {
    id: 999,
    kind: "boss" as const,
    x: p.x + 80,
    y: p.y,
    hp: 500,
    maxHp: 1000,
    speed: 0,
    cd: 999,
    angle: 0,
    hitFlash: 0,
  };
  g.state.enemies = [boss];
  let summons = 0;
  tickOffice(
    g,
    0.05,
    () => {},
    () => summons++,
  );
  assert.equal(g.state.enemies[0].bossPhase, 1);
  boss.hp = 200;
  tickOffice(
    g,
    0.05,
    () => {},
    () => summons++,
  );
  assert.equal(g.state.enemies[0].bossPhase, 2);
  assert.ok(summons >= 5);
});
