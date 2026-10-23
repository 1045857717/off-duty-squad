import assert from "node:assert/strict";
import { performance as nodePerformance } from "node:perf_hooks";
import type { Socket as TcpSocket } from "node:net";
import {
  chromium,
  type Browser,
  type BrowserContext,
  type CDPSession,
  type Page,
} from "playwright";
import type { createServer } from "../server/app";
import { ATTACK_IDS } from "../shared/arsenal";
import { ROLES } from "../shared/content";
import type { Game, Role } from "../shared/types";
import { generateWorld, randomFloor, seededRandom } from "../shared/world";
import { finishDeployment, prepareInBrowser } from "./browser-support";

export const SEED = 3900;
export const MODULES = ATTACK_IDS.slice(0, 4);
export const CHROMIUM_ARGS = [
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling",
];
export const THROUGHPUT_ARGS = [
  "--disable-frame-rate-limit",
  "--disable-gpu-vsync",
];
export const HELP = `Four independent Chromium players; no benchmark runs on import.
Run: node node_modules/tsx/dist/cli.mjs tests/browser-multiplayer411.ts [options]
  --seconds N          Measured seconds per phase, 10..60 (default 12)
  --warmup-seconds N   Warmup per phase, 1..10 (default 3)
  --viewport WxH       CSS viewport (default 1366x768)
  --dpr N              Device pixel ratio, 1..3 (default 2)
  --browser PATH       Chromium executable (or PLAYWRIGHT_BROWSER)
  --headed             Show four independent browser windows
  --display-paced      Omit unconstrained Chromium flags; retain game cap 144
  --help               Print usage without opening browsers or starting a server
Environment: LIVE_URL=https://host selects a basic public session, with no fixtures.
BENCH_CLUSTER=1 clusters local enemies in view; it never alters a public server.
Local mode requires an existing dist/index.html; this harness does not build it.
Each player moves with 300ms W/D/S/A holds and alternating Space dashes (~4.2s).
Default throughput is simulated/display-unconstrained, NOT physical 144Hz evidence.
Local baseline6enemies/dense150enemies are synthetic load, NOT survival results.`;

export function readConfig(args = process.argv.slice(2)) {
  const config = {
    seconds: 12,
    warmupSeconds: 3,
    viewport: { width: 1366, height: 768 },
    dpr: 2,
    headless: true,
    throughput: true,
    executablePath:
      process.env.PLAYWRIGHT_BROWSER ||
      (process.platform === "win32"
        ? "C:/Users/asus/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe"
        : undefined),
    liveUrl: process.env.LIVE_URL || null,
  };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--headed") config.headless = false;
    else if (flag === "--display-paced") config.throughput = false;
    else {
      assert.ok(
        [
          "--seconds",
          "--warmup-seconds",
          "--viewport",
          "--dpr",
          "--browser",
        ].includes(flag),
        `Unknown argument ${flag}; use --help`,
      );
      const value = args[++i];
      assert.ok(value && !value.startsWith("--"), `${flag} needs a value`);
      if (flag === "--seconds") config.seconds = Number(value);
      if (flag === "--warmup-seconds") config.warmupSeconds = Number(value);
      if (flag === "--dpr") config.dpr = Number(value);
      if (flag === "--browser") config.executablePath = value;
      if (flag === "--viewport") {
        const match = /^(\d+)x(\d+)$/.exec(value);
        assert.ok(match, "Viewport must be WIDTHxHEIGHT");
        config.viewport = { width: Number(match[1]), height: Number(match[2]) };
      }
    }
  }
  for (const [name, value, min, max] of [
    ["seconds", config.seconds, 10, 60],
    ["warmup-seconds", config.warmupSeconds, 1, 10],
    ["dpr", config.dpr, 1, 3],
    ["width", config.viewport.width, 640, 3840],
    ["height", config.viewport.height, 480, 2160],
  ] as const) {
    assert.ok(
      Number.isFinite(value) && value >= min && value <= max,
      `${name} must be ${min}..${max}`,
    );
  }
  if (config.liveUrl) {
    const url = new URL(config.liveUrl);
    assert.ok(
      ["http:", "https:"].includes(url.protocol),
      "LIVE_URL must use HTTP(S)",
    );
    assert.ok(
      !url.username && !url.password,
      "Do not embed credentials in LIVE_URL",
    );
  }
  return config;
}
export type Config = ReturnType<typeof readConfig>;
export type OwnedServer = ReturnType<typeof createServer>;

