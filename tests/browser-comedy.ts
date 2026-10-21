import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "../server/app";
import { addPlayer } from "../server/simulation";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { finishDeployment } from "./browser-support";
const dir = mkdtempSync(path.join(tmpdir(), "comedy32-")),
  app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${(app.http.address() as any).port}`,
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_BROWSER
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
      : {}),
  });
const errors: string[] = [],
  passed: string[] = [];
await fs.mkdir("test-results/comedy", { recursive: true });
const open = async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.addInitScript("window.__name=(fn)=>fn");
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto(base, { waitUntil: "networkidle" });
  await p.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return p;
};
try {
  const host = await open();
  assert.match(await host.locator(".page-heading").innerText(), /工位发癫/);
  assert.equal(await host.locator("select").count(), 0);
  await host.locator(".rental-title").first().scrollIntoViewIfNeeded();
  assert.ok(
    parseInt(
      await host
        .locator(".rental-title")
        .first()
        .evaluate((el) => getComputedStyle(el).fontSize),
    ) >= 22,
  );
  assert.ok(
    (await host.getByText("联系QQ：1045857717", { exact: true }).count()) >= 3,
  );
  await host.screenshot({
    path: "test-results/comedy/lobby.png",
    fullPage: true,
  });
  await host
    .locator(".career-filters")
    .getByRole("button", { name: /资本艺术家/ })
    .click();
  assert.equal(await host.locator(".job-grid>button").count(), 4);
  await host.getByRole("button", { name: "选择画饼总监", exact: true }).click();
  assert.match(
    await host.getByRole("region", { name: "职业技能详细说明" }).innerText(),
    /87.4/,
  );
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByLabel("你的行动代号").fill("画饼同学");
  assert.equal(await host.getByRole("dialog").locator("select").count(), 0);
  await host.screenshot({ path: "test-results/comedy/create.png" });
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  assert.equal(
    await host.getByRole("group", { name: "行动模式", exact: true }).count(),
    1,
  );
  await host
    .getByRole("button", { name: "模式：夺回下班权", exact: true })
    .click();
  assert.equal(g.state.mode, "expedition");
  await host
    .getByRole("button", { name: "模式：园区发癫局", exact: true })
    .click();
  await host
    .getByRole("button", { name: "难度：老板开挂", exact: true })
    .click();
  assert.equal(g.state.difficulty, "nightmare");
  await host
    .getByRole("button", { name: "难度：正常发癫", exact: true })
    .click();
  const peer = await open();
  await peer.getByLabel("搜索公开房间").fill(code);
  await peer
    .locator(".live-room-list article")
    .filter({ hasText: code })
    .getByRole("button", { name: "加入小队", exact: true })
    .click();
  await peer.getByRole("region", { name: "小队大厅聊天" }).waitFor();
  await host.getByLabel("聊天内容").fill("饼已画好，锅你们带");
  await host.getByLabel("聊天内容").press("Enter");
  await peer
    .getByRole("region", { name: "小队大厅聊天" })
    .getByText("饼已画好，锅你们带", { exact: true })
    .waitFor();
  assert.equal(
    await host
      .locator(
        ".game-stage .chat-panel,.game-stage .chat-open,.game-stage .live-chat-feed",
      )
      .count(),
    0,
  );
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.waitForTimeout(170);
  await host
    .getByRole("region", { name: "小队准备大厅" })
    .screenshot({ path: "test-results/comedy/ready.png" });
  passed.push(
    "模式/难度卡可真实切换、无原生下拉；28职业含4资本梗；大厅专属小队聊天不遮挡准备，广告QQ与大标题可见。",
  );
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await host.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  await host
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await peer
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.phase === "playing",
  );
  me.invulnerable = 999;
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  await host.waitForTimeout(2800);
  assert.equal(
    await host.getByRole("region", { name: "小队大厅聊天" }).count(),
    0,
  );
  const auto = host.getByRole("button", {
    name: "自动开火快捷开关",
    exact: true,
  });
  const first = await auto.getAttribute("aria-pressed");
  await host.keyboard.press("t");
  await host.waitForTimeout(80);
  assert.notEqual(await auto.getAttribute("aria-pressed"), first);
  await host.keyboard.press("t");
  assert.equal(await auto.getAttribute("aria-pressed"), first);
  await host.getByRole("button", { name: "打开聊天", exact: true }).click();
  await host.getByLabel("聊天内容").fill("t");
  await host.getByLabel("聊天内容").press("t");
  assert.equal(await auto.getAttribute("aria-pressed"), first);
  await host.getByLabel("聊天内容").press("Enter");
  await host.waitForTimeout(140);
  assert.equal(await host.locator(".chat-panel").count(), 0);
  assert.ok(await host.locator(".live-chat-feed").count());
  const toggle = host.locator(".arsenal-toggle");
  await toggle.click();
  await host.getByRole("region", { name: "技能成长树" }).waitFor();
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.ok(!(await toggle.evaluate((el) => el.matches(":focus"))));
  await host.getByRole("button", { name: "快捷设置", exact: true }).click();
  await host.getByRole("dialog").waitFor();
  await host.getByRole("button", { name: "关闭对话框", exact: true }).click();
  assert.ok(
    !(await host
      .getByRole("button", { name: "快捷设置", exact: true })
      .evaluate((el) => el.matches(":focus"))),
  );
  passed.push(
    "T切换自动开火、聊天输入T不触发开火切换；消息发送后收起；成长详情与弹窗关闭后无残留指针焦点。",
  );
  await host.evaluate(() => {
    const w = window as any;
    w.__actorAudit = new Set();
    const proto = w.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    proto.setData = function (k: any, v: any, ...args: any[]) {
      if (k === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId) {
        w.__actorAudit.add(v.leftLeg.toFixed(5));
        w.__paintedHero = this;
      }
      return old.call(this, k, v, ...args);
    };
  });
  // Atlas identity and actual articulated movement, not just a lobby portrait.

  const before = { x: me.x, y: me.y };
  await host.keyboard.down("d");
  await host.waitForTimeout(250);
  await host.keyboard.up("d");
  assert.ok(Math.abs(me.x - before.x) > 5);
  const actor = await host.evaluate(() => {
    const w = window as any,
      rig = w.__paintedHero,
      image = rig.scene.textures.get("painted-director").getSourceImage();
    return {
      paintedSource: !!image,
      width: image.width,
      height: image.height,
      parts: rig.pose.parts,
      visible: rig.visible,
      texture: rig.layers[rig.layerIndex].images.get("head").texture.key,
      poses: w.__actorAudit.size,
    };
  });
  assert.equal(actor.width, 1536);
  assert.equal(actor.height, 320);
  assert.equal(actor.parts, 14);
  assert.equal(actor.visible, true);
  assert.equal(actor.texture, "joint-atlas-v35");
  assert.ok(actor.poses >= 4, JSON.stringify(actor));
  await fs.writeFile(
    "test-results/comedy/actor-audit.json",
    JSON.stringify(actor, null, 2),
  );
  await host
    .locator(".game-stage")
    .screenshot({ path: "test-results/comedy/gameplay-actor.png" });

  await host.screenshot({ path: "test-results/comedy/gameplay.png" });
  me.skillCd = 0;
  g.state.enemies = [
    {
      id: 999,
      kind: "tank",
      x: me.x + 80,
      y: me.y,
      hp: 99999,
      maxHp: 99999,
      speed: 0,
      cd: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  await host.keyboard.press("q");
  await host.waitForTimeout(120);
  assert.ok(g.state.enemies[0].hp < 99999);
  await host.screenshot({ path: "test-results/comedy/pie-skill.png" });
  passed.push(
    "新场内角色素材实际加载，玩家可移动、画饼Q实际伤害与特效生效，战斗仍可看到轻量透明消息。",
  );
  await host.setViewportSize({ width: 390, height: 844 });
  await host.waitForTimeout(150);
  assert.ok(
    await host.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await host.screenshot({ path: "test-results/comedy/mobile-game.png" });
  const mobile = await browser.newPage({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  });
  await mobile.goto(base, { waitUntil: "networkidle" });
  await mobile.getByRole("region", { name: "公开房间大厅" }).waitFor();
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.screenshot({
    path: "test-results/comedy/mobile-lobby.png",
    fullPage: true,
  });
  await mobile.close();
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/comedy/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }, null, 2));
} finally {
  await browser.close();
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
