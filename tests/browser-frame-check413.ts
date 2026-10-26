import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { chromium, type Browser, type Page } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = new Map<string, Buffer>(
  await Promise.all(
    ["html", "js", "css"].map(async (extension) => {
      const name = `frame-check.${extension}`;
      return [
        `/${name}`,
        await readFile(path.join(root, "public", name)),
      ] as const;
    }),
  ),
);
const script = files.get("/frame-check.js")!.toString();
const html = files.get("/frame-check.html")!.toString();
const passed: string[] = [];

type Handler = () => unknown;
class Element {
  textContent = "";
  hidden = false;
  disabled = false;
  value = 0;
  dataset: Record<string, string> = {};
  handlers = new Map<string, Handler>();
  addEventListener(name: string, handler: Handler) {
    this.handlers.set(name, handler);
  }
  async emit(name: string) {
    await this.handlers.get(name)?.();
  }
}

// Synthetic callbacks exercise lifecycle arithmetic only. The actual browser
// below uses native requestAnimationFrame, without a clock or frame override.
function fixture() {
  const elements = new Map<string, Element>();
  const handlers = new Map<string, Handler>();
  const pending = new Map<number, FrameRequestCallback>();
  const copies: string[] = [];
  let nextId = 0;
  let clipboardDenied = false;
  const get = (id: string) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id)!;
  };
  const document = {
    visibilityState: "visible",
    getElementById: get,
    addEventListener: (name: string, handler: Handler) =>
      handlers.set(name, handler),
  };
  const requestAnimationFrame = (callback: FrameRequestCallback) => {
    assert.equal(pending.size, 0, "only one RAF may be pending");
    pending.set(++nextId, callback);
    return nextId;
  };
  const cancelAnimationFrame = (id: number) => pending.delete(id);
  const window = {
    requestAnimationFrame,
    cancelAnimationFrame,
    addEventListener: (name: string, handler: Handler) =>
      handlers.set(name, handler),
  };
  runInNewContext(script, {
    document,
    window,
    requestAnimationFrame,
    cancelAnimationFrame,
    navigator: {
      clipboard: {
        writeText: async (text: string) => {
          if (clipboardDenied) throw new Error("Clipboard denied");
          copies.push(text);
        },
      },
    },
    setTimeout: () => assert.fail("page must not schedule timer frames"),
    setInterval: () => assert.fail("page must not schedule timer frames"),
  });
  return {
    get,
    document,
    pending,
    copies,
    denyClipboard: () => (clipboardDenied = true),
    event: async (name: string) => await handlers.get(name)?.(),
    step(timestamp: number) {
      assert.equal(pending.size, 1, "running test needs exactly one RAF");
      const callback = pending.values().next().value!;
      pending.clear();
      callback(timestamp);
    },
    result: () => JSON.parse(get("frame-result-json").textContent),
  };
}