export function distribution(values: number[]) {
  if (!values.length)
    return {
      count: 0,
      min: null,
      mean: null,
      p50: null,
      p95: null,
      p99: null,
      max: null,
    };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) =>
    sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
  return {
    count: values.length,
    min: sorted[0],
    mean: values.reduce((sum, n) => sum + n, 0) / values.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: sorted.at(-1)!,
  };
}

export type WireSample = {
  startedAt: number;
  firstStateAt: number | null;
  lastStateAt: number | null;
  stateFrames: number;
  statePayloadBytes: number;
  gapsMs: number[];
  existingPingAckRttMs: number[];
  disconnects: number;
  errors: string[];
};
export type Player = {
  number: number;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
  engineId: string | null;
  browserProcessId: number | null;
  socketRequestIds: Set<string>;
  wire: WireSample | null;
  errors: string[];
};

export async function openPlayer(
  config: Config,
  number: number,
  players: Player[],
) {
  // A separate launch is intentional: contexts in one browser share a browser/GPU process.
  const browser = await chromium.launch({
    headless: config.headless,
    executablePath: config.executablePath,
    timeout: 25000,
    args: [...CHROMIUM_ARGS, ...(config.throughput ? THROUGHPUT_ARGS : [])],
  });
  // Register immediately so partial setup failures still close this browser.
  const player = {
    number,
    browser,
    engineId: null,
    browserProcessId: null,
    socketRequestIds: new Set<string>(),
    wire: null,
    errors: [],
  } as unknown as Player;
  players.push(player);
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: config.dpr,
  });
  player.context = context;
  await context.addInitScript("window.__name=(fn)=>fn");
  await context.addInitScript(() => {
    // Use the ordinary product setting and its FramePacer, never a bypass hook.
    localStorage.setItem(
      "offduty-settings",
      JSON.stringify({
        frameCap: 144,
        quality: "high",
        autoFire: true,
        sound: false,
      }),
    );
  });
  const page = await context.newPage();
  player.page = page;
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(25000);
  page.on("pageerror", (error) => {
    if (player.errors.length < 100) player.errors.push(error.message);
  });
  const cdp = await context.newCDPSession(page);
  player.cdp = cdp;
  const pendingPings = new Map<string, number>();
  cdp.on("Network.webSocketCreated", ({ requestId, url }) => {
    if (new URL(url).pathname.includes("/socket.io/"))
      player.socketRequestIds.add(requestId);
  });
  cdp.on(
    "Network.webSocketFrameReceived",
    ({ requestId, timestamp, response }) => {
      if (!player.socketRequestIds.has(requestId) || response.opcode !== 1)
        return;
      const text = response.payloadData;
      if (text.startsWith('0{"sid":')) {
        // Only the tiny Engine.IO handshake is parsed in Node; never parse state again.
        player.engineId = (JSON.parse(text.slice(1)) as { sid: string }).sid;
      }
      const wire = player.wire;
      if (!wire) return;
      if (text.startsWith('42["state",')) {
        if (wire.lastStateAt !== null)
          wire.gapsMs.push((timestamp - wire.lastStateAt) * 1000);
        wire.firstStateAt ??= timestamp;
        wire.lastStateAt = timestamp;
        wire.stateFrames++;
        wire.statePayloadBytes += Buffer.byteLength(text);
      } else {
        const ack = /^43(\d+)\[/.exec(text);
        if (ack) {
          const sent = pendingPings.get(ack[1]);
          if (sent !== undefined)
            wire.existingPingAckRttMs.push((timestamp - sent) * 1000);
          pendingPings.delete(ack[1]);
        }
      }
    },
  );
  cdp.on("Network.webSocketFrameSent", ({ requestId, timestamp, response }) => {
    if (!player.wire || !player.socketRequestIds.has(requestId)) return;
    const ping = /^42(\d+)\["ping:latency",/.exec(response.payloadData);
    if (ping && pendingPings.size < 100) pendingPings.set(ping[1], timestamp);
  });
  cdp.on("Network.webSocketClosed", ({ requestId }) => {
    if (player.socketRequestIds.delete(requestId) && player.wire)
      player.wire.disconnects++;
  });
  cdp.on("Network.webSocketFrameError", ({ requestId, errorMessage }) => {
    if (
      player.wire &&
      player.socketRequestIds.has(requestId) &&
      player.wire.errors.length < 100
    )
      player.wire.errors.push(errorMessage);
  });
  await cdp.send("Network.enable");
  await cdp.send("Performance.enable");
  // Chromium flags prevent throttling; the game explicitly sleeps on document.hidden too.
  // This CDP command keeps each real page active without overriding visibility APIs.
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  const browserCdp = await browser.newBrowserCDPSession();
  try {
    const { processInfo } = await browserCdp.send("SystemInfo.getProcessInfo");
    player.browserProcessId =
      processInfo.find((p) => p.type === "browser")?.id ?? null;
    assert.ok(
      player.browserProcessId !== null,
      "Browser process identity unavailable",
    );
  } finally {
    await browserCdp.detach();
  }
  assert.equal(browser.contexts().length, 1);
  assert.equal(context.pages().length, 1);
  return player;
}

export async function formSquad(players: Player[], url: string) {
  for (const p of players) {
    await p.page.goto(url, { waitUntil: "domcontentloaded" });
    await p.page.waitForFunction(() =>
      document
        .querySelector(".connection")
        ?.textContent?.includes("服务已连接"),
    );
  }
  const roles: Role[] = ["scout", "engineer", "medic", "guardian"];
  const host = players[0].page;
  await host
    .getByRole("button", { name: "创建小队", exact: true })
    .first()
    .click();
  const createDialog = host.getByRole("dialog", {
    name: "留个位置，等同事来。",
    exact: true,
  });
  await createDialog.waitFor({ state: "visible" });
  const createForm = createDialog.locator("form");
  await createForm.getByLabel("你的行动代号").fill("性能验证1");
  await createForm.getByLabel("小队名称").fill("四人性能验证411");
  await createForm
    .getByRole("button", { name: "选择" + ROLES[roles[0]].name, exact: true })
    .click();
  // App renders a real RulesSelector inside this modal's form. Do not rely on
  // page-wide ordering, which could select the inert background selector.
  const mode = createForm.getByRole("button", {
    name: "模式：园区发癫局",
    exact: true,
  });
  await mode.waitFor({ state: "visible" });
  await mode.click();
  await createForm
    .getByRole("button", { name: "创建小队，邀请同事", exact: true })
    .click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code);
  for (let i = 1; i < players.length; i++) {
    const page = players[i].page;
    await page
      .locator(".team-panel")
      .getByRole("button", { name: "输入房间码加入", exact: true })
      .click();
    await page.getByLabel("你的行动代号").fill(`性能验证${i + 1}`);
    await page.getByLabel("六位房间码", { exact: true }).fill(code);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "选择" + ROLES[roles[i]].name, exact: true })
      .click();
    await page
      .locator("form")
      .getByRole("button", { name: "加入小队", exact: true })
      .click();
    await prepareInBrowser(page);
  }
  await Promise.all(
    players.map((p) =>
      p.page.waitForFunction(
        () =>
          window.__OFFDUTY__?.state?.players.filter(
            (p) => !p.bot && p.connected,
          ).length === 4,
      ),
    ),
  );
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  // All four choose through the actual UI before any helper waits for playing.
  await Promise.all(players.map((p) => finishDeployment(p.page)));
  assert.equal(
    new Set(players.map((p) => p.engineId)).size,
    4,
    "Each browser needs its own Engine.IO connection",
  );
  assert.ok(
    players.every((p) => p.engineId && p.socketRequestIds.size === 1),
    "Four active WebSocket transports required",
  );
  return code;
}

