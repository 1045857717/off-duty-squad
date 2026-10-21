export function directionView(angle: number) {
  const dir = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
  return {
    dir,
    column:
      dir === 5
        ? 5
        : dir === 7
          ? 4
          : dir === 6
            ? 3
            : dir === 2
              ? 0
              : dir === 1 || dir === 3
                ? 1
                : 2,
    flip: dir === 3 || dir === 4,
    backTurn: 0,
  };
}
export function limbPose(
  phase: number,
  weight: number,
  time: number,
  fire = 0,
  cast = 0,
  assist = false,
) {
  const stride = Math.sin(phase) * weight,
    lift = Math.cos(phase) * weight;
  return {
    leftLeg: stride * 0.28,
    rightLeg: -stride * 0.28,
    leftFoot: Math.max(0, lift) * -2.3,
    rightFoot: Math.max(0, -lift) * -2.3,
    leftArm: -stride * 0.34 - fire * 0.4 - cast * 0.9 - (assist ? 0.65 : 0),
    rightArm: stride * 0.34 + fire * 0.55 + cast * 0.8 + (assist ? 0.75 : 0),
    bob:
      Math.cos(phase * 2) * weight * 0.7 +
      Math.sin(time * 0.002) * (1 - weight) * 0.6,
    breath: 1 + Math.sin(time * 0.002) * 0.008,
    head: Math.sin(time * 0.0017) * 0.013 + stride * 0.018,
    torso: -stride * 0.018,
  };
}
export function locomotionWeight(
  current: number,
  moving: boolean,
  deltaMs: number,
) {
  return (
    current +
    ((moving ? 1 : 0) - current) * (1 - Math.exp(-Math.max(0, deltaMs) / 85))
  );
}

export function windupProgress(
  remaining: number,
  total: number,
  snapshotAge: number,
) {
  return Math.max(
    0,
    Math.min(
      1,
      1 -
        Math.max(0, remaining - Math.max(0, snapshotAge)) /
          Math.max(0.01, total),
    ),
  );
}
