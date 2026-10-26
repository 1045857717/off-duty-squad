import test from "node:test";
import assert from "node:assert/strict";
import { FramePacer } from "../src/framePacer";
import {
  FrameDiagnostics,
  classifyFrameScheduling,
  type FrameDiagnosticsSnapshot,
} from "../src/frameDiagnostics";

function createDiagnostics() {
  return new FrameDiagnostics();
}
const classify = classifyFrameScheduling;
function close(actual: number | null, expected: number, tolerance = 0.001) {
  assert.notEqual(actual, null);
  assert.ok(
    Math.abs(actual! - expected) <= tolerance,
    `expected ${expected}, got ${actual}`,
  );
}
function runWindow(
  hz: number,
  cap = 0,
  cpuMs = 2,
  diagnostics = createDiagnostics(),
  start = 0,
) {
  const pacer = new FramePacer(cap);
  diagnostics.recordCallback(start);
  // The opening callback is a boundary, not a full measured interval.
  diagnostics.recordRenderedStep(cpuMs);
  let previous = start;
  let result: FrameDiagnosticsSnapshot | null = null;
  for (let i = 1; i <= hz; i++) {
    const now = start + (i * 1000) / hz;
    diagnostics.recordCallback(now);
    if (pacer.sample(now - previous) !== null)
      diagnostics.recordRenderedStep(cpuMs);
    previous = now;
    result = diagnostics.takeSnapshot() ?? result;
  }
  assert.ok(result, "one second of active callbacks should publish a snapshot");
  return result;
}

for (const hz of [60, 144, 240]) {
  test(`measures ${hz} real callbacks/s before an unlocked frame gate`, () => {
    const sample = runWindow(hz);
    close(sample.callbackHz, hz);
    close(sample.renderedHz, hz);
    assert.equal(sample.callbackCount, hz);
    assert.equal(sample.renderedStepCount, hz);
    close(sample.callbackIntervalMeanMs, 1000 / hz);
    close(sample.cpuStepMeanMs, 2);
    close(sample.cpuStepP95Ms, 2);
    assert.equal(sample.windowMs, 1000);
    assert.equal(sample.sampledAt, 1000);
  });
}

test("a 144 cap counts admitted steps separately from 240 callbacks/s", () => {
  const sample = runWindow(240, 144);
  close(sample.callbackHz, 240);
  close(sample.renderedHz, 144);
  assert.equal(sample.callbackCount, 240);
  assert.equal(sample.renderedStepCount, 144);
  assert.equal(sample.cpuSampleCount, 144);
  assert.notEqual(classify(sample).kind, "near-60");
});

test("publishes once per active second and starts the next window at its boundary", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  for (let i = 1; i < 60; i++) {
    diagnostics.recordCallback((i * 1000) / 60);
    diagnostics.recordRenderedStep(1);
    assert.equal(diagnostics.takeSnapshot(), null);
  }
  diagnostics.recordCallback(1000);
  diagnostics.recordRenderedStep(1);
  assert.equal(diagnostics.takeSnapshot()?.callbackCount, 60);
  assert.equal(diagnostics.takeSnapshot(), null);
  for (let i = 1; i <= 60; i++) {
    diagnostics.recordCallback(1000 + (i * 1000) / 60);
    diagnostics.recordRenderedStep(3);
  }
  const next = diagnostics.takeSnapshot();
  assert.ok(next);
  assert.equal(next.callbackCount, 60);
  assert.equal(next.renderedStepCount, 60);
  close(next.callbackHz, 60);
  close(next.cpuStepMeanMs, 3);
});

test("hidden document or bridge samples discard the old window and ignore hidden steps", () => {
  for (const hiddenSource of ["document", "bridge"]) {
    const diagnostics = createDiagnostics();
    diagnostics.recordCallback(0);
    diagnostics.recordCallback(500);
    diagnostics.recordRenderedStep(200);
    diagnostics.recordCallback(600, false);
    diagnostics.recordRenderedStep(900);
    diagnostics.recordCallback(9000, false);
    assert.equal(diagnostics.takeSnapshot(), null, hiddenSource);
    const sample = runWindow(144, 0, 1, diagnostics, 10000);
    close(sample.callbackHz, 144);
    assert.equal(sample.windowMs, 1000);
    assert.equal(sample.callbackCount, 144);
    close(sample.cpuStepMeanMs, 1);
  }
});

test("explicit wake reset removes old counts and CPU costs before the next window", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  diagnostics.recordCallback(500);
  diagnostics.recordRenderedStep(300);
  diagnostics.reset();
  diagnostics.recordRenderedStep(999);
  assert.equal(diagnostics.takeSnapshot(), null);
  const sample = runWindow(240, 0, 1, diagnostics, 60000);
  assert.equal(sample.windowMs, 1000);
  close(sample.callbackHz, 240);
  close(sample.cpuStepP95Ms, 1);
});

test("an unexplained long callback gap restarts sampling instead of diluting cadence", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  diagnostics.recordCallback(500);
  diagnostics.recordRenderedStep(80);
  diagnostics.recordCallback(10000);
  diagnostics.recordRenderedStep(999);
  assert.equal(diagnostics.takeSnapshot(), null);
  for (let i = 1; i <= 60; i++) {
    diagnostics.recordCallback(10000 + (i * 1000) / 60);
    diagnostics.recordRenderedStep(1);
  }
  const sample = diagnostics.takeSnapshot();
  assert.ok(sample);
  close(sample.callbackHz, 60);
  close(sample.cpuStepMeanMs, 1);
  assert.equal(sample.windowMs, 1000);
});

