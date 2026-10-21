import { chromium } from "playwright";
import assert from "node:assert/strict";
await (
  await import("node:fs/promises")
).mkdir("test-results/windows", { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
});
const errors = [];
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto(process.env.GAME_BASE_URL || "http://localhost:3000", {
    waitUntil: "networkidle",
  });
  await p.waitForFunction(() =>
    document.querySelector(".connection")?.textContent.includes("服务已连接"),
  );
  await p.getByRole("button", { name: /先一个人试跑/ }).click();
  await p.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await p.getByRole("button", { name: "小队出发", exact: true }).click();
  await p.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  await p
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await p.waitForFunction(() => window.__OFFDUTY__?.state?.phase === "playing");
  if (await p.getByRole("region", { name: "随机改装" }).count())
    await p.getByRole("button", { name: "暂存强化" }).click();
  const id = await p.evaluate(() => window.__OFFDUTY__.playerId);
  console.log("Started", id);
  await p.evaluate(() =>
    Object.defineProperty(window, "documentPictureInPicture", {
      value: undefined,
      configurable: true,
    }),
  );
  const popupWait = ctx.waitForEvent("page");
  await p.getByRole("button", { name: "独立小窗", exact: true }).click();
  const child = await popupWait;
  child.on("pageerror", (e) => errors.push(e.message));
  child.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await child.waitForFunction(
    (id) =>
      window.__OFFDUTY__?.playerId === id &&
      window.__OFFDUTY__?.state?.phase === "playing",
    id,
  );
  assert.equal(await p.locator("canvas").count(), 0);
  assert.equal(await child.locator("canvas").count(), 1);
  assert.equal(
    await child.evaluate(() => window.__OFFDUTY__.state.players.length),
    2,
  );
  console.log("Popup received SAME player, parent renderer destroyed.");
  await child.waitForTimeout(1100);
  await child.screenshot({ path: "test-results/windows/floating-preview.png" });
  await child.keyboard.press("F4");
  await child
    .getByRole("button", { name: "一键隐藏游戏", exact: true })
    .click();
  await p.getByRole("button", { name: "继续工作" }).waitFor();
  assert.equal(child.isClosed(), true);
  assert.equal(await p.locator("canvas").count(), 0);
  console.log("Hide closes floating window and pauses parent drawing.");
  const reopened = ctx.waitForEvent("page");
  await p.getByRole("button", { name: "继续工作" }).click();
  const next = await reopened;
  await next.waitForFunction(
    (id) =>
      window.__OFFDUTY__?.playerId === id &&
      window.__OFFDUTY__?.state?.phase === "playing",
    id,
  );
  assert.equal(
    await next.evaluate(() => window.__OFFDUTY__.state.players.length),
    2,
  );
  console.log("Show reopens same role and game.");
  await next.keyboard.press("F10").catch((error) => {
    if (!next.isClosed()) throw error;
  });
  await p.getByRole("button", { name: "继续工作" }).waitFor();
  assert.equal(next.isClosed(), true);
  console.log("F10 hides floating window.");
  const reopened2 = ctx.waitForEvent("page");
  await p.keyboard.press("F10");
  const third = await reopened2;
  await third.waitForFunction((id) => window.__OFFDUTY__?.playerId === id, id);
  console.log("F10 in main page restores window.");
  await p.getByRole("button", { name: "返回主窗口" }).click();
  await p.waitForFunction(
    (id) =>
      window.__OFFDUTY__?.playerId === id &&
      window.__OFFDUTY__?.state?.players.some(
        (p) => p.id === id && p.connected,
      ),
    id,
  );
  await p.waitForTimeout(350);
  assert.equal(third.isClosed(), true);
  assert.equal(await p.locator("canvas").count(), 1);
  assert.equal(await p.evaluate(() => window.__OFFDUTY__.state.host), id);
  console.log("Return restores player, renderer, room, host.");
  assert.deepEqual(errors, []);
  console.log("WINDOW_QA_PASS");
} finally {
  await browser.close();
}
