import type { Vec } from "../shared/types";

type View = { x: number; y: number; width: number; height: number };
/** Conservative bounds include limbs, shadows and fast projectiles crossing an edge. */
export function inViewport(p: Vec, view: View, margin: number) {
  return (
    p.x >= view.x - margin &&
    p.x <= view.x + view.width + margin &&
    p.y >= view.y - margin &&
    p.y <= view.y + view.height + margin
  );
}

type Sample = Vec & { time: number };
/** Small authoritative history, sampled 50ms behind server time. Local input
 * prediction never uses this buffer. Missing packets hold the last known position; resets/teleports snap rather than inventing movement through walls. */
export class RemoteMotion {
  private samples: Sample[] = [];
  get size() {
    return this.samples.length;
  }
  clear() {
    this.samples.length = 0;
  }
  push(p: Vec, time: number) {
    const last = this.samples.at(-1);
    if (last && time <= last.time) return;
    if (
      last &&
      (time - last.time > 0.25 || Math.hypot(p.x - last.x, p.y - last.y) > 140)
    )
      this.clear();
    this.samples.push({ x: p.x, y: p.y, time });
    if (this.samples.length > 6) this.samples.shift();
  }
  sample(time: number): Vec {
    const first = this.samples[0];
    if (!first) return { x: 0, y: 0 };
    if (time <= first.time) return { x: first.x, y: first.y };
    for (let i = 1; i < this.samples.length; i++) {
      const b = this.samples[i];
      if (time <= b.time) {
        const a = this.samples[i - 1],
          t = (time - a.time) / (b.time - a.time);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }
    const last = this.samples.at(-1)!;
    return { x: last.x, y: last.y };
  }
}

/** Arrival jitter must not move the playout clock backwards when a late packet
 * replaces an extrapolated position. Each new match resets this clock. */
export class RemoteClock {
  private time = -Infinity;
  private serverTime = -Infinity;
  reset() {
    this.time = this.serverTime = -Infinity;
  }
  advance(elapsed: number, age: number) {
    if (elapsed < this.serverTime) this.reset();
    this.serverTime = elapsed;
    this.time = Math.max(
      this.time,
      elapsed + Math.max(0, Math.min(0.075, age)) - 0.05,
    );
    return this.time;
  }
}
