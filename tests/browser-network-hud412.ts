import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { createServer } from "../server/app";
import { launchFromDraft, readTextContrast } from "./browser-support";
import type { NetworkStatus } from "../src/networkHealth";

// One browser, one idle player. Functional HUD coverage, never a GPU benchmark.
// Serve the current source without writing a shared dist or node_modules cache.
const data = await mkdtemp(path.join(tmpdir(), "offduty-network-hud412-"));
const backend = createServer({ dataDir: data });
let browser: Browser | undefined;
let web: ViteDevServer | undefined;
let dropReplies = false;
let replyDelay = 20;
let probes = 0;
const pendingReplies = new Set<ReturnType<typeof setTimeout>>();
const errors: string[] = [];
const passed: string[] = [];
backend.io.on("connection", (socket) => {
  socket.removeAllListeners("ping:latency");
  socket.on("ping:latency", (_payload, acknowledge) => {
    probes++;
    if (dropReplies || typeof acknowledge !== "function") return;
    const timer = setTimeout(() => {
      pendingReplies.delete(timer);
      if (socket.connected) acknowledge();
    }, replyDelay);
    pendingReplies.add(timer);
  });
});

async function status(page: Page, expected: NetworkStatus) {
  await page.waitForFunction(
    (value) =>
      document
        .querySelector(".rtt-meter")
        ?.getAttribute("data-network-status") === value,
    expected,
    { timeout: 12000 },
  );
  const text = await page.locator(".rtt-meter").innerText();
  if (["good", "moderate", "poor"].includes(expected)) {
    const rtt = Number(text.match(/RTT\s+(\d+)\s+ms/)?.[1]);
    assert.ok(rtt > 0, "RTT must come from an actual nonzero round trip");
    if (expected === "moderate") assert.ok(rtt >= 101 && rtt <= 200);
    if (expected === "poor") assert.ok(rtt > 200);
  } else {
    assert.match(text, /RTT\s+—/);
    assert.doesNotMatch(
      text,
      /\d+\s*ms/,
      "unavailable RTT must not retain an old number",
    );
  }
  assert.ok(
    await page.locator(".network-label").innerText(),
    "status needs text beyond color",
  );
  passed.push(expected);
}

async function geometry(page: Page, label: string) {
  const box = await page.locator(".performance-meter").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const rtt = element.querySelector(".rtt-meter")!.getBoundingClientRect();
    const mission = document
      .querySelector(".mission-peek > button")!
      .getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      rttLeft: rtt.left,
      rttRight: rtt.right,
      missionOverlap:
        rect.left < mission.right &&
        rect.right > mission.left &&
        rect.top < mission.bottom &&
        rect.bottom > mission.top,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      fontSize: parseFloat(style.fontSize),
      opacity: style.opacity,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });
  assert.ok(
    box.left >= 0 && box.right <= box.viewportWidth,
    label + ": horizontally visible",
  );
  assert.ok(
    box.top >= 0 && box.bottom <= box.viewportHeight,
    label + ": vertically visible",
  );
  assert.ok(
    box.rttLeft >= box.left && box.rttRight <= box.right,
    label + ": RTT fits the HUD",
  );
  assert.ok(
    box.scrollWidth <= box.clientWidth + 1,
    label + ": no clipped text",
  );
  assert.equal(
    box.missionOverlap,
    false,
    label + ": mission header must remain readable",
  );
  assert.ok(
    box.fontSize >= 12 && box.opacity === "1",
    label + ": readable type " + JSON.stringify(box),
  );
  assert.ok(
    (await readTextContrast(page, ".performance-meter", ".rtt-meter")) >= 4.5,
  );
  assert.equal(
    await page
      .locator(
        ".performance-meter[aria-live], .performance-meter [aria-live], .performance-meter[role=status]",
      )
      .count(),
    0,
  );
  assert.match(
    (await page.locator(".performance-meter").getAttribute("title")) || "",
    /FPS.*RTT.*往返/,
  );
  const output = process.env.NETWORK_HUD412_ARTIFACT_DIR;
  if (output) {
    await mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, label + ".png") });
  }
  console.log(label, JSON.stringify(box));
  passed.push(label);
}

