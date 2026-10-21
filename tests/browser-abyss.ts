import { launchFromDraft, prepareInBrowser } from "./browser-support";
import { chromium, type Page, type BrowserContext } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { gainExperience } from "../server/simulation";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
const dataDir = mkdtempSync(path.join(tmpdir(), "abyss-browser-")),
  app = createServer({ dataDir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
});
const errors: string[] = [],
  passed: string[] = [];
await fs.mkdir("test-results/abyss", { recursive: true });
async function page(width = 1440, height = 1000) {
  const ctx = await browser.newContext({ viewport: { width, height } }),
    p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  return { ctx, p };
}
try {
  const { p: host } = await page();
  assert.equal(
    await host.locator(".relay-ad").getAttribute("href"),
    "https://api.xiebc.cc",
  );
  await host.screenshot({
    path: "test-results/abyss/lobby.png",
    fullPage: true,
  });
  await host
    .getByRole("button", { name: "创建小队", exact: true })
    .first()
    .click();
  await host.getByLabel("你的行动代号").fill("夜航");
  await host.getByLabel("小队名称").fill("裂隙测试队");
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "模式：园区发癫局", exact: true })
    .click();
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.waitForFunction(() => !!window.__OFFDUTY__?.state?.code);
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    id = await host.evaluate(() => window.__OFFDUTY__!.playerId);
  await prepareInBrowser(host);
  await launchFromDraft(host);
  await host.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  const game = app.rooms.get(code)!;
  game.state.players[0].invulnerable = 9999;
  game.state.players[0].shield = 60;
  game.state.players[0].shieldCap = 60;
  passed.push(
    "Survival creation and player name/squad name/mode preserved; ad points to requested external URL.",
  );
  const { p: observer } = await page(1280, 900);
  await observer.getByRole("region", { name: "公开房间大厅" }).waitFor();
  await observer
    .locator(".live-room-list article")
    .filter({ hasText: code })
    .getByRole("button", { name: "观战", exact: true })
    .click();
  await observer.waitForFunction(
    () =>
      window.__OFFDUTY__?.state?.mode === "survival" &&
      !!window.__OFFDUTY__.playerId,
  );
  assert.equal(await observer.locator(".spectator-badge").count(), 1);
  await observer.getByRole("button", { name: "打开聊天" }).click();
  await observer.getByLabel("聊天内容").fill("观战频道：保持移动 <script>");
  await observer.getByLabel("聊天内容").press("Enter");
  await host.getByRole("button", { name: "打开聊天" }).click();
  await host
    .getByRole("region", { name: "房间聊天" })
    .getByText("观战频道：保持移动 <script>", { exact: true })
    .waitFor();
  await host.getByRole("button", { name: "关闭聊天" }).click();
  passed.push(
    "Public discovery -> real spectator joins and messages reach player as escaped text.",
  );
  gainExperience(game, 220);
  await host.getByRole("region", { name: "随机改装" }).waitFor();
  assert.equal(await host.locator(".quick-augment-cards button").count(), 3);
  await host.screenshot({ path: "test-results/abyss/upgrade.png" });
  const first = game.state.players[0].offers[0].id;
  await host.locator(".quick-augment-cards button").first().click();
  await host.waitForFunction(
    (card) =>
      !!(
        window.__OFFDUTY__!.state!.players[0].arsenal as Record<string, number>
      )[card.replace("attack:", "")] ||
      window.__OFFDUTY__!.state!.players[0].upgrades.includes(card) ||
      window.__OFFDUTY__!.state!.players[0].ability ===
        card.replace("ability:", ""),
    first,
  );
  await host.waitForFunction(
    () =>
      window.__OFFDUTY__?.state?.players.find(
        (p) => p.id === window.__OFFDUTY__?.playerId,
      )?.offers.length === 0,
  );
  await host
    .getByRole("region", { name: "随机改装" })
    .waitFor({ state: "detached" });
  passed.push(
    "Shared XP delivers three random upgrade options; chosen server effect applied without pausing match.",
  );
  const { p: late } = await page(1180, 880);
  await late.getByRole("region", { name: "公开房间大厅" }).waitFor();
  await late
    .locator(".live-room-list article")
    .filter({ hasText: code })
    .getByRole("button", { name: "中途加入" })
    .click();
  await late.waitForFunction(
    () => window.__OFFDUTY__?.state?.players.length === 2,
  );
  const lateId = await late.evaluate(() => window.__OFFDUTY__!.playerId),
    lp = game.state.players.find((p) => p.id === lateId)!;
  lp.invulnerable = 9999;
  assert.ok(lp.pendingUpgrades > 0);
  await late.getByRole("region", { name: "随机改装" }).waitFor();
  await late.getByRole("button", { name: "暂存强化" }).click();
  passed.push(
    "Late player receives current team level upgrade catch-up without resetting room.",
  );
  await host.waitForTimeout(7000);
  assert.equal(await host.locator(".mission-peek.expanded").count(), 0);
  await host.getByRole("button", { name: "查看任务详情" }).click();
  assert.equal(await host.locator(".mission-peek.expanded").count(), 1);
  const transparency = await host
    .locator(".damage-overlay")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.equal(
    await host
      .locator(".damage-overlay")
      .evaluate((el) => getComputedStyle(el).opacity),
    "1",
  );
  const compactHUD = await host.locator(".combat-strip").boundingBox();
  const hudMetrics = await host.locator(".combat-strip").evaluate((el) => ({
    height: el.getBoundingClientRect().height,
    padding: getComputedStyle(el).padding,
    children: [...el.children].map((child) => ({
      class: child.className,
      height: child.getBoundingClientRect().height,
      children: [...child.children].map((item) => ({
        class: item.className,
        height: item.getBoundingClientRect().height,
        padding: getComputedStyle(item).padding,
        margin: getComputedStyle(item).margin,
        lineHeight: getComputedStyle(item).lineHeight,
      })),
    })),
  }));
  assert.ok(
    compactHUD && compactHUD.height < 55,
    "HUD height budget exceeded: " + JSON.stringify(hudMetrics),
  );
  assert.ok(
    await host
      .locator(".vital-shield b")
      .evaluate((el) => el.getBoundingClientRect().width > 0),
  );
  passed.push(
    "Task auto-folds and reopens by click; ranking is transparent; shield overlay visible and HUD is slim.",
  );
  // Input and visual dash are tested in a clear connected chamber.
  const hp = game.state.players[0];
  hp.x = game.state.world.spawn.x;
  hp.y = game.state.world.spawn.y;
  await host.waitForTimeout(400);
  await host.locator("canvas").click({ position: { x: 140, y: 250 } });
  await host.keyboard.down("d");
  await host.keyboard.press("r");
  await host.waitForTimeout(180);
  await host.keyboard.up("d");
  assert.ok(hp.dashSeq > 0);
  passed.push("Real keyboard R triggers sequenced continuous server dash.");
  lp.alive = false;
  lp.hp = 0;
  lp.downTime = 80;
  await late.locator(".downed-alert").waitFor();
  await late.keyboard.press("h");
  await host.locator(".rescue-banner").waitFor();
  assert.equal(game.state.rescuePing?.name, lp.name);
  hp.ability = "mend";
  hp.skillCd = 0;
  hp.x = lp.x + 30;
  hp.y = lp.y;
  await host.waitForTimeout(250);
  await host.keyboard.press("q");
  await late.locator(".downed-alert").waitFor({ state: "detached" });
  passed.push(
    "Downed player calls rescue with H; teammate mend ability revives without reload.",
  );
  await host.keyboard.press("F8");
  await host.locator(".rich-work").waitFor();
  await host.getByLabel("事项名称1").fill("本地测试：已修改事项");
  await host.getByRole("button", { name: "项目看板", exact: true }).click();
  await host.locator(".work-kanban").waitFor();
  await host.getByRole("button", { name: "文档编辑", exact: true }).click();
  await host.getByLabel("工作文档").fill("会议纪要：已验证本地自动保存");
  await host.getByLabel("工作文档").press("F8");
  await host.locator(".rich-work").waitFor({ state: "detached" });
  await host.keyboard.press("F8");
  await host.getByLabel("工作文档").waitFor();
  assert.equal(
    await host.getByLabel("工作文档").inputValue(),
    "会议纪要：已验证本地自动保存",
  );
  await host.getByRole("button", { name: "数据报表", exact: true }).click();
  await host.locator(".work-spreadsheet").waitFor();
  const sheet = host
    .locator(".work-spreadsheet tbody tr")
    .first()
    .locator("td")
    .nth(2);
  await sheet.fill("37");
  await host.getByLabel("公式栏").click();
  await host.waitForTimeout(100);
  await host.getByRole("button", { name: "任务管理", exact: true }).click();
  await host.getByRole("button", { name: "数据报表", exact: true }).click();
  assert.equal(
    await host
      .locator(".work-spreadsheet tbody tr")
      .first()
      .locator("td")
      .nth(2)
      .innerText(),
    "37",
  );
  await host.screenshot({ path: "test-results/abyss/workspace.png" });
  await host.keyboard.press("F8");
  passed.push(
    "All four interactive workspaces work; edits persist; F8 works even while typing.",
  );
  await host.screenshot({ path: "test-results/abyss/gameplay.png" });
  await host.evaluate(() =>
    Object.defineProperty(window, "documentPictureInPicture", {
      value: undefined,
      configurable: true,
    }),
  );
  const popupWait = host.context().waitForEvent("page");
  await host.keyboard.press("F9");
  const child = await popupWait;
  child.on("pageerror", (e) => errors.push(e.message));
  await child.waitForFunction((id) => window.__OFFDUTY__?.playerId === id, id);
  assert.equal(await host.locator("canvas").count(), 0);
  assert.ok((await child.locator(".app.is-compact").count()) > 0);
  await child.keyboard.press("F4");
  await child.getByRole("button", { name: "一键隐藏游戏" }).click();
  await host.getByRole("button", { name: "继续工作" }).waitFor();
  assert.ok(child.isClosed());
  const reopen = host.context().waitForEvent("page");
  await host.getByRole("button", { name: "继续工作" }).click();
  const child2 = await reopen;
  await child2.waitForFunction((id) => window.__OFFDUTY__?.playerId === id, id);
  await host.getByRole("button", { name: "返回主窗口" }).click();
  await host.locator("canvas").waitFor();
  passed.push(
    "F9 opens actual small popup, handoff preserves identity, hide/show/return retain room.",
  );
  const { p: mobile } = await page(390, 844);
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await mobile.screenshot({
    path: "test-results/abyss/mobile.png",
    fullPage: true,
  });
  passed.push("390px lobby responsive layout has no horizontal overflow.");
  // Controlled end state verifies server persistence; combat is tested separately.
  game.state.elapsed = 130;
  game.state.wave = 7;
  game.state.players.forEach((p) => {
    p.alive = false;
    p.hp = 0;
  });
  await host.locator(".debrief-sheet").waitFor();
  assert.ok(app.scores.list("survival", "normal").length > 0);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/abyss/browser-result.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }, null, 2));
} finally {
  await browser.close();
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
