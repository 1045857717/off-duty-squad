import type { EnemyKind } from "../../shared/types";
import {
  JOINT_PARTS,
  rigPartGeometry,
  articulatedPose,
  type AttackFrame,
  type RigGeometry,
} from "./joints";
import { paintOfficeEnemy } from "./officeEnemies40";

/** The historical zombie-* model keys and fifteen-bone topology are protocol stable. */
export const ZOMBIE_PARTS = [
  ...JOINT_PARTS,
  {
    name: "jaw",
    parent: "head",
    rect: [0.39, 0.17, 0.22, 0.1],
    pivot: [0.5, 0.18],
  },
] as const;
export const ZOMBIE_DESIGNS = {
  mite: {
    form: "paperwork-imp",
    skin: "#e8d9b5",
    shade: "#9d9384",
    cloth: "#55485f",
    trim: "#b89a60",
    bulk: 0.94,
    head: 1.02,
    stride: 46,
  },
  hound: {
    form: "office-zombie-crawler",
    skin: "#93aa98",
    shade: "#506b65",
    cloth: "#4d455d",
    trim: "#b89a60",
    bulk: 1.12,
    head: 0.98,
    stride: 58,
  },
  shooter: {
    form: "possessed-toner-printer",
    skin: "#ded1b0",
    shade: "#555265",
    cloth: "#918e83",
    trim: "#719f93",
    bulk: 1.2,
    head: 1.18,
    stride: 98,
  },
  tank: {
    form: "file-cabinet-golem",
    skin: "#71988b",
    shade: "#363545",
    cloth: "#545562",
    trim: "#b89a60",
    bulk: 1.65,
    head: 0.9,
    stride: 116,
  },
  wraith: {
    form: "meeting-minutes-ghost",
    skin: "#a4b6a6",
    shade: "#5f7279",
    cloth: "#83998f",
    trim: "#d1c6a9",
    bulk: 1.12,
    head: 1.12,
    stride: 92,
  },
  bomber: {
    form: "overpressure-coffee-machine",
    skin: "#b89a60",
    shade: "#615263",
    cloth: "#a58a5b",
    trim: "#e8d9b5",
    bulk: 1.45,
    head: 1.05,
    stride: 94,
  },
  boss: {
    form: "kpi-executive-zombie-golem",
    skin: "#9aaa94",
    shade: "#536e68",
    cloth: "#52445f",
    trim: "#b89a60",
    bulk: 1.72,
    head: 1.16,
    stride: 124,
  },
} satisfies Record<
  EnemyKind,
  {
    form: string;
    skin: string;
    shade: string;
    cloth: string;
    trim: string;
    bulk: number;
    head: number;
    stride: number;
  }
>;

type Point = [number, number];
const FORMS: Record<
  EnemyKind,
  { body: [number, number, number]; head: number; jaw: number; radii: number[] }
