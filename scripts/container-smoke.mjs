import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { io } from "socket.io-client";

const image = process.argv[process.argv.indexOf("--image") + 1];
assert.ok(
  process.argv.includes("--image") && image,
  "Pass --image <local-image>",
);
const name = "off-duty-smoke-" + randomBytes(6).toString("hex");
const expectedVersion = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8", timeout: 60000 }).trim();
const sockets = [];
const ack = (socket, event, data) =>
  socket.timeout(8000).emitWithAck(event, data);
async function waitFor(fn, description, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let error;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (e) {
      error = e;
    }
    await delay(200);
  }
  throw new Error("Timed out: " + description, { cause: error });
}
let base;
function resolveBase() {
  const port = docker("port", name, "3000/tcp")
    .split(/\r?\n/)[0]
    .split(":")
    .at(-1);
  base = "http://127.0.0.1:" + port;
}
async function health() {
  const response = await fetch(base + "/api/health", {
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) return false;
  const data = await response.json();
  assert.equal(data.status, "ok");
  assert.equal(data.version, expectedVersion);
  return data;
}
try {
  docker(
    "run",
    "--detach",
    "--name",
    name,
    "--publish",
    "127.0.0.1::3000",
    image,
  );
  resolveBase();
  await waitFor(health, "container health", 60000);
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<html/i);
  const qr = Buffer.from(
    await (await fetch(base + "/wechat-coffee.png")).arrayBuffer(),
  );
  assert.equal(
    createHash("sha256").update(qr).digest("hex"),
    "a342ad5d660da97c4834fb9d0c01ade2e52969272943896fb32001217e2da20a",
  );
  const desktop = await (await fetch(base + "/api/desktop")).json();
  assert.equal(desktop.version, expectedVersion);
  assert.equal(desktop.available, process.argv.includes("--desktop"));
  if (desktop.available) {
    const file = await fetch(base + desktop.url, { method: "HEAD" });
    assert.equal(file.status, 200);
    assert.equal(Number(file.headers.get("content-length")), desktop.bytes);
  }
  for (let i = 0; i < 2; i++) {
    const socket = io(base, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    sockets.push(socket);
    await waitFor(() => socket.connected, "WebSocket client " + i);
  }
  const [host, guest] = sockets;
  const created = await ack(host, "room:create", {
    name: "CI Host",
    role: "scout",
    mode: "survival",
    bots: 0,
  });
  assert.equal(created.ok, true);
  const joined = await ack(guest, "room:join", {
    code: created.code,
    name: "CI Guest",
    role: "medic",
  });
  assert.equal(joined.ok, true);
  let publicMessage;
  guest.once("lobby:message", (message) => {
    publicMessage = message;
  });
  assert.equal(
    (
      await ack(host, "lobby:chat", {
        name: "Forged name",
        text: "Public container check",
      })
    ).ok,
    true,
  );
  await waitFor(() => publicMessage, "public chat delivery");
  assert.equal(publicMessage.name, "CI Host");
  assert.equal(publicMessage.playerId, created.playerId);
  assert.equal((await ack(guest, "game:start", {})).ok, false);
  let chatSeen = false;
  guest.on("chat", (message) => {
    if (message.text === "Container smoke test") chatSeen = true;
  });
  assert.equal(
    (await ack(host, "chat:send", { text: "Container smoke test" })).ok,
    true,
  );
  await waitFor(() => chatSeen, "cross-client chat");
  const publicHistory = await ack(guest, "lobby:history", {});
  assert.ok(
    publicHistory.messages.every(
      (message) => message.text !== "Container smoke test",
    ),
  );
  const latest = new Map();
  for (const [socket, id] of [
    [host, created.playerId],
    [guest, joined.playerId],
  ]) {
    let choosing = false;
    socket.on("state", (state) => {
      latest.set(socket.id, state);
      const player = state.players.find((p) => p.id === id);
      if (
        state.phase === "draft" &&
        player?.offers?.length &&
        !player.initialChosen &&
        !choosing
      ) {
        choosing = true;
        ack(socket, "game:upgrade", { id: player.offers[0].id })
          .then((reply) => {
            assert.equal(reply.ok, true);
          })
          .catch((error) => {
            console.error(error);
          })
          .finally(() => {
            choosing = false;
          });
      }
    });
  }
  assert.equal((await ack(guest, "player:ready", { ready: true })).ok, true);
  assert.equal((await ack(host, "game:start", {})).ok, true);
  await waitFor(
    () => sockets.every((s) => latest.get(s.id)?.phase === "playing"),
    "countdown, shared draft and match start",
  );
  for (const state of latest.values()) {
    assert.equal(state.players.filter((p) => !p.bot).length, 2);
    assert.ok(state.players.every((p) => p.initialChosen));
  }
  host.emit("input", {
    x: 0,
    y: 0,
    aimX: 1,
    aimY: 0,
    fire: true,
    dash: false,
    skill: false,
    interact: false,
  });
  await waitFor(
    () =>
      latest.get(host.id)?.players.find((p) => p.id === created.playerId)
        ?.attackMotion?.source === "basic",
    "innate ordinary attack",
  );
  const attacker = latest
    .get(host.id)
    .players.find((p) => p.id === created.playerId);
  assert.equal(attacker.attackMotion.id, "pulse");
  assert.equal(attacker.ability, "volley");
  assert.ok(Object.keys(attacker.arsenal).length >= 1);
  assert.equal(typeof attacker.basicCd, "number");
  for (const socket of sockets) socket.disconnect();
  // Verify the mounted score data is loaded again after a process restart.
  const record = {
    id: name,
    squadName: "Container persistence",
    score: 42,
    elapsed: 20,
    mode: "survival",
    difficulty: "normal",
    at: new Date().toISOString(),
  };
  docker(
    "exec",
    name,
    "node",
    "-e",
    "require('node:fs').writeFileSync('/app/data/squad-scores.json', process.argv[1])",
    JSON.stringify([record]),
  );
  docker("restart", name);
  // Docker may assign a new ephemeral host port after restart.
  resolveBase();
  await waitFor(health, "restarted container health", 60000);
  await waitFor(async () => {
    const rows = await (await fetch(base + "/api/scores")).json();
    return rows.some((row) => row.id === name && row.score === 42);
  }, "score persistence after restart");
  console.log(
    JSON.stringify({
      image,
      version: expectedVersion,
      health: true,
      page: true,
      desktop: desktop.available,
      websocketClients: 2,
      chat: true,
      publicChat: true,
      innateBasicAttack: true,
      qrImage: true,
      privatePublicIsolation: true,
      countdownAndDraft: true,
      scorePersistence: true,
    }),
  );
} catch (error) {
  try {
    console.error(docker("logs", "--tail", "60", name));
  } catch {}
  throw error;
} finally {
  for (const socket of sockets) socket.disconnect();
  try {
    docker("rm", "--force", "--volumes", name);
  } catch {}
}
