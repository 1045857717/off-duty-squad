import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../server/app";
import { finishDeployment } from "./browser-support";
import { ROLES, EMPTY_INPUT } from "../shared/content";
import type { Role } from "../shared/types";
import { worldBlocked } from "../shared/world";
const dir = mkdtempSync(path.join(tmpdir(), "office-art40-"));
const app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const errors: string[] = [],
  audit: any[] = [];
const out = "test-results/art40";
await fs.mkdir(out, { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__name = (f: any) => f;
    localStorage.setItem("offduty-name", JSON.stringify("美术审查员"));
  });
  await page.goto("http://127.0.0.1:" + (app.http.address() as any).port);
  await page.getByRole("region", { name: "公开房间大厅" }).waitFor();
  await page.screenshot({ path: out + "/lobby.png", fullPage: true });
  await page.getByRole("button", { name: "创建小队", exact: true }).click();
  await page.getByLabel("你的行动代号").fill("美术审查员");
  await page.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await page.screenshot({ path: out + "/ready-room.png", fullPage: true });
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code);
  await page.getByRole("button", { name: "小队出发", exact: true }).click();
  await finishDeployment(page);
  const g = app.rooms.get(code)!,
    me = g.state.players[0];
  g.state.spawnCd = g.state.eventCd = g.state.waveEnds = 999;
  g.state.enemies = [];
  g.state.officeProps = [];
  g.state.event = { kind: "none", name: "", desc: "", remaining: 999 };
  me.invulnerable = 999;
  me.arsenal = {};
  me.attackCooldowns = {};
  const room = [...g.state.world.rooms]
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .find((r) => r.w >= 320 && r.h >= 320)!;
  assert.ok(room);
  me.x = room.x + room.w / 2;
  me.y = room.y + room.h / 2;
  await page.evaluate(() => {
    const w = window as any,
      proto = w.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    proto.setData = function (k: any, v: any, ...rest: any[]) {
      if (k === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId)
        w.__rig = this;
      return old.call(this, k, v, ...rest);
    };
  });
  await page.waitForFunction(() => !!(window as any).__rig);
  if (
    (await page
      .getByRole("button", { name: "自动开火快捷开关", exact: true })
      .getAttribute("aria-pressed")) === "true"
  )
    await page.keyboard.press("t");
  await page.evaluate(() => {
    const fx = (window as any).__rig.scene.fx,
      original = fx.fillRibbon;
    fx.fillRibbon = function (points: any[], ...args: any[]) {
      if (points.length === 26)
        this.__lastMelee = points.map((p) => ({ x: p.x, y: p.y }));
      return original.call(this, points, ...args);
    };
  });
  await page.waitForTimeout(3600);
  for (let d = 0; d < 8; d++) {
    const angle = (d * Math.PI) / 4;
    me.role = "guardian";
    me.basicCd = 0;
    me.attackMotion = undefined;
    me.arsenal = {};
    me.damage = ROLES.guardian.damage;
    me.rate = 0.32;
    const target = {
      id: 800 + d,
      kind: "tank" as const,
      x: me.x + Math.cos(angle) * 65,
      y: me.y + Math.sin(angle) * 65,
      hp: 100000,
      maxHp: 100000,
      speed: 0,
      cd: 999,
      angle: angle + Math.PI,
      hitFlash: 0,
    };
    assert.ok(!worldBlocked(g.state.world, target.x, target.y, 8));
    g.state.enemies = [target];
    const pointer = await page.evaluate(
      ({ x, y }) => {
        const scene = (window as any).__rig.scene,
          cam = scene.cameras.main,
          canvas = scene.game.canvas,
          box = canvas.getBoundingClientRect(),
          p = cam.matrix.transformPoint(x - cam.scrollX, y - cam.scrollY);
        return {
          x: box.x + (p.x * box.width) / canvas.width,
          y: box.y + (p.y * box.height) / canvas.height,
        };
      },
      { x: me.x + Math.cos(angle) * 145, y: me.y + Math.sin(angle) * 145 },
    );
    await page.evaluate(() => {
      (window as any).__rig.scene.fx.__lastMelee = undefined;
    });
    await page.mouse.move(pointer.x, pointer.y);
    const before = me.damageDealt;
    const previousSeq = me.attackSeq;
    await page.mouse.down();
    await page.waitForFunction((previousSeq) => {
      const rig = (window as any).__rig,
        p = rig.pose;
      return (
        rig.clock.current?.seq > previousSeq &&
        p.attack === "bat" &&
        p.attackPhase > 0.42 &&
        p.attackPhase < 0.72 &&
        rig.scene.fx.__lastMelee?.length === 26
      );
    }, previousSeq);
    const sample = await page.evaluate(() => {
      const w = window as any,
        rig = w.__rig,
        scene = rig.scene,
        a = scene.actors.get(w.__OFFDUTY__.playerId),
        v = a.weapon.getData("attack");
      return {
        ribbon: scene.fx.__lastMelee || [],
        floatOverlaps: scene.floats.filter((f: any) => {
          if (!f.active || !f.text.visible) return false;
          const b = f.text.getBounds(),
            v = a.vitals.getBounds();
          return (
            b.right > v.left &&
            b.left < v.right &&
            b.bottom > v.top &&
            b.top < v.bottom
          );
        }).length,
        pose: { ...rig.pose },
        angle: a.aim,
        weaponRotation: a.weapon.rotation,
        weaponTexture: a.weapon.texture.key,
        weaponFrame: a.weapon.frame.name,
        gripError: Math.hypot(
          a.weapon.x - rig.handWorld().x,
          a.weapon.y - rig.handWorld().y,
        ),
        tip: { x: v.tipX, y: v.tipY },
        atlas: rig.layers[rig.layerIndex].images.get("head").texture.key,
      };
    });
    await page.screenshot({ path: out + "/swing-" + d + ".png" });
    await page.mouse.up();
    await fs.writeFile(
      out + "/last-direction.json",
      JSON.stringify(
        {
          direction: d,
          expected: angle,
          server: me.angle,
          motion: me.attackMotion,
          pointer,
          sample,
        },
        null,
        2,
      ),
    );
    assert.ok(
      Math.abs(
        Math.atan2(
          Math.sin(sample.angle - angle),
          Math.cos(sample.angle - angle),
        ),
      ) < 0.13,
      "wrong body heading " + d,
    );
    assert.equal(
      sample.floatOverlaps,
      0,
      "damage numbers overlap the local foot vitals " + d,
    );
    assert.equal(
      sample.ribbon.length,
      26,
      "no actual world-space melee ribbon " + d,
    );
    for (const vertex of sample.ribbon) {
      const dx = vertex.x - me.x,
        dy = vertex.y - me.y;
      assert.ok(
        Math.hypot(dx, dy) <= 136.01,
        "ribbon rendered away from its actual attacker " + d,
      );
      assert.ok(
        dx * Math.cos(angle) + dy * Math.sin(angle) > 0,
        "visible ribbon behind the real hit direction " + d,
      );
    }
    assert.ok(sample.gripError < 1, "detached weapon " + d);
    assert.equal(sample.weaponTexture, "joint-atlas-v40");
    assert.equal(sample.weaponFrame, "basic-tool-guardian");
    assert.equal(sample.atlas, "joint-atlas-v40");
    assert.ok(me.damageDealt > before, "no real forward damage " + d);
    audit.push({ direction: d, ...sample, damage: me.damageDealt - before });
    await page.waitForTimeout(480);
  }
  me.role = "scout";
  g.state.enemies = [];
  const projectiles = [
    { id: "pulse", basic: true, frame: "keycap" },
    { id: "pulse", basic: false, frame: "pulse" },
    { id: "frost", basic: false, frame: "frost" },
    { id: "blade", basic: false, frame: "blade" },
    { id: "ricochet", basic: false, frame: "ricochet" },
    { id: "drone", basic: false, frame: "drone" },
    { id: "seeker", basic: false, frame: "seeker" },
    { id: "venom", basic: false, frame: "venom" },
    { id: "flame", basic: false, frame: "flame" },
  ];
  g.state.serial = Math.max(g.state.serial, 5000);
  g.state.bullets = projectiles.map((v, i) => ({
    id: 4000 + i,
    x: me.x + ((i % 3) - 1) * 90,
    y: me.y + (Math.floor(i / 3) - 1) * 90,
    vx: 0,
    vy: 0,
    owner: me.id,
    damage: 0,
    life: 20,
    enemy: false,
    color: "#c4d4cc",
    attackSkill: v.id as any,
    basic: v.basic,
    level: 1,
  }));
  await page.waitForFunction((items) => {
    const s = (window as any).__rig.scene;
    return items.every(
      (v, i) => s.bullets.get(4000 + i)?.frame.name === "projectile-" + v.frame,
    );
  }, projectiles);
  await page.screenshot({ path: out + "/projectile-materials.png" });
  g.state.bullets = [];
  const coverage = await page.evaluate(() => {
    const rig = (window as any).__rig,
      scene = rig.scene,
      texture = scene.textures.get("joint-atlas-v40"),
      canvas = texture.getSourceImage(),
      ctx = canvas.getContext("2d"),
      models = [
        "developer",
        "technician",
        "security",
        "admin",
        "workhorse",
        "chef",
        "director",
        "designer",
      ],
      parts = rig.parts.map((p: any) => p.name),
      results: any[] = [];
    for (const model of models)
      for (let col = 0; col < 6; col++)
        for (const part of parts) {
          const f = texture.get(model + "-" + col + "-" + part),
            pixels = ctx.getImageData(
              f.cutX,
              f.cutY,
              f.cutWidth,
              f.cutHeight,
            ).data;
          let opaque = 0;
          for (let i = 3; i < pixels.length; i += 4)
            if (pixels[i] > 40) opaque++;
          results.push({
            model,
            col,
            part,
            opaque,
            w: f.cutWidth,
            h: f.cutHeight,
          });
        }
    return { width: canvas.width, height: canvas.height, frames: results };
  });
  assert.ok(coverage.width <= 4096 && coverage.height <= 4096);
  assert.equal(coverage.frames.length, 672);
  for (const f of coverage.frames) assert.ok(f.opaque > 8, JSON.stringify(f));
  await page.screenshot({ path: out + "/gameplay.png" });
  await page.keyboard.press("F9");
  await page.locator(".quiet-embedded").waitFor();
  await page.screenshot({ path: out + "/quiet.png" });
  await page.keyboard.press("F9");
  const bounds = await page.locator(".game-stage").boundingBox();
  assert.ok(bounds && bounds.width > 300 && bounds.height > 100);
  await fs.writeFile(
    out + "/direction-audit.json",
    JSON.stringify({ audit, coverage, errors }, null, 2),
  );
  assert.deepEqual(errors, []);
  console.log(
    "ART40_PASS",
    JSON.stringify({
      directions: audit.length,
      projectileIdentities: projectiles.length,
      humanFrames: coverage.frames.length,
      atlas: [coverage.width, coverage.height],
      errors,
    }),
  );
} finally {
  await browser.close();
  await app.close();
  const cleanup = path.resolve(dir);
  if (
    !cleanup.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(cleanup).startsWith("office-art40-")
  )
    throw Error("Unsafe cleanup");
  rmSync(cleanup, { recursive: true, force: true });
}