export const KEYBOARD_PLAN = {
  directions: ["w", "d", "s", "a"],
  holdMs: 300,
  directionLeadMs: 80,
  dashHoldMs: 60,
  dashEveryHolds: 14,
  phaseOffset: "player number minus one",
  input: "ordinary Playwright keyboard events; normal game physics",
} as const;

export type KeyboardControlReport = {
  player: number;
  durationLimitMs: number;
  elapsedMs: number;
  directionHolds: Record<string, number>;
  dashPresses: number;
  dashDirections: string[];
  keysReleased: boolean;
  durationLimitReached: boolean;
  errors: string[];
};
export type KeyboardController = { stop: () => Promise<KeyboardControlReport> };
const activeKeyboardPages = new WeakSet<Page>();

export function startKeyboardLoop(
  player: Player,
  durationLimitMs: number,
): KeyboardController {
  assert.ok(
    durationLimitMs >= 1000 && durationLimitMs <= 75000,
    "Keyboard loop duration must be bounded to 1..75s",
  );
  assert.ok(
    !activeKeyboardPages.has(player.page),
    "A keyboard loop already owns this page",
  );
  activeKeyboardPages.add(player.page);
  const startedAt = nodePerformance.now();
  const deadline = startedAt + durationLimitMs;
  let stopped = false;
  let wake: (() => void) | undefined;
  const report: KeyboardControlReport = {
    player: player.number,
    durationLimitMs,
    elapsedMs: 0,
    directionHolds: { w: 0, d: 0, s: 0, a: 0 },
    dashPresses: 0,
    dashDirections: [],
    keysReleased: false,
    durationLimitReached: false,
    errors: [],
  };
  const pause = (ms: number) => {
    const boundedMs = Math.min(ms, deadline - nodePerformance.now());
    if (stopped || boundedMs <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        wake = undefined;
        resolve();
      }, boundedMs);
      wake = () => {
        clearTimeout(timer);
        wake = undefined;
        resolve();
      };
    });
  };
  const running = (async () => {
    try {
      // Keyboard focus stays on the actual Phaser canvas, away from chat/form controls.
      await player.page.locator(".game-canvas canvas").focus();
      for (let step = 0; !stopped && nodePerformance.now() < deadline; step++) {
        const direction =
          KEYBOARD_PLAN.directions[(step + player.number - 1) % 4];
        const holdUntil = Math.min(
          deadline,
          nodePerformance.now() + KEYBOARD_PLAN.holdMs,
        );
        await player.page.keyboard.down(direction);
        report.directionHolds[direction]++;
        if (step % KEYBOARD_PLAN.dashEveryHolds === 0) {
          // Give the game an ordinary movement frame before pressing Space. Fourteen
          // holds exceed the normal 3s cooldown and rotate the next dash by 180 degrees.
          await pause(KEYBOARD_PLAN.directionLeadMs);
          if (!stopped && nodePerformance.now() < deadline) {
            await player.page.keyboard.down("Space");
            report.dashPresses++;
            report.dashDirections.push(direction);
            await pause(KEYBOARD_PLAN.dashHoldMs);
            await player.page.keyboard.up("Space");
          }
        }
        await pause(Math.max(0, holdUntil - nodePerformance.now()));
        // All key commands in this page are awaited; release before the next hold.
        await player.page.keyboard.up(direction);
      }
      report.durationLimitReached =
        !stopped && nodePerformance.now() >= deadline;
    } catch (error) {
      report.errors.push(String(error));
    } finally {
      let releaseFailed = false;
      // The worker alone releases keys, including when stop interrupts a hold.
      // Never race a second cleanup keyboard task against an in-flight key command.
      for (const key of ["Space", ...KEYBOARD_PLAN.directions]) {
        try {
          await player.page.keyboard.up(key);
        } catch (error) {
          releaseFailed = true;
          report.errors.push(`Release ${key}: ${String(error)}`);
        }
      }
      report.keysReleased = !releaseFailed;
      report.elapsedMs = nodePerformance.now() - startedAt;
      activeKeyboardPages.delete(player.page);
    }
    return report;
  })();
  return {
    stop: () => {
      stopped = true;
      wake?.();
      return running;
    },
  };
}
export function installFixture(game: Game, enemyCount: 6 | 150) {
  const state = game.state;
  assert.equal(state.players.filter((p) => !p.bot && p.connected).length, 4);
  assert.equal(state.phase, "playing");
  state.seed = SEED;
  state.world = generateWorld(SEED, state.mode, state.world.theme);
  game.random = seededRandom(SEED + 73);
  game.nav = undefined;
  const room = state.world.rooms[Math.floor(state.world.rooms.length / 2)];
  const center = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
  state.bullets = [];
  state.areas = [];
  state.effects = [];
  state.pickups = [];
  state.officeProps = [];
  state.objects = [];
  state.noises = [];
  state.pings = [];
  state.routeVote = undefined;
  state.route = "supply";
  state.noise = 0;
  state.stageTime = 0;
  state.breakTime = 0;
  state.spawnCd = 9999;
  state.waveEnds = 9999;
  state.eventCd = 9999;
  state.event = {
    kind: "none",
    name: "合成性能负载",
    desc: "非生存结论",
    remaining: 9999,
  };
  game.queuedAbilities.clear();
  for (const [i, p] of state.players.entries()) {
    p.x = center.x;
    p.y = center.y + (i - 1.5) * 35;
    p.alive = true;
    p.hp = p.maxHp;
    p.invulnerable = 9999;
    p.shield = 45;
    p.pendingUpgrades = 0;
    p.offers = [];
    p.arsenal = Object.fromEntries(MODULES.map((id) => [id, 8]));
    p.attackCooldowns = {};
    p.basicCd = 0;
    p.skillCd = 0;
    p.damageDealt = 0;
    p.kills = 0;
  }
  state.enemies = Array.from({ length: enemyCount }, (_, i) => ({
    id: ++state.serial,
    kind:
      i % 20 === 0
        ? "boss"
        : i % 4 === 0
          ? "shooter"
          : i % 4 === 1
            ? "tank"
            : i % 4 === 2
              ? "hound"
              : "wraith",
    ...(process.env.BENCH_CLUSTER === "1"
      ? {
          x: center.x - 132 + (i % 15) * 19,
          y: center.y - 95 + Math.floor(i / 15) * 19,
        }
      : i < 24
        ? {
            x: center.x + 90 + (i % 4) * 24,
            y: center.y - 55 + Math.floor(i / 4) * 24,
          }
        : randomFloor(state.world, game.random, center, 200)),
    hp: 1_000_000_000,
    maxHp: 1_000_000_000,
    speed: 0,
    cd: 0.5 + (i % 5) * 0.2,
    angle: 0,
    hitFlash: 0,
    windup: 0,
    attackSeq: 0,
    screamCd: 9999,
  }));
}

