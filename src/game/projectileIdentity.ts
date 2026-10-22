import type { Bullet, Role } from "../../shared/types";
export const PROJECTILE_KINDS40 = [
  "pulse",
  "blade",
  "paper",
  "ricochet",
  "coin",
  "keycap",
  "energy",
  "frost",
  "venom",
  "flame",
  "drone",
  "seeker",
  "shooter",
  "wraith",
  "boss",
  "enemy",
  "card",
  "evidence",
  "report",
  "film",
  "cutter",
  "duck",
] as const;
export type ProjectileVisual = (typeof PROJECTILE_KINDS40)[number];
const BASIC: Partial<Record<Role, ProjectileVisual>> = {
  scout: "keycap",
  designer: "cutter",
  accountant: "coin",
  hr: "paper",
  sales: "card",
  creator: "film",
  lawyer: "evidence",
  intern: "paper",
  duck: "duck",
  qa: "report",
  investor: "coin",
  ppt: "paper",
};
const MODULE: Record<string, ProjectileVisual> = {
  pulse: "pulse",
  blade: "blade",
  ricochet: "ricochet",
  frost: "frost",
  venom: "venom",
  flame: "flame",
  drone: "drone",
  seeker: "seeker",
};
export function projectileVisual(
  b: Pick<Bullet, "attackSkill" | "enemy" | "basic" | "sourceEnemyKind">,
  owner?: Role,
): ProjectileVisual {
  if (b.enemy)
    return b.sourceEnemyKind === "shooter"
      ? "shooter"
      : b.sourceEnemyKind === "wraith"
        ? "wraith"
        : b.sourceEnemyKind === "boss"
          ? "boss"
          : "enemy";
  if (b.basic)
    return (
      (owner && BASIC[owner]) ||
      (b.attackSkill === "blade"
        ? "paper"
        : b.attackSkill === "ricochet"
          ? "coin"
          : "keycap")
    );
  if (b.attackSkill) return MODULE[b.attackSkill] || "energy";
  return owner && ["hr", "intern", "ppt"].includes(owner) ? "paper" : "energy";
}
