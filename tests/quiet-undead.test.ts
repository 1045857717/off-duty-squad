import test from "node:test";
import assert from "node:assert/strict";
import { ENEMY_DEFS, ATTACK_MOTIONS } from "../shared/combatProfiles";
import {
  ZOMBIE_DESIGNS,
  ZOMBIE_PARTS,
  zombieGeometry,
  zombiePose,
} from "../src/game/zombieRig";
import {
  AttackTimeline,
  enemyAttackFrame,
  articulatedPose,
  weaponPose,
} from "../src/game/joints";
import type { EnemyKind } from "../shared/types";
test("every live enemy has its own zombie anatomy including articulated jaw and all six painted views", () => {
  const silhouettes = new Set<string>();
  for (const kind of Object.keys(ENEMY_DEFS) as EnemyKind[]) {
    assert.ok(ZOMBIE_DESIGNS[kind]);
    assert.equal(ENEMY_DEFS[kind].model, "zombie-" + kind);
    silhouettes.add(JSON.stringify(ZOMBIE_DESIGNS[kind]));
    for (let col = 0; col < 6; col++)
      for (const part of ZOMBIE_PARTS) {
        const g = zombieGeometry(col, part.name, kind);
        assert.ok(g.rect[2] > 0 && g.rect[3] > 0);
        assert.ok(
          g.rect[2] * 126 <= 96 && g.rect[3] * 157.5 <= 112,
          kind + " " + part.name + " exceeds atlas cell",
        );
        assert.ok(g.pivot.every(Number.isFinite));
      }
  }
  assert.equal(silhouettes.size, Object.keys(ENEMY_DEFS).length);
  assert.equal(ZOMBIE_PARTS.length, 15);
});
test("all zombie joints animate during locomotion, windup, strike, recovery and hurt without phase snaps", () => {
  for (const kind of Object.keys(ENEMY_DEFS) as EnemyKind[]) {
    const values = ZOMBIE_PARTS.map((part) => new Set<number>());
    for (let f = 0; f < 160; f++) {
      const t = f / 160;
      const m = enemyAttackFrame(
        kind === "tank" ? "overhead" : kind === "shooter" ? "shoot" : "slash",
        t < 0.4 ? t / 0.4 : 0,
        t < 0.4 ? -1 : (t - 0.4) * 1.2,
      );
      const p = zombiePose(kind, t * 10, 1, t * 3000, m, Math.sin(t * Math.PI));
      ZOMBIE_PARTS.forEach((part, i) => {
        assert.ok(Number.isFinite(p[part.name]));
        values[i].add(Math.round(p[part.name] * 1000));
      });
    }
    for (let i = 0; i < values.length; i++)
      assert.ok(values[i].size > 3, kind + " frozen " + ZOMBIE_PARTS[i].name);
    for (const age of [0, 0.12, 0.2, 0.34, 0.4, 0.58]) {
      const a = zombiePose(
        kind,
        0.7,
        0.8,
        1000,
        enemyAttackFrame("overhead", 0, Math.max(0, age - 0.000001)),
      );
      const b = zombiePose(
        kind,
        0.7,
        0.8,
        1000,
        enemyAttackFrame("overhead", 0, age + 0.000001),
      );
      for (const part of ZOMBIE_PARTS)
        assert.ok(
          Math.abs(a[part.name] - b[part.name]) < 0.005,
          kind + " snaps " + part.name + " at " + age,
        );
    }
  }
});
test("ordinary attacks keep feet planted and tool scale continuous at start and completion", () => {
  for (const id of Object.keys(
    ATTACK_MOTIONS,
  ) as (keyof typeof ATTACK_MOTIONS)[]) {
    const clock = new AttackTimeline();
    clock.sample(id, 1, 0);
    for (const t of [0, 0.2, 0.3, 0.5, 0.8, 1]) {
      const frame = clock.sample(id, 1, t * ATTACK_MOTIONS[id].duration);
      const p = articulatedPose(0, 0, 1000, frame, 0, false);
      assert.equal(p.thrust, 0, "attack must not drag grounded feet");
      const visible = weaponPose(frame, 0);
      assert.equal(
        visible.scale,
        0.82,
        "tool cannot grow and shrink when its motion kind changes",
      );
    }
  }
});

