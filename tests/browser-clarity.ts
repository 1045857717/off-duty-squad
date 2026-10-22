import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createServer } from "../server/app";
import { ROLES, EMPTY_INPUT } from "../shared/content";
import { ROLE_BASICS } from "../shared/basics";
import { ROLE_SIGNATURE } from "../shared/arsenal";
import type { Role } from "../shared/types";
import {
  prepareInBrowser,
  finishDeployment,
  readTextContrast,
} from "./browser-support";
const dir = mkdtempSync(path.join(tmpdir(), "clarity37-")),
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
  passed: string[] = [],
  actions: Record<string, unknown> = {};
const done = (s: string) => {
  passed.push(s);
  console.log("CLARITY_PASS", s);
};
await fs.mkdir("test-results/clarity", { recursive: true });
await fs.rm("test-results/clarity/errors.json", { force: true });
const open = async (name: string) => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript((n) => {
    (window as any).__name = (fn: any) => fn;
    localStorage.setItem("offduty-name", JSON.stringify(n));
  }, name);
  await p.goto(base);
  await p.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return p;
};
try {
  const host = await open("普攻组长"),
    peer = await open("普攻队友"),
    viewer = await open("普攻观众");
  assert.match(await host.locator(".scene-copy h2").innerText(), /班是公司的/);
  assert.match(await host.locator(".scene-copy h2").innerText(), /鱼是自己的/);
  const project = host.getByRole("link", { name: "GitHub开源项目" });
  assert.equal(
    await project.getAttribute("href"),
    "https://github.com/1045857717/off-duty-squad",
  );
  assert.equal(await project.getAttribute("target"), "_blank");
  assert.match(await host.title(), /带薪摸鱼/);
  assert.equal(
    await host
      .getByRole("button", { name: "请作者喝咖啡", exact: true })
      .count(),
    0,
  );
  assert.equal(await host.locator('img[src*="wechat-coffee"]').count(), 0);
  assert.equal(
    await fs.stat("dist/wechat-coffee.png").then(
      () => true,
      () => false,
    ),
    false,
  );
  assert.equal(
    createHash("sha256")
      .update(await fs.readFile("docs/support/wechat-coffee.png"))
      .digest("hex"),
    "a342ad5d660da97c4834fb9d0c01ade2e52969272943896fb32001217e2da20a",
  );
  done(
    "新品牌与摸鱼标题正确，GitHub链接可用；咖啡二维码仅在仓库文档，游戏与构建不含二维码",
  );
  await host.screenshot({
    path: "test-results/clarity/lobby.png",
    fullPage: true,
  });
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByLabel("你的行动代号").fill("普攻组长");
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
  const game = app.rooms.get(code)!,
    me = game.state.players.find((p) => p.name === "普攻组长")!,
    teammate = game.state.players.find((p) => p.id !== me.id)!;
  game.state.spawnCd = 999;
  game.state.eventCd = 999;
  game.state.waveEnds = 999;
  game.state.waveTarget = 99999;
  me.invulnerable = 999;
  teammate.invulnerable = 999;
  game.inputs.set(teammate.id, { ...EMPTY_INPUT, fire: false });
  await host.evaluate(() => {
    const w = window as any,
      proto = w.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    proto.setData = function (key: any, value: any, ...args: any[]) {
      if (key === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId)
        w.__rig = this;
      return old.call(this, key, value, ...args);
    };
  });
  await host.waitForFunction(() => !!(window as any).__rig);
  const auto = host.getByRole("button", {
    name: "自动开火快捷开关",
    exact: true,
  });
  if ((await auto.getAttribute("aria-pressed")) === "true")
    await host.keyboard.press("t");
  await host.waitForTimeout(550);
  await host.mouse.move(1050, 490);
  await host.waitForTimeout(120);
  for (const role of Object.keys(ROLES) as Role[]) {
    me.role = role;
    me.ability = ROLE_SIGNATURE[role];
    me.damage = ROLES[role].damage;
    me.arsenal = {};
    me.attackCooldowns = {};
    me.basicCd = 0;
    me.attackMotion = undefined;
    me.hp = me.maxHp = ROLES[role].hp;
    me.shield = 0;
    me.rate = 0.32;
    const intendedAim = await host.evaluate(() => {
      const scene = (window as any).__rig.scene,
        ptr = scene.input.activePointer,
        pos = scene.cameras.main.getWorldPoint(ptr.x, ptr.y),
        me = window.__OFFDUTY__!.state!.players.find(
          (p) => p.id === window.__OFFDUTY__!.playerId,
        )!;
      return Math.atan2(pos.y - me.y, pos.x - me.x);
    });
    game.state.enemies = [
      {
        id: 900,
        kind: "tank",
        x: me.x + Math.cos(intendedAim) * 62,
        y: me.y + Math.sin(intendedAim) * 62,
        hp: 100000,
        maxHp: 100000,
        speed: 0,
        cd: 999,
        angle: 0,
        hitFlash: 0,
      },
    ];
    const before = me.damageDealt;
    await host.waitForTimeout(90);
    await host.mouse.down();
    const samples = await host.evaluate(async () => {
      const w = window as any,
        samples: any[] = [],
        start = performance.now();
      await new Promise<void>((resolve) => {
        const frame = () => {
          const rig = w.__rig,
            a = rig?.scene.actors.get(w.__OFFDUTY__.playerId);
          if (rig && a) {
            const v = a.weapon?.getData("attack");
            samples.push({
              phase: rig.pose.attackPhase,
              attack: rig.pose.attack,
              arm: rig.pose.rightArm,
              torso: rig.pose.torso,
              weapon: v?.id,
              active: v?.active,
              visible: a.weapon?.visible,
              hand: rig.handWorld(),
              x: a.weapon?.x,
              y: a.weapon?.y,
              tipX: v?.tipX,
              tipY: v?.tipY,
              parts: rig.pose.parts,
              depth: rig.depth,
              actorDepth: a.depth,
            });
          }
          if (performance.now() - start < 1000) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      return samples;
    });
    await host.mouse.up();
    const active = samples.filter(
      (s) =>
        s.active &&
        s.attack === ROLE_BASICS[role].weapon &&
        s.phase > 0.05 &&
        s.phase < 0.9,
    );
    assert.ok(active.length >= 6, role + " missing actual normal frames");
    assert.ok(
      active.every(
        (s) =>
          s.visible && s.weapon === ROLE_BASICS[role].weapon && s.parts === 14,
      ),
      role + " wrong visible basic",
    );
    assert.ok(
      active.every((s) => Math.hypot(s.x - s.hand.x, s.y - s.hand.y) < 1),
      role + " detached grip",
    );
    assert.ok(
      active.every((s) => Math.abs(s.depth - s.actorDepth) < 0.001),
      role + " incorrect visible render layer after model change",
    );
    const armRange =
      Math.max(...active.map((s) => s.arm)) -
      Math.min(...active.map((s) => s.arm));
    assert.ok(armRange > 0.18, role + " stiff ordinary arms");
    assert.deepEqual(me.arsenal, {});
    if (!(me.damageDealt > before)) {
      await host.screenshot({ path: "test-results/clarity/failure-basic.png" });
      console.error(
        "BASIC_DIAGNOSTIC",
        JSON.stringify({
          role,
          x: me.x,
          y: me.y,
          angle: me.angle,
          motion: me.attackMotion,
          input: game.inputs.get(me.id),
          target: game.state.enemies[0],
          bullets: game.state.bullets,
          effects: game.state.effects.filter((e) => e.owner === me.id),
        }),
      );
    }
    assert.ok(me.damageDealt > before, role + " ordinary did not hit");
    actions[role] = {
      frames: active.length,
      armRange,
      weapon: ROLE_BASICS[role].weapon,
      damage: me.damageDealt - before,
    };
    if (["scout", "guardian", "cleaner", "barista", "director"].includes(role))
      await host.screenshot({
        path: "test-results/clarity/basic-" + role + ".png",
      });
  }
  done(
    "28职业在空随机构筑下均展示真实14关节普攻、连续手臂变化与贴手武器，并造成实际伤害",
  );
  me.role = "guardian";
  me.ability = "aegis";
  me.hp = 24;
  me.maxHp = 160;
  me.shield = 40;
  me.shieldCap = 60;
  me.hitSeq++;
  me.hitShield = false;
  game.state.enemies = [];
  await host.waitForTimeout(150);
  const hp = host.getByRole("progressbar", { name: "角色生命", exact: true }),
    shield = host.getByRole("progressbar", { name: "角色护盾", exact: true });
  assert.equal(await hp.getAttribute("aria-valuenow"), "24");
  assert.equal(await shield.getAttribute("aria-valuenow"), "40");
  const world = await host.evaluate(() => {
    const w = window as any,
      a = w.__rig.scene.actors.get(w.__OFFDUTY__.playerId),
      v = a.vitals;
    return {
      ...v.getData("vitals"),
      y: v.y,
      actorY: a.y,
      label: v.list
        .filter((o: any) => o.type === "Text")
        .map((o: any) => o.text),
    };
  });
  assert.equal(world.width, 76);
  assert.equal(world.placement, "below-feet");
  assert.ok(world.y > world.actorY);
  assert.ok(world.ghost > world.ratio);
  assert.ok(world.label.includes("盾 40"));
  assert.ok(
    (await readTextContrast(host, ".innate-attack p")) >= 4.5,
    "ordinary attack description must remain readable on the new theme",
  );
  await host.screenshot({ path: "test-results/clarity/vitals.png" });
  done("脚下本机生命条76px并区分自己，护盾独立显示，危险状态与损血拖尾正确");
  me.shield = 0;
  me.hitShield = true;
  me.hitSeq++;
  me.lastHit = {
    sourceName: "验收",
    x: me.x + 20,
    y: me.y,
    at: game.state.elapsed,
    amount: 5,
    shieldAbsorbed: 40,
  };
  await host.waitForFunction(() =>
    document
      .querySelector(".combat-vitals")
      ?.classList.contains("shield-broken"),
  );
  done("破盾状态独立呈现，生命数值没有被护盾替代");
  me.hp = 100;
  me.hitShield = false;
  me.arsenal = { bat: 1, pulse: 1, mop: 1, orbit: 1 };
  me.basicCd = 0;
  await host.keyboard.down("d");
  await host.mouse.down();
  const x = me.x;
  await host.waitForTimeout(700);
  await host.mouse.up();
  await host.keyboard.up("d");
  assert.ok(Math.abs(me.x - x) > 20);
  assert.equal(Object.keys(me.arsenal).length, 4);
  assert.equal(me.ability, "aegis");
  await peer.reload();
  await peer.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  assert.equal(
    game.state.players.filter((p) => p.name === "普攻队友").length,
    1,
  );
  assert.equal(game.state.spectators.length, 1);
  done("双人加观战正常，四模块与普攻/Q共存并能边走边打，队友重连不重复");
  await host.setViewportSize({ width: 620, height: 700 });
  await host.waitForTimeout(250);
  const bounds = await host.locator(".combat-vitals").boundingBox();
  assert.ok(
    bounds &&
      bounds.width >= 100 &&
      bounds.width <= 130 &&
      bounds.x >= 0 &&
      bounds.x + bounds.width <= 620,
  );
  await host.screenshot({ path: "test-results/clarity/compact-vitals.png" });
  done("620px战场生命条可读且位于可见范围");
  const mobile = await open("移动工友");
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.waitForTimeout(200);
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
    false,
  );
  await mobile.locator(".scene-copy").scrollIntoViewIfNeeded();
  await mobile.screenshot({ path: "test-results/clarity/mobile-lobby.png" });
  assert.equal(
    await mobile
      .getByRole("button", { name: "请作者喝咖啡", exact: true })
      .count(),
    0,
  );
  await mobile.getByRole("link", { name: "GitHub开源项目" }).waitFor();
  done("390px摸鱼标题和GitHub入口无横向溢出，游戏没有咖啡二维码入口");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/clarity/report.json",
    JSON.stringify(
      {
        passed,
        errors,
        actions,
        qrSHA256:
          "a342ad5d660da97c4834fb9d0c01ade2e52969272943896fb32001217e2da20a",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { passed, errors, professions: Object.keys(actions).length },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error);
  await fs.writeFile(
    "test-results/clarity/errors.json",
    JSON.stringify({ passed, errors, actions, error: String(error) }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
  await app.close();
  const cleanup = path.resolve(dir);
  if (
    !cleanup.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(cleanup).startsWith("clarity37-")
  )
    throw new Error("Unexpected temporary cleanup path");
  rmSync(cleanup, { recursive: true, force: true });
}
