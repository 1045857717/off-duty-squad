import { ATTACK_IDS } from "../shared/arsenal";
import { launchFromDraft, prepareInBrowser } from "./browser-support";
import { chromium } from "playwright";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
import { randomFloor, generateWorld, seededRandom } from "../shared/world";
import path from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const directory = await fs.mkdtemp(path.join(tmpdir(), "stress-offduty-"));
const app = createServer({ dataDir: directory });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
const peers: Socket[] = [];
let protectFixture: ReturnType<typeof setInterval> | undefined;
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
  ...(process.env.BENCHMARK_UNCAPPED === "1"
    ? { args: ["--disable-frame-rate-limit", "--disable-gpu-vsync"] }
    : {}),
});
const ack = (s: Socket, event: string, data: unknown) =>
  new Promise<any>((r) => s.emit(event, data, r));
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  await page.addInitScript((value) => {
    (window as any).__BENCH_UNCAPPED = value;
  }, process.env.BENCHMARK_UNCAPPED === "1");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  await page
    .getByRole("button", { name: "创建小队", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await page.waitForFunction(() => window.__OFFDUTY__?.state?.code);
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code);
  for (const [i, role] of ["engineer", "medic", "guardian"].entries()) {
    const socket = io(url, { transports: ["websocket"], forceNew: true });
    await new Promise<void>((r) => socket.once("connect", r));
    peers.push(socket);
    await ack(socket, "room:join", { code, name: "同事" + (i + 1), role });
    const p = app.rooms.get(code)!.state.players.at(-1)!;

    await ack(socket, "player:ready", { ready: true });
    socket.on("state", (s) => {
      const p = s.players.find((p: any) => p.role === role);
      if (p && !p.initialChosen && p.offers.length && s.phase === "draft")
        void ack(socket, "game:upgrade", { id: p.offers[0].id });
      if (p)
        socket.emit("input", {
          x: 0,
          y: 0,
          aimX: 1,
          aimY: 0,
          fire: true,
          skill: true,
        });
    });
  }
  await prepareInBrowser(page);
  await launchFromDraft(page);
  await page.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  const game = app.rooms.get(code)!;
  if (process.env.STRESS_SEED) {
    const seed = Number(process.env.STRESS_SEED);
    assert.ok(Number.isSafeInteger(seed));
    game.state.world = generateWorld(
      seed,
      game.state.mode,
      game.state.world.theme,
    );
    game.random = seededRandom(seed + 73);
    game.state.bullets = [];
    game.state.areas = [];
    game.state.effects = [];
  }
  // Controlled benchmark fixture: long-lived actors keep draw load stable; only this test owns the server reference.
  const room =
    game.state.world.rooms[Math.floor(game.state.world.rooms.length / 2)];
  const center = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
  game.state.players.forEach((p, i) => {
    p.x = center.x;
    p.y = center.y + (i - 1) * 35;
    p.invulnerable = 9999;
    p.pendingUpgrades = 0;
    p.offers = [];
    if (process.env.FULL_ARSENAL === "1")
      p.arsenal = Object.fromEntries(
        ATTACK_IDS.slice(0, Number(process.env.STRESS_MODULES || 16)).map(
          (id) => [id, 8],
        ),
      );
    if (process.env.STRESS_SEED) {
      p.attackCooldowns = {};
      p.basicCd = 0;
      p.skillCd = 0;
      p.damageDealt = 0;
      p.kills = 0;
    }
    p.shield = 45;
  });
  // Q grants can replace the fixture invulnerability timer; keep this renderer benchmark alive.
  for (const p of game.state.players) {
    p.alive = true;
    p.hp = p.maxHp;
  }
  protectFixture = setInterval(() => {
    for (const p of game.state.players) p.invulnerable = 9999;
  }, 50);
  const count = Number(process.env.ENEMY_COUNT || 100);
  game.state.enemies = Array.from({ length: count }, (_, i) => {
    const point =
      i < 24
        ? {
            x: center.x + 90 + (i % 4) * 24,
            y: center.y - 55 + Math.floor(i / 4) * 24,
          }
        : randomFloor(game.state.world, game.random, center, 200);
    return {
      id: ++game.state.serial,
      kind:
        i % 20 === 0
          ? ("boss" as const)
          : i % 4 === 0
            ? ("shooter" as const)
            : i % 4 === 1
              ? ("tank" as const)
              : i % 4 === 2
                ? ("hound" as const)
                : ("wraith" as const),
      ...point,
      hp: 1000000000,
      maxHp: 1000000000,
      speed: 0,
      cd: 0.5 + (i % 5) * 0.2,
      angle: 0,
      hitFlash: 0,
      windup: 0,
      attackSeq: 0,
      screamCd: 999,
    };
  });
  game.state.spawnCd = 999;
  game.state.eventCd = 999;
  game.state.event = {
    kind: "none",
    name: "测试隔离",
    desc: "",
    remaining: 999,
  };
  game.state.waveEnds = 999;
  await page.waitForTimeout(1800);
  let profileSession: any;
  if (process.env.CPU_PROFILE === "1") {
    profileSession = await page.context().newCDPSession(page);
    await profileSession.send("Profiler.enable");
    await profileSession.send("Profiler.start");
  }
  const durationMs = Number(process.env.STRESS_SECONDS || 6) * 1000;
  assert.ok(
    Number.isFinite(durationMs) && durationMs >= 1000 && durationMs <= 300000,
  );
  const result = await page.evaluate(async (durationMs) => {
    let frames = 0;
    const times: number[] = [],
      proto = (window as any).Phaser.Renderer.WebGL.WebGLRenderer.prototype,
      old = proto.render;
    let previous = performance.now();
    proto.render = function (...args: any[]) {
      const now = performance.now();
      frames++;
      times.push(now - previous);
      previous = now;
      return old.apply(this, args);
    };
    const start = performance.now();
    await new Promise((r) => setTimeout(r, durationMs));
    proto.render = old;
    times.shift();
    times.sort((a, b) => a - b);
    const c = document.querySelector("canvas")!;
    return {
      displayUncapped: (window as any).__BENCH_UNCAPPED === true,
      worldSeed: window.__OFFDUTY__!.state!.world.seed,
      measurementSeconds: durationMs / 1000,
      phase: window.__OFFDUTY__!.state!.phase,
      modulesPerPlayer: Object.keys(
        window.__OFFDUTY__!.state!.players[0].arsenal,
      ).length,
      fps: frames / ((performance.now() - start) / 1000),
      frames,
      p95: times[Math.floor(times.length * 0.95)],
      players: window.__OFFDUTY__!.state!.players.length,
      enemies: window.__OFFDUTY__!.state!.enemies.length,
      bullets: window.__OFFDUTY__!.state!.bullets.length,
      ratio: c.width / c.getBoundingClientRect().width,
      damage: window.__OFFDUTY__!.state!.players.map((p) => ({
        name: p.name,
        damage: p.damageDealt,
      })),
    };
  }, durationMs);
  if (profileSession) {
    const { profile } = await profileSession.send("Profiler.stop");
    await fs.mkdir("test-results", { recursive: true });
    await fs.writeFile(
      "test-results/stress-33-profile.json",
      JSON.stringify(profile),
    );
  }
  console.log("STRESS_SAMPLE", JSON.stringify(result));
  await fs.mkdir("test-results", { recursive: true });
  await fs.writeFile(
    "test-results/stress-latest-attempt.json",
    JSON.stringify(result, null, 2),
  );
  await page.screenshot({ path: "test-results/stress-attempt.png" });
  assert.equal(result.phase, "playing");
  assert.equal(result.players, 4);
  assert.equal(result.enemies, count);
  assert.ok(result.ratio > 1.9);
  console.log("DENSE_COMBAT", JSON.stringify(result));
  await fs.mkdir("test-results", { recursive: true });
  await fs.writeFile(
    "test-results/stress.json",
    JSON.stringify(result, null, 2),
  );
  // Measure both viewports before enforcing either target so failures retain both results.
  await page.screenshot({ path: "test-results/stress-scene.png" });
  await page.getByRole("button", { name: "快捷设置" }).click();
  await page.getByLabel("迷你模式").check();
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(1700);
  const smallWindowFPS = await page.evaluate(async () => {
    let n = 0;
    const proto = (window as any).Phaser.Renderer.WebGL.WebGLRenderer.prototype,
      old = proto.render;
    proto.render = function (...args: any[]) {
      n++;
      return old.apply(this, args);
    };
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 3000));
    proto.render = old;
    return n / ((performance.now() - start) / 1000);
  });
  console.log("SMALL_WINDOW_DAMAGE_OVERLAY_FPS", smallWindowFPS);
  await fs.writeFile(
    "test-results/stress.json",
    JSON.stringify({ ...result, smallWindowFPS }, null, 2),
  );
  await page.screenshot({ path: "test-results/high-refresh-small-window.png" });
  await page.keyboard.press("F4");
  await page.waitForTimeout(250);
  await page.screenshot({ path: "test-results/high-refresh-toolbar.png" });
  const damage = game.state.players.map((p) => ({
    id: p.id,
    damage: p.damageDealt,
  }));
  assert.ok(damage.every((p) => p.damage > 0));
  assert.equal(await page.locator(".damage-overlay .damage-row").count(), 4);
  assert.ok(
    result.fps >= Number(process.env.MIN_FPS || 144),
    `dense 2xDPR frame rate ${result.fps}`,
  );
  assert.ok(
    smallWindowFPS >= Number(process.env.MIN_FPS || 144),
    `small window dense FPS ${smallWindowFPS}`,
  );
} finally {
  clearInterval(protectFixture);
  for (const peer of peers) peer.disconnect();
  await browser.close();
  await app.close();
  if (
    !path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(directory).startsWith("stress-offduty-")
  )
    throw Error("Unsafe benchmark cleanup");
  await fs.rm(directory, { recursive: true, force: true });
}
