export type SyncStatus =
  | "disconnected"
  | "unmeasured"
  | "fresh"
  | "late"
  | "stalled";
export type NetworkStreamSnapshot = {
  status: SyncStatus;
  transport: string;
  ageMs: number | null;
  snapshotHz: number | null;
  jitterMs: number | null;
  maxGapMs: number | null;
};
/** Arrival observations only. No packet-loss claim: volatile snapshots may be
 * intentionally skipped, and browser main-thread work can delay callbacks. */
export class NetworkStream {
  private connected = false;
  private expected = false;
  private waitingSince = 0;
  private transport = "unknown";
  private lastAt: number | null = null;
  private gaps: number[] = [];
  constructor(private readonly now: () => number = () => performance.now()) {}
  get sampleCount() {
    return this.gaps.length;
  }
  setConnected(value: boolean) {
    this.connected = value;
    this.transport = "unknown";
    this.reset();
  }
  setTransport(name: string) {
    this.transport = name;
  }
  expectState(expected: boolean) {
    if (this.expected === expected) return;
    this.expected = expected;
    this.reset();
  }
  reset() {
    this.waitingSince = this.now();
    this.lastAt = null;
    this.gaps.length = 0;
  }
  recordSnapshot() {
    if (!this.connected) return;
    this.expected = true;
    const now = this.now();
    if (this.lastAt !== null) {
      const gap = now - this.lastAt;
      if (gap > 1000) this.gaps.length = 0;
      else if (gap > 0) {
        this.gaps.push(gap);
        if (this.gaps.length > 32) this.gaps.shift();
      }
    }
    this.lastAt = now;
  }
  read(): NetworkStreamSnapshot {
    const ageMs =
      this.lastAt === null
        ? null
        : Math.max(0, Math.round(this.now() - this.lastAt));
    const status: SyncStatus = !this.connected
      ? "disconnected"
      : ageMs === null
        ? this.expected && this.now() - this.waitingSince >= 1000
          ? "stalled"
          : "unmeasured"
        : ageMs >= 1000
          ? "stalled"
          : ageMs >= 250
            ? "late"
            : "fresh";
    const mean =
      this.gaps.length >= 3
        ? this.gaps.reduce((a, b) => a + b, 0) / this.gaps.length
        : null;
    return {
      status,
      transport: this.transport,
      ageMs,
      snapshotHz:
        mean && status !== "stalled" ? Math.round(10000 / mean) / 10 : null,
      jitterMs: mean
        ? Math.round(
            this.gaps.reduce((sum, gap) => sum + Math.abs(gap - mean), 0) /
              this.gaps.length,
          )
        : null,
      maxGapMs: this.gaps.length ? Math.round(Math.max(...this.gaps)) : null,
    };
  }
}
