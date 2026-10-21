import test from "node:test";
import assert from "node:assert/strict";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
const once = (socket: Socket, event: string) =>
  new Promise<any[]>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Missing socket event: " + event)),
      4000,
    );
    socket.once(event, (...args: any[]) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
const ack = (socket: Socket, event: string, data: unknown = {}) =>
  socket.timeout(4000).emitWithAck(event, data);
async function fixture() {
  const app = createServer();
  await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
  const clients: Socket[] = [];
  const connect = async () => {
    const s = io("http://127.0.0.1:" + (app.http.address() as any).port, {
      transports: ["websocket"],
      forceNew: true,
    });
    clients.push(s);
    await once(s, "connect");
    return s;
  };
  const close = async () => {
    clients.forEach((s) => s.disconnect());
    await app.close();
  };
  return { app, connect, close };
}
test("public messages cross rooms and spectators use their server-side identity", async () => {
  const f = await fixture();
  try {
    const a = await f.connect(),
      b = await f.connect(),
      viewer = await f.connect();
    const ra = await ack(a, "room:create", { name: "真实工友", role: "scout" });
    const rb = await ack(b, "room:create", {
      name: "另一间同事",
      role: "medic",
    });
    await ack(viewer, "room:watch", { code: ra.code, name: "观战同事" });
    const cross = once(b, "lobby:message");
    assert.equal(
      (await ack(a, "lobby:chat", { name: "伪造房主", text: "跨房间找搭子" }))
        .ok,
      true,
    );
    const [message] = await cross;
    assert.equal(message.name, "真实工友");
    assert.equal(message.playerId, ra.playerId);
    assert.equal(message.text, "跨房间找搭子");
    const observed = once(a, "lobby:message");
    await ack(viewer, "lobby:chat", { name: "伪造工友", text: "观众也能说话" });
    const [seen] = await observed;
    assert.equal(seen.name, "观战同事");
    assert.equal(seen.spectator, true);
    assert.notEqual(ra.code, rb.code);
  } finally {
    await f.close();
  }
});
test("public flood quota does not consume private squad messaging quota", async () => {
  const f = await fixture();
  try {
    const a = await f.connect();
    await ack(a, "room:create", { name: "限流同事", role: "scout" });
    for (let i = 0; i < 4; i++)
      assert.equal((await ack(a, "lobby:chat", { text: "公屏" + i })).ok, true);
    assert.equal((await ack(a, "lobby:chat", { text: "太快" })).ok, false);
    for (let i = 0; i < 5; i++)
      assert.equal((await ack(a, "chat:send", { text: "队内" + i })).ok, true);
    assert.equal((await ack(a, "chat:send", { text: "队内也太快" })).ok, false);
  } finally {
    await f.close();
  }
});
test("private squad messages do not enter public history and lobby nicknames are sanitized", async () => {
  const f = await fixture();
  try {
    const a = await f.connect(),
      b = await f.connect();
    await ack(a, "room:create", { name: "私聊工友", role: "scout" });
    await ack(a, "chat:send", { text: "队内暗号" });
    assert.equal(
      (await ack(b, "lobby:history")).messages.some(
        (m: any) => m.text === "队内暗号",
      ),
      false,
    );
    const delivery = once(a, "lobby:message");
    await ack(b, "lobby:chat", {
      name: "大厅\n昵称",
      text: "<img src=x onerror=alert(1)>\n​",
    });
    const [message] = await delivery;
    assert.equal(message.name.includes("\n"), false);
    assert.equal(message.spectator, false);
    assert.ok(Number.isFinite(message.at));
    assert.match(message.text, /<img/);
  } finally {
    await f.close();
  }
});

import { newChatMessages } from "../src/community";
test("unread counts still advance when the public history is capped at sixty rows", () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({
    id: String(i + 1),
    name: "工友",
    text: "消息",
    at: i,
    spectator: false,
  }));
  assert.equal(newChatMessages("57", rows), 3);
  assert.equal(newChatMessages("60", rows), 0);
  assert.equal(newChatMessages(undefined, rows), 0);
});
