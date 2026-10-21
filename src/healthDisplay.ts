const finite = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (value: number) => Math.max(0, Math.min(1, finite(value)));
export function healthReadout(
  hp: number,
  maxHp: number,
  shield: number,
  shieldCap: number,
  alive = true,
) {
  const maximum = Math.max(1, finite(maxHp, 100));
  const life = alive ? Math.max(0, Math.min(maximum, finite(hp))) : 0;
  const armor = Math.max(0, finite(shield));
  const ratio = clamp(life / maximum);
  const status = !alive
    ? "down"
    : ratio <= 0.25
      ? "critical"
      : ratio <= 0.5
        ? "wounded"
        : "healthy";
  return {
    hp: Math.ceil(life),
    maxHp: Math.ceil(maximum),
    ratio,
    shield: Math.ceil(armor),
    shieldRatio: clamp(armor / Math.max(1, armor, finite(shieldCap))),
    status,
    color:
      status === "critical"
        ? 0xff6f62
        : status === "wounded"
          ? 0xf4bf62
          : 0x83e0ae,
  };
}
/** Frame-rate-independent recent damage trail. Healing must never look like damage. */
export class VitalTrail {
  private target = 1;
  private value = 1;
  private last = -1;
  private holdUntil = 0;
  sample(ratio: number, time: number) {
    ratio = clamp(ratio);
    if (this.last < 0 || ratio > this.target) this.value = ratio;
    else if (ratio < this.target) {
      this.value = Math.max(this.value, this.target);
      this.holdUntil = time + 340;
    }
    const elapsed = Math.max(0, time - Math.max(this.last, this.holdUntil));
    if (time > this.holdUntil)
      this.value += (ratio - this.value) * (1 - Math.exp(-elapsed / 240));
    this.target = ratio;
    this.last = time;
    this.value = Math.max(ratio, clamp(this.value));
    return this.value;
  }
}
