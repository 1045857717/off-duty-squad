export const NETWORK_PROBE_INTERVAL_MS = 3000;
export const NETWORK_PROBE_TIMEOUT_MS = 2500;
// One scheduled probe plus its acknowledgement deadline.
export const NETWORK_STALE_MS =
  NETWORK_PROBE_INTERVAL_MS + NETWORK_PROBE_TIMEOUT_MS;

export type NetworkStatus =
  | "good"
  | "moderate"
  | "poor"
  | "unknown"
  | "disconnected"
  | "no-response";
export type NetworkHealthSnapshot = {
  status: NetworkStatus;
  rttMs: number | null;
};

/** Mutable probe data; readers choose their own publication rate. */
export class NetworkHealth {
  private connected = false;
  private serial = 0;
  private pending: { id: number; startedAt: number } | null = null;
  private sample: { rttMs: number; receivedAt: number } | null = null;
  private waitingSince = 0;
  private failed = false;

  constructor(private readonly now: () => number = () => performance.now()) {}

  setConnected(connected: boolean) {
    this.connected = connected;
    this.reset();
  }

  reset() {
    // Invalidate replies from a previous connection, visibility period or owner.
    this.serial++;
    this.pending = null;
    this.sample = null;
    this.failed = false;
    this.waitingSince = this.now();
  }

  beginProbe(): number | null {
    if (!this.connected || this.pending) return null;
    const id = ++this.serial;
    this.pending = { id, startedAt: this.now() };
    return id;
  }

  finishProbe(id: number, timedOut: boolean) {
    if (!this.connected || this.pending?.id !== id) return;
    const now = this.now();
    const elapsed = now - this.pending.startedAt;
    this.pending = null;
    this.failed = timedOut || elapsed >= NETWORK_PROBE_TIMEOUT_MS;
    this.sample = this.failed
      ? null
      : { rttMs: Math.max(1, Math.round(elapsed)), receivedAt: now };
  }

  read(): NetworkHealthSnapshot {
    if (!this.connected) return { status: "disconnected", rttMs: null };
    const now = this.now();
    if (
      this.failed ||
      (this.pending &&
        now - this.pending.startedAt >= NETWORK_PROBE_TIMEOUT_MS) ||
      now - (this.sample?.receivedAt ?? this.waitingSince) >= NETWORK_STALE_MS
    )
      return { status: "no-response", rttMs: null };
    if (!this.sample) return { status: "unknown", rttMs: null };
    const { rttMs } = this.sample;
    return {
      status: rttMs <= 100 ? "good" : rttMs <= 200 ? "moderate" : "poor",
      rttMs,
    };
  }
}
