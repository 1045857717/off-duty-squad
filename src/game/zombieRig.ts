import type { EnemyKind } from "../../shared/types";
import {
  JOINT_PARTS,
  rigPartGeometry,
  articulatedPose,
  type AttackFrame,
  type RigGeometry,
} from "./joints";
/** Anatomical sprites are painted once into the shared atlas; no per-frame canvas work. */
export const ZOMBIE_PARTS = [
  ...JOINT_PARTS,
  {
    name: "jaw",
    parent: "head",
    rect: [0.39, 0.17, 0.22, 0.1],
    pivot: [0.5, 0.18],
  },
] as const;
export const ZOMBIE_DESIGNS: Record<
  EnemyKind,
  {
    skin: string;
    shade: string;
    cloth: string;
    trim: string;
    bulk: number;
    head: number;
    stride: number;
  }
> = {
  mite: {
    skin: "#a6ab83",
    shade: "#515c47",
    cloth: "#69665a",
    trim: "#ac7955",
    bulk: 0.84,
    head: 1.02,
    stride: 48,
  },
  hound: {
    skin: "#a5a293",
    shade: "#59594e",
    cloth: "#6b6e72",
    trim: "#9a6353",
    bulk: 0.92,
    head: 0.94,
    stride: 60,
  },
  shooter: {
    skin: "#9caa83",
    shade: "#4f6650",
    cloth: "#626553",
    trim: "#bcaa62",
    bulk: 1.04,
    head: 1.12,
    stride: 98,
  },
  tank: {
    skin: "#a2a18a",
    shade: "#5d6050",
    cloth: "#555d57",
    trim: "#b19b76",
    bulk: 1.45,
    head: 0.92,
    stride: 110,
  },
  wraith: {
    skin: "#b1b6a0",
    shade: "#575e58",
    cloth: "#555262",
    trim: "#ab93a7",
    bulk: 0.9,
    head: 1.08,
    stride: 85,
  },
  bomber: {
    skin: "#aaa68a",
    shade: "#65644e",
    cloth: "#786451",
    trim: "#c4a252",
    bulk: 1.32,
    head: 0.95,
    stride: 96,
  },
  boss: {
    skin: "#a8aa98",
    shade: "#5f6356",
    cloth: "#3d4f50",
    trim: "#c6a269",
    bulk: 1.43,
    head: 1.1,
    stride: 118,
  },
};
export function zombieGeometry(
  column: number,
  name: string,
  kind: EnemyKind,
): RigGeometry {
  const design = ZOMBIE_DESIGNS[kind];
  if (name === "jaw")
    return { rect: [0.385, 0.17, 0.23, 0.108], pivot: [0.5, 0.18] };
  const g = rigPartGeometry(column, name);
  // Broader shoulders and hips preserve real joints rather than scaling disconnected limbs.
  const spread = (x: number) => 0.5 + (x - 0.5) * design.bulk;
  const pair = (p: [number, number]): [number, number] => [spread(p[0]), p[1]];
  if (name === "head")
    return {
      rect: [0.5 - 0.23 * design.head, 0, 0.46 * design.head, 0.285],
      pivot: [0.5, 0.265],
    };
  return {
    ...g,
    rect: [spread(g.rect[0]), g.rect[1], g.rect[2] * design.bulk, g.rect[3]],
    pivot: pair(g.pivot),
    tip: g.tip && pair(g.tip),
    polygon: g.polygon?.map(pair),
    radius: g.radius ? g.radius * design.bulk : undefined,
  };
}
export function paintZombiePart(
  c: CanvasRenderingContext2D,
  kind: EnemyKind,
  column: number,
  name: string,
  g: RigGeometry,
) {
  const d = ZOMBIE_DESIGNS[kind],
    S = 126,
    H = 157.5,
    back = column >= 3,
    side = column === 2;
  const p = (a: [number, number]): [number, number] => [a[0] * S, a[1] * H];
  const shape = (fill: string, points: [number, number][]) => {
    c.fillStyle = fill;
    c.beginPath();
    points.forEach((q, i) => (i ? c.lineTo(...p(q)) : c.moveTo(...p(q))));
    c.closePath();
    c.fill();
    c.stroke();
  };
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    fill: string | CanvasGradient,
  ) => {
    c.fillStyle = fill;
    c.beginPath();
    c.ellipse(x * S, y * H, rx * S, ry * H, 0, 0, Math.PI * 2);
    c.fill();
  };
  c.strokeStyle = "#29332e";
  c.lineWidth = 1.25;
  c.lineJoin = "round";
  c.lineCap = "round";
  const grad = c.createLinearGradient(
    g.rect[0] * S,
    0,
    (g.rect[0] + g.rect[2]) * S,
    0,
  );
  grad.addColorStop(0, d.shade);
  grad.addColorStop(0.38, d.skin);
  grad.addColorStop(0.7, d.skin);
  grad.addColorStop(1, d.shade);
  if (name === "torso") {
    const poly = g.polygon!;
    shape(d.cloth, poly);
    const x = g.rect[0],
      w = g.rect[2],
      cx = 0.5;
    c.globalAlpha = 0.3;
    c.fillStyle = "#162c29";
    c.fillRect((cx + 0.015) * S, 0.285 * H, w * 0.35 * S, 0.29 * H);
    c.globalAlpha = 1;
    if (!back) {
      shape(d.shade, [
        [cx - 0.045, 0.27],
        [cx + 0.045, 0.27],
        [cx + 0.026, 0.37],
        [cx - 0.02, 0.365],
      ]);
      shape("#c0b49a", [
        [cx - 0.055, 0.27],
        [cx, 0.32],
        [cx - 0.045, 0.39],
        [cx - 0.1, 0.29],
      ]);
      shape("#b0a38d", [
        [cx + 0.055, 0.27],
        [cx, 0.32],
        [cx + 0.045, 0.39],
        [cx + 0.1, 0.29],
      ]);
      shape(kind === "boss" ? "#bc9454" : "#68505a", [
        [cx, 0.32],
        [cx + 0.025, 0.43],
        [cx, 0.49],
        [cx - 0.025, 0.43],
      ]);
      c.fillStyle = "#d2c8a6";
      c.fillRect((cx - 0.1) * S, 0.4 * H, 0.075 * S, 0.035 * H);
      c.fillStyle = "#777d68";
      c.fillRect((cx - 0.094) * S, 0.405 * H, 0.057 * S, 0.007 * H);
    } else {
      c.strokeStyle = "#8e9283";
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(0.5 * S, 0.28 * H);
      c.lineTo(0.51 * S, 0.55 * H);
      c.stroke();
    }
    // Ragged cloth, rib lines, exposed wounds, seams and a crooked employee badge.
    c.strokeStyle = "#292f2b";
    c.lineWidth = 1.1;
    for (let n = 0; n < 3; n++) {
      c.beginPath();
      c.moveTo((cx - 0.09) * S, (0.46 + n * 0.025) * H);
      c.lineTo((cx + 0.07) * S, (0.47 + n * 0.022) * H);
      c.stroke();
    }
    shape("#785c51", [
      [cx - 0.13, 0.49],
      [cx - 0.05, 0.46],
      [cx - 0.04, 0.54],
      [cx - 0.11, 0.56],
    ]);
    for (let n = 0; n < 5; n++) {
      c.fillStyle = n % 2 ? d.shade : d.trim;
      c.fillRect(
        (x + 0.05 + n * w * 0.18) * S,
        (0.57 + (n % 2) * 0.018) * H,
        w * 0.16 * S,
        0.025 * H,
      );
    }
    if (kind === "bomber" || kind === "shooter") {
      ellipse(0.5, 0.46, 0.14 * d.bulk, 0.105, d.skin);
      c.strokeStyle = "#747f53";
      for (let n = 0; n < 3; n++) {
        c.beginPath();
        c.arc(
          0.5 * S,
          (0.43 + n * 0.025) * H,
          (0.08 + n * 0.007) * S,
          0.1,
          Math.PI - 0.1,
        );
        c.stroke();
      }
      ellipse(0.54, 0.46, 0.025, 0.021, d.trim);
    }
    if (kind === "boss") {
      shape("#af915b", [
        [0.36, 0.29],
        [0.42, 0.29],
        [0.42, 0.34],
        [0.34, 0.34],
      ]);
      shape("#af915b", [
        [0.58, 0.29],
        [0.64, 0.29],
        [0.66, 0.34],
        [0.58, 0.34],
      ]);
    }
    return;
  }
  if (name === "head") {
    const hx =
        0.5 + (side ? 0.018 : column === 1 ? 0.012 : column === 5 ? -0.012 : 0),
      rx = 0.102 * d.head;
    ellipse(hx, 0.135, rx, 0.118, grad);
    c.strokeStyle = "#343c32";
    c.beginPath();
    c.ellipse(hx * S, 0.135 * H, rx * S, 0.118 * H, 0, 0, Math.PI * 2);
    c.stroke();
    ellipse(hx - rx, 0.14, 0.021, 0.035, d.shade);
    ellipse(hx + rx, 0.14, 0.02, 0.032, d.skin);
    shape("#40473d", [
      [hx - rx, 0.07],
      [hx - rx * 0.7, 0.025],
      [hx - 0.02, 0.018],
      [hx + 0.02, 0.036],
      [hx + rx * 0.8, 0.035],
      [hx + rx, 0.075],
      [hx + 0.025, 0.062],
      [hx - 0.02, 0.08],
    ]);
    if (kind === "boss")
      shape("#b69a62", [
        [0.41, 0.06],
        [0.4, 0.008],
        [0.46, 0.038],
        [0.5, 0.002],
        [0.54, 0.038],
        [0.6, 0.008],
        [0.59, 0.06],
      ]);
    if (!back) {
      for (const sign of side ? [1] : [-1, 1]) {
        const ex = hx + sign * (side ? 0.036 : 0.042);
        ellipse(ex, 0.125, 0.025, 0.016, "#3b4437");
        ellipse(
          ex + (side ? 0.009 : 0),
          0.126,
          0.009,
          0.008,
          kind === "boss" ? "#edc67e" : "#d4d7aa",
        );
        ellipse(ex + (side ? 0.012 : 0), 0.126, 0.003, 0.006, "#373b2e");
      }
      shape(d.shade, [
        [hx + 0.008, 0.13],
        [hx + (side ? 0.073 : 0.024), 0.18],
        [hx - 0.008, 0.175],
      ]);
      c.strokeStyle = "#8a6457";
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo((hx - 0.065) * S, 0.165 * H);
      c.lineTo((hx - 0.045) * S, 0.2 * H);
      c.stroke();
      c.strokeStyle = "#cad0b1";
      c.lineWidth = 0.65;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo((hx - 0.07 + i * 0.008) * S, (0.17 + i * 0.008) * H);
        c.lineTo((hx - 0.045 + i * 0.005) * S, (0.175 + i * 0.008) * H);
        c.stroke();
      }
      ellipse(hx, 0.208, 0.058, 0.026, "#30372f");
      if (kind === "shooter") {
        ellipse(hx + 0.025, 0.19, 0.045, 0.024, "#b8b66e");
        ellipse(hx + 0.04, 0.19, 0.019, 0.012, "#444d34");
      }
    } else {
      c.strokeStyle = "#7a8271";
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(hx * S, 0.08 * H);
      c.lineTo((hx + 0.01) * S, 0.23 * H);
      c.stroke();
    }
    return;
  }
  if (name === "jaw") {
    if (back) return;
    ellipse(0.5, 0.226, 0.062 * d.head, 0.027, d.shade);
    ellipse(0.5, 0.23, 0.052 * d.head, 0.021, d.skin);
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i === 2 ? "#6c6e54" : "#ddd5b5";
      c.fillRect(
        (0.455 + i * 0.019) * S,
        0.207 * H,
        0.012 * S,
        (i % 2 ? 0.012 : 0.016) * H,
      );
    }
    return;
  }
  const a = p(g.pivot),
    b = p(g.tip!),
    r = (g.radius || 0.04) * S,
    isHand = name.endsWith("Hand"),
    isFoot = name.endsWith("Foot"),
    bare = isHand || name.endsWith("Forearm");
  c.strokeStyle = "#27312b";
  c.lineWidth = r * 2 + 1.5;
  c.beginPath();
  c.moveTo(...a);
  c.lineTo(...b);
  c.stroke();
  c.strokeStyle = bare ? d.skin : isFoot ? "#39433e" : d.cloth;
  c.lineWidth = r * 2;
  c.beginPath();
  c.moveTo(...a);
  c.lineTo(...b);
  c.stroke();
  c.strokeStyle = bare ? d.shade : "#858777";
  c.lineWidth = Math.max(0.7, r * 0.3);
  c.beginPath();
  c.moveTo(a[0] - r * 0.45, a[1]);
  c.lineTo(b[0] - r * 0.45, b[1]);
  c.stroke();
  if (isHand) {
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = i % 2 ? d.shade : d.skin;
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(b[0] - r + i * r * 0.55, b[1] - 1);
      c.lineTo(b[0] - r + i * r * 0.6 + (i - 1) * 0.7, b[1] + 3 + (i % 2));
      c.stroke();
    }
  } else if (!isFoot) {
    c.strokeStyle = bare ? "#816b58" : "#a19478";
    c.lineWidth = 0.65;
    c.beginPath();
    c.moveTo(b[0] - r * 0.7, b[1] - 2);
    c.lineTo(b[0] + r * 0.7, b[1] - 1);
    c.stroke();
    c.fillStyle = "#795d52";
    c.fillRect((a[0] + b[0]) / 2 - r * 0.4, (a[1] + b[1]) / 2, r * 0.9, 2.5);
  } else {
    c.strokeStyle = "#a29d83";
    c.lineWidth = 0.75;
    c.beginPath();
    c.moveTo(b[0] - r * 0.7, b[1]);
    c.lineTo(b[0] + r * 0.7, b[1]);
    c.stroke();
  }
}
export function zombiePose(
  kind: EnemyKind,
  phase: number,
  weight: number,
  time: number,
  motion: AttackFrame,
  hurt = 0,
) {
  const p = articulatedPose(phase, weight, time, motion, 0, false),
    s = Math.sin(phase),
    l = Math.cos(phase),
    idle = Math.sin(time * 0.0024),
    charge = motion.windup,
    hit = motion.strike;
  // Uneven gait and reaching hands are present even between attacks.
  p.leftUpperArm += 0.28 + weight * 0.2;
  p.rightUpperArm -= 0.28 + weight * 0.14;
  p.leftForearm += 0.4 + idle * 0.045;
  p.rightForearm -= 0.45 + Math.sin(time * 0.0021) * 0.04;
  p.leftHand += 0.12 + Math.sin(time * 0.0031) * 0.055;
  p.rightHand -= 0.1 + Math.cos(time * 0.0027) * 0.05;
  p.head += idle * 0.025 + charge * 0.07 - hit * 0.1;
  p.torso += s * weight * 0.035;
  p.jaw =
    0.025 +
    (idle + 1) * 0.018 +
    charge * 0.09 +
    hit * (kind === "shooter" ? 0.3 : 0.16);
  p.leftFoot += Math.sin(phase + 0.4) * weight * 0.06;
  p.rightFoot += Math.sin(phase + Math.PI + 0.25) * weight * 0.06;
  if (kind === "mite") {
    p.leftUpperLeg *= 1.32;
    p.rightUpperLeg *= 1.32;
    p.bob += Math.abs(s) * weight * 0.8;
  }
  if (kind === "hound") {
    p.torso += 0.68;
    p.head -= 0.5;
    p.leftUpperArm -= 0.32;
    p.rightUpperArm += 0.35;
    p.leftUpperLeg -= 0.45;
    p.rightUpperLeg += 0.32;
    p.leftShin += 0.85;
    p.rightShin += 0.65;
    p.leftFoot -= 0.18;
    p.rightFoot -= 0.18;
    p.bob += 16 + weight * 1.3 * l;
    p.leftForearm += 0.32;
    p.rightForearm -= 0.28;
  }
  if (kind === "tank" || kind === "boss") {
    p.torso += s * weight * 0.04;
    p.bob += Math.cos(phase * 2) * weight * 1.2;
    p.leftUpperArm -= charge * 0.2;
    p.rightUpperArm += charge * 0.2;
  }
  if (kind === "shooter") {
    p.head -= charge * 0.16;
    p.torso += charge * 0.1 - hit * 0.16;
    p.leftHand += charge * 0.18;
    p.rightHand -= charge * 0.18;
  }
  if (kind === "wraith") {
    p.leftUpperArm -= 0.22;
    p.rightUpperArm += 0.26;
    p.jaw += charge * 0.15 + hit * 0.2;
  }
  if (kind === "bomber") {
    p.leftUpperArm += 0.18;
    p.rightUpperArm -= 0.18;
    p.breath += charge * 0.035;
    p.head += idle * charge * 0.08;
  }
  p.torso -= hurt * 0.14;
  p.head += hurt * 0.18;
  p.leftForearm += hurt * 0.2;
  p.rightForearm -= hurt * 0.16;
  p.jaw += hurt * 0.08;
  return p;
}
