import type { AttackId } from "../../shared/types";
import {
  ATTACK_MOTIONS,
  type AttackMotionKind,
} from "../../shared/combatProfiles";
/** Smooth, overlapping anticipation/contact/recovery envelopes; no phase-boundary snaps. */
const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export class AttackTimeline {
  private current: { id: AttackId; seq: number; at: number } | null = null;
  private pending: {
    id: AttackId;
    seq: number;
    at: number;
    queued: boolean;
  } | null = null;
  private lastSeq = -1;
  sample(id: AttackId | undefined, seq: number, time: number, sourceAgeMs = 0) {
    if (id && seq !== this.lastSeq) {
      this.lastSeq = seq;
      const age = Number.isFinite(sourceAgeMs) ? Math.max(0, sourceAgeMs) : 0;
      if (age < ATTACK_MOTIONS[id].duration)
        this.pending = {
          id,
          seq,
          at: time - age,
          queued:
            !!this.current &&
            time - this.current.at < ATTACK_MOTIONS[this.current.id].duration,
        };
    }
    if (
      this.pending &&
      (!this.current ||
        time - this.current.at >= ATTACK_MOTIONS[this.current.id].duration)
    ) {
      const { queued, ...next } = this.pending;
      this.current = queued
        ? { ...next, at: time }
        : time - next.at < ATTACK_MOTIONS[next.id].duration
          ? next
          : null;
      this.pending = null;
    }
    const current = this.current;
    const profile = current ? ATTACK_MOTIONS[current.id] : null;
    const progress =
      current && profile
        ? Math.min(1, Math.max(0, (time - current.at) / profile.duration))
        : 1;
    return {
      id: current?.id,
      kind: profile?.kind || ("shoot" as AttackMotionKind),
      progress,
      windup: smooth(0, 0.2, progress) * (1 - smooth(0.2, 0.34, progress)),
      strike: smooth(0.18, 0.32, progress) * (1 - smooth(0.45, 0.68, progress)),
      recovery: smooth(0.45, 0.68, progress) * (1 - smooth(0.78, 1, progress)),
      active: progress < 1,
    };
  }
}
export type AttackFrame = ReturnType<AttackTimeline["sample"]>;
export function enemyAttackFrame(
  kind: AttackMotionKind,
  charge: number,
  age: number,
): AttackFrame {
  const preparing = charge > 0;
  const active = preparing || (age >= 0 && age < 0.58);
  return {
    id: undefined,
    kind,
    active,
    progress: preparing
      ? charge * 0.2
      : active
        ? 0.2 + Math.min(1, age / 0.58) * 0.8
        : 1,
    windup: preparing
      ? Math.sin((charge * Math.PI) / 2)
      : active
        ? 1 - smooth(0, 0.18, age)
        : 0,
    strike:
      active && !preparing
        ? smooth(0, 0.12, age) * (1 - smooth(0.2, 0.34, age))
        : 0,
    recovery:
      active && !preparing
        ? smooth(0.2, 0.34, age) * (1 - smooth(0.4, 0.58, age))
        : 0,
  };
}