assert.match(html, /<title>浏览器空载刷新测试<\/title>/);
assert.match(html, /浏览器回调 次\/秒/);
assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>|\son\w+\s*=/i);
assert.doesNotMatch(
  script,
  /\b(?:fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage)\b/,
);
for (const rate of [30, 60, 144, 360]) {
  const test = fixture();
  assert.equal(test.pending.size, 0, "idle page has no animation loop");
  await test.get("frame-start").emit("click");
  await test.get("frame-start").emit("click");
  test.step(0);
  for (let index = 1; index <= rate * 5; index++)
    test.step((index * 1000) / rate);
  const result = test.result();
  assert.equal(test.get("frame-check").dataset.state, "complete");
  assert.equal(test.pending.size, 0, "completed page stops RAF");
  assert.equal(result.elapsedMs, 5000);
  assert.equal(result.callbackCount, rate * 5);
  assert.equal(result.callbacksPerSecond, rate);
  assert.equal(result.sampleCount, Math.min(rate * 5, 512));
  assert.equal(result.sampleLimit, 512);
  assert.equal(test.copies.length, 0, "results never copy without a click");
  for (const value of Object.values(result))
    assert.equal(typeof value, "number");
  await test.get("frame-copy").emit("click");
  assert.deepEqual(JSON.parse(test.copies[0]), result);
  await test.get("frame-start").emit("click");
  assert.equal(test.get("frame-result").hidden, true);
  assert.equal(test.get("frame-result-json").textContent, "");
  test.step(10000);
  test.step(10016);
  test.document.visibilityState = "hidden";
  await test.event("visibilitychange");
  assert.equal(test.get("frame-check").dataset.state, "aborted");
  assert.equal(test.pending.size, 0);
  assert.equal(test.get("frame-progress").value, 0);
  assert.equal(test.get("frame-result").hidden, true);
  assert.equal(test.get("frame-rate").textContent, "—");
  assert.equal(test.get("frame-result-json").textContent, "");
  assert.equal(test.get("frame-copy").disabled, true);
  test.document.visibilityState = "visible";
  await test.event("visibilitychange");
  assert.equal(test.pending.size, 0, "visibility return must not auto-restart");
  await test.get("frame-start").emit("click");
  test.step(20000);
  await test.event("pagehide");
  assert.equal(test.pending.size, 0);
  assert.equal(test.get("frame-check").dataset.state, "aborted");
}
const interruptedSchedule = fixture();
await interruptedSchedule.get("frame-start").emit("click");
interruptedSchedule.step(0);
interruptedSchedule.step(1000);
interruptedSchedule.step(2000);
interruptedSchedule.step(3000);
interruptedSchedule.step(4000);
interruptedSchedule.step(5000);
assert.match(interruptedSchedule.get("frame-status").textContent, /长调度停顿/);
assert.equal(interruptedSchedule.result().callbacksPerSecond, 1);

const denied = fixture();
await denied.get("frame-start").emit("click");
denied.step(0);
denied.step(5000);
denied.denyClipboard();
await denied.get("frame-copy").emit("click");
assert.equal(denied.get("frame-result-json").hidden, false);
assert.match(denied.get("frame-copy-status").textContent, /手动复制/);
passed.push(
  "deterministic lifecycle: 30/60/144/360 callbacks per second, 512 sample cap, repeat, hidden/pagehide abort, click-only clipboard and denial fallback",
);
console.log(passed[0]);
if (process.argv.includes("--unit")) process.exit(0);

