import test from "node:test";
import assert from "node:assert/strict";
import { predictPosition, predictDash } from "../src/renderMotion";
test("render extrapolation fills snapshot gaps but is capped at 100ms", () => {
  const r = predictPosition({ x: 128, y: 304 }, { x: 180, y: 0 }, 0.05);
  assert.equal(r.x, 137);
  assert.equal(predictPosition({ x: 128, y: 304 }, { x: 180, y: 0 }, 2).x, 146);
});
test("render extrapolation cannot move through walls or use invalid frame deltas", () => {
  assert.equal(
    predictPosition({ x: 240, y: 320 }, { x: 180, y: 0 }, 0.1).x,
    240,
  );
  assert.deepEqual(predictPosition({ x: 128, y: 304 }, { x: 180, y: 0 }, NaN), {
    x: 128,
    y: 304,
  });
});

test("predicted dash travels 120 units but never tunnels through laboratory walls", () => {
  assert.equal(predictDash({ x: 128, y: 240 }, { x: 1, y: 0 }).x, 248);
  assert.equal(predictDash({ x: 240, y: 320 }, { x: 1, y: 0 }).x, 240);
});
import { FramePacer } from "../src/framePacer";
test("144 FPS cap retains fractional timing on a 240 Hz render clock", () => {
  const gate = new FramePacer(144);
  let renders = 0;
  for (let i = 0; i < 2400; i++)
    if (gate.sample(1000 / 240) !== null) renders++;
  assert.ok(Math.abs(renders - 1440) <= 1, `actual frames ${renders}`);
});
test("unlocked frame pacing renders each display tick and rejects non-finite time", () => {
  const gate = new FramePacer(0);
  assert.equal(gate.sample(1000 / 240), 1000 / 240);
  assert.equal(gate.sample(NaN), 0);
});

test("144 cap preserves pending credit when a compositor batches callbacks into bursts", () => {
  const gate = new FramePacer(144);
  let renders = 0,
    total = 0;
  for (let i = 0; i < 400; i++)
    for (const delta of [
      18.6, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
    ]) {
      total += delta;
      if (gate.sample(delta) !== null) renders++;
    }
  assert.ok(
    Math.abs(renders - (total / 1000) * 144) < 2,
    `burst FPS ${renders / (total / 1000)}`,
  );
});
