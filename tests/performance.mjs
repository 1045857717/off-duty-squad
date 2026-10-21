import { chromium } from "playwright";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: process.env.HEADED !== "1",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: Number(process.env.DPR || 1),
});
try {
  await page.goto(process.env.GAME_BASE_URL || "http://localhost:3000", {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() =>
    document.querySelector(".connection")?.textContent.includes("服务已连接"),
  );
  await page.getByRole("button", { name: /先一个人试跑/ }).click();
  await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await page.getByRole("button", { name: "小队出发", exact: true }).click();
  await page.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  await page
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await page.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  await page.waitForTimeout(1200);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", {
    rate: Number(process.env.CPU_RATE || 1),
  });
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.collectGarbage");
  const before = (await cdp.send("Performance.getMetrics")).metrics;
  const sample = await page.evaluate(async () => {
    let textUpdates = 0,
      renderCalls = 0;
    const textProto = window.Phaser.GameObjects.Text.prototype,
      oldText = textProto.updateText;
    textProto.updateText = function (...a) {
      textUpdates++;
      return oldText.apply(this, a);
    };
    const rendererProto = window.Phaser.Renderer.WebGL.WebGLRenderer.prototype,
      oldRender = rendererProto.render;
    rendererProto.render = function (...a) {
      renderCalls++;
      return oldRender.apply(this, a);
    };
    const deltas = [],
      longtasks = [];
    let prev = performance.now(),
      mutations = 0;
    const mo = new MutationObserver((list) => (mutations += list.length));
    mo.observe(document.querySelector(".app"), {
      subtree: true,
      characterData: true,
      childList: true,
      attributes: true,
    });
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longtasks.push(e.duration);
    });
    po.observe({ type: "longtask", buffered: false });
    const start = performance.now();
    return await new Promise((resolve) => {
      function frame(t) {
        deltas.push(t - prev);
        prev = t;
        if (t - start < 8000) {
          requestAnimationFrame(frame);
          return;
        }
        mo.disconnect();
        po.disconnect();
        deltas.shift();
        deltas.sort((a, b) => a - b);
        textProto.updateText = oldText;
        rendererProto.render = oldRender;
        resolve({
          textUpdates,
          renderCalls,
          gameFPS: renderCalls / ((t - start) / 1000),
          duration: t - start,
          frames: deltas.length,
          fps: deltas.length / ((t - start) / 1000),
          p50: deltas[Math.floor(deltas.length * 0.5)],
          p95: deltas[Math.floor(deltas.length * 0.95)],
          p99: deltas[Math.floor(deltas.length * 0.99)],
          over25: deltas.filter((x) => x > 25).length,
          over50: deltas.filter((x) => x > 50).length,
          mutations,
          longtasks: longtasks.length,
          phase: window.__OFFDUTY__.state.phase,
          entities: window.__OFFDUTY__.state.enemies.length,
          phaserGlobal: !!window.Phaser,
        });
      }
      requestAnimationFrame(frame);
    });
  });
  const after = (await cdp.send("Performance.getMetrics")).metrics;
  const metric = (m, n) => m.find((v) => v.name === n)?.value || 0;
  const result = {
    ...sample,
    scriptMs:
      (metric(after, "ScriptDuration") - metric(before, "ScriptDuration")) *
      1000,
    taskMs:
      (metric(after, "TaskDuration") - metric(before, "TaskDuration")) * 1000,
    heapMB: metric(after, "JSHeapUsedSize") / 1048576,
    nodes: metric(after, "Nodes"),
  };
  console.log(JSON.stringify(result, null, 2));
  const required = process.env.MIN_FPS
    ? Number(process.env.MIN_FPS)
    : Math.min(144, result.fps * 0.82);
  result.requiredFPS = required;
  if (result.gameFPS < required || result.textUpdates > 240)
    throw Error(
      `High-refresh regression: ${result.gameFPS.toFixed(1)} < ${required.toFixed(1)} FPS, text uploads ${result.textUpdates}`,
    );
  await page.keyboard.press("F10");
  await page.waitForTimeout(450);
  const hiddenFrames = await page.evaluate(async () => {
    let count = 0;
    const proto = window.Phaser.Renderer.WebGL.WebGLRenderer.prototype,
      original = proto.render;
    proto.render = function (...args) {
      count++;
      return original.apply(this, args);
    };
    await new Promise((r) => setTimeout(r, 600));
    proto.render = original;
    return count;
  });
  if (hiddenFrames !== 0) throw Error("Hidden game should stop rendering");
  await page.getByRole("button", { name: /继续/ }).click();
  await page.waitForTimeout(350);
  result.hiddenFrames = hiddenFrames;
  console.log("Hidden frames:", hiddenFrames);
  await fs.writeFile(
    process.env.PERF_OUTPUT || "test-results/performance.json",
    JSON.stringify(result, null, 2),
  );
} finally {
  await browser.close();
}
