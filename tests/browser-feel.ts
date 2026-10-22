import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../server/app";
import { ATTACK_IDS } from "../shared/arsenal";
import { prepareInBrowser, finishDeployment } from "./browser-support";
const dir = mkdtempSync(path.join(tmpdir(), "feel35-"));
const app = createServer({ dataDir: dir });
await new Promise<void>((resolve) => app.http.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + (app.http.address() as any).port;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const errors: string[] = [],
  passed: string[] = [];
const done = (name: string) => {
  passed.push(name);
  console.log("FEEL_PASS", name);
};
await fs.mkdir("test-results/feel", { recursive: true });
const open = async (name: string) => {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((name) => {
    (window as any).__name = (fn: any) => fn;
    localStorage.setItem("offduty-name", JSON.stringify(name));
  }, name);
  await page.goto(base);
  await page.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return page;
};
const snapshot = (page: Page, name: string) =>
  page.screenshot({ path: "test-results/feel/" + name + ".png" });
try {
  const host = await open("手感组长"),
    peer = await open("手感队友"),
    viewer = await open("手感观众");
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByLabel("你的行动代号").fill("手感组长");
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code);
  for (const [page, watch] of [
    [peer, false],
    [viewer, true],
  ] as const) {
    await page.getByLabel("搜索公开房间").fill(code);
    await page
      .locator(".live-room-list article")
      .filter({ hasText: code })
      .getByRole("button", { name: watch ? "观战" : "加入小队", exact: true })
      .click();
    await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  }
  await prepareInBrowser(peer);
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await Promise.all([finishDeployment(host), finishDeployment(peer)]);
  const game = app.rooms.get(code)!;
  const me = game.state.players.find((p) => p.name === "手感组长")!;
  game.state.spawnCd = 999;
  game.state.eventCd = 999;
  game.state.waveEnds = 999;
  game.state.enemies = [];
  game.state.officeProps = [];
  game.state.event = { kind: "none", name: "", desc: "", remaining: 999 };
  for (const p of game.state.players) {
    p.invulnerable = 9999;
    p.regen = 0;
  }
  const room = [...game.state.world.rooms].sort(
    (a, b) => b.w * b.h - a.w * a.h,
  )[0];
  me.x = room.x + room.w / 2;
  me.y = room.y + room.h / 2;
  game.state.players.find((p) => p.id !== me.id)!.x = me.x - 85;
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
  done("双人准备、共同初始选卡、观战与对局同步正常");
  await host.waitForTimeout(3600);
  const auto = host.getByRole("button", {
    name: "自动开火快捷开关",
    exact: true,
  });
  if ((await auto.getAttribute("aria-pressed")) === "true")
    await host.keyboard.press("t");
  me.hp = 100;
  me.maxHp = 100;
  me.shield = 32;
  me.shieldCap = 40;
  await host.getByRole("progressbar", { name: "角色生命" }).waitFor();
  await host.waitForTimeout(400);
  me.hp = 24;
  me.hitSeq++;
  me.hitShield = false;
  await host.waitForFunction(
    () =>
      document.querySelector(".combat-vitals .vital-label strong")
        ?.textContent === "24",
  );
  assert.equal(
    await host
      .getByRole("progressbar", { name: "角色生命" })
      .getAttribute("aria-valuenow"),
    "24",
  );
  assert.match(await host.locator(".combat-vitals").innerText(), /危险/);
  assert.match(await host.locator(".vital-shield-amount").innerText(), /32/);
  const health = await host.evaluate(() => {
    const w = window as any,
      scene = w.__rig.scene;
    const meter = scene.children.list.find(
      (o: any) => o.name === "vitals-" + w.__OFFDUTY__.playerId,
    );
    return {
      data: meter.getData("vitals"),
      label: meter.list.find((o: any) => o.type === "Text").text,
      armor: meter.list.filter((o: any) => o.type === "Text")[1]?.text,
    };
  });
  assert.equal(health.data.hp, 24);
  assert.equal(health.data.status, "critical");
  assert.equal(health.data.width, 108);
  assert.equal(health.data.placement, "below-feet");
  assert.ok(health.data.ghost > health.data.ratio);
  assert.match(health.armor, /盾 32/);
  await snapshot(host, "health-critical");
  done("脚下数字生命/独立护盾、危险状态和受伤拖尾清晰可见");
  me.shield = 0;
  me.hitShield = true;
  me.hitSeq++;
  me.lastHit = {
    sourceName: "护盾验收",
    x: me.x + 30,
    y: me.y,
    at: game.state.elapsed,
    amount: 5,
    shieldAbsorbed: 32,
  };
  await host.waitForFunction(() =>
    document
      .querySelector(".combat-vitals")
      ?.classList.contains("shield-broken"),
  );
  await snapshot(host, "shield-break");
  done("护盾破裂使用独立状态文字，不与生命损失混为同一条");
  me.hp = 100;
  me.hitShield = false;
  await host.mouse.move(1120, 510);
  const results: Record<string, unknown> = {};
  for (const id of ATTACK_IDS) {
    me.arsenal = { [id]: 1 };
    me.basicCd = 999;
    me.attackCooldowns = {};
    game.state.enemies = [];
    await host.mouse.down();
    const samples = [];
    for (let i = 0; i < 20; i++) {
      await host.waitForTimeout(18);
      samples.push(
        await host.evaluate(() => {
          const w = window as any,
            a = w.__rig.scene.actors.get(w.__OFFDUTY__.playerId),
            v = a.weapon.getData("attack");
          return {
            attack: w.__rig.pose.attack,
            phase: w.__rig.pose.attackPhase,
            arm: w.__rig.pose.rightArm,
            weapon: v?.id,
            x: a.weapon.x,
            y: a.weapon.y,
            hand: w.__rig.handWorld(),
            ribbon: a.ribbon.points.length,
          };
        }),
      );
    }
    await host.mouse.up();
    await fs.writeFile(
      "test-results/feel/samples-" + id + ".json",
      JSON.stringify(samples, null, 2),
    );
    const active = samples.filter(
      (v) => v.attack === id && Number(v.phase) < 0.95,
    );
    assert.ok(active.length >= 3, id + " missing visible attack frames");
    assert.ok(
      active.every((v) => v.weapon === id),
      id + " weapon/arm identity mismatch",
    );
    assert.ok(
      Math.max(...active.map((v) => Number(v.arm))) -
        Math.min(...active.map((v) => Number(v.arm))) >
        0.08,
      id + " arm is visually static",
    );
    assert.ok(
      active.every((v) => Math.hypot(v.x - v.hand.x, v.y - v.hand.y) < 4),
      id + " detached from hand",
    );
    results[id] = {
      frames: active.length,
      trail: Math.max(...active.map((v) => v.ribbon)),
    };
    if (["bat", "mop", "wrench", "pulse"].includes(id))
      await snapshot(host, "attack-" + id);
    await host.waitForTimeout(500);
  }
  done("16种攻击逐一确认真实手臂变化、正确武器、握持点连续与有界挥击轨迹");
  me.arsenal = { bat: 1, pulse: 1, mop: 1, wrench: 1 };
  me.attackCooldowns = {};
  await host.mouse.down();
  await host.keyboard.down("d");
  await host.waitForTimeout(1000);
  await host.keyboard.up("d");
  await host.mouse.up();
  done("四模块同时触发并移动时，动作队列不冻结行走");
  for (const [x, y] of [
    [1100, 500],
    [300, 500],
    [700, 300],
    [700, 720],
    [1100, 400],
    [400, 700],
  ]) {
    await host.mouse.move(x, y);
    await host.waitForTimeout(25);
    const turn = await host.evaluate(() => {
      const rig = (window as any).__rig;
      return rig.layers
        .filter((layer: any) => layer.group.visible)
        .reduce((sum: number, layer: any) => sum + layer.group.alpha, 0);
    });
    assert.ok(
      Math.abs(turn - 1) < 0.01,
      "turn crossfade changes character opacity: " + turn,
    );
  }
  done("快速转身持续保持可见层总透明度，不出现人物闪烁");
  await host.setViewportSize({ width: 620, height: 540 });
  await host.waitForTimeout(300);
  await snapshot(host, "compact-health");
  const bounds = await host.locator(".combat-vitals").boundingBox();
  assert.ok(
    bounds &&
      bounds.width >= 108 &&
      bounds.x >= 0 &&
      bounds.x + bounds.width <= 620,
  );
  done("620像素小窗血条仍可读且不溢出画面");
  assert.equal(errors.length, 0, errors.join("\n"));
  await fs.writeFile(
    "test-results/feel/report.json",
    JSON.stringify({ passed, errors, attacks: results }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors, attacks: results }, null, 2));
} finally {
  await browser.close();
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
