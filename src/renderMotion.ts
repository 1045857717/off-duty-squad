import type { Vec, World } from "../shared/types";
import { MAP_WALLS } from "../shared/content";
import { moveWorld } from "../shared/world";
export function predictPosition(
  position: Vec,
  velocity: Vec,
  seconds: number,
  world?: World,
): Vec {
  const dt = Math.max(0, Math.min(0.1, Number.isFinite(seconds) ? seconds : 0));
  const result = { ...position };
  if (world) {
    moveWorld(world, result, velocity.x * dt, velocity.y * dt, 15);
    return result;
  }
  const dx = velocity.x * dt,
    dy = velocity.y * dt;
  const blocked = (x: number, y: number) =>
    MAP_WALLS.some(
      (w) =>
        x + 12 > w.x &&
        x - 12 < w.x + w.w &&
        y + 12 > w.y &&
        y - 12 < w.y + w.h,
    );
  if (!blocked(result.x + dx, result.y)) result.x += dx;
  if (!blocked(result.x, result.y + dy)) result.y += dy;
  return result;
}
export function predictDash(position: Vec, direction: Vec, world?: World): Vec {
  const len = Math.hypot(direction.x, direction.y);
  if (!len) return { ...position };
  let result = { ...position };
  for (let i = 0; i < 12; i++)
    result = predictPosition(
      result,
      { x: (direction.x / len) * 100, y: (direction.y / len) * 100 },
      0.1,
      world,
    );
  return result;
}
