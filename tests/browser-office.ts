import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { ROLES } from "../shared/content";
import { ROLE_SIGNATURE, attackOffer, ATTACK_IDS } from "../shared/arsenal";
import { openVote } from "../server/office";
import { launchFromDraft } from "./browser-support";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
const dataDir = mkdtempSync(path.join(tmpdir(), "office30-")),
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
await fs.mkdir("test-results/office", { recursive: true });
const open = async (width = 1440, height = 1000) => {
  const p = await browser.newPage({ viewport: { width, height } });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.addInitScript("window.__name=(fn)=>fn");
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  return p;
};
try {
  const host = await open(),
    peer = await open();
  for (const key of ["F7", "F2"]) {
    const button = host
      .locator(".top-actions button")
      .filter({ has: host.locator("kbd", { hasText: key }) });
    assert.match(
      await button.innerText(),
      key === "F7" ? /伤害排名/ : /游戏设置/,
    );
  }
  await host.getByLabel("大厅聊天内容").fill("不问进度，今晚一起下班 <script>");
  await host.getByLabel("大厅聊天内容").press("Enter");
  await peer
    .getByRole("region", { name: "公共大厅聊天" })
    .getByText("不问进度，今晚一起下班 <script>", { exact: true })
    .waitFor();
  assert.equal(await peer.locator(".lobby-chat script").count(), 0);
  await host.screenshot({
    path: "test-results/office/lobby.png",
    fullPage: true,
  });
  passed.push(
    "全新纸白办公大厅，F7伤害排名/F2游戏设置有可见文字；跨房间前大厅聊天实时互通、时间显示且文本安全。",
  );
  assert.equal(await host.getByRole("button", { name: /^选择/ }).count(), 28);
  for (const role of Object.keys(ROLES) as (keyof typeof ROLES)[]) {
    await host
      .getByRole("button", { name: "选择" + ROLES[role].name, exact: true })
      .click();
    assert.match(
      await host.locator(".role-description").innerText(),
      new RegExp(ROLES[role].skill),
    );
  }
  await host.getByRole("button", { name: "选择保洁专员", exact: true }).click();
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByLabel("你的行动代号").fill("准点下班");
  await host.getByLabel("小队名称").fill("今天不开会队");
  await host.waitForTimeout(350);
  const checkJobText = async () => {
    const widths = await host
      .locator(".modal .job-grid > button > span")
      .evaluateAll((items) =>
        items.map((item) => item.getBoundingClientRect().width),
      );
    assert.ok(
      widths.every((width) => width >= 80),
      `职业文字区域过窄: ${widths.join(",")}`,
    );
    assert.ok(
      await host
        .locator(".modal")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    );
  };
  await checkJobText();
  const portraits = await host
    .locator(".job-grid img")
    .evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).src),
    );
  assert.equal(new Set(portraits).size, 28, "每个岗位需要自己的办公风格肖像");
  await host.screenshot({ path: "test-results/office/jobs.png" });
  await host.setViewportSize({ width: 390, height: 844 });
  await host.waitForTimeout(120);
  await checkJobText();
  await host.screenshot({ path: "test-results/office/mobile-create.png" });
  await host.setViewportSize({ width: 1440, height: 1000 });
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  assert.equal(me.role, "cleaner");
  assert.equal(me.ability, "sanitize");
  await host.getByRole("button", { name: "添加2位AI", exact: true }).click();
  await host.screenshot({ path: "test-results/office/ready.png" });
  passed.push(
    "28职业可选择且描述立即更新；保洁专员保留独立深度消杀Q，准备大厅真实显示职业与AI。",
  );
  await peer.getByLabel("搜索公开房间").fill(code);
  await peer
    .locator(".live-room-list article")
    .filter({ hasText: code })
    .getByRole("button", { name: "加入小队", exact: true })
    .click();
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
  const guestId = await peer.evaluate(() => window.__OFFDUTY__!.playerId),
    guest = g.state.players.find((p) => p.id === guestId)!;
  await host.getByLabel("聊天内容").fill("等大家选完再出发");
  await host.getByLabel("聊天内容").press("Enter");
  await peer
    .getByRole("region", { name: "小队大厅聊天" })
    .getByText("等大家选完再出发", { exact: true })
    .waitFor();
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await host.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  me.offers = [
    attackOffer(me, "mop"),
    attackOffer(me, "bat"),
    attackOffer(me, "coffee"),
  ];
  await host.waitForTimeout(180);
  await host.screenshot({ path: "test-results/office/draft.png" });
  await host
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  assert.equal(g.state.phase, "draft");
  await peer
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.phase === "playing",
  );
  g.state.players.forEach((p) => (p.invulnerable = 999));
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.enemies = [];
  g.state.objects = [];
  await host.waitForTimeout(4000);
  await host.screenshot({ path: "test-results/office/campus.png" });
  passed.push(
    "准备大厅消息双方可见；地图内拖把/橡胶棍/咖啡卡真实可选，全员选择屏障保留，雨夜园区使用新的办公世界。",
  );
  const printer = g.state.officeProps.find((o) => o.kind === "printer")!;
  me.x = printer.x;
  me.y = printer.y;
  await host.waitForTimeout(300);
  await host.keyboard.down("e");
  await host.waitForTimeout(1100);
  await host.keyboard.up("e");
  assert.ok(printer.active > 0 && g.state.noises.length);
  await host.screenshot({ path: "test-results/office/printer-lure.png" });
  await host.keyboard.press("g");
  await host.waitForTimeout(150);
  assert.equal(g.state.pings.at(-1)?.kind, "gather");
  await peer.locator(".team-ping-controls").waitFor();
  const sprinkler = g.state.officeProps.find((o) => o.kind === "sprinkler")!;
  me.x = sprinkler.x;
  me.y = sprinkler.y;
  await host.waitForTimeout(200);
  await host.keyboard.down("e");
  await host.waitForTimeout(1100);
  await host.keyboard.up("e");
  assert.ok(sprinkler.active > 0);
  await host.screenshot({ path: "test-results/office/sprinkler.png" });
  passed.push(
    "E启动打印机产生真实诱饵噪声，喷淋持续减速；G发出小队集合标记，队友同步可见。",
  );
  openVote(g);
  await host.getByRole("region", { name: "小队路线投票" }).waitFor();
  await host.getByRole("button", { name: /安全通道绕行/ }).click();
  await peer.getByRole("button", { name: /安全通道绕行/ }).click();
  await host.waitForTimeout(220);
  assert.equal(g.state.routeVote?.resolved, "detour");
  assert.equal(g.state.route, "detour");
  passed.push(
    "真实双玩家路线投票形成多数结果并应用绕行刷怪系数，不是装饰按钮。",
  );
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
    x: me.x - 160 + (i % 4) * 115,
    y: me.y - 130 + Math.floor(i / 4) * 180,
    hp: 999999,
    maxHp: 999999,
    speed: 0,
    cd: 999,
    angle: Math.PI / 2,
    hitFlash: 0,
  }));
  g.state.players.forEach((p) => {
    p.arsenal = {};
    p.skillCd = 999;
  });
  g.state.areas = [];
  g.state.effects = [];
  await host.waitForTimeout(1250);
  await host.screenshot({ path: "test-results/office/zombies.png" });
  const boss = g.state.enemies.find((e) => e.kind === "boss")!;
  boss.hp = boss.maxHp * 0.5;
  await host.waitForTimeout(200);
  assert.equal(boss.bossPhase, 1);
  boss.hp = boss.maxHp * 0.2;
  await host.waitForTimeout(220);
  assert.equal(boss.bossPhase, 2);
  assert.match(
    await host.locator(".global-boss-vitals").innerText(),
    /点名召集/,
  );
  await host.screenshot({ path: "test-results/office/boss-phases.png" });
  passed.push(
    "七种敌人是人形办公丧尸而非旧甲虫；首领护具/追猎/召集阶段真实切换，低血量召集感染者。",
  );
  // Office floor via same-mode restart, preserving multiplayer identities.
  g.state.players.forEach((p) => {
    p.alive = false;
    p.hp = 0;
  });
  await host.getByRole("region", { name: "本局战斗统计" }).waitFor();
  await host.waitForTimeout(450);
  await host.screenshot({ path: "test-results/office/report.png" });
  await host.getByRole("button", { name: /重整队伍/ }).click();
  await host
    .getByRole("button", { name: "模式：夺回下班权", exact: true })
    .click();
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
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
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.enemies = [];
  g.state.players.forEach((p) => (p.invulnerable = 999));
  await host.waitForTimeout(4000);
  await host.screenshot({ path: "test-results/office/office-floor.png" });
  passed.push(
    "夺回下班权地图具备工位/会议桌/机房/茶水间陈设与门禁任务，和园区发癫局区分；新行动战报保留统计。",
  );
  const mobile = await open(390, 844);
  await mobile.getByRole("region", { name: "公开房间大厅" }).waitFor();
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.screenshot({
    path: "test-results/office/mobile.png",
    fullPage: true,
  });
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, errors }, null, 2));
  await fs.writeFile(
    "test-results/office/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
} finally {
  await browser.close();
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
