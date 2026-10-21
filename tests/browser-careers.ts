import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "../server/app";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
const data = mkdtempSync(path.join(tmpdir(), "careers31-")),
  app = createServer({ dataDir: data });
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
await fs.mkdir("test-results/careers", { recursive: true });
const open = async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.addInitScript("window.__name=(fn)=>fn");
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base, { waitUntil: "networkidle" });
  await p.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return p;
};
try {
  const host = await open();
  await host.screenshot({
    path: "test-results/careers/lobby.png",
    fullPage: true,
  });
  const picker = host.getByRole("region", { name: "打工人职业选择" });
  await picker.getByRole("button", { name: /^IT/ }).click();
  assert.equal(await picker.locator(".job-grid>button").count(), 3);
  await picker.getByRole("button", { name: /^抽象打工人/ }).click();
  assert.equal(await picker.locator(".job-grid>button").count(), 5);
  await picker.getByRole("button", { name: "选择牛马", exact: true }).click();
  assert.match(
    await host.getByRole("region", { name: "职业技能详细说明" }).innerText(),
    /74.8/,
  );
  await picker.getByLabel("搜索职业").fill("考古学家");
  await picker.getByText("暂时还没有这个岗位").waitFor();
  await picker.getByRole("button", { name: "没找到职业？" }).click();
  await picker.getByLabel("期待的职业").fill("考古学家");
  await picker.getByRole("button", { name: "记在本机心愿单" }).click();
  assert.ok(
    await host.evaluate(() =>
      localStorage.getItem("offduty-career-wishes")?.includes("考古学家"),
    ),
  );
  await picker.getByText("更多职业，敬请期待").waitFor();
  await picker.getByRole("button", { name: "查看全部职业" }).click();
  assert.equal(await picker.locator(".job-grid>button").count(), 28);
  passed.push(
    "28职业、8类型筛选、抽象职业与技能数值、无结果和本地职业心愿单可实际使用。",
  );
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByLabel("你的行动代号").fill("牛马下班");
  await host.waitForTimeout(300);
  const modal = host.getByRole("dialog");
  assert.match(
    await modal.getByRole("region", { name: "职业技能详细说明" }).innerText(),
    /伤害|冷却/,
  );
  await host.screenshot({ path: "test-results/careers/jobs.png" });
  await host.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await host.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await host.screenshot({ path: "test-results/careers/mobile-create.png" });
  await host.setViewportSize({ width: 1440, height: 1000 });
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  assert.equal(
    await host.getByRole("group", { name: "行动模式", exact: true }).count(),
    1,
  );
  assert.equal(
    await host.getByRole("group", { name: "行动难度", exact: true }).count(),
    1,
  );
  assert.equal(await host.locator(".mode-selection").count(), 0);
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  assert.equal(me.role, "workhorse");
  const peer = await open();
  await peer.getByLabel("搜索公开房间").fill(code);
  await peer
    .locator(".live-room-list article")
    .filter({ hasText: code })
    .getByRole("button", { name: "加入小队", exact: true })
    .click();
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.waitForTimeout(180);
  const green = await host
    .locator(".ready-seat.is-ready footer")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
  assert.ok(
    green.every((x) => x === "rgb(36, 115, 75)"),
    green.join(","),
  );
  await host.getByText(/查看 牛马冲锋 的伤害/).click();
  await host.screenshot({ path: "test-results/careers/ready.png" });
  passed.push(
    "准备就绪是绿色，真实队员状态同步；模式和难度各只有1个入口，技能可展开查看详细机制。",
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
  g.state.spawnCd = 999;
  g.state.enemies = [
    {
      id: 990,
      kind: "tank",
      x: me.x + 60,
      y: me.y,
      hp: 99999,
      maxHp: 99999,
      speed: 0,
      cd: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  me.skillCd = 0;
  await host.waitForTimeout(1100);
  await host.keyboard.press("q");
  await host.waitForTimeout(130);
  assert.ok(me.shield > 0);
  await host.screenshot({ path: "test-results/careers/battle-fx.png" });
  assert.equal(await host.locator("canvas").count(), 1);
  passed.push(
    "牛马固定Q实际生效，生成素材可在游戏引擎中正常加载，开局全员选择屏障保留。",
  );
  await host.locator(".desktop-download-button").click();
  await host.getByRole("dialog").waitFor();
  const link = host.locator(".desktop-download-link");
  await link.waitFor();
  const href = await link.getAttribute("href");
  const resp = await host.request.get(base + "/api/desktop");
  const release = await resp.json();
  assert.ok(release.available && release.bytes > 100000000);
  assert.equal(href, release.url);
  const head = await host.request.head(base + href);
  assert.equal(head.status(), 200);
  assert.equal(Number(head.headers()["content-length"]), release.bytes);
  assert.ok(head.headers()["content-disposition"].includes("attachment"));
  await host.screenshot({ path: "test-results/careers/desktop-download.png" });
  passed.push(
    "网页桌面端入口返回实际Windows便携包，下载响应、文件大小和连接配置正确。",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/careers/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }, null, 2));
} finally {
  await browser.close();
  await app.close();
  rmSync(data, { recursive: true, force: true });
}
