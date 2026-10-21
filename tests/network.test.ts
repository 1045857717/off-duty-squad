import { draftSocket } from "./support";
import test from "node:test";
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
const once = (s: Socket, event: string) =>
  new Promise<any>((r) => s.once(event, r));
const ack = (s: Socket, event: string, data: unknown) =>
  new Promise<any>((r) => s.emit(event, data, r));
test("real clients share rooms, enforce host permissions, isolate worlds and reconnect by token", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const port = (app.http.address() as any).port;
  const clients: Socket[] = [];
  const connect = async () => {
    const s = io(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    clients.push(s);
    await once(s, "connect");
    return s;
  };
  try {
    const a = await connect(),
      b = await connect(),
      c = await connect();
    const ra = await ack(a, "room:create", { name: "叶子", role: "scout" });
    assert.equal(ra.ok, true);
    assert.match(ra.code, /^[A-Z2-9]{6}$/);
    const invalid = await ack(b, "room:join", {
      code: "NOPE!!",
      name: "伙伴",
      role: "medic",
    });
    assert.equal(invalid.ok, false);
    const rb = await ack(b, "room:join", {
      code: ra.code,
      name: "伙伴",
      role: "medic",
    });
    assert.equal(rb.ok, true);
    const rc = await ack(c, "room:create", {
      name: "别的队",
      role: "guardian",
    });
    assert.notEqual(ra.code, rc.code);
    const denied = await ack(b, "game:start", {});
    assert.equal(denied.ok, false);
    assert.equal((await ack(a, "game:start", {})).ok, false);
    await draftSocket(a, app.rooms.get(ra.code)!, ra.playerId);
    assert.equal(
      (await draftSocket(b, app.rooms.get(ra.code)!, rb.playerId)).ok,
      true,
    );
    assert.equal(app.rooms.get(ra.code)!.state.players[1].ready, true);
    const started = await ack(a, "game:start", {});
    assert.equal(started.ok, true);
    let state = await once(b, "state");
    while (state.phase !== "playing") state = await once(b, "state");
    assert.equal(state.phase, "playing");
    assert.equal(state.players.length, 2);
    assert.equal(state.players[0].name, "叶子");
    const cs = await once(c, "state");
    assert.equal(cs.phase, "lobby");
    assert.equal(cs.players.length, 1);
    b.disconnect();
    await new Promise((r) => setTimeout(r, 60));
    const d = await connect();
    const resumed = await ack(d, "room:resume", { token: rb.token });
    assert.equal(resumed.ok, true);
    assert.equal(resumed.playerId, rb.playerId);
    const ds = await once(d, "state");
    assert.equal(ds.players.length, 2);
    assert.equal(
      ds.players.find((p: any) => p.id === rb.playerId).connected,
      true,
    );
    const unknown = await ack(c, "player:role", { role: "hacker" });
    assert.equal(unknown.ok, false);
  } finally {
    clients.forEach((s) => s.disconnect());
    await app.close();
  }
});
test("room rejects invalid role and oversized payload gracefully", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const port = (app.http.address() as any).port;
  const s = io(`http://127.0.0.1:${port}`, { transports: ["websocket"] });
  try {
    await once(s, "connect");
    const bad = await ack(s, "room:create", { role: "hacker", name: "x" });
    assert.equal(bad.ok, false);
    const good = await ack(s, "room:create", {
      role: "scout",
      name: "x".repeat(100),
    });
    assert.equal(good.ok, true);
    const state = await once(s, "state");
    assert.equal(state.players[0].name.length, 12);
  } finally {
    s.disconnect();
    await app.close();
  }
});

test("floating-window handoff preserves a player and host through return", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const port = (app.http.address() as any).port;
  const clients: Socket[] = [];
  const connect = async () => {
    const s = io(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    clients.push(s);
    await once(s, "connect");
    return s;
  };
  try {
    const owner = await connect(),
      teammate = await connect(),
      floating = await connect();
    const created = await ack(owner, "room:create", {
      name: "房主",
      role: "scout",
    });
    await ack(teammate, "room:join", {
      code: created.code,
      name: "同事",
      role: "medic",
    });
    const moved = await ack(floating, "room:resume", {
      token: created.token,
      floating: true,
    });
    assert.equal(moved.playerId, created.playerId);
    assert.equal(app.rooms.get(created.code)!.state.players.length, 2);
    floating.disconnect();
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(app.rooms.get(created.code)!.state.host, created.playerId);
    const returned = await ack(owner, "room:resume", {
      token: created.token,
      floating: false,
    });
    assert.equal(returned.ok, true);
    assert.equal(app.rooms.get(created.code)!.state.players.length, 2);
    assert.equal(
      app.rooms
        .get(created.code)!
        .state.players.find((p) => p.id === created.playerId)!.connected,
      true,
    );
  } finally {
    clients.forEach((s) => s.disconnect());
    await app.close();
  }
});

test("a quick skill press is not lost when it follows a movement packet immediately", async () => {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const s = io(`http://127.0.0.1:${(app.http.address() as any).port}`, {
    transports: ["websocket"],
  });
  try {
    await once(s, "connect");
    const created = await ack(s, "room:create", {
      name: "快捷键",
      role: "scout",
    });
    await draftSocket(s, app.rooms.get(created.code)!, created.playerId);
    await ack(s, "game:start", {});
    while (app.rooms.get(created.code)!.state.phase !== "playing")
      await new Promise((r) => setTimeout(r, 20));
    s.emit("input", {
      x: 1,
      y: 0,
      aimX: 1,
      aimY: 0,
      fire: false,
      skill: false,
      dash: false,
      interact: false,
    });
    s.emit("input", {
      x: 1,
      y: 0,
      aimX: 1,
      aimY: 0,
      fire: false,
      skill: true,
      dash: false,
      interact: false,
    });
    s.emit("input", {
      x: 0,
      y: 0,
      aimX: 1,
      aimY: 0,
      fire: false,
      skill: false,
      dash: false,
      interact: false,
    });
    await new Promise((r) => setTimeout(r, 90));
    assert.ok(
      app.rooms.get(created.code)!.state.players[0].skillCd > 0,
      "press must survive coalescing",
    );
  } finally {
    s.disconnect();
    await app.close();
  }
});
