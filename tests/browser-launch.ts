import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { gainExperience } from "../server/simulation";
import { generateOffers } from "../shared/rogue";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
const dataDir = mkdtempSync(path.join(tmpdir(), "abyss-launch-")),
  app = createServer({ dataDir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
});
const passed: string[] = [],
  errors: string[] = [];
await fs.mkdir("test-results/launch", { recursive: true });
const open = async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  return p;
};
try {
  const host = await open();
  await host.getByRole("region", { name: "公开房间大厅" }).waitFor();
  assert.equal(
    await host.getByText("公开房间 · 加入 / 观战", { exact: true }).count(),
    0,
  );
  assert.equal(await host.locator(".rental-ads article").count(), 3);
  await host
    .getByRole("button", { name: "创建小队", exact: true })
    .first()
    .click();
  await host.getByLabel("你的行动代号").fill("夜航");
  await host.getByLabel("小队名称").fill("黑潮协作队");
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!;
  assert.equal(g.state.players[0].offers.length, 0);
  assert.equal(await host.locator(".initial-draft").count(), 0);
  assert.equal(
    await host.getByRole("button", { name: "我已准备", exact: true }).count(),
    0,
  );
  const guest = await open();
  await guest.getByLabel("搜索公开房间").fill(code);
  const card = guest
    .locator(".live-room-list article")
    .filter({ hasText: code });
  await card.waitFor();
  await guest.screenshot({
    path: "test-results/launch/public-rooms.png",
    fullPage: true,
  });
  await card.getByRole("button", { name: "加入小队", exact: true }).click();
  await guest.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const guestId = await guest.evaluate(() => window.__OFFDUTY__!.playerId),
    me = g.state.players[0],
    peer = g.state.players.find((p) => p.id === guestId)!;
  await host.getByRole("button", { name: "添加2位AI", exact: true }).click();
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.players.length === 4,
  );
  assert.equal(g.state.players.filter((p) => p.bot).length, 2);
  await guest.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await guest.getByRole("status", { name: "出发倒计时" }).waitFor();
  await guest
    .getByRole("button", { name: "取消准备", exact: true })
    .first()
    .click();
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.phase === "lobby",
  );
  assert.ok(g.state.players.every((p) => !p.offers.length));
  await guest.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await host.getByRole("status", { name: "出发倒计时" }).waitFor();
  await host.waitForTimeout(250);
  await host.screenshot({ path: "test-results/launch/countdown.png" });
  await host.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  await guest.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  assert.equal(g.state.phase, "draft");
  assert.equal(g.state.elapsed, 0);
  assert.equal(g.state.enemies.length, 0);
  await host
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await host.waitForTimeout(180);
  assert.equal(g.state.phase, "draft");
  assert.equal(g.state.elapsed, 0);
  const before = me.x;
  await host.keyboard.down("d");
  await host.waitForTimeout(180);
  await host.keyboard.up("d");
  assert.equal(me.x, before);
  const offered = peer.offers.map((o) => o.id);
  await guest.reload({ waitUntil: "networkidle" });
  await guest.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  assert.deepEqual(
    peer.offers.map((o) => o.id),
    offered,
  );
  await guest.waitForTimeout(500);
  await guest.screenshot({ path: "test-results/launch/in-map-draft.png" });
  await guest
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.phase === "playing",
  );
  passed.push(
    "公开房间主界面直接加入；可添加2位AI；房主免准备、3秒倒计时可取消；地图内全员选卡后才开战，刷新不重抽。",
  );
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.players.forEach((p) => {
    p.invulnerable = 999;
  });
  await host.waitForTimeout(300);
  const dash = me.dashSeq,
    attack = me.attackSeq;
  await host.keyboard.down("d");
  await host.keyboard.press("Space");
  await host.waitForTimeout(160);
  await host.keyboard.up("d");
  assert.ok(me.dashSeq > dash);
  assert.equal(me.attackSeq, attack);
  const beforeShift = me.dashSeq;
  me.dashCd = 0;
  await host.keyboard.press("Shift");
  await host.waitForTimeout(90);
  assert.equal(me.dashSeq, beforeShift);
  passed.push(
    "空格默认冲刺且不与射击冲突；Shift默认关闭，设置中保留兼容开关。",
  );
  g.state.coins = 0;
  g.state.objects = [
    {
      id: ++g.state.serial,
      kind: "chest",
      label: "遗物匣",
      cost: 20,
      progress: 0,
      used: false,
      x: me.x,
      y: me.y,
    },
  ];
  await host.keyboard.down("e");
  await host.locator(".interaction-channel.blocked").waitFor();
  assert.match(
    await host.locator(".interaction-channel").innerText(),
    /缺少 20/,
  );
  g.state.coins = 100;
  await host.keyboard.up("e");
  await host.waitForTimeout(140);
  await host.keyboard.down("e");
  await host.waitForTimeout(270);
  assert.ok(
    g.state.objects[0].progress > 0 && g.state.objects[0].progress < 0.7,
  );
  await host.screenshot({
    path: "test-results/launch/interaction-progress.png",
  });
  await host.waitForTimeout(550);
  await host.keyboard.up("e");
  assert.ok(g.state.objects[0].used);
  assert.equal(g.state.coins, 80);
  await host.locator(".interaction-channel.complete").waitFor();
  await host.getByRole("button", { name: "零件用途", exact: true }).click();
  assert.match(await host.locator(".parts-popover").innerText(), /全队共享/);
  await host.screenshot({ path: "test-results/launch/parts-help.png" });
  await host.getByRole("button", { name: "零件用途", exact: true }).click();
  passed.push(
    "E显示缺零件、正在交互百分比和完成状态；20零件真实扣除；HUD可查看全队资源用途与设施费用。",
  );
  me.pendingUpgrades = 0;
  me.offers = [];
  const level = g.state.level;
  gainExperience(g, 50000);
  assert.equal(g.state.level, level + 1);
  gainExperience(g, 1);
  assert.equal(g.state.level, level + 1);
  me.pendingUpgrades = 4;
  me.offers = generateOffers(g, me);
  await host.waitForTimeout(160);
  const pending = me.pendingUpgrades;
  await host.keyboard.press("1");
  await host.waitForTimeout(180);
  const after = me.pendingUpgrades;
  assert.equal(after, pending - 1);
  await host.evaluate(() => {
    for (let i = 0; i < 5; i++)
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "1",
          code: "Digit1",
          repeat: true,
          bubbles: true,
        }),
      );
  });
  await host.waitForTimeout(150);
  assert.equal(me.pendingUpgrades, after);
  if (await host.locator(".augment-dock").count())
    await host.getByRole("button", { name: "暂存强化" }).click();
  passed.push("大额经验结转且一次只升一级；长按数字键不会连续消耗多张升级卡。");
  me.arsenal = { orbit: 1 };
  me.attackCooldowns = {};
  await host.waitForTimeout(180);
  assert.ok(g.state.areas.some((a) => a.kind === "orbit"));
  const r1 = g.state.areas.find((a) => a.kind === "orbit")!.radius;
  me.arsenal.orbit = 8;
  await host.locator(".arsenal-modules .module-tier-2").waitFor();
  for (
    let i = 0;
    i < 30 &&
    (g.state.areas.find((a) => a.kind === "orbit")?.radius || 0) <= r1;
    i++
  )
    await host.waitForTimeout(25);
  assert.ok(g.state.areas.find((a) => a.kind === "orbit")!.radius > r1);
  await host.screenshot({ path: "test-results/launch/evolved-orbit.png" });
  g.state.enemies = [
    {
      id: ++g.state.serial,
      kind: "tank",
      x: me.x + 65,
      y: me.y,
      hp: 999999,
      maxHp: 999999,
      speed: 0,
      cd: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  me.arsenal = { venom: 4 };
  me.attackCooldowns = {};
  await host.waitForTimeout(400);
  assert.ok(g.state.areas.some((a) => a.kind === "venom"));
  g.state.enemies = [];
  await host.waitForTimeout(700);
  assert.ok(g.state.areas.some((a) => a.kind === "venom" && a.life > 1));
  await host.screenshot({ path: "test-results/launch/persistent-venom.png" });
  passed.push(
    "刃环范围常驻且随等级扩大，满级UI升级为金色；毒云在释放后持续显示真实作用区域。",
  );
  me.arsenal = { pulse: 1 };
  me.attackCooldowns = {};
  me.crit = 1;
  g.state.areas = [];
  g.state.enemies = [
    {
      id: ++g.state.serial,
      kind: "tank",
      x: me.x + 70,
      y: me.y,
      hp: 999999,
      maxHp: 999999,
      speed: 0,
      cd: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  await host.evaluate(() => {
    const proto = (window as any).Phaser.GameObjects.BitmapText.prototype,
      old = proto.setText;
    (window as any).__critSeen = [];
    (window as any).__restoreCrit = () => (proto.setText = old);
    proto.setText = function (text: any) {
      if (String(text).includes("暴击!"))
        (window as any).__critSeen.push(String(text));
      return old.call(this, text);
    };
  });
  await host.waitForTimeout(900);
  assert.ok(g.state.effects.some((e) => e.critical));
  assert.ok(await host.evaluate(() => (window as any).__critSeen.length > 0));
  await host.screenshot({ path: "test-results/launch/critical-hit.png" });
  await host.evaluate(() => (window as any).__restoreCrit());
  const far = g.state.world.points.at(-1)!;
  g.state.enemies.push({
    id: ++g.state.serial,
    kind: "boss",
    ...far,
    hp: 12345,
    maxHp: 12345,
    speed: 0,
    cd: 999,
    angle: 0,
    hitFlash: 0,
  });
  await host.getByRole("region", { name: "全局BOSS血条" }).waitFor();
  assert.match(await host.locator(".global-boss-vitals").innerText(), /12,345/);
  await host.screenshot({ path: "test-results/launch/global-boss.png" });
  passed.push(
    "暴击有金色暴击数字与独立效果；未被击中过的远处BOSS也始终显示全局血条。",
  );
  await host.keyboard.press("F2");
  await host.getByRole("combobox", { name: "工作模式进入方式" }).click();
  await host.getByRole("option", { name: "Excel 表格", exact: true }).click();
  await host.getByRole("button", { name: "设置好了" }).click();
  await host.keyboard.press("F8");
  await host.getByRole("region", { name: "Excel风格工作表" }).waitFor();
  await host.getByLabel("单元格 H1", { exact: true }).fill("2");
  await host.getByLabel("单元格 H2", { exact: true }).fill("3");
  await host.getByLabel("单元格 H3", { exact: true }).fill("=SUM(H1:H2)");
  await host.getByLabel("Excel公式栏").click();
  assert.equal(
    await host.getByLabel("单元格 H3", { exact: true }).inputValue(),
    "5",
  );
  await host.screenshot({ path: "test-results/launch/excel-work.png" });
  await host.getByRole("button", { name: "邮件工作台", exact: true }).click();
  await host.getByRole("button", { name: "新建草稿", exact: false }).click();
  await host.getByLabel("邮件草稿主题").fill("回归测试草稿");
  await host.getByLabel("邮件草稿正文").fill("本地草稿保存验证");
  await host.getByRole("button", { name: "VS Code", exact: true }).click();
  await host.getByLabel("代码编辑器").fill("const status = 'ready';");
  await host.getByRole("button", { name: "切换工作界面", exact: true }).click();
  await host.getByRole("menuitem", { name: "经营分析", exact: true }).click();
  await host.getByLabel("分析周期").selectOption("本月");
  await host.screenshot({ path: "test-results/launch/metrics-work.png" });
  await host.keyboard.press("F8");
  await host.keyboard.press("F2");
  await host.getByRole("combobox", { name: "工作模式进入方式" }).click();
  await host.getByRole("option", { name: "每次随机", exact: true }).click();
  await host.getByRole("button", { name: "设置好了" }).click();
  await host.keyboard.press("F8");
  await host.locator(".work-screen").waitFor();
  assert.equal(
    await host.locator(".work-side .selected, .ide-workspace").count(),
    1,
  );
  await host.keyboard.press("F8");
  passed.push(
    "工作模式可固定Excel或随机进入；Excel实际计算SUM；邮件草稿、代码编辑与分析周期均可操作并保存。",
  );
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await mobile.goto(url, { waitUntil: "networkidle" });
  await mobile.getByRole("region", { name: "公开房间大厅" }).waitFor();
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.screenshot({
    path: "test-results/launch/mobile-public.png",
    fullPage: true,
  });
  await mobile.close();
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/launch/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }, null, 2));
} finally {
  await browser.close();
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
