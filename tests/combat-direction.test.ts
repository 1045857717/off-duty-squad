import test from "node:test";
import assert from "node:assert/strict";
import {
  meleeRibbon,
  effectStamp,
  FX_FORWARD,
} from "../src/game/combatGeometry";
import { ROLE_BASICS } from "../shared/basics";
import { ROLES } from "../shared/content";
import type { Role } from "../shared/types";

test("melee ribbons stay inside the hit sector in all eight directions throughout a swing", () => {
  for (let d = 0; d < 8; d++)
    for (let step = 0; step <= 20; step++) {
      const a = (d * Math.PI) / 4,
        points = meleeRibbon(a, 140, step / 20);
      for (const point of points) {
        const forward = point.x * Math.cos(a) + point.y * Math.sin(a);
        assert.ok(forward > 0, d + " backwards slash " + step);
        assert.ok(Math.hypot(point.x, point.y) <= 140.001);
        const diff = Math.atan2(
          Math.sin(Math.atan2(point.y, point.x) - a),
          Math.cos(Math.atan2(point.y, point.x) - a),
        );
        assert.ok(Math.abs(diff) <= 1.05 + 1e-8);
      }
    }
  assert.equal(FX_FORWARD, 0, "new artwork uses +X as its authored heading");
});
test("radial, shield and summons never fall through to a directional slash stamp", () => {
  for (const ability of ["nova", "wok", "takeblame", "crunch", "pie"])
    assert.equal(effectStamp({ kind: "skill", ability } as any), "impact");
  for (const ability of ["aegis", "injunction"])
    assert.equal(effectStamp({ kind: "skill", ability } as any), "shield");
  for (const ability of ["mend", "supply", "paidbreak"])
    assert.equal(effectStamp({ kind: "skill", ability } as any), "heal");
  assert.equal(
    effectStamp({ kind: "skill", ability: "reaper" } as any),
    "orbit",
  );
  assert.equal(
    effectStamp({ kind: "skill", attackSkill: "blade" } as any),
    "slash",
  );
  assert.equal(
    effectStamp({ kind: "attack", attackSkill: "bat", owner: "p" } as any),
    null,
  );
});
test("every profession has a consistent ranged or melee basic with a meaningful reachable range", () => {
  for (const role of Object.keys(ROLES) as Role[]) {
    const b = ROLE_BASICS[role];
    assert.equal(
      b.ranged,
      ["pulse", "blade", "ricochet"].includes(b.weapon),
      role,
    );
    assert.ok(b.range >= (b.ranged ? 500 : 100));
    assert.ok(b.range <= (b.ranged ? 600 : 170));
  }
});

import { projectileVisual } from "../src/game/projectileIdentity";
test("ordinary and module projectiles preserve physical identities even with the same underlying attack id", () => {
  assert.equal(
    projectileVisual(
      { attackSkill: "pulse", basic: true, enemy: false } as any,
      "scout",
    ),
    "keycap",
  );
  assert.equal(
    projectileVisual({ attackSkill: "pulse", enemy: false } as any, "scout"),
    "pulse",
  );
  assert.equal(
    projectileVisual(
      { attackSkill: "blade", basic: true, enemy: false } as any,
      "hr",
    ),
    "paper",
  );
  assert.equal(
    projectileVisual({ attackSkill: "blade", enemy: false } as any, "hr"),
    "blade",
  );
  assert.equal(
    projectileVisual(
      { attackSkill: "ricochet", basic: true, enemy: false } as any,
      "investor",
    ),
    "coin",
  );
  assert.equal(
    projectileVisual(
      { attackSkill: "ricochet", enemy: false } as any,
      "investor",
    ),
    "ricochet",
  );
  for (const kind of ["frost", "seeker", "drone", "venom", "flame"] as const)
    assert.equal(
      projectileVisual({ attackSkill: kind, enemy: false } as any, "scout"),
      kind,
    );
});
