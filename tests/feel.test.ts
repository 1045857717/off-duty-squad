import test from "node:test";
import assert from "node:assert/strict";
import { AttackTimeline, articulatedPose } from "../src/game/joints";
import { ATTACK_IDS } from "../shared/arsenal";
import { ATTACK_MOTIONS } from "../shared/combatProfiles";

test("every weapon has continuous joints through windup, contact and recovery boundaries", () => {
  for (const id of ATTACK_IDS) {
    for (const phase of [0.18, 0.23, 0.32, 0.45, 0.58, 0.68, 0.8]) {
      const clock = new AttackTimeline();
      clock.sample(id, 1, 0);
      const duration = ATTACK_MOTIONS[id].duration;
      const before = articulatedPose(
        0.7,
        0.6,
        1000,
        clock.sample(id, 1, (phase - 0.00001) * duration),
        0,
        false,
      );
      const after = articulatedPose(
        0.7,
        0.6,
        1000,
        clock.sample(id, 1, (phase + 0.00001) * duration),
        0,
        false,
      );
      for (const joint of [
        "leftUpperArm",
        "rightUpperArm",
        "leftForearm",
        "rightForearm",
        "torso",
      ] as const) {
        assert.ok(
          Math.abs(after[joint] - before[joint]) < 0.005,
          id + " snaps at " + phase + " in " + joint,
        );
      }
    }
  }
});

test("a late-joining renderer does not replay a stale attack snapshot", () => {
  const clock = new AttackTimeline();
  const sample = clock.sample("bat", 12, 1000, 5000);
  assert.equal(sample.active, false);
});

test("source age advances a received animation rather than restarting its anticipation", () => {
  const clock = new AttackTimeline();
  const sample = clock.sample(
    "bat",
    3,
    1000,
    ATTACK_MOTIONS.bat.duration * 0.4,
  );
  assert.ok(Math.abs(sample.progress - 0.4) < 0.001);
});

import { visibleAttack, weaponPose } from "../src/game/joints";
test("held weapon follows the current animation while a different module is queued", () => {
  const timeline = new AttackTimeline();
  timeline.sample("bat", 1, 0);
  const frame = timeline.sample("pulse", 2, 50);
  assert.equal(frame.id, "bat");
  assert.equal(visibleAttack(frame, { bat: 1, pulse: 2 }), "bat");
});
test("weapon rotation starts and ends at aim without an attack-start snap", () => {
  for (const id of ATTACK_IDS)
    for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const clock = new AttackTimeline();
      const start = weaponPose(clock.sample(id, 1, 0), facing);
      const end = weaponPose(
        clock.sample(id, 1, ATTACK_MOTIONS[id].duration),
        facing,
      );
      assert.equal(start.rotation, facing, id);
      assert.equal(end.rotation, facing, id);
    }
});

import { healthReadout, VitalTrail } from "../src/healthDisplay";
test("health display clamps invalid values and exposes numerical shield separately", () => {
  const value = healthReadout(24.2, 100, 30, 40, true);
  assert.equal(value.hp, 25);
  assert.equal(value.status, "critical");
  assert.equal(value.shieldRatio, 0.75);
  const invalid = healthReadout(NaN, 0, -30, NaN, false);
  assert.equal(invalid.hp, 0);
  assert.equal(invalid.ratio, 0);
  assert.equal(invalid.shieldRatio, 0);
  assert.equal(invalid.status, "down");
});
test("damage trail holds recent loss then drains independently from immediate health", () => {
  const trail = new VitalTrail();
  assert.equal(trail.sample(1, 0), 1);
  assert.equal(trail.sample(0.5, 100), 1);
  assert.equal(trail.sample(0.5, 300), 1);
  const draining = trail.sample(0.5, 800);
  assert.ok(draining > 0.5 && draining < 0.8);
  assert.ok(trail.sample(0.5, 3000) < 0.501);
});
test("healing immediately clears stale damage loss and maximum-health changes stay bounded", () => {
  const trail = new VitalTrail();
  trail.sample(1, 0);
  trail.sample(0.3, 20);
  assert.equal(trail.sample(0.7, 40), 0.7);
  assert.ok(trail.sample(-10, 100) <= 1);
  assert.equal(trail.sample(2, 200), 1);
});

import { enemyAttackFrame } from "../src/game/joints";
test("enemy windup connects to contact without resetting raised arms", () => {
  const charged = enemyAttackFrame("overhead", 1, -1);
  const released = enemyAttackFrame("overhead", 0, 0);
  const a = articulatedPose(0, 0, 1000, charged, 0, false);
  const b = articulatedPose(0, 0, 1000, released, 0, false);
  assert.ok(Math.abs(a.rightUpperArm - b.rightUpperArm) < 0.01);
  assert.ok(Math.abs(a.leftForearm - b.leftForearm) < 0.01);
});

import { rigPartGeometry } from "../src/game/joints";
test("painted-arm pivots match the actual anatomy in front and side frames", () => {
  const front = rigPartGeometry(0, "rightUpperArm");
  const side = rigPartGeometry(2, "rightUpperArm");
  assert.ok(front.pivot[0] > 0.55 && front.pivot[0] < 0.65);
  assert.ok(side.pivot[0] > 0.4 && side.pivot[0] < 0.56);
  const hand = rigPartGeometry(2, "rightHand");
  assert.ok(
    hand.pivot[0] < 0.56,
    "profile hand must not sample transparent outer edge",
  );
});

test("a fresh queued module begins at anticipation instead of jumping into or skipping its strike", () => {
  const clock = new AttackTimeline();
  clock.sample("bat", 1, 0);
  clock.sample("pulse", 2, 100);
  const queued = clock.sample("pulse", 2, ATTACK_MOTIONS.bat.duration + 10);
  assert.equal(queued.id, "pulse");
  assert.equal(queued.progress, 0);
  assert.equal(queued.active, true);
});

import { ROLE_BASICS } from "../shared/basics";
test("ordinary weapon remains visible without any drafted attack module", () => {
  for (const basic of Object.values(ROLE_BASICS)) {
    const t = new AttackTimeline();
    const frame = t.sample(basic.weapon, 1, 10);
    assert.equal(
      (visibleAttack as (...args: any[]) => unknown)(frame, {}, basic.weapon),
      basic.weapon,
    );
  }
});
test("ordinary fire has a readable held-tool silhouette and recoil at contact", () => {
  const t = new AttackTimeline();
  t.sample("pulse", 1, 0);
  const pose = weaponPose(
    t.sample("pulse", 1, ATTACK_MOTIONS.pulse.duration * 0.35),
    0,
  );
  assert.ok(pose.scale >= 0.74);
  assert.ok(pose.recoil >= 5);
});

test("melee contact points towards the actual strike instead of crossing behind it", () => {
  for (const id of ["bat", "mop", "wrench", "meteor"] as const)
    for (let dir = 0; dir < 8; dir++) {
      const facing = (dir * Math.PI) / 4,
        clock = new AttackTimeline();
      clock.sample(id, 1, 0);
      const frame = clock.sample(id, 1, ATTACK_MOTIONS[id].duration * 0.3);
      assert.ok(
        Math.cos(weaponPose(frame, facing).rotation - facing) > 0.85,
        id + " contact is pointing sideways/backwards",
      );
    }
});
