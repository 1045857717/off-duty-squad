import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "../server/app";
import { launchFromDraft } from "./browser-support";
const data = await mkdtemp(path.join(tmpdir(), "offduty-diagnostics413-"));
const backend = createServer({ dataDir: data });
backend.io.engine.opts.transports = ["polling"];
let dropStates = false,
  dropProbes = false;
const adapter = backend.io.of("/").adapter,
  original = adapter.broadcast;
adapter.broadcast = (packet, options) => {
  if (dropStates && packet.data?.[0] === "state") return;
  original.call(adapter, packet, options);
};
backend.io.on("connection", (socket) => {
  socket.removeAllListeners("ping:latency");
  socket.on("ping:latency", (_payload, ack) => {
    if (!dropProbes && typeof ack === "function") ack();
  });
});
await new Promise<void>((r) => backend.http.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const errors: string[] = [],
  passed: string[] = [];
try {
  const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as any).__name = (f: any) => f;
    localStorage.setItem(
      "offduty-settings",
      JSON.stringify({
        frameCap: 0,
        quality: "balanced",
        sound: false,
        autoFire: false,
        showGuide: false,
      }),
    );
  });
  await page.goto(`http://127.0.0.1:${(backend.http.address() as any).port}`);
  await page.getByRole("button", { name: /先一个人试跑/ }).click();
  await launchFromDraft(page);
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code),
    game = backend.rooms.get(code)!;
  game.state.enemies = [];
  game.state.spawnCd = game.state.eventCd = game.state.waveEnds = 9999;
  for (const player of game.state.players) player.invulnerable = 9999;
  await page.waitForFunction(
    () =>
      document
        .querySelector(".performance-meter")
        ?.getAttribute("data-sync-status") === "fresh",
  );
  await page.waitForFunction(
    () =>
      document
        .querySelector(".rtt-meter")
        ?.getAttribute("data-network-status") === "good",
  );
  await page.getByRole("button", { name: "快捷设置", exact: true }).click();
  await page.locator(".performance-diagnostics > summary").click();
  await page.getByText("HTTP 轮询（兼容连接）", { exact: true }).waitFor();
  await page.waitForFunction(() => {
    const text = document.querySelector(".diagnostic-content")?.textContent;
    return (
      !!text &&
      /浏览器回调/.test(text) &&
      /次\/秒/.test(text) &&
      !/浏览器回调尚未测得/.test(text)
    );
  });
  const text = await page.locator(".diagnostic-content").innerText();
  assert.match(text, /高刷.*跟随浏览器/);
  assert.match(text, /不等于物理/);
  assert.equal(
    await page.getByRole("link", { name: /空载刷新测试/ }).getAttribute("href"),
    "/frame-check.html",
  );
  await mkdir("test-results/diagnostics413", { recursive: true });
  for (const [name, width, height] of [
    ["desktop", 1366, 768],
    ["mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    const clipped = await page
      .locator(".performance-diagnostics")
      .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    assert.equal(clipped, false, "diagnostic details must fit " + name);
    await page.screenshot({ path: `test-results/diagnostics413/${name}.png` });
  }
  passed.push(
    "fallback polling, real callback metrics, target explanation, responsive F2 diagnostics",
  );
  await page.getByRole("button", { name: "关闭对话框", exact: true }).click();
  await page.setViewportSize({ width: 1366, height: 768 });
  dropStates = true;
  await page.waitForFunction(
    () =>
      document
        .querySelector(".performance-meter")
        ?.getAttribute("data-sync-status") === "stalled",
    null,
    { timeout: 6000 },
  );
  assert.match(await page.locator(".network-label").innerText(), /同步停顿/);
  assert.equal(
    await page.locator(".rtt-meter").getAttribute("data-network-status"),
    "good",
  );
  assert.match(await page.locator(".render-rate").innerText(), /[1-9]\d* FPS/);
  passed.push(
    "state stream stall is visible even while RTT replies remain healthy",
  );
  dropStates = false;
  await page.waitForFunction(
    () =>
      document
        .querySelector(".performance-meter")
        ?.getAttribute("data-sync-status") === "fresh",
  );
  dropProbes = true;
  await page.waitForFunction(
    () =>
      document
        .querySelector(".rtt-meter")
        ?.getAttribute("data-network-status") === "no-response",
    null,
    { timeout: 12000 },
  );
  assert.equal(
    await page.locator(".performance-meter").getAttribute("data-sync-status"),
    "fresh",
  );
  assert.match(await page.locator(".network-label").innerText(), /探测超时/);
  passed.push(
    "missing RTT acknowledgement is not mislabeled as a game synchronization outage",
  );
  dropProbes = false;
  await page.waitForFunction(
    () =>
      document
        .querySelector(".rtt-meter")
        ?.getAttribute("data-network-status") === "good",
    null,
    { timeout: 8000 },
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/diagnostics413/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log("DIAGNOSTICS413_PASS", JSON.stringify(passed));
} finally {
  await browser.close();
  await backend.close();
  const target = path.resolve(data);
  if (
    !target.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(target).startsWith("offduty-diagnostics413-")
  )
    throw Error("Unsafe cleanup");
  await rm(target, { recursive: true, force: true });
}
