import type { GameState } from "../shared/types";

const position = (value: number) => Math.round(value * 100) / 100;
const velocity = (value: number | undefined) =>
  value === undefined ? undefined : Math.round(value * 1000) / 1000;

/** Wire-only visual precision. Never round the authoritative simulation, health,
 * damage, cooldowns, identifiers or collision results. A hundredth of a world
 * pixel is below the renderer's visible resolution and compresses far better
 * than changing 16-digit floating-point tails on every entity every tick. */
export function transientSnapshot(state: GameState) {
  return {
    ...state,
    world: undefined,
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      x: position(enemy.x),
      y: position(enemy.y),
      angle: Math.round(enemy.angle * 10000) / 10000,
      vx: velocity(enemy.vx),
      vy: velocity(enemy.vy),
    })),
    bullets: state.bullets.map((bullet) => ({
      ...bullet,
      x: position(bullet.x),
      y: position(bullet.y),
      vx: velocity(bullet.vx)!,
      vy: velocity(bullet.vy)!,
    })),
    effects: state.effects.map((effect) => ({
      ...effect,
      x: position(effect.x),
      y: position(effect.y),
      toX: effect.toX === undefined ? undefined : position(effect.toX),
      toY: effect.toY === undefined ? undefined : position(effect.toY),
    })),
    pickups: state.pickups.map((pickup) => ({
      ...pickup,
      x: position(pickup.x),
      y: position(pickup.y),
    })),
  };
}