> = {
  // Body width/top/height, head width, jaw width; radii: sleeve, forearm, hand, thigh, shin, foot.
  mite: {
    body: [0.43, 0.24, 0.4],
    head: 0.4,
    jaw: 0.22,
    radii: [0.035, 0.027, 0.043, 0.036, 0.027, 0.047],
  },
  hound: {
    body: [0.46, 0.4, 0.32],
    head: 0.39,
    jaw: 0.24,
    radii: [0.05, 0.043, 0.058, 0.05, 0.037, 0.055],
  },
  shooter: {
    body: [0.54, 0.24, 0.45],
    head: 0.48,
    jaw: 0.35,
    radii: [0.047, 0.042, 0.052, 0.047, 0.038, 0.064],
  },
  tank: {
    body: [0.68, 0.23, 0.47],
    head: 0.34,
    jaw: 0.25,
    radii: [0.079, 0.073, 0.106, 0.08, 0.071, 0.086],
  },
  wraith: {
    body: [0.54, 0.23, 0.6],
    head: 0.43,
    jaw: 0.27,
    radii: [0.043, 0.034, 0.041, 0.037, 0.028, 0.039],
  },
  bomber: {
    body: [0.6, 0.23, 0.48],
    head: 0.44,
    jaw: 0.25,
    radii: [0.05, 0.043, 0.052, 0.062, 0.046, 0.068],
  },
  boss: {
    body: [0.67, 0.23, 0.42],
    head: 0.44,
    jaw: 0.28,
    radii: [0.073, 0.057, 0.077, 0.073, 0.061, 0.081],
  },
};
function buildGeometry(kind: EnemyKind) {
  const d = ZOMBIE_DESIGNS[kind],
    f = FORMS[kind];
  const dirs: Record<string, RigGeometry>[] = Array.from(
    { length: 6 },
    () => ({}),
  );
  const point = (column: number, name: string, p: Point): Point => {
    const arm =
      name.endsWith("UpperArm") ||
      name.endsWith("Forearm") ||
      name.endsWith("Hand");
    const slot = name.endsWith("UpperArm")
      ? 0
      : name.endsWith("Forearm")
        ? 1
        : name.endsWith("Hand")
          ? 2
          : name.endsWith("UpperLeg")
            ? 3
            : name.endsWith("Shin")
              ? 4
              : 5;
    const base = [0.265, 0.415, 0.565, 0.565, 0.78, 0.94][slot];
    let y = p[1],
      spread = 0;
    if (kind === "hound")
      y = [0.49, 0.67, 0.84, 0.68, 0.79, 0.89][slot] + p[1] - base;
    if (kind === "mite")
      y = [0.265, 0.415, 0.565, 0.6, 0.73, 0.85][slot] + p[1] - base;
    if (kind === "wraith")
      y = [0.265, 0.415, 0.565, 0.7, 0.84, 0.97][slot] + p[1] - base;
    if (kind === "tank" || kind === "shooter" || kind === "bomber") {
      y =
        [0.29, 0.45, 0.61, kind === "shooter" ? 0.65 : 0.68, 0.8, 0.92][slot] +
        p[1] -
        base;
      spread = arm
        ? kind === "tank"
          ? 0.08
          : kind === "bomber"
            ? 0.04
            : 0.025
        : 0;
    }
    const viewSpread =
      column === 2 ? 0 : column === 0 || column === 3 ? 1 : 0.65;
    return [
      0.5 + (p[0] - 0.5) * d.bulk + Math.sign(p[0] - 0.5) * spread * viewSpread,
      y,
    ];
  };
  for (const part of ZOMBIE_PARTS) {
    for (let col = 0; col < 6; col++) {
      const name = part.name;
      let g: RigGeometry;
      if (name === "torso") {
        const [width, top, height] = f.body;
        g = {
          rect: [0.5 - width / 2, top, width, height],
          pivot: [0.5, kind === "hound" ? 0.62 : 0.5],
        };
      } else if (name === "head") {
        const cx =
          0.5 +
          (kind === "hound"
            ? col === 2
              ? 0.14
              : col === 1 || col === 4
                ? 0.06
                : col === 5
                  ? -0.06
                  : 0
            : 0);
        g = {
          rect: [
            cx - f.head / 2,
            kind === "hound" ? 0.23 : 0,
            f.head,
            kind === "hound" ? 0.265 : 0.285,
          ],
          pivot: [cx, kind === "hound" ? 0.475 : 0.265],
        };
      } else if (name === "jaw") {
        g = {
          rect: [
            0.5 +
              (kind === "hound"
                ? col === 2
                  ? 0.14
                  : col === 1 || col === 4
                    ? 0.06
                    : col === 5
                      ? -0.06
                      : 0
                : 0) -
              f.jaw / 2,
            kind === "hound" ? 0.4 : 0.18,
            f.jaw,
            0.115,
          ],
          pivot: [
            0.5 +
              (kind === "hound"
                ? col === 2
                  ? 0.14
                  : col === 1 || col === 4
                    ? 0.06
                    : col === 5
                      ? -0.06
                      : 0
                : 0),
            kind === "hound" ? 0.416 : 0.196,
          ],
        };
      } else {
        const raw = rigPartGeometry(col, name),
          pivot = point(col, name, raw.pivot),
          tip = point(
            col,
            name.endsWith("UpperArm")
              ? name.replace("UpperArm", "Forearm")
              : name.endsWith("Forearm")
                ? name.replace("Forearm", "Hand")
                : name.endsWith("UpperLeg")
                  ? name.replace("UpperLeg", "Shin")
                  : name.endsWith("Shin")
                    ? name.replace("Shin", "Foot")
                    : name,
            raw.tip!,
          );
        const slot = name.endsWith("UpperArm")
          ? 0
          : name.endsWith("Forearm")
            ? 1
            : name.endsWith("Hand")
              ? 2
              : name.endsWith("UpperLeg")
                ? 3
                : name.endsWith("Shin")
                  ? 4
                  : 5;
        const radius = f.radii[slot],
          pad = radius * 1.5 + 0.012;
        const x = Math.min(pivot[0], tip[0]) - pad,
          y = Math.min(pivot[1], tip[1]) - pad * 0.8;
        g = {
          rect: [
            x,
            y,
            Math.abs(tip[0] - pivot[0]) + pad * 2,
            Math.abs(tip[1] - pivot[1]) + pad * 1.6,
          ],
          pivot,
          tip,
          radius,
        };
      }
      dirs[col][name] = g;
    }
    // A frame change must never change the quad's dimensions. Size each bone from
    // all six views once, with stroke/finger padding, rather than rebuilding it live.
    const width = Math.max(...dirs.map((v) => v[part.name].rect[2]));
    const height = Math.max(...dirs.map((v) => v[part.name].rect[3]));
    for (const dir of dirs) {
      const g = dir[part.name],
        [x, y, w, h] = g.rect;
      g.rect = [x - (width - w) / 2, y - (height - h) / 2, width, height];
    }
  }
  return dirs;
}
const GEOMETRY: Record<EnemyKind, Record<string, RigGeometry>[]> = {
  mite: buildGeometry("mite"),
  hound: buildGeometry("hound"),
  shooter: buildGeometry("shooter"),
  tank: buildGeometry("tank"),
  wraith: buildGeometry("wraith"),
  bomber: buildGeometry("bomber"),
  boss: buildGeometry("boss"),
};
export function zombieGeometry(
  column: number,
  name: string,
  kind: EnemyKind,
): RigGeometry {
  return GEOMETRY[kind][column][name];
}
export function paintZombiePart(
  c: CanvasRenderingContext2D,
  kind: EnemyKind,
  column: number,
  name: string,
  g: RigGeometry,
) {
  paintOfficeEnemy(c, kind, column, name, g, ZOMBIE_DESIGNS[kind]);
}