import { rigPartGeometry } from "../src/game/joints";
test("overhead anticipation visibly raises the wrist above the shoulder before a downward contact", () => {
  const clock = new AttackTimeline();
  clock.sample("wrench", 1, 0);
  const prep = articulatedPose(
    0,
    0,
    1000,
    clock.sample("wrench", 1, ATTACK_MOTIONS.wrench.duration * 0.2),
    0,
    false,
  );
  const contact = articulatedPose(
    0,
    0,
    1000,
    clock.sample("wrench", 1, ATTACK_MOTIONS.wrench.duration * 0.37),
    0,
    false,
  );
  for (let column = 0; column < 6; column++) {
    const shoulder = rigPartGeometry(column, "rightUpperArm").pivot,
      elbow = rigPartGeometry(column, "rightForearm").pivot,
      hand = rigPartGeometry(column, "rightHand").pivot;
    const y = (pose: typeof prep) => {
      const a = pose.torso + pose.rightUpperArm,
        b = a + pose.rightForearm;
      return (
        Math.sin(a) * (elbow[0] - shoulder[0]) * 84 +
        Math.cos(a) * (elbow[1] - shoulder[1]) * 105 +
        Math.sin(b) * (hand[0] - elbow[0]) * 84 +
        Math.cos(b) * (hand[1] - elbow[1]) * 105
      );
    };
    assert.ok(
      y(prep) < -8,
      "windup wrist is still below shoulder in view " + column + ": " + y(prep),
    );
    assert.ok(
      y(contact) - y(prep) > 18,
      "contact does not follow a readable downward arc in view " + column,
    );
  }
});

import { MovementFacing } from "../src/game/actorPose";
test("near-simultaneous diagonal key release retains heading while intentional cardinal movement still turns", () => {
  const facing = new MovementFacing();
  facing.press();
  assert.deepEqual(facing.sample(-1, -1, 100), { x: -1, y: -1 });
  facing.release(110);
  assert.deepEqual(facing.sample(0, -1, 125), { x: -1, y: -1 });
  facing.release(135);
  assert.deepEqual(facing.sample(0, 0, 220), { x: -1, y: -1 });
  facing.press();
  assert.deepEqual(facing.sample(1, -1, 230), { x: 1, y: -1 });
  facing.release(240);
  assert.deepEqual(facing.sample(0, -1, 295), { x: 0, y: -1 });
  facing.release(300);
  facing.press();
  assert.deepEqual(facing.sample(-1, 0, 310), { x: -1, y: 0 });
});

import { circleRing } from "../src/game/circleTessellation";
test("combat circles use cached low-cost rings without visible high-DPI contour loss", () => {
  for (const radius of [1, 2, 5, 12, 30, 64, 100, 200, 400, 800]) {
    const r = circleRing(radius),
      count = r.length / 2 - 1;
    assert.ok(radius * (1 - Math.cos(Math.PI / count)) <= 0.251);
    assert.equal(circleRing(radius), r);
    assert.ok(Math.abs(r[0] - r[r.length - 2]) < 1e-12);
    assert.ok(Math.abs(r[1] - r[r.length - 1]) < 1e-12);
  }
  assert.ok(
    circleRing(2).length / 2 - 1 <= 8,
    "tiny particle must not build a100-point polygon",
  );
});

import { arcSpan } from "../src/game/circleTessellation";
test("adaptive attack arcs preserve clockwise, anticlockwise and full-turn semantics", () => {
  const tau = Math.PI * 2;
  assert.equal(arcSpan(0, tau * 2), tau);
  assert.equal(arcSpan(0, -tau * 2, true), -tau);
  assert.ok(Math.abs(arcSpan(0, -Math.PI / 2) - Math.PI * 1.5) < 1e-12);
  assert.ok(Math.abs(arcSpan(0, Math.PI / 2, true) + Math.PI * 1.5) < 1e-12);
  assert.equal(arcSpan(1, 1), 0);
  assert.equal(arcSpan(1, 1, true), 0);
});