test("irregular intervals use elapsed wall time and retain percentile evidence", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  let now = 0;
  for (let i = 0; i < 100; i++) {
    now += i % 2 === 0 ? 2 : 18;
    diagnostics.recordCallback(now);
    diagnostics.recordRenderedStep(i < 95 ? 1 : 11);
  }
  const sample = diagnostics.takeSnapshot();
  assert.ok(sample);
  close(sample.callbackHz, 100);
  close(sample.callbackIntervalMeanMs, 10);
  close(sample.callbackIntervalP5Ms, 2);
  close(sample.callbackIntervalP95Ms, 18);
  close(sample.cpuStepMeanMs, 1.5);
  close(sample.cpuStepP95Ms, 1);
  assert.equal(classify(sample).kind, "other");
});

test("a zero-step window exposes callbacks without inventing CPU samples", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  for (let i = 1; i <= 60; i++) diagnostics.recordCallback((i * 1000) / 60);
  const sample = diagnostics.takeSnapshot();
  assert.ok(sample);
  close(sample.callbackHz, 60);
  assert.equal(sample.renderedStepCount, 0);
  assert.equal(sample.renderedHz, 0);
  assert.equal(sample.cpuStepMeanMs, null);
  assert.equal(sample.cpuStepP95Ms, null);
  assert.equal(sample.cpuSampleCount, 0);
});

test("CPU percentile includes the expensive tail but no skipped or duplicate steps", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  for (let i = 1; i <= 100; i++) {
    diagnostics.recordCallback(i * 10);
    if (i % 2 === 0) continue;
    diagnostics.recordRenderedStep(i <= 89 ? 1 : 11);
    diagnostics.recordRenderedStep(999);
  }
  const sample = diagnostics.takeSnapshot();
  assert.ok(sample);
  assert.equal(sample.renderedStepCount, 50);
  assert.equal(sample.cpuSampleCount, 50);
  close(sample.cpuStepMeanMs, 2);
  close(sample.cpuStepP95Ms, 11);
});

test("sample arrays stay below 512 while counters and means retain the whole window", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  for (let i = 1; i <= 2000; i++) {
    diagnostics.recordCallback(i / 2);
    diagnostics.recordRenderedStep(i <= 1000 ? 1 : 3);
  }
  const sample = diagnostics.takeSnapshot();
  assert.ok(sample);
  assert.equal(sample.callbackCount, 2000);
  assert.equal(sample.renderedStepCount, 2000);
  close(sample.callbackHz, 2000);
  close(sample.cpuStepMeanMs, 2);
  assert.ok(sample.callbackSampleCount > 0 && sample.callbackSampleCount < 512);
  assert.ok(sample.cpuSampleCount > 0 && sample.cpuSampleCount < 512);
  for (const value of Object.values(diagnostics))
    if (Array.isArray(value)) assert.ok(value.length < 512);
});

test("non-finite or backwards callback clocks restart the window", () => {
  for (const invalid of [NaN, Infinity, -1]) {
    const diagnostics = createDiagnostics();
    diagnostics.recordCallback(0);
    diagnostics.recordCallback(500);
    diagnostics.recordRenderedStep(80);
    diagnostics.recordCallback(invalid);
    assert.equal(diagnostics.takeSnapshot(), null);
    const sample = runWindow(60, 0, 2, diagnostics, 1000);
    close(sample.callbackHz, 60);
    close(sample.cpuStepMeanMs, 2);
  }
});

test("invalid CPU samples do not poison valid timing or fabricate zero-cost work", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  for (let i = 1; i <= 100; i++) {
    diagnostics.recordCallback(i * 10);
    diagnostics.recordRenderedStep(i <= 3 ? [NaN, Infinity, -1][i - 1] : 4);
  }
  const sample = diagnostics.takeSnapshot();
  assert.ok(sample);
  assert.equal(sample.renderedStepCount, 100);
  assert.equal(sample.cpuSampleCount, 97);
  close(sample.cpuStepMeanMs, 4);
  close(sample.cpuStepP95Ms, 4);
});

test("only a credible active window describes observed scheduling near 60/s", () => {
  assert.equal(classify(undefined).kind, "insufficient-data");
  assert.equal(classify(null).kind, "insufficient-data");
  const sample = runWindow(60);
  assert.equal(
    classify({ ...sample, windowMs: 250 }).kind,
    "insufficient-data",
  );
  assert.equal(
    classify({ ...sample, callbackSampleCount: 3 }).kind,
    "insufficient-data",
  );
  const description = classify(sample);
  assert.equal(description.kind, "near-60");
  assert.match(description.summary, /observed.*(schedul|callback).*60/i);
  assert.match(
    description.summary,
    /physical.*(unknown|unverified|not|cannot)/i,
  );
  assert.match(
    description.summary,
    /network.*(unknown|unverified|not|cannot)/i,
  );
});

test("bursty delivery averaging 60/s is not classified as steady scheduling near 60/s", () => {
  const diagnostics = createDiagnostics();
  diagnostics.recordCallback(0);
  let now = 0;
  for (let i = 0; i < 60; i++) {
    now += i % 2 === 0 ? 1 : 1000 / 30 - 1;
    diagnostics.recordCallback(now);
    diagnostics.recordRenderedStep(1);
  }
  const sample = diagnostics.takeSnapshot();
  assert.ok(sample);
  close(sample.callbackHz, 60);
  assert.equal(classify(sample).kind, "other");
});