export function serverTcpCounters(app: OwnedServer, players: Player[]) {
  return players.map((player) => {
    const socket = [...app.io.sockets.sockets.values()].find(
      (s) => s.conn.transport.sid === player.engineId,
    );
    assert.ok(socket, `Missing server socket for player ${player.number}`);
    assert.equal(socket.conn.transport.name, "websocket");
    // engine.io 6/ws exposes the actual net.Socket here; do not estimate via JSON size.
    const transport = socket.conn.transport as unknown as {
      socket?: { _socket?: TcpSocket };
    };
    const tcp = transport.socket?._socket;
    assert.ok(
      tcp && !tcp.destroyed && Number.isFinite(tcp.bytesWritten),
      "Actual server TCP counter unavailable",
    );
    return {
      player: player.number,
      engineId: socket.conn.transport.sid,
      socketId: socket.id,
      tcp,
      startBytes: tcp.bytesWritten,
    };
  });
}

export function beginWireSample(player: Player) {
  player.wire = {
    startedAt: nodePerformance.now(),
    firstStateAt: null,
    lastStateAt: null,
    stateFrames: 0,
    statePayloadBytes: 0,
    gapsMs: [],
    existingPingAckRttMs: [],
    disconnects: 0,
    errors: [],
  };
}
export function endWireSample(player: Player) {
  const sample = player.wire!;
  player.wire = null;
  const durationMs = nodePerformance.now() - sample.startedAt;
  const observedSpanMs =
    sample.firstStateAt !== null && sample.lastStateAt !== null
      ? (sample.lastStateAt - sample.firstStateAt) * 1000
      : 0;
  return {
    durationMs,
    engineId: player.engineId,
    activeWebSockets: player.socketRequestIds.size,
    stateFrames: sample.stateFrames,
    stateFramesPerSecond: sample.stateFrames / (durationMs / 1000),
    stateGapMs: distribution(sample.gapsMs),
    // CDP timestamps have their own epoch. The remainder conservatively bounds
    // unobserved leading + trailing silence without mixing clock origins.
    boundarySilenceTotalMs: Math.max(0, durationMs - observedSpanMs),
    uncompressedStatePayloadBytes: sample.statePayloadBytes,
    existingPingAckRttMs: distribution(sample.existingPingAckRttMs),
    existingPingAckSamplesMs: sample.existingPingAckRttMs,
    disconnects: sample.disconnects,
    errors: sample.errors,
  };
}