const REST_FRAME: AttackFrame = {
  id: undefined,
  kind: "shoot",
  progress: 1,
  windup: 0,
  strike: 0,
  recovery: 0,
  active: false,
};
export function zombiePose(
  kind: EnemyKind,
  phase: number,
  weight: number,
  time: number,
  motion: AttackFrame,
  hurt = 0,
) {
  // Share locomotion only. Office objects get their own attack arcs, never a
  // human weapon pose underneath a second, conflicting set of rotations.
  const p = articulatedPose(phase, weight, time, REST_FRAME, 0, false);
  const step = Math.sin(phase) * weight,
    lift = Math.cos(phase) * weight,
    idle = Math.sin(time * 0.0024),
    follow = Math.sin(time * 0.0024 - 0.65),
    charge = motion.windup,
    hit = motion.strike,
    recover = motion.recovery;
  // Relax into the body only between actions. Multiplying the smooth envelopes
  // preserves the authored peak windup/contact poses and continuous transitions.
  const atRest = (1 - charge) * (1 - hit) * (1 - recover);
  const planted = 1 - Math.min(1, charge * 0.8 + hit * 0.9 + recover * 0.4);
  p.leftUpperLeg *= planted;
  p.rightUpperLeg *= planted;
  p.leftShin *= planted;
  p.rightShin *= planted;
  p.leftFoot *= planted;
  p.rightFoot *= planted;
  p.leftUpperArm += 0.17 - step * 0.12;
  p.rightUpperArm -= 0.2 - step * 0.1;
  p.leftForearm += 0.2 + follow * 0.025;
  p.rightForearm -= 0.24 + idle * 0.025;
  p.leftHand += 0.08 + Math.sin(time * 0.0031) * 0.045;
  p.rightHand -= 0.07 + Math.sin(time * 0.0031 - 0.6) * 0.045;
  p.head += idle * 0.018;
  p.jaw = 0.025 + (follow + 1) * 0.012;

  switch (kind) {
    case "mite":
      p.leftUpperLeg *= 1.4;
      p.rightUpperLeg *= 1.4;
      p.torso += step * 0.07 + charge * 0.15 - hit * 0.22 + recover * 0.035;
      p.bob += Math.abs(step) * 1.3 + charge * 1.0 - hit * 0.8;
      p.leftUpperArm += charge * 0.85 - hit * 0.9 + recover * 0.2;
      p.rightUpperArm -= charge * 1.25 - hit * 1.5 + recover * 0.22;
      p.leftForearm += charge * 0.38 - hit * 0.2;
      p.rightForearm -= charge * 0.5 - hit * 0.32;
      p.leftHand += charge * 0.18 - hit * 0.3 + recover * 0.08;
      p.rightHand -= charge * 0.23 - hit * 0.38 + recover * 0.1;
      p.head += charge * 0.11 - hit * 0.14 + recover * 0.05;
      p.jaw += charge * 0.13 + hit * 0.29 + recover * 0.06;
      break;
    case "hound":
      // Weight stays low; alternate long forelimbs carry the zombie's chest.
      p.torso += 0.2 + step * 0.04 + charge * 0.12 - hit * 0.21;
      p.head -= 0.16 + charge * 0.13 - hit * 0.24;
      p.bob += 2 + lift * weight * 0.85 + charge * 2.5 - hit * 2.1;
      p.leftUpperLeg -= 0.38 + step * 0.18;
      p.rightUpperLeg += 0.28 + step * 0.16;
      p.leftShin += 0.79 - charge * 0.1;
      p.rightShin += 0.64 - charge * 0.08;
      p.leftFoot -= 0.26;
      p.rightFoot -= 0.23;
      p.leftUpperArm += 0.08 + step * 0.4 + charge * 0.54 - hit * 0.72;
      p.rightUpperArm -= 0.12 + step * 0.4 + charge * 0.48 - hit * 0.64;
      p.leftForearm += 0.12 - lift * 0.18 + charge * 0.28 - hit * 0.2;
      p.rightForearm -= 0.12 + lift * 0.18 + charge * 0.26 - hit * 0.18;
      p.leftHand -= 0.1 + charge * 0.12 - hit * 0.21;
      p.rightHand += 0.08 + charge * 0.12 - hit * 0.21;
      p.jaw += charge * 0.2 + hit * 0.48 + recover * 0.14;
      break;
    case "shooter":
      p.leftUpperArm -= atRest * (0.45 + follow * 0.025);
      p.rightUpperArm += atRest * (0.48 + idle * 0.025);
      p.leftForearm -= atRest * 0.8;
      p.rightForearm += atRest * 0.84;
      p.leftHand -= atRest * 0.13;
      p.rightHand += atRest * 0.12;
      p.leftUpperLeg *= 0.6;
      p.rightUpperLeg *= 0.6;
      p.torso += charge * 0.07 - hit * 0.15 + recover * 0.04;
      p.head += charge * 0.13 - hit * 0.23 + recover * 0.08;
      p.bob += charge * 0.6 + hit * 1.8;
      p.leftUpperArm += 0.08 + charge * 0.36 - hit * 0.17;
      p.rightUpperArm -= 0.1 + charge * 0.38 - hit * 0.18;
      p.leftForearm += 0.3 + charge * 0.18 + hit * 0.12;
      p.rightForearm -= 0.3 + charge * 0.18 + hit * 0.12;
      p.leftHand += charge * 0.15 - hit * 0.23;
      p.rightHand -= charge * 0.15 - hit * 0.23;
      p.jaw += charge * 0.12 + hit * 0.64 + recover * 0.19;
      p.breath = 1 + idle * 0.002 - charge * 0.006 + hit * 0.012;
      break;
    case "tank":
      p.leftUpperLeg *= 0.55;
      p.rightUpperLeg *= 0.55;
      p.leftShin *= 0.55;
      p.rightShin *= 0.55;
      p.torso += step * 0.04 - charge * 0.045 + hit * 0.17 + recover * 0.03;
      p.head += charge * 0.07 - hit * 0.12 + recover * 0.025;
      p.bob += Math.cos(phase * 2) * weight * 0.9 + charge * 0.6 + hit * 2.7;
      p.leftUpperArm += charge * 1.75 - hit * 0.46 + recover * 0.13;
      p.rightUpperArm -= charge * 1.75 - hit * 0.46 + recover * 0.13;
      p.leftForearm += charge * 0.5 - hit * 0.29;
      p.rightForearm -= charge * 0.5 - hit * 0.29;
      p.leftHand += charge * 0.23 - hit * 0.35;
      p.rightHand -= charge * 0.23 - hit * 0.35;
      p.jaw += charge * 0.07 + hit * 0.22 + recover * 0.05;
      p.breath = 1 + idle * 0.002 + hit * 0.008;
      break;
    case "wraith":
      p.leftUpperArm -= atRest * 0.16;
      p.rightUpperArm -= atRest * 0.06;
      p.leftForearm -= atRest * 0.1;
      p.rightForearm += atRest * 0.07;
      p.torso += atRest * follow * 0.012;
      p.bob = -6 + idle * 2.3 + step * 0.35 - charge * 0.7 + hit * 1.2;
      p.torso += idle * 0.045 - charge * 0.06 + hit * 0.1;
      p.head -= 0.06 + follow * 0.03 + charge * 0.18 - hit * 0.12;
      p.leftUpperArm += 0.44 + follow * 0.09 + charge * 0.58 + hit * 0.23;
      p.rightUpperArm -= 0.44 + idle * 0.09 + charge * 0.61 + hit * 0.23;
      p.leftForearm += 0.27 + charge * 0.4 + recover * 0.1;
      p.rightForearm -= 0.27 + charge * 0.4 + recover * 0.1;
      p.leftHand += follow * 0.1 + hit * 0.27;
      p.rightHand -= idle * 0.1 + hit * 0.27;
      p.leftUpperLeg = 0.12 + follow * 0.08 + step * 0.06;
      p.rightUpperLeg = -0.13 - idle * 0.07 - step * 0.06;
      p.leftShin = 0.15 + idle * 0.07 + charge * 0.05;
      p.rightShin = 0.12 + follow * 0.06 + charge * 0.05;
      p.leftFoot = -0.13 - follow * 0.08 - hit * 0.06;
      p.rightFoot = -0.08 - idle * 0.07 - hit * 0.06;
      p.jaw += charge * 0.42 + hit * 0.46 + recover * 0.2;
      break;
    case "bomber": {
      p.leftUpperArm -= atRest * (0.55 + follow * 0.025);
      p.rightUpperArm += atRest * (0.55 + idle * 0.025);
      p.leftForearm -= atRest * 0.84;
      p.rightForearm += atRest * 0.87;
      p.leftHand -= atRest * 0.14;
      p.rightHand += atRest * 0.13;
      const pressure = Math.sin(time * 0.038) * charge * charge;
      p.torso += step * 0.065 + pressure * 0.018 - hit * 0.1;
      p.head += idle * 0.035 + pressure * 0.05 - charge * 0.1 + hit * 0.17;
      p.bob += charge * 1.6 + pressure * 0.3 + hit * 1.8;
      p.leftUpperArm += 0.22 + charge * 0.35 - hit * 0.62;
      p.rightUpperArm -= 0.22 + charge * 0.35 - hit * 0.62;
      p.leftForearm += 0.33 + charge * 0.24 + pressure * 0.015;
      p.rightForearm -= 0.33 + charge * 0.24 - pressure * 0.015;
      p.leftHand += charge * 0.16 + hit * 0.26;
      p.rightHand -= charge * 0.16 + hit * 0.26;
      p.jaw += charge * 0.28 + hit * 0.52 + recover * 0.12;
      p.breath =
        1 + idle * 0.004 + charge * 0.025 + pressure * 0.003 - hit * 0.012;
      break;
    }
    case "boss":
      p.leftUpperArm -= atRest * (0.5 + follow * 0.025);
      p.rightUpperArm += atRest * (0.52 + idle * 0.025);
      p.leftForearm -= atRest * 0.72;
      p.rightForearm += atRest * 0.76;
      p.leftHand -= atRest * 0.12;
      p.rightHand += atRest * 0.11;
      p.leftUpperLeg *= 0.62;
      p.rightUpperLeg *= 0.62;
      p.torso += step * 0.05 + charge * 0.13 - hit * 0.24 + recover * 0.065;
      p.head += charge * 0.09 - hit * 0.16 + recover * 0.06;
      p.bob += Math.cos(phase * 2) * weight * 1.1 + hit * 1.4;
      p.leftUpperArm += 0.12 + charge * 1.05 - hit * 0.95 + recover * 0.19;
      p.rightUpperArm -= 0.15 + charge * 1.6 - hit * 1.45 + recover * 0.23;
      p.leftForearm += 0.13 + charge * 0.48 - hit * 0.23;
      p.rightForearm -= 0.14 + charge * 0.6 - hit * 0.32;
      p.leftHand += charge * 0.24 - hit * 0.35 + recover * 0.1;
      p.rightHand -= charge * 0.3 - hit * 0.42 + recover * 0.12;
      p.jaw += charge * 0.16 + hit * 0.31 + recover * 0.11;
      p.breath = 1 + idle * 0.004 + charge * 0.006;
      break;
  }
  p.leftFoot += Math.sin(phase + 0.4) * weight * 0.035;
  p.rightFoot += Math.sin(phase + Math.PI + 0.25) * weight * 0.035;
  const flinch = Math.max(0, Math.min(1, hurt));
  p.torso -= flinch * 0.14;
  p.head += flinch * 0.18;
  p.leftForearm += flinch * 0.2;
  p.rightForearm -= flinch * 0.16;
  p.jaw += flinch * 0.1;
  return p;
}

