/** Preserves fractional frame credit so 144/165 caps do not collapse to 120 on 240Hz. */
export class FramePacer {
  private credit = 0;
  private elapsed = 0;
  constructor(private cap: number) {}
  sample(delta: number): number | null {
    const dt = Math.max(0, Math.min(100, Number.isFinite(delta) ? delta : 0));
    if (!this.cap) return dt;
    const interval = 1000 / this.cap;
    this.credit += dt;
    this.elapsed += dt;
    if (this.credit + 0.001 < interval) return null;
    // Keep up to four pending frames. Modulo discarded whole-frame credit when
    // a compositor delivered a late callback, collapsing 144 caps to 60/120.
    // The bound prevents an unbounded catch-up burst after tab suspension.
    this.credit = Math.min(interval * 4, Math.max(0, this.credit - interval));
    const elapsed = this.elapsed;
    this.elapsed = 0;
    return elapsed;
  }
}