// Serialized into each page; all runtime dependencies must live inside this function.
export function installPageProbe() {
  type Renderer = {
    game: {
      loop: { frame: number };
      events: {
        on: (name: string, listener: () => void) => unknown;
        off: (name: string, listener: () => void) => unknown;
      };
      scene: {
        getScene: (name: string) => {
          cameras: {
            main: {
              worldView: {
                x: number;
                y: number;
                width: number;
                height: number;
              };
            };
          };
        };
      };
    };
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    contextLost: boolean;
  };
  const win = window as unknown as {
    Phaser?: {
      Renderer: {
        WebGL: {
          WebGLRenderer: {
            prototype: {
              render: (this: Renderer, ...args: unknown[]) => unknown;
            };
          };
        };
      };
    };
    __multiplayer411?: {
      sample: (durationMs: number) => Promise<PageSample>;
      restore: () => void;
    };
  };
  if (win.__multiplayer411) throw new Error("Probe already installed");
  const proto = win.Phaser?.Renderer.WebGL.WebGLRenderer.prototype;
  if (!proto)
    throw new Error(
      "Phaser WebGL renderer unavailable; no RAF-as-FPS fallback",
    );
  const original = proto.render;
  let active: {
    renderCalls: number;
    renderedFrames: number;
    previousFrame: number | null;
    previousAt: number | null;
    frameIntervalsMs: number[];
    gameStepDurationsMs: number[];
    renderDurationsMs: number[];
    stepStartedAt: number | null;
    overflow: boolean;
    renderer: Renderer | null;
  } | null = null;
  let observedGame: Renderer["game"] | null = null;
  const beforeStep = () => {
    if (active) active.stepStartedAt = performance.now();
  };
  const afterRender = () => {
    if (active && active.stepStartedAt !== null) {
      active.gameStepDurationsMs.push(performance.now() - active.stepStartedAt);
      active.stepStartedAt = null;
    }
  };
  proto.render = function (...args) {
    if (!observedGame) {
      observedGame = this.game;
      observedGame.events.on("prestep", beforeStep);
      observedGame.events.on("postrender", afterRender);
    }
    const began = performance.now();
    const result = original.apply(this, args);
    const sample = active;
    // A successful actual WebGL render invocation, after the game's FramePacer.
    if (
      sample &&
      !this.contextLost &&
      this.canvas.matches(".game-canvas canvas")
    ) {
      const now = performance.now();
      sample.renderer = this;
      sample.renderDurationsMs.push(now - began);
      sample.renderCalls++;
      if (sample.previousFrame !== this.game.loop.frame) {
        sample.renderedFrames++;
        if (sample.previousAt !== null) {
          if (sample.frameIntervalsMs.length < 20000)
            sample.frameIntervalsMs.push(now - sample.previousAt);
          else sample.overflow = true;
        }
        sample.previousAt = now;
        sample.previousFrame = this.game.loop.frame;
      }
    }
    return result;
  };
  win.__multiplayer411 = {
    restore: () => {
      proto.render = original;
      observedGame?.events.off("prestep", beforeStep);
      observedGame?.events.off("postrender", afterRender);
      delete win.__multiplayer411;
    },
    sample: async (durationMs) => {
      if (active) throw new Error("Overlapping renderer sample");
      const sample = {
        renderCalls: 0,
        renderedFrames: 0,
        previousFrame: null,
        previousAt: null,
        frameIntervalsMs: [] as number[],
        gameStepDurationsMs: [] as number[],
        renderDurationsMs: [] as number[],
        stepStartedAt: null as number | null,
        overflow: false,
        renderer: null as Renderer | null,
      };
      active = sample;
      const startedAt = performance.now();
      let rafCount = 0,
        rafId = 0,
        hiddenSamples = 0,
        visibilityChanges = 0,
        contextLosses = 0;
      const states: PageSample["states"] = [];
      const headerLatencySamples: PageSample["headerLatencySamples"] = [];
      const visibility = () => {
        visibilityChanges++;
      };
      const lost = () => {
        contextLosses++;
      };
      document.addEventListener("visibilitychange", visibility);
      const canvas = document.querySelector<HTMLCanvasElement>(
        ".game-canvas canvas",
      );
      canvas?.addEventListener("webglcontextlost", lost);
      const referenceRaf = () => {
        rafCount++;
        rafId = requestAnimationFrame(referenceRaf);
      };
      rafId = requestAnimationFrame(referenceRaf);
      const snapshot = () => {
        if (document.hidden) hiddenSamples++;
        const state = window.__OFFDUTY__?.state;
        const me = state?.players.find(
          (p) => p.id === window.__OFFDUTY__?.playerId,
        );
        const view =
          observedGame?.scene.getScene("station")?.cameras.main.worldView;
        states.push({
          worldSeed: state?.world.seed ?? null,
          enemyCentersInView:
            state && view
              ? state.enemies.filter(
                  (e) =>
                    e.x >= view.x &&
                    e.y >= view.y &&
                    e.x <= view.x + view.width &&
                    e.y <= view.y + view.height,
                ).length
              : null,
          hp: me?.hp ?? null,
          hitSeq: me?.hitSeq ?? null,
          atMs: performance.now() - startedAt,
          phase: state?.phase ?? null,
          players: state?.players.length ?? 0,
          connectedHumans:
            state?.players.filter((p) => !p.bot && p.connected).length ?? 0,
          aliveHumans:
            state?.players.filter((p) => !p.bot && p.alive).length ?? 0,
          enemies: state?.enemies.length ?? 0,
          bullets: state?.bullets.length ?? 0,
          areas: state?.areas.length ?? 0,
          effects: state?.effects.length ?? 0,
          equippedModules: me ? Object.keys(me.arsenal).length : 0,
          damage: me?.damageDealt ?? 0,
          x: me?.x ?? null,
          y: me?.y ?? null,
          attackSeq: me?.attackSeq ?? null,
          dashSeq: me?.dashSeq ?? null,
          tick: state?.tick ?? null,
        });
      };
      const latency = () => {
        const text =
          document.querySelector(".connection small")?.textContent ?? "";
        const match = /(\d+)\s*ms/.exec(text);
        if (match)
          headerLatencySamples.push({
            atMs: performance.now() - startedAt,
            ms: Number(match[1]),
          });
      };
      snapshot();
      latency();
      const stateTimer = setInterval(snapshot, 1000);
      const latencyTimer = setInterval(latency, 3000);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
        snapshot();
        const elapsedMs = performance.now() - startedAt;
        const renderer = sample.renderer;
        const rect = canvas?.getBoundingClientRect();
        const gl = renderer?.gl;
        const debug = gl?.getExtension("WEBGL_debug_renderer_info");
        return {
          elapsedMs,
          renderCalls: sample.renderCalls,
          renderedFrames: sample.renderedFrames,
          frameIntervalsMs: sample.frameIntervalsMs,
          gameStepDurationsMs: sample.gameStepDurationsMs,
          renderDurationsMs: sample.renderDurationsMs,
          overflow: sample.overflow,
          referenceRafCount: rafCount,
          hiddenSamples,
          visibilityChanges,
          contextLosses,
          finalHidden: document.hidden,
          visibilityState: document.visibilityState,
          playerId: window.__OFFDUTY__?.playerId ?? null,
          headerLatencySamples,
          states,
          canvas:
            canvas && rect
              ? {
                  width: canvas.width,
                  height: canvas.height,
                  cssWidth: rect.width,
                  cssHeight: rect.height,
                  backingRatio: canvas.width / rect.width,
                }
              : null,
          webgl: gl
            ? {
                version: String(gl.getParameter(gl.VERSION)),
                vendor: String(
                  gl.getParameter(
                    debug ? debug.UNMASKED_VENDOR_WEBGL : gl.VENDOR,
                  ),
                ),
                renderer: String(
                  gl.getParameter(
                    debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
                  ),
                ),
              }
            : null,
          configuredFrameCap:
            (
              JSON.parse(localStorage.getItem("offduty-settings") || "{}") as {
                frameCap?: number;
              }
            ).frameCap ?? null,
        };
      } finally {
        active = null;
        clearInterval(stateTimer);
        clearInterval(latencyTimer);
        cancelAnimationFrame(rafId);
        document.removeEventListener("visibilitychange", visibility);
        canvas?.removeEventListener("webglcontextlost", lost);
      }
    },
  };
}