/** Select the weapon from the animation actually being rendered, not a newer network packet. */
export function visibleAttack(
  frame: AttackFrame,
  arsenal: Partial<Record<AttackId, number>>,
  basic?: AttackId,
) {
  return frame.id && (arsenal[frame.id] || frame.id === basic)
    ? frame.id
    : basic ||
        (Object.keys(arsenal).find((id) => arsenal[id as AttackId]) as
          | AttackId
          | undefined);
}
export function weaponPose(frame: AttackFrame, facing: number) {
  const { windup: prep, strike: hit, recovery, kind } = frame;
  const side = Math.cos(facing) < 0 ? -1 : 1;
  const phase = frame.progress;
  const swing =
    phase < 0.16
      ? -0.95 * smooth(0, 0.16, phase)
      : phase < 0.48
        ? -0.95 + 1.85 * smooth(0.16, 0.48, phase)
        : 0.9 * (1 - smooth(0.48, 1, phase));
  const up = Math.atan2(
    Math.sin(-Math.PI / 2 - facing),
    Math.cos(-Math.PI / 2 - facing),
  );
  const offset = !frame.active
    ? 0
    : kind === "slash" || kind === "sweep"
      ? swing * side
      : kind === "overhead"
        ? up * prep * (1 - hit)
        : kind === "throw"
          ? (-prep * 0.65 + hit * 0.18) * side
          : kind === "shoot"
            ? -hit * 0.075 * side
            : (-prep * 0.15 + hit * 0.2) * side;
  return {
    rotation: facing + offset,
    scale: 0.82,
    recoil: kind === "shoot" ? hit * 6.8 : 0,
    trail:
      frame.active &&
      ["slash", "sweep", "overhead", "throw"].includes(kind) &&
      hit > 0.08,
  };
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

export type RigGeometry = {
  rect: [number, number, number, number];
  pivot: [number, number];
  tip?: [number, number];
  radius?: number;
  polygon?: [number, number][];
};
/** Direction-specific painted anatomy; the old universal outer-edge crops contained transparent pixels. */
export function rigPartGeometry(
  column: number,
  name: string,
  model = "developer",
): RigGeometry {
  const side = column === 2;
  const horse = model === "workhorse";
  const spread = ["chef", "security"].includes(model) ? 1.1 : 1;
  const adjust = (p: [number, number]): [number, number] => [
    0.5 + (p[0] - 0.5) * spread,
    p[1] + (horse && p[1] < 0.64 ? 0.045 : 0),
  ];
  const points: Record<string, [number, number]> =
    column === 2
      ? {
          leftUpperArm: [0.51, 0.27],
          leftForearm: [0.51, 0.42],
          leftHand: [0.51, 0.565],
          rightUpperArm: [0.455, 0.27],
          rightForearm: [0.44, 0.42],
          rightHand: [0.435, 0.565],
          leftUpperLeg: [0.52, 0.57],
          leftShin: [0.5, 0.78],
          leftFoot: [0.48, 0.94],
          rightUpperLeg: [0.49, 0.57],
          rightShin: [0.48, 0.78],
          rightFoot: [0.47, 0.94],
        }
      : column === 1 || column === 4
        ? {
            leftUpperArm: [0.395, 0.265],
            leftForearm: [0.37, 0.415],
            leftHand: [0.36, 0.565],
            rightUpperArm: [0.59, 0.265],
            rightForearm: [0.64, 0.42],
            rightHand: [0.65, 0.565],
            leftUpperLeg: [0.455, 0.565],
            leftShin: [0.435, 0.78],
            leftFoot: [0.425, 0.94],
            rightUpperLeg: [0.545, 0.565],
            rightShin: [0.575, 0.78],
            rightFoot: [0.595, 0.94],
          }
        : column === 5
          ? {
              leftUpperArm: [0.605, 0.265],
              leftForearm: [0.63, 0.415],
              leftHand: [0.64, 0.565],
              rightUpperArm: [0.41, 0.265],
              rightForearm: [0.36, 0.42],
              rightHand: [0.35, 0.565],
              leftUpperLeg: [0.545, 0.565],
              leftShin: [0.565, 0.78],
              leftFoot: [0.575, 0.94],
              rightUpperLeg: [0.455, 0.565],
              rightShin: [0.425, 0.78],
              rightFoot: [0.405, 0.94],
            }
          : {
              leftUpperArm: [0.4, 0.265],
              leftForearm: [0.335, 0.415],
              leftHand: [0.29, 0.565],
              rightUpperArm: [0.6, 0.265],
              rightForearm: [0.665, 0.415],
              rightHand: [0.71, 0.565],
              leftUpperLeg: [0.455, 0.565],
              leftShin: [0.415, 0.78],
              leftFoot: [0.395, 0.94],
              rightUpperLeg: [0.545, 0.565],
              rightShin: [0.585, 0.78],
              rightFoot: [0.605, 0.94],
            };
  if (name === "head")
    return {
      rect: horse ? [0.14, 0, 0.74, 0.345] : [0.27, 0, 0.46, 0.285],
      pivot: [0.5, horse ? 0.315 : 0.265],
    };
  if (name === "torso") {
    const polygon: [number, number][] = (
      side
        ? [
            [0.425, 0.255],
            [0.595, 0.255],
            [0.59, 0.605],
            [0.42, 0.605],
          ]
        : [
            [0.395, 0.255],
            [0.605, 0.255],
            [0.625, 0.6],
            [0.375, 0.6],
          ]
    ).map((p) => adjust(p as [number, number]));
    return {
      rect: [side ? 0.38 : 0.32, 0.23, side ? 0.26 : 0.36, horse ? 0.43 : 0.39],
      pivot: [0.5, 0.5],
      polygon,
    };
  }
  const raw = points[name];
  if (!raw) throw new Error("Unknown rig part: " + name);
  const pivot = adjust(raw);
  const next = name.endsWith("UpperArm")
    ? name.replace("UpperArm", "Forearm")
    : name.endsWith("Forearm")
      ? name.replace("Forearm", "Hand")
      : name.endsWith("UpperLeg")
        ? name.replace("UpperLeg", "Shin")
        : name.endsWith("Shin")
          ? name.replace("Shin", "Foot")
          : "";
  const tip: [number, number] = next
    ? adjust(points[next])
    : [
        pivot[0] +
          (name.endsWith("Foot")
            ? side
              ? 0.065
              : name.startsWith("left")
                ? -0.025
                : 0.025
            : 0),
        Math.min(0.985, pivot[1] + (name.endsWith("Hand") ? 0.047 : 0.04)),
      ];
  const radius = name.endsWith("UpperArm")
    ? 0.052
    : name.endsWith("Forearm")
      ? 0.038
      : name.endsWith("Hand")
        ? 0.033
        : name.endsWith("Foot")
          ? 0.065
          : 0.064;
  const x = Math.max(0, Math.min(pivot[0], tip[0]) - radius),
    y = Math.max(0, Math.min(pivot[1], tip[1]) - radius * 0.8);
  return {
    rect: [
      x,
      y,
      Math.min(1, Math.max(pivot[0], tip[0]) + radius) - x,
      Math.min(1, Math.max(pivot[1], tip[1]) + radius * 0.8) - y,
    ],
    pivot,
    tip,
    radius,
  };
}

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
      right -= 0.48 + prep * 0.34 - hit * 0.11;
      left -= 0.3 + prep * 0.12;
      elbowR = -0.68 - hit * 0.2;
      elbowL = 0.25;
      torso += prep * 0.035 - hit * 0.065;
    }
    if (kind === "slash" || kind === "sweep") {
      left += prep * 0.92 - hit * 1.25 + recoil * 0.16;
      right -= prep * 1.0 - hit * 1.45 + recoil * 0.16;
      elbowL = 0.36 + prep * 0.23;
      elbowR = -0.42 - prep * 0.22;
      torso += prep * 0.17 - hit * 0.28;
    }
    if (kind === "overhead") {
      left += prep * 1.85 - hit * 0.5;
      right -= prep * 1.85 - hit * 0.5;
      elbowL = 0.1 + prep * 0.65;
      elbowR = -0.1 - prep * 0.65;
      torso += hit * 0.13;
    }
    if (kind === "throw") {
      right += prep * 0.9 - hit * 1.4;
      left -= hit * 0.3;
      elbowR = -prep * 0.65 + hit * 0.15;
      torso += prep * 0.04 - hit * 0.08;
    }
    if (kind === "channel" || kind === "summon") {
      left += 0.3 + prep * 0.3 + hit * 0.2;
      right -= 0.3 + prep * 0.3 + hit * 0.2;
      elbowL = 0.85 + prep * 0.35;
      elbowR = -0.85 - prep * 0.35;
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
    thrust: 0,
    jaw: 0,
    breath: 1 + Math.sin(time * 0.002) * 0.006,
  };
}

/** Handle and visible tip of the existing80x40 tool artwork. */
export function toolGeometry(id: AttackId) {
  if (id === "mop") return { origin: 0.08, tip: 72 };
  if (id === "bat") return { origin: 0.08, tip: 58 };
  if (id === "wrench") return { origin: 0.08, tip: 66 };
  if (id === "coffee") return { origin: 0.38, tip: 43 };
  if (id === "meteor" || id === "orbit") return { origin: 0.32, tip: 56 };
  if (id === "drone" || id === "seeker") return { origin: 0.35, tip: 58 };
  return { origin: 0.2, tip: 68 };
}