/** Material-specific collapse, consumed only by the enemy branch of fall(). */
export const ZOMBIE_DEATH: Record<
  EnemyKind,
  { roll: number; sink: number; squash: number }
> = {
  mite: { roll: 1.25, sink: 8, squash: 0.3 },
  hound: { roll: 1.05, sink: 5, squash: 0.12 },
  shooter: { roll: 0.98, sink: 7, squash: 0.12 },
  tank: { roll: 1.12, sink: 9, squash: 0.12 },
  wraith: { roll: 0.13, sink: 15, squash: 0.53 },
  bomber: { roll: 0.66, sink: 11, squash: 0.34 },
  boss: { roll: 1.18, sink: 8, squash: 0.14 },
};
export function zombieDeathJoint(kind: EnemyKind, name: string, ease: number) {
  const sign = name.startsWith("left") ? 1 : -1;
  if (name === "jaw")
    return (kind === "shooter" ? 0.78 : kind === "bomber" ? 0.48 : 0.36) * ease;
  if (name === "head")
    return (
      (kind === "wraith" ? -0.24 : kind === "shooter" ? -0.35 : 0.28) * ease
    );
  if (name === "torso")
    return (kind === "wraith" ? -0.12 : kind === "bomber" ? 0.2 : 0.12) * ease;
  if (name.endsWith("UpperArm"))
    return (
      sign * (kind === "wraith" ? -0.6 : kind === "mite" ? 0.48 : -0.22) * ease
    );
  if (name.endsWith("Forearm"))
    return (
      sign * (kind === "tank" ? 0.25 : kind === "wraith" ? 0.2 : 0.7) * ease
    );
  if (name.endsWith("Hand")) return sign * (kind === "mite" ? 0.5 : 0.3) * ease;
  if (name.endsWith("UpperLeg"))
    return sign * (kind === "wraith" ? 0.13 : 0.22) * ease;
  if (name.endsWith("Shin")) return (kind === "tank" ? 0.55 : 0.4) * ease;
  return -0.2 * ease;
}
