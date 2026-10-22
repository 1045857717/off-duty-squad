import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../server/app";
import { finishDeployment, prepareInBrowser } from "./browser-support";
import { ENEMY_DEFS } from "../shared/combatProfiles";
import { EMPTY_INPUT } from "../shared/content";
import type { EnemyKind } from "../shared/types";
const dir = await fs.mkdtemp(path.join(tmpdir(), "undead39-")),
  app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + (app.http.address() as any).port;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const errors: string[] = [],
  passed: string[] = [];
const done = (s: string) => {
  passed.push(s);
  console.log("QUIET_UNDEAD_PASS", s);
};
await fs.mkdir("test-results/undead39", { recursive: true });
const open = async (name: string) => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript((n) => {
    (window as any).__name = (f: any) => f;
    localStorage.setItem("offduty-name", JSON.stringify(n));
    localStorage.setItem(
      "offduty-settings",
      JSON.stringify({
        autoFire: false,
        showGuide: false,
        sound: false,
        opacity: 1,
      }),
    );
  }, name);
  await p.goto(base);
  await p.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return p;
};
const snap = (p: Page, name: string) =>
  p.screenshot({ path: "test-results/undead39/" + name + ".png" });
try {
  const host = await open("摸鱼组长"),
    peer = await open("摸鱼搭子"),
    viewer = await open("看鱼群众");
  assert.match(await host.title(), /带薪摸鱼/);
  assert.ok(!(await host.locator("body").innerText()).includes("本群不查考勤"));
  done("新名称与轻松聊天文案正确");
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code);
  for (const [p, watch] of [
    [peer, false],
    [viewer, true],
  ] as const) {
    await p.getByLabel("搜索公开房间").fill(code);
    await p
      .locator(".live-room-list article")
      .filter({ hasText: code })
      .getByRole("button", { name: watch ? "观战" : "加入小队", exact: true })
      .click();
    await p.getByRole("region", { name: "小队准备大厅" }).waitFor();
  }
  await prepareInBrowser(peer);
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await Promise.all([finishDeployment(host), finishDeployment(peer)]);
  const g = app.rooms.get(code)!,
    me = g.state.players.find((p) => p.name === "摸鱼组长")!;
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.waveEnds = 999;
  g.state.waveTarget = 999999;
  g.state.enemies = [];
  for (const p of g.state.players) {
    p.invulnerable = 9999;
    p.basicCd = 999;
    p.arsenal = {};
    g.inputs.set(p.id, { ...EMPTY_INPUT, fire: false });
  }
  me.arsenal = { pulse: 1, orbit: 4, bat: 8, arc: 3 };
  me.attackCooldowns = { pulse: 999, orbit: 999, bat: 999, arc: 999 };
  await host.evaluate(() => {
    const w = window as any,
      proto = w.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    proto.setData = function (k: any, v: any, ...a: any[]) {
      if (k === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId)
        w.__scene = this.scene;
      return old.call(this, k, v, ...a);
    };
  });
  await host.waitForFunction(() => !!(window as any).__scene);
  const layout = async () =>
    host.evaluate(() => {
      const box = (s: string) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          b: r.bottom,
          r: r.right,
        };
      };
      return {
        hp: box(".combat-vitals"),
        strip: box(".combat-strip"),
        build: box(".arsenal-strip"),
        stage: box(".game-stage"),
        app: box(".app"),
      };
    });
  await host.waitForTimeout(100);
  var rect = await layout();
  assert.ok(rect.build.b <= rect.strip.y - 2, JSON.stringify(rect));
  assert.ok(rect.hp.w <= 130 && rect.hp.h <= 40);
  await snap(host, "dock-full");
  await host.locator(".arsenal-toggle").click();
  rect = await layout();
  assert.ok(rect.build.b < rect.strip.y);
  const details = await host.locator(".build-details").boundingBox();
  assert.ok(details && details.y + details.height <= rect.build.y);
  await host.locator(".arsenal-toggle").click();
  done("构筑与生命栏垂直流式对齐，展开详情也不会盖住血条");
  const id = me.id;
  await host.keyboard.press("F9");
  await host.locator(".quiet-embedded").waitFor();
  await host.waitForTimeout(250);
  rect = await layout();
  assert.ok(rect.app.w <= 522 && rect.app.h <= 352, JSON.stringify(rect));
  assert.ok(
    rect.stage.w >= 400 &&
      rect.stage.w <= 522 &&
      rect.stage.h >= 300 &&
      rect.stage.h <= 352,
    JSON.stringify(rect),
  );
  assert.ok(rect.build.b <= rect.strip.y - 2);
  assert.ok(rect.strip.r <= rect.stage.r);
  const canvasBox = await host.locator("canvas").first().boundingBox();
  assert.ok(
    canvasBox &&
      Math.abs(canvasBox.width - rect.stage.w) < 2 &&
      Math.abs(canvasBox.height - rect.stage.h) < 2,
    JSON.stringify({ canvasBox, rect }),
  );
  assert.equal(await host.title(), "状态面板");
  assert.equal(await host.evaluate(() => window.__OFFDUTY__!.playerId), id);
  assert.equal(g.state.players.length, 2);
  await snap(host, "quiet-mini");
  await fs.writeFile(
    "test-results/undead39/mini-layout.json",
    JSON.stringify(
      await host.evaluate(() => {
        let el: Element | null = document.querySelector("canvas");
        const rows = [];
        while (el) {
          const s = getComputedStyle(el),
            r = el.getBoundingClientRect();
          rows.push({
            tag: el.tagName,
            cl: el.className,
            x: r.x,
            y: r.y,
            w: r.width,
            h: r.height,
            display: s.display,
            opacity: s.opacity,
            position: s.position,
            visibility: s.visibility,
            transform: s.transform,
            overflow: s.overflow,
          });
          el = el.parentElement;
        }
        return rows;
      }),
      null,
      2,
    ),
  );
  const before = me.x;
  await host.keyboard.down("KeyD");
  await host.waitForTimeout(280);
  await host.keyboard.up("KeyD");
  assert.ok(Math.abs(me.x - before) > 15);
  await host.keyboard.press("F9");
  await host.locator(".quiet-embedded").waitFor({ state: "detached" });
  assert.match(await host.title(), /带薪摸鱼/);
  assert.equal(g.state.spectators.length, 1);
  done(
    "F9真实缩为520×350，安静标题和自动收起栏；移动、队友、观众不掉线，F9恢复",
  );
  for (const viewport of [
    { width: 620, height: 600 },
    { width: 390, height: 700 },
  ]) {
    await host.setViewportSize(viewport);
    await host.waitForTimeout(180);
    rect = await layout();
    assert.ok(rect.build.b <= rect.strip.y - 2);
    assert.ok(rect.strip.r <= rect.stage.r + 1, JSON.stringify(rect));
    await snap(host, "dock-" + viewport.width);
  }
  await host.setViewportSize({ width: 1440, height: 1000 });
  await Promise.all([peer.close(), viewer.close()]);
  g.state.enemies = [];
  await host.waitForTimeout(100);
  const kinds = Object.keys(ENEMY_DEFS) as EnemyKind[];
  const actors = kinds.map((kind, i) => ({
    id: 5000 + i,
    kind,
    x: me.x + (i - 3) * 72,
    y: me.y - 70,
    hp: 1e9,
    maxHp: 1e9,
    speed: 0,
    cd: 999,
    angle: Math.PI / 2,
    hitFlash: 0,
    screamCd: 999,
  }));
  g.state.enemies = actors;
  await host.waitForTimeout(300);
  await host.evaluate(() => {
    const w = window as any,
      proto = w.Phaser.Renderer.WebGL.WebGLPipeline.prototype,
      old = proto.batchQuad;
    w.__zombieQuads = { count: 0, onScreen: 0, invalid: 0, parts: {} };
    w.__restoreZombieBatch = () => (proto.batchQuad = old);
    proto.batchQuad = function (image: any, ...args: any[]) {
      const name = image?.frame?.name;
      if (typeof name === "string" && name.startsWith("zombie-")) {
        const q = w.__zombieQuads;
        q.count++;
        q.parts[name] = (q.parts[name] || 0) + 1;
        if (!args.slice(0, 8).every(Number.isFinite)) q.invalid++;
        const xs = [args[0], args[2], args[4], args[6]],
          ys = [args[1], args[3], args[5], args[7]];
        if (
          Math.max(...xs) > 0 &&
          Math.min(...xs) < this.renderer.width &&
          Math.max(...ys) > 0 &&
          Math.min(...ys) < this.renderer.height
        )
          q.onScreen++;
      }
      return old.call(this, image, ...args);
    };
  });
  await host.keyboard.press("F9");
  await host.waitForTimeout(120);
  const bossBounds = await host
      .getByRole("region", { name: "全局BOSS血条" })
      .boundingBox(),
    miniStage = await host.locator(".game-stage").boundingBox();
  assert.ok(
    bossBounds &&
      miniStage &&
      bossBounds.x >= miniStage.x &&
      bossBounds.y >= miniStage.y &&
      bossBounds.x + bossBounds.width <= miniStage.x + miniStage.width,
    JSON.stringify({ bossBounds, miniStage }),
  );
  assert.ok(await host.locator(".global-boss-vitals header b").isVisible());
  await snap(host, "mini-boss");
  await host.keyboard.press("F9");
  await host.waitForTimeout(120);
  await host.waitForFunction(() => {
    const s = (window as any).__scene;
    return !!(s?.sys?.isActive?.() && s?.actors?.get("e5000")?.rig?.active);
  });
  const audit = await host.evaluate(async (kinds) => {
    const w = window as any,
      s = w.__scene;
    const results: any = {};
    let frame = 0;
    await new Promise<void>((resolve) => {
      const inspect = () => {
        for (let i = 0; i < kinds.length; i++) {
          const actor = s.actors.get("e" + (5000 + i)),
            rig = actor?.rig;
          if (!rig) continue;
          const cycle = (frame % 60) / 60,
            elapsed = frame / 60,
            charge = cycle < 0.4,
            angle = (Math.floor(frame / 18) * Math.PI) / 4;
          rig.updateEnemy(
            {
              kind: kinds[i],
              windup: charge ? 1 - cycle / 0.4 : 0,
              windupTotal: 1,
              attackStartedAt: charge ? -99 : elapsed - (cycle - 0.4),
              hitFlash: Math.max(0, Math.sin(frame * 0.1)) * 0.06,
              vx: 60,
              vy: 0,
            },
            angle,
            2.4,
            1000 / 60,
            performance.now(),
            elapsed,
            0,
          );
          const record = (results[kinds[i]] ??= {
            model: rig.pose.model,
            renderPath: rig.pose.renderPath,
            parts: rig.pose.parts,
            atlas: [
              rig.layers[0].bones[0].image.texture.getSourceImage().width,
              rig.layers[0].bones[0].image.texture.getSourceImage().height,
            ],
            heads: new Set<string>(),
            joints: {},
            directions: new Set<number>(),
            visible: rig.visible,
          });
          record.heads.add(
            rig.layers.find((l: any) => l.group.visible)?.images.get("head")
              .frame.name,
          );
          record.directions.add(rig.pose.dir);
          for (const bone of rig.layers[rig.layerIndex].bones) {
            const name =
              rig.parts[rig.layers[rig.layerIndex].bones.indexOf(bone)].name;
            (record.joints[name] ??= new Set<number>()).add(
              Math.round(bone.rotation * 1000),
            );
          }
        }
        if (++frame >= 140) {
          s.events.off("postupdate", inspect);
          resolve();
        }
      };
      s.events.on("postupdate", inspect);
      const t = setInterval(() => {
        const t = frame / 140;
        for (const e of w.__OFFDUTY__.state.enemies) {
          e.angle = (Math.floor(t * 8) * Math.PI) / 4;
        }
      }, 25);
      setTimeout(() => clearInterval(t), 3000);
    });
    for (const r of Object.values(results) as any[]) {
      r.heads = [...r.heads];
      r.directions = [...r.directions];
      r.joints = Object.fromEntries(
        Object.entries(r.joints).map(([k, v]: any) => [k, v.size]),
      );
    }
    results.__gpu = w.__zombieQuads;
    w.__restoreZombieBatch();
    return results;
  }, kinds);
  for (const kind of kinds) {
    assert.equal(audit[kind].model, "zombie-" + kind);
    assert.equal(audit[kind].parts, 15);
    assert.ok(audit[kind].atlas.every((n: number) => n > 0 && n <= 4096));
    assert.equal(audit[kind].renderPath, "joint-quad-batch");
    assert.ok(
      audit[kind].heads.every((s: string) => s.startsWith("zombie-" + kind)),
    );
    assert.ok(audit[kind].joints.jaw > 3);
    assert.ok(audit[kind].joints.leftHand > 3);
    assert.ok(audit[kind].joints.rightHand > 3);
    assert.equal(audit[kind].directions.length, 8);
    for (const [joint, count] of Object.entries(audit[kind].joints))
      assert.ok((count as number) > 3, kind + " frozen " + joint);
  }
  assert.ok(audit.__gpu.count > 700);
  assert.equal(audit.__gpu.invalid, 0);
  assert.ok(
    audit.__gpu.onScreen > audit.__gpu.count * 0.75,
    JSON.stringify(audit.__gpu),
  );
  await snap(host, "seven-undead");
  await fs.writeFile(
    "test-results/undead39/actual-rigs.json",
    JSON.stringify(audit, null, 2),
  );
  done("七类实际敌人全部使用独立丧尸贴图与15关节，下颌和手腕持续动作");
  const deathIds = g.state.enemies.map((e) => e.id);
  await host.evaluate((ids) => {
    const w = window as any,
      s = w.__scene;
    w.__deathSeen = {};
    const capture = () => {
      for (const id of ids) {
        const r = s.children.list.find((c: any) => c.name === "rig-e" + id);
        if (r?.pose.dying && r.rotation > 0)
          w.__deathSeen[id] = {
            id,
            dying: r.pose.dying,
            fall: r.pose.fall,
            rotation: r.rotation,
            alpha: r.alpha,
          };
      }
    };
    s.events.on("postupdate", capture);
    w.__stopDeathCapture = () => s.events.off("postupdate", capture);
  }, deathIds);
  for (const e of g.state.enemies) e.hp = 0;
  await host.waitForFunction(
    (ids) => ids.every((id) => (window as any).__deathSeen[id]),
    deathIds,
    { polling: 30, timeout: 15000 },
  );
  const fallen = await host.evaluate(() => {
    const w = window as any;
    w.__stopDeathCapture();
    return Object.values(w.__deathSeen) as {
      id: number;
      dying: boolean;
      rotation: number;
      fall: number;
      alpha: number;
    }[];
  });
  assert.equal(fallen.length, 7);
  assert.ok(
    fallen.every((f) => f.dying && f.rotation > 0 && f.alpha < 1),
    JSON.stringify(fallen),
  );
  await snap(host, "undead-fall");
  done("七类丧尸的实际死亡均保留骨架连续倒地，并逐渐消退");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/undead39/report.json",
    JSON.stringify({ passed, errors, audit }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }));
} finally {
  await browser.close();
  await app.close();
  if (
    !path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(dir).startsWith("undead39-")
  )
    throw Error("Unsafe temporary cleanup");
  await fs.rm(dir, { recursive: true, force: true });
}