export type PageSample = {
  elapsedMs: number;
  renderCalls: number;
  renderedFrames: number;
  frameIntervalsMs: number[];
  gameStepDurationsMs: number[];
  renderDurationsMs: number[];
  overflow: boolean;
  referenceRafCount: number;
  hiddenSamples: number;
  visibilityChanges: number;
  contextLosses: number;
  finalHidden: boolean;
  visibilityState: string;
  playerId: string | null;
  configuredFrameCap: number | null;
  headerLatencySamples: { atMs: number; ms: number }[];
  states: {
    worldSeed: number | null;
    enemyCentersInView: number | null;
    hp: number | null;
    hitSeq: number | null;
    atMs: number;
    phase: string | null;
    players: number;
    connectedHumans: number;
    aliveHumans: number;
    enemies: number;
    bullets: number;
    areas: number;
    effects: number;
    equippedModules: number;
    damage: number;
    x: number | null;
    y: number | null;
    attackSeq: number | null;
    dashSeq: number | null;
    tick: number | null;
  }[];
  canvas: {
    width: number;
    height: number;
    cssWidth: number;
    cssHeight: number;
    backingRatio: number;
  } | null;
  webgl: { version: string; vendor: string; renderer: string } | null;
};
export async function samplePage(player: Player, durationMs: number) {
  return player.page.evaluate((ms) => {
    const probe = (
      window as unknown as {
        __multiplayer411?: { sample: (ms: number) => Promise<PageSample> };
      }
    ).__multiplayer411;
    if (!probe) throw new Error("Renderer probe missing");
    return probe.sample(ms);
  }, durationMs);
}

