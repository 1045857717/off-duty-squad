import fs from "node:fs/promises";
import { ROLES } from "../shared/content";
import { ROLE_BASICS, basicMetrics } from "../shared/basics";
import { ATTACK_MOTIONS, SIGNATURE_MOTIONS } from "../shared/combatProfiles";
import { skillMetrics } from "../shared/careers";
import { effectStamp } from "../src/game/combatGeometry";
import type { Role } from "../shared/types";
const rows = (Object.keys(ROLES) as Role[]).map((role) => {
  const b = basicMetrics(role, ROLES[role].damage),
    q = skillMetrics(role);
  return {
    role,
    name: ROLES[role].name,
    basic: {
      ...b,
      motion: ATTACK_MOTIONS[b.weapon].kind,
      contactMs: ATTACK_MOTIONS[b.weapon].duration * 0.3,
      displayTexture: "basic-tool-" + role,
    },
    signature: {
      name: ROLES[role].skill,
      ...q,
      motion: SIGNATURE_MOTIONS[q.ability],
      stamp: effectStamp({ kind: "skill", ability: q.ability } as any),
    },
  };
});
await fs.writeFile(
  "docs/combat-audit-4.0.json",
  JSON.stringify({ version: "4.0.0", roles: rows }, null, 2) + "\n",
);
const header =
  "# 职业攻击审查 / Profession combat audit\n\n由共享权威数据生成：npx tsx scripts/audit-combat40.ts。数值是未加随机增益的基础值；UI对伤害取整，实际模拟保留精度。每个职业普攻不占随机模块槽，Q保持独立。\n\n| 职业 | 普攻 | 方式 / 动作 | 基础伤害 | 范围 | 接触时刻 | 固定Q / 动作 / 反馈 |\n|---|---|---|---:|---:|---:|---|\n";
const body = rows
  .map(
    (r) =>
      "| " +
      r.name +
      " | " +
      r.basic.name +
      " | " +
      (r.basic.ranged ? "远程" : "近战") +
      " / " +
      r.basic.motion +
      " | " +
      r.basic.damage +
      " | " +
      r.basic.range +
      " | " +
      Math.round(r.basic.contactMs) +
      "ms | " +
      r.signature.name +
      " / " +
      r.signature.motion +
      " / " +
      r.signature.stamp +
      " |",
  )
  .join("\n");
await fs.writeFile(
  "docs/COMBAT-4.0.md",
  header +
    body +
    "\n\n八方向前扇区与转向蓄力回归：tests/combat-direction.test.ts、tests/basics.test.ts。真实14关节/手持工具/伤害：tests/browser-clarity.ts。实际八方向身体、握点和命中：tests/browser-art40.ts。敌人骨骼：tests/art40-rig-audit.mjs。\n",
);
console.log(
  "Audited",
  rows.length,
  "professions",
  Object.values(ROLE_BASICS).filter((b) => b.ranged).length,
  "ranged",
);
