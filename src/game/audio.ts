let context: AudioContext | undefined;
const lastByKind = new Map<string, number>();
export function playSound(kind: string, enabled: boolean, volume: number) {
  if (!enabled || volume <= 0 || document.hidden) return;
  const now = performance.now();
  const spacing =
    kind === "step"
      ? 140
      : kind === "failure"
        ? 240
        : kind === "enemy-windup"
          ? 260
          : 75;
  if (now - (lastByKind.get(kind) ?? -999) < spacing) return;
  lastByKind.set(kind, now);
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const osc = context.createOscillator(),
      gain = context.createGain(),
      t = context.currentTime;
    const tune =
      kind === "enemy-windup"
        ? [280, 480, 0.13]
        : kind === "failure"
          ? [175, 110, 0.14]
          : kind === "critical"
            ? [880, 240, 0.13]
            : kind === "shield-break"
              ? [680, 95, 0.25]
              : kind === "shield-hit"
                ? [410, 200, 0.11]
                : kind === "player-hit"
                  ? [110, 38, 0.17]
                  : kind === "collect"
                    ? [600, 1100, 0.12]
                    : kind === "printer"
                      ? [180, 135, 0.25]
                      : kind === "scream"
                        ? [380, 120, 0.3]
                        : kind === "step"
                          ? [85, 65, 0.05]
                          : kind === "melee"
                            ? [145, 45, 0.12]
                            : kind === "ping"
                              ? [720, 520, 0.12]
                              : kind === "heal"
                                ? [400, 800, 0.22]
                                : kind === "skill"
                                  ? [220, 680, 0.22]
                                  : [120, 55, 0.09];
    osc.type = ["death", "melee", "step"].includes(kind)
      ? "triangle"
      : kind === "printer"
        ? "sawtooth"
        : "sine";
    osc.frequency.setValueAtTime(tune[0], t);
    osc.frequency.exponentialRampToValueAtTime(tune[1], t + tune[2]);
    gain.gain.setValueAtTime(volume * 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + tune[2]);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(t);
    osc.stop(t + tune[2]);
  } catch {
    /* Audio is optional when browser autoplay is unavailable. */
  }
}
