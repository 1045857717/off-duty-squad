import type { GameState } from "./types";
export const BALANCE = {
  enemyHp: 1.9,
  healDrop: 0.03,
  nightmareHealDrop: 0.015,
  healCap: 6,
  healAmount: 18,
  initialXp: 180,
  levelInterval: 16,
  normalParts: 2,
  eliteParts: 7,
  bossParts: 60,
  crystalParts: 5,
  waveParts: 35,
};
export function squadPressure(s: GameState) {
  const n = Math.max(1, s.teamPeak || 0, s.players.length);
  return { size: n, hp: n, damage: 1 + (n - 1) * 0.15, spawn: Math.sqrt(n) };
}
export function ledger(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}
export function whole(value: number) {
  return Math.max(
    0,
    Math.round(Number.isFinite(value) ? value : 0),
  ).toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}
