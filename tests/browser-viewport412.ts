import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "../server/app";
import { generateWorld } from "../shared/world";
import { finishDeployment } from "./browser-support";

const dir = await mkdtemp(path.join(tmpdir(), "offduty-viewport412-"));
const app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const errors: string[] = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__name = (f: any) => f;
    localStorage.setItem(
      "offduty-settings",
      JSON.stringify({ autoFire: false, showGuide: false, sound: false }),
    );
  });
  await page.goto(`http://127.0.0.1:${(app.http.address() as any).port}`);
  await page.getByRole("button", { name: "创建小队", exact: true }).click();
  await page.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await page.getByRole("button", { name: "小队出发", exact: true }).click();
  await finishDeployment(page);
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code);
  const g = app.rooms.get(code)!,
    me = g.state.players[0];
  g.state.spawnCd = g.state.eventCd = g.state.waveEnds = 9999;
  g.state.enemies = [];
  g.state.bullets = [];
  g.state.effects = [];
  g.state.pickups = [];
  g.state.officeProps = [];
  g.state.areas = [];
  me.invulnerable = 9999;
  me.arsenal = {};
  await page.evaluate(() => {
    const w = window as any,
      proto = w.Phaser.GameObjects.Container.prototype,
      original = proto.setData;
    proto.setData = function (k: any, v: any, ...args: any[]) {
      if (k === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId)
        w.__scene412 = this.scene;
      return original.call(this, k, v, ...args);
    };
  });
  await page.waitForFunction(() => !!(window as any).__scene412);
  await page.waitForFunction(
    () => window.__OFFDUTY__!.state!.enemies.length === 0,
  );
  const world = g.state.world;
  const room = [...world.rooms].sort((a, b) => b.w * b.h - a.w * a.h)[0];
  me.x = room.x + room.w / 2;
  me.y = room.y + room.h / 2;
  const far = world.tiles
    .flatMap((tile, i) =>
      tile
        ? [
            {
              x: ((i % world.cols) + 0.5) * world.tile,
              y: (Math.floor(i / world.cols) + 0.5) * world.tile,
            },
          ]
        : [],
    )
    .sort(
      (a, b) =>
        Math.hypot(b.x - me.x, b.y - me.y) - Math.hypot(a.x - me.x, a.y - me.y),
    )[0];
  await page.waitForTimeout(400);
  const ids = Array.from({ length: 150 }, () => ++g.state.serial);
  g.state.enemies = ids.map((id) => ({
    id,
    kind: "tank",
    ...far,
    hp: 99999,
    maxHp: 99999,
    speed: 0,
    cd: 9999,
    angle: 0,
    hitFlash: 0,
  }));
  g.state.bullets = ids.map((id) => ({
    id,
    ...far,
    vx: 0,
    vy: 0,
    owner: me.id,
    damage: 1,
    life: 9999,
    enemy: true,
    color: "#fff",
  }));
  g.state.pickups = ids.map((id) => ({
    id,
    ...far,
    kind: "crystal",
    value: 1,
  }));
  await page.waitForFunction(
    () => window.__OFFDUTY__!.state!.enemies.length === 150,
  );
  await page.waitForTimeout(250);
  const offscreen = await page.evaluate((ids) => {
    const scene = (window as any).__scene412;
    return {
      actors: ids.filter((id) => scene.actors.has("e" + id)).length,
      bullets: ids.filter((id) => scene.bullets.has(id)).length,
      pickups: ids.filter((id) => scene.items.has("pickup-" + id)).length,
    };
  }, ids);
  assert.deepEqual(offscreen, { actors: 0, bullets: 0, pickups: 0 });
  const first = g.state.enemies[0];
  first.x = me.x + 80;
  first.y = me.y;
  g.state.bullets[0].x = me.x + 80;
  g.state.bullets[0].y = me.y;
  g.state.pickups[0].x = me.x + 60;
  g.state.pickups[0].y = me.y;
  await page.waitForFunction((id) => {
    const s = (window as any).__scene412;
    return (
      s.actors.get("e" + id)?.rig?.visible &&
      s.bullets.get(id)?.visible &&
      s.items.has("pickup-" + id)
    );
  }, ids[0]);
  first.x = far.x;
  first.y = far.y;
  g.state.bullets[0].x = far.x;
  g.state.bullets[0].y = far.y;
  await page.waitForFunction((id) => {
    const s = (window as any).__scene412;
    return !s.actors.get("e" + id)?.rig?.visible && !s.bullets.get(id)?.visible;
  }, ids[0]);
  first.x = me.x + 90;
  first.y = me.y;
  await page.waitForFunction(
    (id) => !!(window as any).__scene412.actors.get("e" + id)?.rig?.visible,
    ids[0],
  );
  first.x = far.x;
  first.y = far.y;
  await page.waitForFunction(
    (id) => !(window as any).__scene412.actors.get("e" + id)?.rig?.visible,
    ids[0],
  );
  const before = await page.evaluate(
    () => (window as any).__scene412.corpses.length,
  );
  g.state.enemies = [];
  g.state.bullets = [];
  await page.waitForFunction(
    () => window.__OFFDUTY__!.state!.enemies.length === 0,
  );
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => (window as any).__scene412.corpses.length),
    before,
    "Offscreen deaths must not allocate invisible corpses",
  );
  await page.evaluate(() => {
    const w = window as any;
    w.__beforeReset412 = w.__scene412.actors.get(w.__OFFDUTY__.playerId);
  });
  g.state.world = generateWorld(4123900, g.state.mode);
  g.nav = undefined;
  g.state.elapsed = 0;
  me.x = g.state.world.spawn.x;
  me.y = g.state.world.spawn.y;
  await page.waitForFunction(() => {
    const w = window as any;
    return (
      w.__OFFDUTY__.state.world.seed === 4123900 &&
      w.__scene412.actors.get(w.__OFFDUTY__.playerId) !== w.__beforeReset412
    );
  });
  // Exercise the scene's local preview route against a frozen server clock.
  const previewMotion = await page.evaluate(() => {
    const w = window as any,
      scene = w.__scene412,
      time = scene.frameNow;
    const p = {
      ...w.__OFFDUTY__.state.players[0],
      id: "preview-proof412",
      x: 300,
      y: 300,
    };
    scene.drawPlayer(p, time, 16, true);
    const start = scene.actors.get(p.id).x;
    p.x += 18;
    scene.drawPlayer(p, time + 16, 16, true);
    const end = scene.actors.get(p.id).x;
    scene.destroyActor(p.id, scene.actors.get(p.id), false);
    return { start, end };
  });
  assert.ok(
    previewMotion.end - previewMotion.start > 0.1,
    "Local preview must move at frozen server elapsed",
  );
  assert.deepEqual(errors, []);
  await mkdir("test-results/viewport412", { recursive: true });
  await writeFile(
    "test-results/viewport412/report.json",
    JSON.stringify(
      {
        offscreen,
        visibleEntry: true,
        exit: true,
        offscreenDeath: true,
        reentry: true,
        worldReset: true,
        lobbyPreview: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "viewport412: 150 offscreen enemies + bullets + pickups allocate zero visuals; entry/exit/death passed",
  );
} finally {
  await browser.close();
  await app.close();
  const target = path.resolve(dir);
  if (
    !target.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(target).startsWith("offduty-viewport412-")
  )
    throw Error("Unsafe cleanup");
  await rm(target, { recursive: true, force: true });
}
