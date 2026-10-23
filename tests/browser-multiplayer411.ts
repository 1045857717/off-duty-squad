/**
 * Bounded four-real-browser performance harness. See --help for CLI options.
 * Synthetic fixtures are confined to the createServer instance owned here.
 * Never import this module from a test runner: invoke this CLI explicitly.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { availableParallelism, cpus, tmpdir } from "node:os";
import path from "node:path";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { createServer } from "../server/app";
import {
  CHROMIUM_ARGS,
  HELP,
  KEYBOARD_PLAN,
  MODULES,
  SEED,
  THROUGHPUT_ARGS,
  beginWireSample,
  distribution,
  endWireSample,
  formSquad,
  installFixture,
  installPageProbe,
  leavePlayer,
  openPlayer,
  readConfig,
  samplePage,
  serverTcpCounters,
  startKeyboardLoop,
  type KeyboardController,
  type KeyboardControlReport,
  type PageSample,
  type OwnedServer,
  type Player,
} from "./multiplayer411-support";

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.slice(2).includes("--help")) console.log(HELP);
  else await run();
}

async function run() {
  const config = readConfig();
  const fixtureLayout =
    process.env.BENCH_CLUSTER === "1"
      ? "clustered-visible"
      : "distributed-world";
  const root = fileURLToPath(new URL("../", import.meta.url));
  const runId =
    new Date().toISOString().replace(/[:.]/g, "-") + `-${process.pid}`;
  const output = path.join(root, "test-results", "multiplayer411", runId);
  await mkdir(output, { recursive: true });
  const players: Player[] = [];
  const phases: Awaited<ReturnType<typeof measurePhase>>[] = [];
  const cleanup: { player: number; result: string }[] = [];
  const activeControls: KeyboardController[] = [];
  const keyboardRuns: KeyboardControlReport[] = [];
  const errors: string[] = [];
  const startedAt = new Date().toISOString();
  let app: OwnedServer | undefined;
  let dataDirectory: string | undefined;
  let protectFixture: ReturnType<typeof setInterval> | undefined;
  let build: { sha256: string; modifiedAt: string } | null = null;
  let url = config.liveUrl ?? "";
  let code: string | null = null;
  let timedOut = false;
  let interrupted: string | null = null;
  let forceExit: ReturnType<typeof setTimeout> | undefined;
  // Includes launches, actual UI flow, both warmups and measurements, and cleanup.
  const budgetMs = 120000 + (config.seconds + config.warmupSeconds) * 2000;
  const abort = () => {
    // Closing pages interrupts pending browser work, allowing the normal finally path.
    for (const p of players) void p.browser.close().catch(() => {});
    forceExit ??= setTimeout(() => {
      console.error(
        `Harness exceeded shutdown budget; partial output: ${output}`,
      );
      process.exit(1);
    }, 15000);
  };
  const deadline = setTimeout(() => {
    timedOut = true;
    errors.push(`Exceeded total budget ${budgetMs}ms`);
    abort();
  }, budgetMs);
  const signal = (name: string) => {
    interrupted = name;
    errors.push(`Interrupted by ${name}`);
    // Forced cancellation disconnects browsers; normal completion confirms UI leave.
    abort();
  };
  const onSigint = () => signal("SIGINT");
  const onSigterm = () => signal("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  try {
    await persist();
    if (!config.liveUrl) {
      const index = path.join(root, "dist", "index.html");
      const [html, info] = await Promise.all([readFile(index), stat(index)]);
      build = {
        sha256: createHash("sha256").update(html).digest("hex"),
        modifiedAt: info.mtime.toISOString(),
      };
      dataDirectory = await mkdtemp(
        path.join(tmpdir(), "offduty-multiplayer411-"),
      );
      app = createServer({ dataDir: dataDirectory });
      await new Promise<void>((resolve, reject) => {
        app!.http.once("error", reject);
        app!.http.listen(0, "127.0.0.1", () => {
          app!.http.off("error", reject);
          resolve();
        });
      });
      url = `http://127.0.0.1:${(app.http.address() as { port: number }).port}`;
    }
    console.log(
      `multiplayer411 ${config.liveUrl ? "public basic session" : "local synthetic load"}; ${config.throughput ? "simulated/display-unconstrained throughput" : "display-paced Chromium"}; game cap 144; output ${output}`,
    );
    // Sequential launch limits startup spikes. Every call still creates a Browser.
    for (let i = 1; i <= 4; i++) {
      assert.ok(!timedOut && !interrupted, "Run cancelled");
      await openPlayer(config, i, players);
    }
    assert.equal(
      new Set(players.map((p) => p.browserProcessId)).size,
      4,
      "Four distinct browser processes required",
    );
    code = await formSquad(players, url);
    const ids = await Promise.all(
      players.map((p) => p.page.evaluate(() => window.__OFFDUTY__!.playerId)),
    );
    assert.equal(
      new Set(ids).size,
      4,
      "Four distinct real player identities required",
    );
    for (const player of players) await player.page.evaluate(installPageProbe);
    const specs = config.liveUrl
      ? [{ name: "live-basic4players", enemies: null }]
      : [
          { name: "baseline6enemies", enemies: 6 as const },
          { name: "dense150enemies", enemies: 150 as const },
        ];
    for (const spec of specs) {
      assert.ok(!timedOut && !interrupted, "Run cancelled");
      if (app) {
        const game = app.rooms.get(code)!;
        installFixture(game, spec.enemies!);
        // Q can replace invulnerability in production. Restore it only in this owned fixture.
        protectFixture = setInterval(() => {
          for (const p of game.state.players) p.invulnerable = 9999;
        }, 50);
        await Promise.all(
          players.map((p) =>
            p.page.waitForFunction(
              ({ seed, enemies }) => {
                const state = window.__OFFDUTY__?.state;
                return (
                  state?.world.seed === seed &&
                  state.enemies.length === enemies &&
                  state.players.every(
                    (p) => Object.keys(p.arsenal).length === 4,
                  )
                );
              },
              { seed: SEED, enemies: spec.enemies },
            ),
          ),
        );
      }
      // Q occurs before the movement workers own their pages' keyboard commands.
      await Promise.all(
        players.map(async (p) => {
          await p.page.locator(".game-canvas canvas").focus();
          await p.page.keyboard.press("q");
        }),
      );
      let phase: Awaited<ReturnType<typeof measurePhase>> | undefined;
      try {
        for (const p of players) {
          activeControls.push(
            startKeyboardLoop(
              p,
              (config.warmupSeconds + config.seconds) * 1000 + 3000,
            ),
          );
        }
        await Promise.all(
          players.map((p) =>
            p.page.waitForTimeout(config.warmupSeconds * 1000),
          ),
        );
        console.log(
          `Measuring ${spec.name}: four actively controlled independent renderers for ${config.seconds}s`,
        );
        phase = await measurePhase(
          spec.name,
          spec.enemies,
          config.seconds * 1000,
          players,
          app,
        );
      } finally {
        const reports = await stopControls();
        if (phase) {
          for (const row of phase.players) {
            row.keyboardControls =
              reports.find((r) => r.player === row.player) ?? null;
            if (
              !row.keyboardControls?.keysReleased ||
              row.keyboardControls.errors.length ||
              row.keyboardControls.durationLimitReached
            ) {
              row.failures.push(
                "Keyboard loop failed, exceeded its bound, or could not release keys",
              );
              row.valid = false;
            }
          }
          phase.valid &&= phase.players.every((p) => p.valid);
        }
      }
      assert.ok(phase, "Phase measurement missing");
      phases.push(phase);
      await persist();
      if (protectFixture) clearInterval(protectFixture);
      protectFixture = undefined;
      assert.ok(
        phase.valid,
        `${spec.name} has invalid evidence; inspect per-player validation`,
      );
    }
  } catch (error) {
    errors.push(
      error instanceof Error ? error.stack || error.message : String(error),
    );
  } finally {
    await stopControls();
    if (protectFixture) clearInterval(protectFixture);
    // Guests first, host last. Each UI leave receives its actual room:leave ack
    // through the application's normal state transition before browsers close.
    const guests = await Promise.all(
      players
        .slice(1)
        .map(async (p) => ({ player: p.number, result: await leavePlayer(p) })),
    );
    cleanup.push(...guests);
    if (players[0])
      cleanup.push({ player: 1, result: await leavePlayer(players[0]) });
    await Promise.allSettled(players.map((p) => p.browser.close()));
    if (app) {
      try {
        await app.close();
      } catch (error) {
        errors.push(`Server cleanup: ${String(error)}`);
      }
    }
    if (dataDirectory) {
      try {
        const cleanupPath = path.resolve(dataDirectory);
        if (
          !cleanupPath.startsWith(path.resolve(tmpdir()) + path.sep) ||
          !path.basename(cleanupPath).startsWith("offduty-multiplayer411-")
        )
          throw new Error("Unexpected temporary fixture cleanup path");
        await rm(cleanupPath, { recursive: true, force: true });
      } catch (error) {
        errors.push(`Temporary fixture cleanup: ${String(error)}`);
      }
    }

    if (cleanup.some((p) => p.result.startsWith("ui-leave-failed")))
      errors.push(
        "At least one UI room:leave could not be confirmed; browsers were disconnected",
      );
    try {
      await persist(true);
    } finally {
      clearTimeout(deadline);
      if (forceExit) clearTimeout(forceExit);
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    }
  }
  console.log(`Report: ${path.join(output, "summary.json")}`);
  if (
    errors.length ||
    timedOut ||
    interrupted ||
    phases.length !== (config.liveUrl ? 1 : 2)
  ) {
    process.exitCode = 1;
    console.error(errors.join("\n"));
  }

  async function stopControls() {
    const controllers = activeControls.splice(0);
    const reports = await Promise.all(
      controllers.map((controller) => controller.stop()),
    );
    keyboardRuns.push(...reports);
    for (const report of reports) {
      if (
        report.errors.length ||
        !report.keysReleased ||
        report.durationLimitReached
      )
        errors.push(
          `Player ${report.player} keyboard control cleanup: ${JSON.stringify(report)}`,
        );
    }
    return reports;
  }

  async function persist(final = false) {
    for (const p of players) {
      await writeFile(
        path.join(output, `player-${p.number}.json`),
        JSON.stringify(
          {
            player: p.number,
            browserVersion: p.browser.version(),
            independentBrowser: true,
            browserProcessId: p.browserProcessId,
            viewport: config.viewport,
            dpr: config.dpr,
            engineId: p.engineId,
            errors: p.errors,
            phases: phases.map((phase) => ({
              name: phase.name,
              synthetic: phase.synthetic,
              ...phase.players.find((row) => row.player === p.number),
            })),
          },
          null,
          2,
        ),
      );
    }
    const expectedPhases = config.liveUrl ? 1 : 2;
    await writeFile(
      path.join(output, "summary.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          runId,
          startedAt,
          updatedAt: new Date().toISOString(),
          complete: final,
          valid:
            final &&
            !errors.length &&
            !timedOut &&
            !interrupted &&
            phases.length === expectedPhases &&
            phases.every((p) => p.valid),
          url,
          roomCode: code,
          mode: config.liveUrl
            ? "live-basic-public-session"
            : "local-owned-synthetic-fixture",
          physical144HzDisplayEvidence: false,
          throughput: config.throughput
            ? "simulated/display-unconstrained throughput; Chromium vsync/frame limit disabled, game FramePacer cap 144"
            : "display-paced Chromium; game FramePacer cap 144; physical display refresh unverified",
          config,
          seed: config.liveUrl ? null : SEED,
          fixture: config.liveUrl
            ? null
            : {
                layout: fixtureLayout,
                synthetic: true,
                survivalResult: false,
                enemyCounts: [6, 150],
                enemyHp: 1_000_000_000,
                enemySpeed: 0,
                modules: MODULES,
                moduleLevel: 8,
                modulesPerCharacter: 4,
                invulnerability: true,
                seed: SEED,
                simulationRandomSeed: SEED + 73,
              },
          keyboardPlan: KEYBOARD_PLAN,
          keyboardRuns,
          build,
          runtime: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            logicalCpus: cpus().length,
            availableParallelism: availableParallelism(),
            focusEmulationEnabledForAllPages: true,
            chromiumArgs: [
              ...CHROMIUM_ARGS,
              ...(config.throughput ? THROUGHPUT_ARGS : []),
            ],
          },
          budgetMs,
          timedOut,
          interrupted,
          cleanup,
          errors,
          limitations: [
            "Four independent browser launches share this machine, GPU and network; results include concurrent browser contention. CDP focus emulation and background-throttling flags keep all four pages active.",
            "WebGL render calls and unique rendered game frames are measured after FramePacer; reference RAF is reported separately, never called FPS.",
            "Renderer timestamps measure CPU-side WebGL submissions, not GPU completion, scanout, or physical display refresh.",
            "Phaser prestep-to-postrender timing measures in-engine work; CDP main-thread task/script/layout deltas also cover work between engine frames. Neither proves GPU completion or physical scanout.",
            "CDP state timestamps measure browser transport arrival; they combine server cadence, network delivery and browser scheduling, not React publication cadence.",
            "CDP state payload sizes are decompressed application bytes. Only local net.Socket bytesWritten measures actual TCP application writes, after WebSocket compression/framing; excludes IP/TCP headers and retransmits.",
            "Node CPU/event-loop metrics cover the owned server plus this harness/CDP processing in one process; they exclude Chromium CPU/GPU. In LIVE_URL mode they describe the harness, not the remote server.",
            "Header latency is the game's existing ping result, sampled every 3s and potentially stale/rounded. CDP passively matches those same ping acknowledgments; no extra ping traffic or snapshot parsing in pages.",
            "Default local fixtures are seeded synthetic stationary, high-HP enemies with invulnerable humans and four level-8 modules; no survival or balance claims.",
            "Local mode serves existing dist without rebuilding it; index hash/mtime records the served entry, not proof that dist matches source.",
            "LIVE_URL runs one ordinary four-player UI session with natural enemies/load and no privileged changes; remote CPU, TCP counters and fixed-seed fixtures are unavailable.",
            "Keyboard holds and Space dashes are actual browser inputs; movement, collision and dash outcomes remain normal server physics. Position samples show displacement, not a reconstructed path or physics simulation.",
            "No 144Hz pass/fail threshold is inferred. Invalid visibility, identity, transport, load, rendering or phase evidence fails the run.",
          ],
          phases: phases.map(({ players: rows, ...phase }) => ({
            ...phase,
            players: rows.map(({ raw, ...row }) => ({
              ...row,
              rawReport: `player-${row.player}.json`,
            })),
          })),
        },
        null,
        2,
      ),
    );
  }
}

async function measurePhase(
  name: string,
  enemies: number | null,
  durationMs: number,
  players: Player[],
  app?: OwnedServer,
) {
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  const tcp = app ? serverTcpCounters(app, players) : null;
  const pageMetricsBefore = await Promise.all(
    players.map((p) => p.cdp.send("Performance.getMetrics")),
  );
  const cpuStart = process.cpuUsage();
  const eluStart = performance.eventLoopUtilization();
  const start = performance.now();
  histogram.enable();
  players.forEach(beginWireSample);
  // allSettled retains the other three players' evidence if one page crashes.
  let samples: PromiseSettledResult<PageSample>[];
  try {
    samples = await Promise.allSettled(
      players.map((p) => samplePage(p, durationMs)),
    );
  } finally {
    histogram.disable();
  }
  const elapsedMs = performance.now() - start;
  const pageMetricsAfter = await Promise.all(
    players.map((p) => p.cdp.send("Performance.getMetrics")),
  );
  const cpu = process.cpuUsage(cpuStart);
  const elu = performance.eventLoopUtilization(eluStart);
  const wire = players.map(endWireSample);
  const tcpRows =
    tcp?.map((row) => ({
      player: row.player,
      engineId: row.engineId,
      socketId: row.socketId,
      deltaBytesWritten: row.tcp.bytesWritten - row.startBytes,
      bytesPerSecond:
        (row.tcp.bytesWritten - row.startBytes) / (elapsedMs / 1000),
      connectedAtEnd: !row.tcp.destroyed,
      sameConnectionAtEnd: [...app!.io.sockets.sockets.values()].some(
        (s) => s.id === row.socketId && s.conn.transport.sid === row.engineId,
      ),
    })) ?? null;
  const rows = players.map((p, i) => {
    const result = samples[i];
    const raw = result.status === "fulfilled" ? result.value : null;
    const failures: string[] = [];
    const check = (ok: unknown, message: string) => {
      if (!ok) failures.push(message);
    };
    if (result.status === "rejected") failures.push(String(result.reason));
    check(!p.errors.length, "Browser page errors");
    check(
      raw &&
        raw.gameStepDurationsMs.length > 0 &&
        raw.renderDurationsMs.length > 0,
      "Engine and WebGL work timing evidence missing",
    );
    check(raw && raw.elapsedMs >= 10000, "Less than 10s of page evidence");
    check(
      raw &&
        raw.renderCalls > 0 &&
        raw.renderedFrames > 1 &&
        raw.frameIntervalsMs.length > 0 &&
        raw.webgl,
      "Actual WebGL renderer evidence missing",
    );
    check(
      raw && !raw.overflow && !raw.contextLosses,
      "Renderer overflow/context loss",
    );
    check(
      raw &&
        !raw.hiddenSamples &&
        !raw.visibilityChanges &&
        !raw.finalHidden &&
        raw.visibilityState === "visible",
      "Page visibility changed or slept",
    );
    check(
      raw?.configuredFrameCap === 144,
      "Normal game FramePacer cap 144 not preserved",
    );
    check(
      raw?.states.every(
        (s) =>
          s.phase === "playing" &&
          s.players === 4 &&
          s.connectedHumans === 4 &&
          s.aliveHumans === 4,
      ),
      "Not four living, connected human players throughout playing",
    );
    if (
      !process.env.LIVE_URL &&
      process.env.BENCH_CLUSTER === "1" &&
      enemies === 150
    )
      check(
        raw?.states.every((s) => (s.enemyCentersInView ?? 0) >= 100),
        "Clustered fixture must keep at least 100 enemy centers genuinely visible",
      );
    check(raw?.playerId, "Player identity missing");
    const first = raw?.states[0];
    const last = raw?.states.at(-1);
    const positions =
      raw?.states.filter((s) => s.x !== null && s.y !== null) ?? [];
    const maxSampledDisplacement =
      first?.x !== null && first?.x !== undefined && first.y !== null
        ? Math.max(
            0,
            ...positions.map((s) =>
              Math.hypot(s.x! - first.x!, s.y! - first.y!),
            ),
          )
        : null;
    const attackSeqDelta =
      first?.attackSeq !== null &&
      first?.attackSeq !== undefined &&
      last?.attackSeq !== null &&
      last?.attackSeq !== undefined
        ? last.attackSeq - first.attackSeq
        : null;
    const dashSeqDelta =
      first?.dashSeq !== null &&
      first?.dashSeq !== undefined &&
      last?.dashSeq !== null &&
      last?.dashSeq !== undefined
        ? last.dashSeq - first.dashSeq
        : null;
    check(
      maxSampledDisplacement !== null && maxSampledDisplacement > 1,
      "Own-player state did not prove movement",
    );
    check(
      attackSeqDelta !== null && attackSeqDelta > 0,
      "Own-player attackSeq did not advance",
    );
    check(
      dashSeqDelta !== null && dashSeqDelta > 0,
      "Own-player dashSeq did not advance",
    );
    if (enemies !== null) {
      check(
        raw?.states.every(
          (s) => s.enemies === enemies && s.equippedModules === 4,
        ),
        "Synthetic enemy/module load drifted",
      );
      check(
        raw && raw.states.at(-1)!.damage > raw.states[0].damage,
        "Player did no damage during measured load",
      );
    }
    check(
      wire[i].stateFrames >= 2 &&
        wire[i].activeWebSockets === 1 &&
        !wire[i].disconnects &&
        !wire[i].errors.length,
      "State WebSocket missing/interrupted",
    );
    check(
      wire[i].existingPingAckRttMs.count > 0,
      "Existing game ping acknowledgment not observed",
    );
    check(
      raw && raw.headerLatencySamples.length > 0,
      "Existing game header RTT unavailable",
    );
    const tcpRow = tcpRows?.[i] ?? null;
    if (tcpRow)
      check(
        tcpRow.connectedAtEnd &&
          tcpRow.sameConnectionAtEnd &&
          tcpRow.deltaBytesWritten > 0,
        "Server TCP connection changed or wrote no bytes",
      );
    return {
      player: p.number,
      valid: !failures.length,
      failures,
      playerId: raw?.playerId ?? null,
      keyboardControls: null as KeyboardControlReport | null,
      actions: {
        firstPosition: first ? { x: first.x, y: first.y } : null,
        lastPosition: last ? { x: last.x, y: last.y } : null,
        maxSampledDisplacementFromFirst: maxSampledDisplacement,
        attackSeqDelta,
        dashSeqDelta,
        damageDelta: first && last ? last.damage - first.damage : null,
      },
      renderCallsPerSecond: raw
        ? raw.renderCalls / (raw.elapsedMs / 1000)
        : null,
      renderedFramesPerSecond: raw
        ? raw.renderedFrames / (raw.elapsedMs / 1000)
        : null,
      renderedFrameIntervalMs: distribution(raw?.frameIntervalsMs ?? []),
      browserMainThread: Object.fromEntries(
        [
          "ScriptDuration",
          "TaskDuration",
          "LayoutDuration",
          "RecalcStyleDuration",
        ].map((name) => {
          const before = pageMetricsBefore[i].metrics.find(
            (m) => m.name === name,
          )?.value;
          const after = pageMetricsAfter[i].metrics.find(
            (m) => m.name === name,
          )?.value;
          return [
            name.replace("Duration", "Ms"),
            before === undefined || after === undefined
              ? null
              : (after - before) * 1000,
          ];
        }),
      ),
      gameStepCostMs: distribution(raw?.gameStepDurationsMs ?? []),
      webglSubmitCostMs: distribution(raw?.renderDurationsMs ?? []),
      referenceRafCount: raw?.referenceRafCount ?? null,
      referenceRafCallbacksPerSecond: raw
        ? raw.referenceRafCount / (raw.elapsedMs / 1000)
        : null,
      gameHeaderRttMs: distribution(
        raw?.headerLatencySamples.map((s) => s.ms) ?? [],
      ),
      incoming: wire[i],
      tcp: tcpRow,
      raw,
    };
  });
  const frameRates = rows
    .map((r) => r.renderedFramesPerSecond)
    .filter((v): v is number => v !== null);
  const cpuMs = (cpu.user + cpu.system) / 1000;
  return {
    name,
    synthetic: !!app,
    requestedDurationMs: durationMs,
    elapsedMs,
    valid:
      rows.every((p) => p.valid) &&
      new Set(rows.map((p) => p.playerId)).size === 4,
    summary: {
      slowestPlayerRenderedFramesPerSecond: frameRates.length
        ? Math.min(...frameRates)
        : null,
      fastestPlayerRenderedFramesPerSecond: frameRates.length
        ? Math.max(...frameRates)
        : null,
      // Keep players independent; pooling frames would conceal a single stuttering player.
      worstPlayerFrameP95Ms: maxOrNull(
        rows.map((p) => p.renderedFrameIntervalMs.p95),
      ),
      worstPlayerFrameP99Ms: maxOrNull(
        rows.map((p) => p.renderedFrameIntervalMs.p99),
      ),
      worstPlayerStateGapP95Ms: maxOrNull(
        rows.map((p) => p.incoming.stateGapMs.p95),
      ),
      worstPlayerStateGapMaxMs: maxOrNull(
        rows.map((p) => p.incoming.stateGapMs.max),
      ),
      totalServerTcpDeltaBytesWritten:
        tcpRows?.reduce((n, p) => n + p.deltaBytesWritten, 0) ?? null,
      totalServerTcpBytesPerSecond:
        tcpRows?.reduce((n, p) => n + p.bytesPerSecond, 0) ?? null,
    },
    node: {
      scope: app
        ? "owned server + harness/CDP in this process"
        : "harness only; remote server unavailable",
      eventLoopDelayMs: {
        resolutionMs: 10,
        samples: histogram.count,
        mean: Number.isFinite(histogram.mean) ? histogram.mean / 1e6 : null,
        p95: histogram.count ? histogram.percentile(95) / 1e6 : null,
        p99: histogram.count ? histogram.percentile(99) / 1e6 : null,
        max: histogram.count ? histogram.max / 1e6 : null,
      },
      cpu: {
        userMs: cpu.user / 1000,
        systemMs: cpu.system / 1000,
        totalMs: cpuMs,
        percentOfOneCore: (cpuMs / elapsedMs) * 100,
        percentOfAvailableCores:
          (cpuMs / elapsedMs / availableParallelism()) * 100,
      },
      eventLoopUtilization: elu.utilization,
    },
    players: rows,
  };
}

function maxOrNull(values: (number | null)[]) {
  const numbers = values.filter((v): v is number => v !== null);
  return numbers.length ? Math.max(...numbers) : null;
}
