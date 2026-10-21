import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
  ...(process.env.BENCHMARK_UNCAPPED === "1"
    ? { args: ["--disable-frame-rate-limit", "--disable-gpu-vsync"] }
    : {}),
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
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
  // Sample movement at the requested display target. An uncapped GPU loop can
  // exceed 5000Hz, where real subpixel travel falls below a .03px threshold.
  await page.keyboard.press("F2");
  await page.getByRole("combobox", { name: "刷新率模式" }).click();
  await page.getByRole("option", { name: "144 FPS 上限", exact: true }).click();
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.waitForTimeout(500);
  const dpr = await page
    .locator("canvas")
    .evaluate((el) => el.width / el.getBoundingClientRect().width);
  assert.ok(dpr > 1.9);
  const hints = await page
    .locator(".top-actions button")
    .evaluateAll((buttons) =>
      buttons
        .filter((b) => !b.disabled)
        .map((b) => ({
          name: b.getAttribute("aria-label") || b.textContent,
          keys: b.querySelector("kbd")?.textContent,
        })),
    );
  assert.ok(
    hints.every((h) => h.keys),
    JSON.stringify(hints),
  );
  await page.evaluate(() => {
    window.__frames = new Set();
    const proto = window.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    window.__oldPoseData = old;
    proto.setData = function (key, frame, ...rest) {
      if (
        key === "pose" &&
        this.name === "rig-" + window.__OFFDUTY__.playerId
      ) {
        window.__frames.add(frame.leftLeg.toFixed(5));
        window.__hero = this;
      }
      return old.call(this, key, frame, ...rest);
    };
  });
  await page.locator("canvas").click({ position: { x: 170, y: 200 } });
  await page.keyboard.down("d");
  await page.waitForTimeout(470);
  await page.keyboard.up("d");
  const motion = await page.evaluate(async () => {
    const positions = [],
      actor = window.__hero;
    let previous = actor.x;
    const start = performance.now();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "a",
        code: "KeyA",
        keyCode: 65,
        which: 65,
        bubbles: true,
      }),
    );
    // Count only actual rendered game frames. The browser RAF can run much
    // faster than a capped 144Hz game and would re-sample the same position.
    await new Promise((resolve) => {
      const proto = window.Phaser.Renderer.WebGL.WebGLRenderer.prototype,
        old = proto.render;
      proto.render = function (...args) {
        positions.push(Math.abs(actor.x - previous));
        previous = actor.x;
        return old.apply(this, args);
      };
      setTimeout(() => {
        proto.render = old;
        resolve();
      }, 400);
    });
    document.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "a",
        code: "KeyA",
        keyCode: 65,
        which: 65,
        bubbles: true,
      }),
    );
    return {
      samples: positions.length,
      moving: positions.filter((d) => d > 0.03).length,
    };
  });
  if (motion.samples > 15 && motion.moving / motion.samples < 0.7)
    throw Error(`Movement still stepped ${JSON.stringify(motion)}`);
  const frames = await page.evaluate(() => window.__frames.size);
  assert.ok(frames >= 10, `Distinct walk phases ${frames}`);
  await page.evaluate(
    () =>
      (window.Phaser.GameObjects.Container.prototype.setData =
        window.__oldPoseData),
  );
  assert.equal(await page.locator(".damage-overlay").count(), 1);
  await page.keyboard.press("F7");
  assert.equal(await page.locator(".damage-overlay").count(), 0);
  await page.keyboard.press("F7");
  assert.equal(await page.locator(".damage-overlay").count(), 1);
  await page.keyboard.press("F2");
  await page.getByRole("combobox", { name: "刷新率模式" }).click();
  await page.getByRole("option", { name: "144 FPS 上限", exact: true }).click();
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.waitForTimeout(900);
  const capSample = await page.evaluate(async () => {
    let frames = 0,
      rafFrames = 0,
      running = true;
    const raf = () => {
      if (running) {
        rafFrames++;
        requestAnimationFrame(raf);
      }
    };
    requestAnimationFrame(raf);
    const proto = window.Phaser.Renderer.WebGL.WebGLRenderer.prototype,
      old = proto.render;
    proto.render = function (...args) {
      frames++;
      return old.apply(this, args);
    };
    const t = performance.now();
    await new Promise((r) => setTimeout(r, 3000));
    proto.render = old;
    running = false;
    return {
      fps: frames / ((performance.now() - t) / 1000),
      raf: rafFrames / ((performance.now() - t) / 1000),
    };
  });
  const cap = capSample.fps;
  console.log("CAP_SAMPLE", JSON.stringify(capSample));
  assert.ok(cap > 135 && cap < 150, `144 cap rendered ${cap}`);
  await page.keyboard.press("F2");
  await page.getByRole("combobox", { name: "刷新率模式" }).click();
  await page
    .getByRole("option", { name: "高刷 · 跟随屏幕", exact: true })
    .click();
  await page.getByRole("combobox", { name: "画面精细度" }).click();
  await page
    .getByRole("option", { name: "均衡 · 减少像素填充", exact: true })
    .click();
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.waitForTimeout(700);
  assert.ok(
    await page
      .locator("canvas")
      .evaluate(
        (el) =>
          Math.abs(el.width / el.getBoundingClientRect().width - 1) < 0.01,
      ),
  );
  await page.keyboard.press("F2");
  await page.getByRole("combobox", { name: "画面精细度" }).click();
  await page
    .getByRole("option", { name: "精细 · 高清角色 / 高 DPI", exact: true })
    .click();
  await page.getByRole("button", { name: "设置好了" }).click();
  await page.waitForTimeout(700);
  await page.keyboard.press("F2");
  await page.getByLabel("迷你模式").check();
  await page.getByRole("button", { name: "设置好了" }).click();
  const border = await page.locator(".stage-shell").evaluate((el) => ({
    width: getComputedStyle(el).borderLeftWidth,
    radius: getComputedStyle(el).borderRadius,
  }));
  assert.equal(border.width, "0px");
  assert.equal(border.radius, "0px");
  assert.equal(await page.locator(".window-immersive").count(), 1);
  await page.keyboard.press("F4");
  assert.equal(await page.locator(".window-immersive").count(), 0);
  const compactHints = await page
    .locator(".compact-bar button")
    .evaluateAll((buttons) => buttons.map((b) => !!b.querySelector("kbd")));
  assert.ok(compactHints.every(Boolean));
  assert.deepEqual(errors, []);
  console.log(
    "QUALITY_ANIMATION_SHORTCUTS",
    JSON.stringify({
      dpr,
      distinctWalkFrames: frames,
      motion,
      cap144: cap,
      toolbarHints: hints,
      compactBorder: border,
      consoleErrors: errors,
    }),
  );
  await fs.mkdir("test-results", { recursive: true });
  await fs.writeFile(
    "test-results/quality.json",
    JSON.stringify(
      {
        dpr,
        distinctWalkFrames: frames,
        motion,
        cap144: cap,
        displayUncapped: process.env.BENCHMARK_UNCAPPED === "1",
        toolbarHints: hints,
        border,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
