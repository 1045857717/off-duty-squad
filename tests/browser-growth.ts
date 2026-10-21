import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { generateOffers } from "../shared/rogue";
import { attackOffer } from "../shared/arsenal";
import { launchFromDraft } from "./browser-support";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
const dataDir = mkdtempSync(path.join(tmpdir(), "abyss-growth-")),
  app = createServer({ dataDir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`,
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_BROWSER
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
      : {}),
    headless: true,
  });
const passed: string[] = [],
  errors: string[] = [];
await fs.mkdir("test-results/growth", { recursive: true });
const open = async () => {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript("window.__name=(fn)=>fn");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  return page;
};
try {
  const host = await open();
  assert.equal(
    await host.getByRole("button", { name: "创建小队", exact: true }).count(),
    1,
  );
  assert.equal(
    await host.getByRole("button", { name: "全部房间", exact: true }).count(),
    0,
  );
  await host.screenshot({
    path: "test-results/growth/clean-lobby.png",
    fullPage: true,
  });
  await host.getByRole("button", { name: /先一个人试跑/ }).click();
  await launchFromDraft(host);
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.waveEnds = 999;
  g.state.players.forEach((p) => (p.invulnerable = 999));
  g.state.objects = [];
  passed.push("首页仅一个创建按钮，保留单一搜索，移除冗余房间筛选。");
  me.arsenal = { orbit: 2 };
  me.attackCooldowns = {};
  g.state.level = 2;
  me.pendingUpgrades = 3;
  me.offers = generateOffers(g, me);
  await host.getByRole("region", { name: "随机改装" }).waitFor();
  assert.ok(me.offers.every((c) => !["multishot", "pierce"].includes(c.id)));
  assert.ok(
    me.offers.every((c) => !c.attackSkill || c.attackSkill === "orbit"),
  );
  await host.keyboard.press("1");
  await host.waitForTimeout(160);
  assert.equal(me.arsenal.orbit, 3);
  if (await host.locator(".augment-dock").count())
    await host.getByRole("button", { name: "暂存强化" }).click();
  await host.locator(".arsenal-toggle").click();
  await host.getByRole("region", { name: "技能成长树" }).waitFor();
  assert.match(await host.locator(".growth-tree").innerText(), /小队 Lv.4/);
  g.state.level = 4;
  await host.waitForTimeout(180);
  assert.ok((await host.locator(".tree-connectors .available").count()) > 0);
  me.offers = [attackOffer(me, "gravity")];
  me.pendingUpgrades = 1;
  me.upgradeCd = 0;
  await host.waitForTimeout(180);
  await host.keyboard.press("1");
  await host.waitForTimeout(150);
  assert.equal(me.arsenal.gravity, 1);
  assert.equal(me.arsenal.orbit, 3);
  await host.screenshot({ path: "test-results/growth/skill-tree.png" });
  await host.locator(".arsenal-toggle").click();
  passed.push(
    "非投射构筑无弹丸/贯穿卡；主干Lv.3、小队Lv.4才开放关联分支，学习引力后原刃环仍保留，成长图显示实际节点。",
  );
  g.state.coins = 100;
  g.state.objects = [
    {
      id: ++g.state.serial,
      kind: "chest",
      label: "遗物匣",
      cost: 20,
      used: false,
      progress: 0,
      x: me.x,
      y: me.y,
    },
  ];
  await host.keyboard.down("e");
  await host.locator(".smooth-channel-meter").waitFor();
  const samples = await host.evaluate(async () => {
    const values: string[] = [];
    return await new Promise<{ count: number; distinct: number }>((resolve) => {
      const start = performance.now();
      function frame() {
        const el = document.querySelector<HTMLElement>(
          ".smooth-channel-meter .interaction-track>i",
        );
        if (el) values.push(el.style.transform);
        if (performance.now() - start < 350) requestAnimationFrame(frame);
        else resolve({ count: values.length, distinct: new Set(values).size });
      }
      requestAnimationFrame(frame);
    });
  });
  assert.ok(samples.distinct > 10, JSON.stringify(samples));
  await host.screenshot({ path: "test-results/growth/smooth-interaction.png" });
  await host.waitForTimeout(550);
  await host.keyboard.up("e");
  assert.equal(g.state.objects[0].used, true);
  assert.equal(g.state.coins, 80);
  if (await host.locator(".augment-dock").count())
    await host.getByRole("button", { name: "暂存强化" }).click();
  passed.push(
    `E交互逐帧进度采样${samples.distinct}种变化，实际扣费20零件，完成反馈保留。`,
  );
  me.arsenal = {};
  g.state.areas = [];
  me.pendingUpgrades = 0;
  me.offers = [];
  g.state.enemies = [
    {
      id: ++g.state.serial,
      kind: "tank",
      x: me.x + 60,
      y: me.y,
      hp: 10000,
      maxHp: 10000,
      speed: 0,
      cd: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  const enemy = g.state.enemies[0];
  g.state.bullets.push({
    id: ++g.state.serial,
    x: enemy.x,
    y: enemy.y,
    vx: 0,
    vy: 0,
    owner: me.id,
    damage: 12.3456789,
    life: 1,
    enemy: false,
    color: me.color,
  });
  await host.waitForTimeout(200);
  assert.ok(
    Math.abs(me.damageDealt * 100 - Math.round(me.damageDealt * 100)) < 1e-6,
  );
  assert.doesNotMatch(
    await host.locator(".damage-overlay").innerText(),
    /\d+\.\d+/,
  );
  await host.screenshot({ path: "test-results/growth/damage-board.png" });
  passed.push(
    "伤害账本截断浮点误差，实时榜统一整数伤害/DPS/击败/占比，并使用分层贡献条。",
  );
  // Draw all seven new material atlases together in a controlled render fixture.
  const kinds = [
    "mite",
    "hound",
    "shooter",
    "tank",
    "wraith",
    "bomber",
    "boss",
  ] as const;
  g.state.enemies = kinds.map((kind, i) => ({
    id: ++g.state.serial,
    kind,
    x: me.x - 170 + (i % 4) * 120,
    y: me.y - 130 + Math.floor(i / 4) * 190,
    hp: 999999,
    maxHp: 999999,
    speed: 0,
    cd: 999,
    angle: Math.PI / 2,
    hitFlash: 0,
  }));
  await host.waitForTimeout(2000);
  await host.screenshot({ path: "test-results/growth/organic-monsters.png" });
  await host.keyboard.press("F8");
  await host.locator(".work-sidebar-collapsed").waitFor();
  assert.ok((await host.locator(".work-side").boundingBox())!.width < 65);
  await host.getByRole("button", { name: "展开工作侧栏", exact: true }).click();
  await host.waitForTimeout(250);
  assert.ok((await host.locator(".work-side").boundingBox())!.width > 150);
  await host.getByRole("button", { name: "折叠工作侧栏", exact: true }).click();
  await host.keyboard.press("F8");
  await host.keyboard.press("F2");
  await host
    .getByRole("combobox", { name: "工作模式进入方式", exact: true })
    .click();
  await host.getByRole("option", { name: "Excel 表格", exact: true }).click();
  await host.getByRole("button", { name: "设置好了" }).click();
  await host.keyboard.press("F8");
  await host.getByRole("region", { name: "Excel风格工作表" }).waitFor();
  assert.equal(await host.locator(".work-sidebar-collapsed").count(), 1);
  await host.screenshot({ path: "test-results/growth/work-collapsed.png" });
  await host.keyboard.press("F8");
  passed.push(
    "工作侧栏每次默认折叠，可展开；配置下拉使用同主题菜单，固定Excel后正确进入。",
  );
  const watcher = await open();
  await watcher.getByLabel("搜索公开房间").fill(code);
  await watcher
    .locator(".live-room-list article")
    .filter({ hasText: code })
    .getByRole("button", { name: "观战", exact: true })
    .click();
  await watcher.locator(".spectator-badge").waitFor();
  me.arsenal = { orbit: 3, gravity: 1 };
  me.damageTaken = 92.12;
  me.criticalHits = 7;
  me.rescues = 1;
  me.healingDone = 83.45;
  g.state.players.forEach((p) => {
    p.alive = false;
    p.hp = 0;
  });
  await host.getByRole("region", { name: "本局战斗统计" }).waitFor();
  assert.equal(await host.locator(".downed-alert").count(), 0);
  assert.equal(await host.getByRole("button", { name: /呼叫求救/ }).count(), 0);
  assert.equal(await host.locator(".rescue-banner").count(), 0);
  const report = await host.locator(".debrief-sheet").innerText();
  for (const label of [
    "有效伤害",
    "承受伤害",
    "互相捞人",
    "暴击命中",
    "这把带了什么",
  ])
    assert.ok(report.includes(label));
  assert.doesNotMatch(report, /\d+\.\d+/);
  await host.screenshot({ path: "test-results/growth/run-report.png" });
  await host.setViewportSize({ width: 390, height: 844 });
  await host.waitForTimeout(250);
  await host.screenshot({ path: "test-results/growth/mobile-report.png" });
  assert.ok(
    await host.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await host.setViewportSize({ width: 1440, height: 1000 });
  passed.push(
    "全员阵亡后不再显示呼救；结算战报展示模式、难度、队伍贡献、整数DPS/承伤/治疗/救援/暴击及最终构筑。",
  );
  await host
    .getByRole("button", { name: "重整队伍，再来一把", exact: true })
    .click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await host.locator(".leave-button").click();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "离开小队", exact: true })
    .click();
  await host.getByRole("region", { name: "公开房间大厅" }).waitFor();
  await watcher.getByRole("region", { name: "公开房间大厅" }).waitFor();
  assert.equal(app.rooms.has(code), false);
  passed.push(
    "房主最后离开时，仅剩AI的房间立即关闭，观众返回公开大厅，旧房间从真实列表删除。",
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
    path: "test-results/growth/mobile-lobby.png",
    fullPage: true,
  });
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, errors }, null, 2));
  await fs.writeFile(
    "test-results/growth/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
} finally {
  await browser.close();
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
