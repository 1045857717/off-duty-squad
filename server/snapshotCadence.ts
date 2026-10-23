type Load = {
  phase: string;
  enemies: readonly unknown[];
  bullets: readonly unknown[];
  effects: readonly unknown[];
};
/** Simulation remains 60Hz. Give dense visual snapshots a bounded 20Hz wire
 * budget; local prediction and 50ms remote interpolation fill rendered frames.
 * Three seconds of hysteresis avoid thrashing near the entity thresholds.
 * Join/resume/action replies and reliable world changes bypass this scheduler. */
export class SnapshotCadence {
  private lastSent = -Infinity;
  private lastHeavy = -Infinity;
  due(frame: number, state: Load) {
    if (
      state.phase === "playing" &&
      (state.enemies.length >= 100 ||
        state.bullets.length >= 200 ||
        state.effects.length >= 150)
    )
      this.lastHeavy = frame;
    const interval =
      state.phase === "playing" && frame - this.lastHeavy < 180 ? 3 : 2;
    if (frame - this.lastSent < interval) return false;
    this.lastSent = frame;
    return true;
  }
}
