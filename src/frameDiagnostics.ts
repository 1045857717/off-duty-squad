/** Measurements from the existing browser callback / engine step, not display scanout. */
export type FrameDiagnosticsSnapshot = {
  /** Monotonic performance.now() timestamp at the end of this active window. */
  sampledAt: number;
  windowMs: number;
  /** Callbacks after the opening boundary; independent of the FramePacer gate. */
  callbackCount: number;
  callbackHz: number;
  /** Completed engine.step calls admitted by FramePacer, not GPU presentations. */
  renderedStepCount: number;
  renderedHz: number;
  callbackIntervalMeanMs: number;
  callbackIntervalP5Ms: number;
  callbackIntervalP95Ms: number;
  /** Synchronous time inside engine.step; excludes work between callbacks and GPU completion. */
  cpuStepMeanMs: number | null;
  cpuStepP95Ms: number | null;
  /** Percentiles use at most the latest 256 samples; counts and means cover the whole window. */
  callbackSampleCount: number;
  cpuSampleCount: number;
};

export type FrameSchedulingClassification = {
  kind: "insufficient-data" | "near-60" | "other";
  summary: string;
};

const WINDOW_MS = 1000;
const MAX_CALLBACK_GAP_MS = 1000;
const MAX_SAMPLES = 256;

function percentile(sorted: number[], fraction: number): number {
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

/** No clock, RAF, timer, or React updates: the owner supplies real observations. */
export class FrameDiagnostics {
  private startedAt: number | null = null;
  private previousAt: number | null = null;
  private callbackCount = 0;
  private renderedStepCount = 0;
  private cpuCount = 0;
  private cpuTotalMs = 0;
  private callbackIntervals: number[] = [];
  private cpuStepDurations: number[] = [];
  private canRecordStep = false;

  reset(): void {
    this.startedAt = null;
    this.previousAt = null;
    this.clearWindow();
  }

  /** Returns false when inactive, warming up, or restarting across an unknown gap. */
  recordCallback(now: number, active = true): boolean {
    this.canRecordStep = false;
    if (!active || !Number.isFinite(now)) {
      this.reset();
      return false;
    }
    const interval = this.previousAt === null ? null : now - this.previousAt;
    if (interval === null || interval < 0 || interval > MAX_CALLBACK_GAP_MS) {
      // Never turn a suspension (or an unexplained long gap) into a cadence estimate.
      this.reset();
      this.startedAt = now;
      this.previousAt = now;
      return false;
    }
    this.callbackIntervals[this.callbackCount % MAX_SAMPLES] = interval;
    this.callbackCount++;
    this.previousAt = now;
    this.canRecordStep = true;
    return true;
  }

  /** Call once after a completed engine.step, and never for a skipped pacer gate. */
  recordRenderedStep(cpuMs: number): void {
    if (!this.canRecordStep) return;
    this.canRecordStep = false;
    this.renderedStepCount++;
    if (!Number.isFinite(cpuMs) || cpuMs < 0) return;
    this.cpuStepDurations[this.cpuCount % MAX_SAMPLES] = cpuMs;
    this.cpuCount++;
    this.cpuTotalMs += cpuMs;
  }

  /** Publish at most once per active second, after recording this callback's step. */
  takeSnapshot(): FrameDiagnosticsSnapshot | null {
    if (this.startedAt === null || this.previousAt === null) return null;
    const windowMs = this.previousAt - this.startedAt;
    if (windowMs < WINDOW_MS || !this.callbackCount) return null;
    const intervals = this.callbackIntervals.slice().sort((a, b) => a - b);
    const cpu = this.cpuStepDurations.slice().sort((a, b) => a - b);
    const snapshot: FrameDiagnosticsSnapshot = {
      sampledAt: this.previousAt,
      windowMs,
      callbackCount: this.callbackCount,
      callbackHz: (this.callbackCount * 1000) / windowMs,
      renderedStepCount: this.renderedStepCount,
      renderedHz: (this.renderedStepCount * 1000) / windowMs,
      callbackIntervalMeanMs: windowMs / this.callbackCount,
      callbackIntervalP5Ms: percentile(intervals, 0.05),
      callbackIntervalP95Ms: percentile(intervals, 0.95),
      cpuStepMeanMs: this.cpuCount ? this.cpuTotalMs / this.cpuCount : null,
      cpuStepP95Ms: this.cpuCount ? percentile(cpu, 0.95) : null,
      callbackSampleCount: intervals.length,
      cpuSampleCount: cpu.length,
    };
    this.startedAt = this.previousAt;
    this.clearWindow();
    return snapshot;
  }

  private clearWindow(): void {
    this.callbackCount = 0;
    this.renderedStepCount = 0;
    this.cpuCount = 0;
    this.cpuTotalMs = 0;
    this.callbackIntervals.length = 0;
    this.cpuStepDurations.length = 0;
    this.canRecordStep = false;
  }
}

/** Describes observations only; neither monitor refresh nor network cause is measured here. */
export function classifyFrameScheduling(
  snapshot?: FrameDiagnosticsSnapshot | null,
): FrameSchedulingClassification {
  const limits =
    "Physical display refresh is unverified; a network cause cannot be inferred from these timings.";
  if (
    !snapshot ||
    !Number.isFinite(snapshot.windowMs) ||
    snapshot.windowMs < WINDOW_MS ||
    !Number.isFinite(snapshot.callbackHz) ||
    snapshot.callbackSampleCount < 30 ||
    !Number.isFinite(snapshot.callbackIntervalP5Ms) ||
    !Number.isFinite(snapshot.callbackIntervalP95Ms)
  )
    return {
      kind: "insufficient-data",
      summary:
        "Waiting for a complete active browser callback sample. " + limits,
    };
  if (
    snapshot.callbackHz >= 57 &&
    snapshot.callbackHz <= 63 &&
    snapshot.callbackCount >= 45 &&
    snapshot.callbackIntervalP5Ms >= 13 &&
    snapshot.callbackIntervalP95Ms <= 21
  )
    return {
      kind: "near-60",
      summary:
        "Observed browser scheduling is about 60 callbacks/s in this sample. " +
        limits,
    };
  return {
    kind: "other",
    summary:
      "Observed browser callbacks average " +
      Math.round(snapshot.callbackHz) +
      "/s in this sample; delivery may vary. " +
      limits,
  };
}
