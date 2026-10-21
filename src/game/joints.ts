import type { AttackId } from "../../shared/types";
import {
  ATTACK_MOTIONS,
  type AttackMotionKind,
} from "../../shared/combatProfiles";
export class AttackTimeline {
  private current: { id: AttackId; seq: number; at: number } | null = null;
  private pending: { id: AttackId; seq: number } | null = null;
  private lastSeq = -1;
  sample(id: AttackId | undefined, seq: number, time: number) {
    if (id && seq !== this.lastSeq) {
      this.lastSeq = seq;
      this.pending = { id, seq };
    }
    if (
      this.pending &&
      (!this.current ||
        time - this.current.at >= ATTACK_MOTIONS[this.current.id].duration)
    ) {
      this.current = { ...this.pending, at: time };
      this.pending = null;
    }
    const current = this.current,
      profile = current ? ATTACK_MOTIONS[current.id] : null,
      progress =
        current && profile
          ? Math.min(1, Math.max(0, (time - current.at) / profile.duration))
          : 1;
    const windup =
      progress < 0.23 ? Math.sin(((progress / 0.23) * Math.PI) / 2) : 0;
    const strike =
      progress >= 0.23 && progress < 0.58
        ? Math.sin(((progress - 0.23) / 0.35) * Math.PI)
        : 0;
    const recovery =
      progress >= 0.58 && progress < 1
        ? Math.sin((((1 - progress) / 0.42) * Math.PI) / 2)
        : 0;
    return {
      id: current?.id,
      kind: profile?.kind || ("shoot" as AttackMotionKind),
      progress,
      windup,
      strike,
      recovery,
      active: progress < 1,
    };
  }
}
export const JOINT_PARTS = [
  {
    name: "leftUpperLeg",
    rect: [0.29, 0.61, 0.21, 0.22],
    pivot: [0.43, 0.63],
    parent: "root",
  },
  {
    name: "leftShin",
    rect: [0.29, 0.79, 0.21, 0.17],
    pivot: [0.43, 0.81],
    parent: "leftUpperLeg",
  },
  {
    name: "leftFoot",
    rect: [0.29, 0.93, 0.21, 0.07],
    pivot: [0.43, 0.94],
    parent: "leftShin",
  },
  {
    name: "rightUpperLeg",
    rect: [0.5, 0.61, 0.21, 0.22],
    pivot: [0.57, 0.63],
    parent: "root",
  },
  {
    name: "rightShin",
    rect: [0.5, 0.79, 0.21, 0.17],
    pivot: [0.57, 0.81],
    parent: "rightUpperLeg",
  },
  {
    name: "rightFoot",
    rect: [0.5, 0.93, 0.21, 0.07],
    pivot: [0.57, 0.94],
    parent: "rightShin",
  },
  {
    name: "leftUpperArm",
    rect: [0.06, 0.28, 0.24, 0.21],
    pivot: [0.28, 0.32],
    parent: "torso",
  },
  {
    name: "leftForearm",
    rect: [0.06, 0.46, 0.24, 0.16],
    pivot: [0.2, 0.48],
    parent: "leftUpperArm",
  },
  {
    name: "leftHand",
    rect: [0.06, 0.59, 0.24, 0.07],
    pivot: [0.14, 0.6],
    parent: "leftForearm",
  },
  {
    name: "torso",
    rect: [0.285, 0.27, 0.43, 0.38],
    pivot: [0.5, 0.5],
    parent: "root",
  },
  {
    name: "rightUpperArm",
    rect: [0.7, 0.28, 0.24, 0.21],
    pivot: [0.72, 0.32],
    parent: "torso",
  },
  {
    name: "rightForearm",
    rect: [0.7, 0.46, 0.24, 0.16],
    pivot: [0.8, 0.48],
    parent: "rightUpperArm",
  },
  {
    name: "rightHand",
    rect: [0.7, 0.59, 0.24, 0.07],
    pivot: [0.86, 0.6],
    parent: "rightForearm",
  },
  { name: "head", rect: [0, 0, 1, 0.29], pivot: [0.5, 0.285], parent: "torso" },
] as const;
export function articulatedPose(
  phase: number,
  weight: number,
  time: number,
  motion: ReturnType<AttackTimeline["sample"]>,
  cast: number,
  assist: boolean,
) {
  const step = Math.sin(phase) * weight,
    lift = Math.cos(phase) * weight;
  const prep = motion.windup,
    recoil = motion.recovery,
    hit = motion.strike,
    kind = motion.kind;
  let left = -step * 0.28,
    right = step * 0.28,
    elbowL = 0.05,
    elbowR = -0.05,
    torso = -step * 0.018;
  if (motion.active) {
    if (kind === "shoot") {
      right -= 0.42 + prep * 0.24 + hit * 0.35;
      left -= 0.25;
      elbowR = -0.58 + hit * 0.25;
      elbowL = 0.25;
      torso += hit * 0.04;
    }
    if (kind === "slash" || kind === "sweep") {
      left += prep * 0.55 - hit * 0.9 + recoil * 0.16;
      right -= prep * 0.55 - hit * 0.95 + recoil * 0.16;
      elbowL = 0.36 + prep * 0.23;
      elbowR = -0.42 - prep * 0.22;
      torso += prep * 0.09 - hit * 0.14;
    }
    if (kind === "overhead") {
      left -= prep * 0.85 + hit * 0.45;
      right += prep * 0.85 + hit * 0.45;
      elbowL = 0.55 + prep * 0.3;
      elbowR = -0.55 - prep * 0.3;
      torso += hit * 0.13;
    }
    if (kind === "throw") {
      right += prep * 0.62 - hit * 1.25;
      left -= hit * 0.3;
      elbowR = -prep * 0.65 + hit * 0.15;
      torso += prep * 0.04 - hit * 0.08;
    }
    if (kind === "channel" || kind === "summon") {
      left -= 0.38 + hit * 0.5;
      right += 0.38 + hit * 0.5;
      elbowL = 0.25 + prep * 0.3;
      elbowR = -0.25 - prep * 0.3;
    }
  }
  const rawBlend = motion.active
      ? Math.max(
          0,
          Math.min(1, motion.progress / 0.18, (1 - motion.progress) / 0.25),
        )
      : 0,
    blend = rawBlend * rawBlend * (3 - 2 * rawBlend);
  left = -step * 0.28 + (left + step * 0.28) * blend;
  right = step * 0.28 + (right - step * 0.28) * blend;
  elbowL = 0.05 + (elbowL - 0.05) * blend;
  elbowR = -0.05 + (elbowR + 0.05) * blend;
  torso = -step * 0.018 + (torso + step * 0.018) * blend;
  left -= cast * 0.8 + (assist ? 0.55 : 0);
  right += cast * 0.8 + (assist ? 0.55 : 0);
  elbowL += cast * 0.35;
  elbowR -= cast * 0.35;
  return {
    leftUpperLeg: step * 0.25,
    rightUpperLeg: -step * 0.25,
    leftShin: Math.max(0, lift) * 0.42,
    rightShin: Math.max(0, -lift) * 0.42,
    leftFoot: -Math.max(0, lift) * 0.28,
    rightFoot: -Math.max(0, -lift) * 0.28,
    leftUpperArm: left,
    leftForearm: elbowL,
    leftHand: hit * 0.15,
    rightUpperArm: right,
    rightForearm: elbowR,
    rightHand: -hit * 0.15,
    torso,
    head: Math.sin(time * 0.0017) * 0.012 + step * 0.014 - cast * 0.035,
    bob:
      Math.cos(phase * 2) * weight * 0.7 +
      Math.sin(time * 0.002) * (1 - weight) * 0.6 +
      hit * 0.8,
    breath: 1 + Math.sin(time * 0.002) * 0.006,
  };
}
