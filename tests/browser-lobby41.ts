import { readTextContrast } from "./browser-support";
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../server/app";

// Single-browser lobby coverage. Uses the shared dist; never starts a build.
const data = await mkdtemp(path.join(tmpdir(), "offduty-lobby41-"));
const backend = createServer({ dataDir: data });
await new Promise<void>((resolve) =>
  backend.http.listen(0, "127.0.0.1", resolve),
);
const url =
  process.env.LOBBY41_URL ||
  "http://127.0.0.1:" + (backend.http.address() as { port: number }).port;
const out = "test-results/lobby41";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const checks: string[] = [],
  errors: string[] = [];
const laptop = { width: 1366, height: 768 };
async function open() {
  const context = await browser.newContext({ viewport: laptop });
  const page = await context.newPage();
  await page.addInitScript("window.__name=(fn)=>fn");
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  await page.locator(".app.lobby41").waitFor();
  return page;
}
async function top(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
}
async function geometry(page: Page, ready = false) {
  await top(page);
  const result = await page.evaluate((isReady) => {
    const mode = document
        .querySelector(".rules-selector")!
        .getBoundingClientRect(),
      chat = document.querySelector(".lobby-channels")!.getBoundingClientRect();
    const target = document
      .querySelector(isReady ? ".ready-roster" : ".public-lobby")!
      .getBoundingClientRect();
    const launch = isReady
      ? document.querySelector(".ready-launch")!.getBoundingClientRect()
      : null;
    return {
      modeTop: mode.top,
      modeBottom: mode.bottom,
      rosterBottom: target.bottom,
      targetTop: target.top,
      chatTop: chat.top,
      chatBottom: chat.bottom,
      targetRight: target.right,
      chatLeft: chat.left,
      launchBottom: launch?.bottom,
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  }, ready);
  assert.ok(result.modeTop >= 0, "Mode panels must not be scrolled off screen");
  assert.ok(
    result.modeBottom <= result.targetTop,
    "Modes must precede the roster/public scene",
  );
  assert.ok(
    result.chatTop >= 0 && result.chatBottom < 768,
    "Chat must be visible at laptop size",
  );
  assert.ok(
    result.chatLeft > result.targetRight,
    "Chat must share the lobby viewport",
  );
  assert.equal(
    result.scrollWidth,
    result.width,
    "Laptop must not overflow horizontally",
  );
  if (ready)
    assert.ok(
      result.rosterBottom <= 768,
      "All four roster seats must be in the viewport",
    );
  if (ready)
    assert.ok(
      result.launchBottom! <= 768,
      "Launch must be visible without scrolling",
    );
  return result;
}
try {
  const host = await open();
  await host.getByRole("region", { name: "公开房间大厅" }).waitFor();
  assert.equal(
    await host
      .getByRole("button", { name: "模式：园区发癫局", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await host
      .getByRole("button", { name: "模式：夺回下班权", exact: true })
      .count(),
    1,
  );
  assert.ok(
    await host
      .locator(".lobby-scene")
      .getByText("班是公司的，", { exact: false })
      .isVisible(),
  );
  assert.ok(
    await host
      .locator(".lobby-scene")
      .getByText("摸到的鱼，才算自己挣到的。", { exact: true })
      .isVisible(),
  );
  assert.equal(await host.locator(".lobby-scene .pixel-avatar").count(), 3);
  assert.ok(
    await host
      .getByRole("link", { name: "GitHub开源项目", exact: true })
      .isVisible(),
  );
  assert.equal(await host.locator(".rental-ads article").count(), 3);
  assert.ok(
    await host
      .getByText(
        "广告位出租 · 联系QQ：1045857717 · 只在大厅展示 · 战斗画面不放广告",
        { exact: true },
      )
      .count(),
  );
  const publicGeometry = await geometry(host);
  await host.screenshot({ path: out + "/public-lobby-empty-1366.png" });
  await host
    .getByRole("button", { name: "模式：夺回下班权", exact: true })
    .focus();
  await host.keyboard.press("Enter");
  assert.equal(
    await host
      .getByRole("button", { name: "模式：夺回下班权", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await host
    .getByRole("button", { name: "模式：园区发癫局", exact: true })
    .click();
  checks.push(
    "Public rooms default; one mode control; keyboard selection; native art; brand slogans; GitHub and QQ ads retained",
  );

  await host.keyboard.press("F10");
  await host.locator(".hidden-veil").waitFor();
  const neutral = await host
    .locator(".hidden-veil .btn-primary")
    .evaluate((button) => getComputedStyle(button).backgroundColor);
  assert.equal(
    neutral,
    "rgb(238, 240, 242)",
    "F10 neutral button must retain #eef0f2",
  );
  await host.screenshot({ path: out + "/f10-neutral.png" });
  await host.keyboard.press("F10");
  checks.push("F10 neutral resume button retains #eef0f2");

  await host
    .getByRole("button", { name: "创建小队", exact: true })
    .first()
    .click();
  await host.getByLabel("你的行动代号").fill("打卡不打工");
  await host.getByLabel("小队名称").fill("今天也要准点下班");
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code);
  const guest = await open();
  await guest.getByLabel("搜索公开房间").fill(code);
  const room = guest
    .locator(".live-room-list article")
    .filter({ hasText: code });
  await room.waitFor();
  await top(guest);
  await guest.screenshot({ path: out + "/public-lobby-1366.png" });
  await guest.setViewportSize({ width: 390, height: 844 });
  await top(guest);
  assert.equal(
    await guest.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  const mobileProfession = await guest
    .locator(".profession-identity")
    .boundingBox();
  assert.ok(
    mobileProfession && mobileProfession.width > 200,
    "Mobile profession copy needs a readable width",
  );
  await guest.screenshot({
    path: out + "/public-lobby-390.png",
    fullPage: true,
  });
  await guest.setViewportSize(laptop);
  await room.getByRole("button", { name: "加入小队", exact: true }).click();
  await guest.getByRole("region", { name: "小队准备大厅" }).waitFor();
  assert.equal(
    await guest
      .getByRole("button", { name: "模式：园区发癫局", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await host
      .getByRole("button", { name: "小队出发", exact: true })
      .isDisabled(),
    true,
  );
  await top(host);
  await host.getByRole("button", { name: "添加2位AI", exact: true }).click();
  assert.equal(
    await host.evaluate(() => scrollY),
    0,
    "AI setup must not scroll the lobby",
  );
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.players.length === 4,
  );
  await guest
    .getByLabel("聊天内容", { exact: true })
    .fill("同事到齐，准点下班。");
  await guest.getByLabel("聊天内容", { exact: true }).press("Enter");
  await host
    .locator(".squad-chat-messages")
    .getByText("同事到齐，准点下班。", { exact: true })
    .waitFor();
  await guest.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.waitForFunction(() =>
    window.__OFFDUTY__!.state!.players.every(
      (p) => p.bot || p.id === window.__OFFDUTY__!.state!.host || p.ready,
    ),
  );
  await host.locator(".ready-launch .launch-only:enabled").waitFor();
  const readyGeometry = await geometry(host, true);
  const contrasts = {
    readyText: await readTextContrast(
      host,
      ".ready-seat.is-ready:first-child > footer",
    ),
    readyIcon: await readTextContrast(
      host,
      ".ready-seat.is-ready:first-child > footer",
      "svg",
    ),
    chatSystem: await readTextContrast(
      host,
      ".squad-chat-messages",
      "p.system > span",
    ),
    chatMessage: await readTextContrast(
      host,
      ".squad-chat-messages",
      "p:not(.system) > span",
    ),
  };
  for (const [name, value] of Object.entries(contrasts)) {
    assert.ok(value >= 4.5, name + " contrast " + value);
  }
  checks.push(
    "Ready text/icon and actual chat system/message contrast >= 4.5:1: " +
      JSON.stringify(contrasts),
  );
  assert.equal(await host.locator(".ready-roster .ready-seat").count(), 4);
  assert.equal(await host.locator(".ready-roster .pixel-avatar").count(), 4);
  assert.equal(
    await host
      .getByRole("button", { name: "模式：园区发癫局", exact: true })
      .count(),
    1,
  );
  await host.screenshot({ path: out + "/ready-room-1366.png" });
  checks.push(
    "1366×768: top mode panels, four native workers, launch and chat share the viewport; live squad chat delivered",
  );
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await host.getByRole("status", { name: "出发倒计时" }).waitFor();
  await host.screenshot({ path: out + "/countdown-1366.png" });
  await host.getByRole("button", { name: "取消出发", exact: true }).click();
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.phase === "lobby",
  );
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await guest.getByRole("status", { name: "出发倒计时" }).waitFor();
  await guest
    .getByRole("button", { name: "取消准备", exact: true })
    .first()
    .click();
  await host.waitForFunction(
    () => window.__OFFDUTY__!.state!.phase === "lobby",
  );
  assert.equal(
    await host
      .getByRole("button", { name: "小队出发", exact: true })
      .isDisabled(),
    true,
  );
  checks.push(
    "Host-only modes; unready launch gating; real ready; host countdown cancel and guest unready cancel preserved",
  );
  await host.setViewportSize({ width: 390, height: 844 });
  await top(host);
  assert.equal(
    await host.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await host.screenshot({ path: out + "/ready-room-390.png", fullPage: true });
  assert.ok(
    await host
      .getByRole("button", { name: "图鉴与档案", exact: true })
      .isVisible(),
  );
  assert.ok(
    await host
      .getByRole("button", { name: "行动指南", exact: true })
      .isVisible(),
  );
  await host.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await host
    .locator(".mode-panel")
    .first()
    .evaluate((button) => ({
      animation: getComputedStyle(button).animationName,
      transition: getComputedStyle(button).transitionDuration,
    }));
  assert.equal(reduced.animation, "none");
  assert.equal(reduced.transition, "0s");
  checks.push(
    "390px: public lobby and ready room have no horizontal overflow; reduced motion disables lobby animation/transitions",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    out + "/report.json",
    JSON.stringify(
      {
        checks,
        publicGeometry,
        readyGeometry,
        neutral,
        contrasts,
        reduced,
        errors,
      },
      null,
      2,
    ),
  );
  await rm(out + "/failure.json", { force: true });
  console.log(
    JSON.stringify({ checks, publicGeometry, readyGeometry, errors }, null, 2),
  );
} catch (error) {
  let index = 0;
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      await top(page).catch(() => {});
      await page
        .screenshot({ path: out + "/failure-" + index++ + ".png" })
        .catch(() => {});
    }
  }
  await writeFile(
    out + "/failure.json",
    JSON.stringify({ checks, errors, error: String(error) }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
  await backend.close();
  const tempRoot = path.resolve(tmpdir()) + path.sep;
  assert.ok(path.resolve(data).startsWith(tempRoot + "offduty-lobby41-"));
  await rm(data, { recursive: true, force: true });
}