// Read-only static fixture: only these three exact paths, loopback and an OS
// assigned port. No Vite/backend/game, CDP attachment, downloads or launch flags
// that disable vsync, GPU rendering or background throttling.
const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
  const body = files.get(pathname);
  if (!body || !["GET", "HEAD"].includes(request.method || "")) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Type",
    pathname.endsWith(".html")
      ? "text/html; charset=utf-8"
      : pathname.endsWith(".js")
        ? "text/javascript; charset=utf-8"
        : "text/css; charset=utf-8",
  );
  response.end(request.method === "HEAD" ? undefined : body);
});
const temporary = await mkdtemp(path.join(tmpdir(), "offduty-frame-check413-"));
let browser: Browser | undefined;
const errors: string[] = [];
const requests = new Set<string>();
async function waitForResult(page: Page) {
  await page.waitForFunction(
    () => document.getElementById("frame-check")?.dataset.state === "complete",
    undefined,
    { timeout: 12000 },
  );
  const result = JSON.parse(
    (await page.locator("#frame-result-json").textContent()) || "{}",
  );
  assert.ok(result.elapsedMs >= 5000 && result.elapsedMs < 6500);
  assert.ok(result.callbackCount > 0);
  assert.ok(result.callbacksPerSecond > 0);
  assert.ok(result.sampleCount > 0 && result.sampleCount <= 512);
  assert.ok(
    Math.abs(
      result.callbacksPerSecond -
        (result.callbackCount * 1000) / result.elapsedMs,
    ) < 0.01,
  );
  assert.equal(await page.locator("#frame-copy").isEnabled(), true);
  return result;
}
try {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  assert.ok(![3106, 3112].includes(address.port));
  const origin = `http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(`${origin}/package.json`)).status, 404);
  browser = await chromium.launch({
    headless: !process.argv.includes("--headed"),
    ...(process.env.PLAYWRIGHT_BROWSER
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
      : {}),
    ignoreDefaultArgs: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1100, height: 900 },
    reducedMotion: "reduce",
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => requests.add(request.url()));
  await page.goto(`${origin}/frame-check.html`);
  await page.bringToFront();
  assert.equal(await page.title(), "浏览器空载刷新测试");
  assert.equal(
    await page.locator("#frame-check").getAttribute("data-state"),
    "idle",
  );
  assert.equal(await page.locator("#frame-result").isVisible(), false);
  await page
    .getByRole("button", { name: "开始 5 秒测试", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const desktop = await waitForResult(page);
  await page.screenshot({
    path: path.join(temporary, "desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "复制结果", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .getElementById("frame-copy-status")
      ?.textContent?.includes("已复制"),
  );
  assert.deepEqual(
    JSON.parse(await page.evaluate(() => navigator.clipboard.readText())),
    desktop,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#frame-start").click();
  const mobile = await waitForResult(page);
  const geometry = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
    minimumFont: Math.min(
      ...Array.from(document.querySelectorAll("main *")).map((element) =>
        parseFloat(getComputedStyle(element).fontSize),
      ),
    ),
    buttonHeight: document
      .getElementById("frame-start")!
      .getBoundingClientRect().height,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    scriptSources: Array.from(document.scripts).map(
      (script) => new URL(script.src).pathname,
    ),
    canvasCount: document.querySelectorAll("canvas").length,
  }));
  assert.ok(geometry.scrollWidth <= geometry.width);
  assert.equal(geometry.bodyFont, 16);
  assert.ok(geometry.minimumFont >= 12);
  assert.ok(geometry.buttonHeight >= 44);
  assert.equal(geometry.reducedMotion, true);
  assert.deepEqual(geometry.scriptSources, ["/frame-check.js"]);
  assert.equal(geometry.canvasCount, 0);
  await page.screenshot({
    path: path.join(temporary, "mobile.png"),
    fullPage: true,
  });
  // Return the start control to view before bringing up a real second tab.
  await page.locator("#frame-start").click();
  await page.waitForFunction(
    () =>
      Number(
        (document.getElementById("frame-progress") as HTMLProgressElement)
          .value,
      ) > 0,
  );
  const background = await context.newPage();
  await background.bringToFront();
  const nativeHidden = await page.evaluate(
    () => document.visibilityState !== "visible",
  );
  if (nativeHidden) {
    await page.waitForFunction(
      () => document.getElementById("frame-check")?.dataset.state === "aborted",
      undefined,
      { timeout: 8000, polling: 100 },
    );
  }
  await background.close();
  await page.bringToFront();
  // Some automated Chromium environments keep all tabs visible. In that case
  // explicitly report native visibility as unobserved; deterministic coverage
  // above still verifies abort/clear, and reload terminates the active loop.
  if (!nativeHidden) await page.reload();
  assert.equal(await page.locator("#frame-result").isVisible(), false);
  assert.equal(await page.locator("#frame-result-json").textContent(), "");
  assert.equal(await page.locator("#frame-copy").isDisabled(), true);
  assert.equal(await page.locator("#frame-start").isEnabled(), true);
  assert.equal(
    await page.locator("#frame-check").getAttribute("data-state"),
    nativeHidden ? "aborted" : "idle",
  );
  const visibilityCheck = nativeHidden
    ? "native hidden-tab abort passed"
    : "native hidden state not observed (both Chromium pages stayed visible); abort/clear covered by deterministic lifecycle tests";
  for (const url of requests)
    assert.ok(files.has(new URL(url).pathname), `unexpected request: ${url}`);
  assert.deepEqual(errors, []);
  passed.push(
    "Chromium: real 5 second RAF twice, keyboard start, actual clipboard, 390px/reduced motion, navigation resets active measurement, no page/CSP errors, only 3 assets",
  );
  console.log(
    JSON.stringify(
      {
        passed,
        desktop,
        mobile,
        geometry,
        visibilityCheck,
        fixturePort: address.port,
        screenshots: temporary,
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--review")) {
    // Gives the caller a brief chance to inspect screenshots, then cleans up.
    console.log("SCREENSHOT_REVIEW_READY");
    await new Promise((resolve) => setTimeout(resolve, 45000));
  }
} finally {
  await browser?.close();
  if (server.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  const resolved = path.resolve(temporary);
  assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
  assert.ok(path.basename(resolved).startsWith("offduty-frame-check413-"));
  await rm(resolved, { recursive: true, force: true });
  console.log(
    "Dedicated browser/server closed; confirmed temporary prefix removed.",
  );
}
