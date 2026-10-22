import type { EnemyKind } from "./types";
/** Wave pressure grows after players have had time to form a build. Peak squad
 * size is retained by the caller, preventing leave/rejoin difficulty exploits. */
export function survivalCurve(wave: number, players: number) {
  const w = Math.max(1, Math.floor(wave)),
    n = Math.max(1, Math.min(4, players));
  const age = w - 1;
  return {
    health:
      0.7 +
      age * 0.09 +
      Math.max(0, w - 4) * 0.055 +
      Math.pow(Math.max(0, w - 10), 1.22) * 0.025,
    teamHp: 1 + (n - 1) * (0.18 + Math.min(0.18, age * 0.018)),
    damage: 1 + age * 0.055 + Math.max(0, w - 10) * 0.035,
    speed: 0.85 + Math.min(0.9, age * 0.035),
    interval: Math.max(0.28, 2.05 - age * 0.09),
    spawn: 1 + (n - 1) * 0.28,
    batch: Math.min(
      7,
      1 + Math.floor(age / 4) + (w >= 4 ? Math.floor((n - 1) / 2) : 0),
    ),
    eliteChance: w < 4 ? 0 : Math.min(0.3, 0.025 + (w - 4) * 0.012),
    target: Math.round((22 + age * 7) * (1 + (n - 1) * 0.55)),
  };
}
export function survivalEnemy(wave: number, roll: number): EnemyKind {
  const pool: [EnemyKind, number][] = [
    ["mite", 60],
    ["hound", 30],
  ];
  if (wave >= 2) pool.push(["shooter", 16]);
  if (wave >= 3) pool.push(["bomber", 14]);
  if (wave >= 4) pool.push(["tank", 20]);
  if (wave >= 6) pool.push(["wraith", 18]);
  let value =
    Math.max(0, Math.min(0.999999, roll)) *
    pool.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [kind, weight] of pool) {
    value -= weight;
    if (value < 0) return kind;
  }
  return "hound";
}