try {
  await new Promise<void>((resolve) =>
    backend.http.listen(0, "127.0.0.1", resolve),
  );
  const backendUrl =
    "http://127.0.0.1:" + (backend.http.address() as { port: number }).port;
  web = await createViteServer({
    cacheDir: path.join(data, "vite-cache"),
    clearScreen: false,
    server: {
      host: "127.0.0.1",
      port: 0,
      open: false,
      proxy: {
        "/socket.io": { target: backendUrl, ws: true },
        "/api": backendUrl,
      },
    },
  });
  await web.listen();
  const url =
    "http://127.0.0.1:" + (web.httpServer!.address() as { port: number }).port;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_BROWSER
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  await page.addInitScript("window.__name=(fn)=>fn");
  // An ordinary 60 FPS cap keeps this functional run light; no throughput flags.
  await page.addInitScript(() => {
    localStorage.setItem(
      "offduty-settings",
      JSON.stringify({ frameCap: 60, quality: "low", sound: false }),
    );
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url);
  await page.getByRole("button", { name: /先一个人试跑/ }).click();
  await launchFromDraft(page);
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code);
  const game = backend.rooms.get(code)!;
  game.state.enemies = [];
  game.state.spawnCd = 999;
  game.state.eventCd = 999;
  game.state.players[0].invulnerable = 999;
  await status(page, "good");
  assert.ok(probes > 0);
  await page.waitForFunction(() =>
    /[1-9]\d* FPS/.test(
      document.querySelector(".render-rate")?.textContent || "",
    ),
  );
  await geometry(page, "1366");

  if (!process.argv.includes("--layout-only")) {
    replyDelay = 140;
    await status(page, "moderate");
    replyDelay = 275;
    await status(page, "poor");
    dropReplies = true;
    await status(page, "no-response");
    dropReplies = false;
    replyDelay = 20;
    await status(page, "good");

    await context.setOffline(true);
    for (const socket of backend.io.sockets.sockets.values())
      socket.conn.close();
    await status(page, "disconnected");
    replyDelay = 1800;
    await context.setOffline(false);
    await status(page, "unknown");
    await status(page, "poor");
    replyDelay = 20;
    await status(page, "good");
    assert.equal(
      await page.evaluate(() => window.__OFFDUTY__!.state!.code),
      code,
      "reconnect preserves the room",
    );

    // React parent snapshots arrive much faster; HUD DOM publications stay at 1 Hz.
    const updates = await page
      .locator(".performance-meter")
      .evaluate(async (element) => {
        const times: number[] = [];
        const observer = new MutationObserver(() =>
          times.push(performance.now()),
        );
        observer.observe(element, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
        });
        await new Promise((resolve) => setTimeout(resolve, 4200));
        observer.disconnect();
        return times;
      });
    assert.ok(updates.length <= 5, "at most one HUD publication per second");
    for (let i = 1; i < updates.length; i++)
      assert.ok(updates[i] - updates[i - 1] >= 850);
    passed.push("1Hz publications");
  }
  await page.locator(".mission-peek.folded").waitFor();

  await page.keyboard.press("F9");
  await page.locator(".app.is-compact").waitFor();
  await page.setViewportSize({ width: 640, height: 480 });
  await geometry(page, "compact");
  await page.setViewportSize({ width: 390, height: 844 });
  await geometry(page, "390-compact");
  await page.keyboard.press("F9");
  await geometry(page, "390");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("button", { name: "打开聊天", exact: true }).click();
  const chat = page.getByRole("textbox", { name: "聊天内容" });
  await chat.fill("输入法组合中");
  await chat.dispatchEvent("compositionstart", { data: "输入法组合中" });
  await chat.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 229,
    isComposing: true,
    bubbles: true,
  });
  assert.equal(
    await chat.inputValue(),
    "输入法组合中",
    "IME Enter must not submit",
  );
  await chat.dispatchEvent("compositionend", { data: "输入法组合中" });
  await chat.press("Escape");
  passed.push("IME input");
  assert.deepEqual(errors, []);
  console.log("NETWORK_HUD412_PASS", JSON.stringify(passed));
} finally {
  for (const timer of pendingReplies) clearTimeout(timer);
  await browser?.close();
  await web?.close();
  await backend.close();
  const cleanup = path.resolve(data);
  if (
    !cleanup.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(cleanup).startsWith("offduty-network-hud412-")
  )
    throw Error("Unsafe HUD fixture cleanup");
  await rm(cleanup, { recursive: true, force: true });
}
