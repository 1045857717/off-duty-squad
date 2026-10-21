import test from "node:test";
import assert from "node:assert/strict";
import {
  directionView,
  limbPose,
  locomotionWeight,
} from "../src/game/actorPose";
test("all eight turn sectors retain a distinct view including rear diagonals", () => {
  const poses = Array.from({ length: 8 }, (_, i) =>
    directionView((i * Math.PI) / 4),
  );
  assert.equal(
    new Set(poses.map((p) => JSON.stringify([p.column, p.flip, p.backTurn])))
      .size,
    8,
  );
  assert.equal(directionView(-Math.PI / 2).dir, 6);
  assert.equal(directionView(Math.PI * 2).dir, 0);
});
test("upper-body firing and casting never freeze the continuous locomotion legs", () => {
  for (let i = 0; i < 120; i++) {
    const phase = (i / 120) * Math.PI * 2,
      a = limbPose(phase, 1, 1000),
      b = limbPose(phase, 1, 1000, 0.8, 0.9);
    assert.equal(a.leftLeg, b.leftLeg);
    assert.equal(a.rightLeg, b.rightLeg);
    assert.notEqual(a.rightArm, b.rightArm);
  }
  const angles = Array.from(
    { length: 120 },
    (_, i) => limbPose((i / 120) * Math.PI * 2, 1, 1000).leftLeg,
  );
  assert.ok(new Set(angles.map((a) => a.toFixed(5))).size > 50);
});
test("starting and stopping ease smoothly independent of display refresh", () => {
  let a = 0,
    b = 0;
  for (let i = 0; i < 144; i++) a = locomotionWeight(a, true, 1000 / 144);
  for (let i = 0; i < 60; i++) b = locomotionWeight(b, true, 1000 / 60);
  assert.ok(Math.abs(a - b) < 1e-6);
  assert.ok(a > 0.99);
  assert.ok(locomotionWeight(a, false, 1000 / 144) > 0.8);
});