export async function leavePlayer(player: Player) {
  if (!player.page || player.page.isClosed()) return "page-unavailable";
  try {
    player.page.setDefaultTimeout(3000);
    const joined = await player.page.evaluate(
      () => !!window.__OFFDUTY__?.state,
    );
    if (!joined) return "already-left";

    const reportLeave = player.page.locator(".debrief-leave");
    if (await reportLeave.isVisible()) {
      await reportLeave.click();
      await player.page.waitForFunction(
        () => !window.__OFFDUTY__?.state,
        undefined,
        { timeout: 3000 },
      );
      return "room:leave-confirmed-via-report-ui";
    }
    // F9 restores the normal page if the user-controlled UI has become compact.
    if (await player.page.locator(".app.is-compact").count()) {
      await player.page.keyboard.press("F9");
    }
    await player.page.keyboard.press("Escape");
    await player.page.locator(".team-panel .leave-button").click();
    await player.page
      .locator(".dialog-actions")
      .getByRole("button", { name: "离开小队", exact: true })
      .click();
    await player.page.waitForFunction(
      () => !window.__OFFDUTY__?.state,
      undefined,
      { timeout: 3000 },
    );
    return "room:leave-confirmed-via-ui";
  } catch (error) {
    // Browser close below disconnects even when the page was lost or UI changed.
    return `ui-leave-failed: ${String(error)}`;
  }
}
