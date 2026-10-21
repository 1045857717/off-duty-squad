import type { AttackId, Player } from "./types";
import { ATTACK_IDS, ATTACKS } from "./arsenal";
export const PROJECTILE_ATTACKS: AttackId[] = [
  "pulse",
  "frost",
  "blade",
  "drone",
  "seeker",
];
export const MAX_MODULES = 4;
export const ATTACK_BRANCHES: Record<AttackId, AttackId[]> = {
  pulse: ["frost", "drone", "ricochet"],
  arc: ["gravity", "ricochet"],
  frost: ["flame", "pulse"],
  blade: ["orbit", "frost"],
  orbit: ["blade", "gravity"],
  meteor: ["flame", "venom"],
  venom: ["gravity", "meteor"],
  drone: ["seeker", "pulse"],
  flame: ["meteor", "frost"],
  seeker: ["drone", "arc"],
  gravity: ["arc", "venom"],
  ricochet: ["pulse", "arc"],
  bat: ["wrench", "mop"],
  mop: ["orbit", "venom"],
  wrench: ["bat", "arc"],
  coffee: ["flame", "meteor"],
};
export const upgradeCount = (p: Player, id: string) =>
  p.upgrades.filter((v) => v === id).length;
export const hasProjectile = (p: Player) =>
  PROJECTILE_ATTACKS.some((id) => (p.arsenal[id] || 0) > 0);
export function branchRequirement(p: Player, id: AttackId, level: number) {
  if (p.arsenal[id]) return null;
  if (Object.keys(p.arsenal).length >= MAX_MODULES)
    return `已装配${MAX_MODULES}个模块，继续强化已有分支`;
  const parents = ATTACK_IDS.filter((parent) =>
    ATTACK_BRANCHES[parent].includes(id),
  );
  const unlocked = parents.find((parent) => (p.arsenal[parent] || 0) >= 3);
  if (!unlocked)
    return `${parents.map((parent) => ATTACKS[parent].name + " Lv.3").join(" / ")} 解锁`;
  if (level < 4) return "小队 Lv.4 解锁进阶分支";
  return null;
}
export function attackAvailable(p: Player, id: AttackId, level: number) {
  return !branchRequirement(p, id, level);
}
export function augmentAvailable(
  p: Player,
  id: string,
  level: number,
  teamSize: number,
) {
  const n = upgradeCount(p, id),
    top = Math.max(0, ...Object.values(p.arsenal));
  if (["multishot", "pierce"].includes(id) && !hasProjectile(p)) return false;
  if (id === "multishot") return p.projectiles < 7;
  if (id === "pierce") return n < 5;
  if (id === "rate") return p.rate > 0.065 && n < 8;
  if (id === "speed") return (p.speed < 390 || n < 9) && n < 9;
  if (id === "cooldown") return p.cooldownScale > 0.3 && n < 7;
  if (id === "crit") return top >= 2 && n < 5;
  if (id === "regen")
    return (upgradeCount(p, "health") > 0 || level >= 4) && n < 5;
  if (id === "vampire")
    return level >= 5 && upgradeCount(p, "damage") >= 2 && p.lifesteal < 0.18;
  if (id === "thorns")
    return (p.role === "guardian" || p.shieldCap > 0) && n < 5;
  if (id === "orbiting")
    return (
      ((p.arsenal.orbit || 0) >= 2 || (p.arsenal.blade || 0) >= 3) && n < 3
    );
  if (id === "explosive")
    return (
      ((p.arsenal.meteor || 0) >= 3 || (p.arsenal.flame || 0) >= 3) && n < 3
    );
  if (id === "dashfire")
    return (
      (upgradeCount(p, "speed") > 0 || (p.arsenal.flame || 0) >= 2) && n < 3
    );
  if (id === "execution")
    return top >= 4 && upgradeCount(p, "crit") > 0 && n < 3;
  if (id === "guardian")
    return (
      teamSize > 1 &&
      (p.role === "medic" ||
        p.role === "guardian" ||
        upgradeCount(p, "shield") > 0) &&
      n < 3
    );
  if (id === "shield")
    return (
      (p.role === "guardian" || upgradeCount(p, "health") > 0 || level >= 3) &&
      n < 6
    );
  if (id === "bloodpact")
    return level >= 5 && top >= 3 && n < 3 && p.rate > 0.065;
  if (id === "glass") return level >= 5 && top >= 3 && n < 3;
  if (id === "damage" || id === "health") return true;
  return n < 10;
}
export function growthPath(p: Player, id: string) {
  if (id.startsWith("attack:")) {
    const key = id.slice(7) as AttackId;
    if (p.arsenal[key]) return `${ATTACKS[key].element}主干 / 已习得升级`;
    const parent = ATTACK_IDS.find(
      (k) => (p.arsenal[k] || 0) >= 3 && ATTACK_BRANCHES[k].includes(key),
    );
    return `${parent ? ATTACKS[parent].name : "起始攻击"} → ${ATTACKS[key].name}`;
  }
  return (
    {
      multishot: "投射主干 → 分裂弹舱",
      pierce: "投射主干 → 钨芯贯穿",
      orbiting: "旋刃 Lv.3 / 刃环 Lv.2 → 游离刃环",
      explosive: "烈焰 / 陨击 Lv.3 → 尸爆协议",
      dashfire: "机动 / 烈焰 → 燎原引擎",
      execution: "攻击 Lv.4 + 暴击 → 终结者",
      guardian: "多人协作 → 战地纽带",
      vampire: "小队 Lv.5 + 伤害 Lv.2 → 猩红回路",
      signature: "职业核心 → 专属 Q 增幅",
    }[id] || "基础属性 → 累积成长"
  );
}
