import { JOINT_PARTS, rigPartGeometry, type RigGeometry } from "./joints";
import { gameplayModel } from "./paintedActors";
import type { Role } from "../../shared/types";
import { makeProfessionTool } from "./professionTools40";
import type { GAMEPLAY_MODELS } from "./paintedActors";
type Model = (typeof GAMEPLAY_MODELS)[number];
type C = CanvasRenderingContext2D;
/** The same cut-paper/cel material vocabulary as the office monsters. All six views are authored, not mirrored rear views. */
const people: Record<
  Model,
  {
    cloth: string;
    light: string;
    shadow: string;
    skin: string;
    shade: string;
    hair: string;
    accent: string;
  }
> = {
  developer: {
    cloth: "#c1cbd2",
    light: "#e5e3d8",
    shadow: "#75889a",
    skin: "#ddb28b",
    shade: "#ae7d65",
    hair: "#34313e",
    accent: "#6dc6b3",
  },
  technician: {
    cloth: "#6f8798",
    light: "#a0b7bc",
    shadow: "#425363",
    skin: "#bf916e",
    shade: "#8b5e50",
    hair: "#302c35",
    accent: "#e6b76b",
  },
  security: {
    cloth: "#404c62",
    light: "#6a7d8c",
    shadow: "#292d42",
    skin: "#c69c7b",
    shade: "#946a59",
    hair: "#37303b",
    accent: "#dca76a",
  },
  admin: {
    cloth: "#829c94",
    light: "#bbcbb6",
    shadow: "#4f6c6c",
    skin: "#e9c09b",
    shade: "#bd8f77",
    hair: "#44343f",
    accent: "#efd19a",
  },
  workhorse: {
    cloth: "#a69a80",
    light: "#d2c6a3",
    shadow: "#6f655b",
    skin: "#d5aa88",
    shade: "#a57561",
    hair: "#594236",
    accent: "#dbb777",
  },
  chef: {
    cloth: "#d5cfb9",
    light: "#f2e6c8",
    shadow: "#969d97",
    skin: "#c9a07c",
    shade: "#9b6e5a",
    hair: "#43343a",
    accent: "#c67561",
  },
  director: {
    cloth: "#666077",
    light: "#8d849b",
    shadow: "#3c394e",
    skin: "#d9ae87",
    shade: "#ab7e65",
    hair: "#77716d",
    accent: "#e8b66f",
  },
  designer: {
    cloth: "#9b735e",
    light: "#ca9b75",
    shadow: "#634e50",
    skin: "#ddb591",
    shade: "#ad7f6a",
    hair: "#3c303d",
    accent: "#73b8b0",
  },
};
const ink = "#232333";
function poly(c: C, pts: number[][], fill: string, stroke = true) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = ink;
    c.lineWidth = 1.5;
    c.stroke();
  }
}
function line(
  c: C,
  x: number,
  y: number,
  xx: number,
  yy: number,
  col: string,
  w = 1,
) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(xx, yy);
  c.stroke();
}
function oval(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  col: string,
  stroke = false,
) {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  if (stroke) {
    c.strokeStyle = ink;
    c.lineWidth = 1.3;
    c.stroke();
  }
}
export function paintHumanPart(
  c: C,
  model: Model,
  col: number,
  part: string,
  g: RigGeometry,
) {
  const p = people[model],
    back = col >= 3,
    profile = col === 2,
    rearLeft = col === 5,
    quarter = col === 1 || col === 4 || col === 5;
  c.lineCap = "round";
  c.lineJoin = "round";
  if (part === "head") {
    const x = 63 + (profile ? 2 : quarter ? (rearLeft ? -2 : 2) : 0),
      y = 22;
    // Neck joins the shoulder silhouette even when the head tilts.
    poly(
      c,
      [
        [x - 4, 31],
        [x + 4, 31],
        [x + 5, 42],
        [x - 4, 42],
      ],
      p.shade,
    );
    if (model === "workhorse") {
      poly(
        c,
        [
          [x - 16, 14],
          [x - 12, 3],
          [x - 8, 9],
          [x + 9, 8],
          [x + 13, 2],
          [x + 17, 16],
          [x + 13, 34],
          [x + 6, 41],
          [x - 8, 39],
          [x - 15, 31],
        ],
        "#92714e",
      );
      poly(
        c,
        [
          [x - 11, 18],
          [x + 9, 17],
          [x + 13, 31],
          [x + 6, 36],
          [x - 8, 34],
        ],
        "#c69b6c",
      );
      if (!back) {
        oval(
          c,
          x + (profile ? 6 : 0),
          29,
          profile ? 9 : 12,
          7,
          "#cfb08a",
          true,
        );
        oval(c, x + 4, 28, 1.6, 1, ink);
        if (!profile) oval(c, x - 5, 28, 1.6, 1, ink);
        line(c, x - 8, 17, x - 3, 18, ink, 2);
        line(c, x + 4, 18, x + 9, 16, ink, 2);
        oval(c, x + 7, 20, 1.3, 1.7, ink);
        if (!profile) oval(c, x - 6, 21, 1.3, 1.7, ink);
      } else {
        line(c, x, 8, x + 1, 34, "#5c4738", 3);
      }
      return;
    }
    const w = profile ? 10 : quarter ? 12 : 13;
    poly(
      c,
      [
        [x - w, 13],
        [x - w + 2, 7],
        [x + 6, 7],
        [x + w, 16],
        [x + w - 1, 28],
        [x + 5, 35],
        [x - 5, 34],
        [x - w, 25],
      ],
      p.skin,
    );
    poly(
      c,
      [
        [x + 5, 10],
        [x + w, 16],
        [x + w - 1, 28],
        [x + 5, 35],
        [x + 2, 30],
      ],
      p.shade,
      false,
    );
    if (!profile) oval(c, x - w, 23, 2.3, 3.8, p.skin, true);
    if (profile) {
      poly(
        c,
        [
          [x + 8, 17],
          [x + 14, 22],
          [x + 9, 24],
        ],
        p.skin,
      );
    }
    if (back) {
      poly(
        c,
        [
          [x - w, 12],
          [x - w + 3, 5],
          [x + 3, 3],
          [x + w, 10],
          [x + w, 25],
          [x + 5, 31],
          [x - 7, 28],
          [x - w, 22],
        ],
        p.hair,
      );
      line(c, x - 7, 11, x + 3, 7, "#ffffff", 0.7);
      if (col === 4) oval(c, x + w - 1, 25, 2.5, 4, p.shade);
      if (col === 5) oval(c, x - w + 1, 25, 2.5, 4, p.shade);
    } else {
      poly(
        c,
        [
          [x - w - 1, 16],
          [x - w, 8],
          [x - 5, 3],
          [x + 4, 4],
          [x + w, 10],
          [x + w - 2, 18],
          [x + 6, 13],
          [x + 1, 16],
          [x - 3, 11],
          [x - 8, 17],
        ],
        p.hair,
      );
      line(c, x - 7, 8, x + 1, 6, "#bdb8aa", 0.8);
      const eye = profile ? x + 7 : x + 5;
      line(c, eye - 3, 20, eye + 2, 19, ink, 1.3);
      oval(c, eye, 22, 1, 1.5, ink);
      if (!profile) {
        line(c, x - 8, 20, x - 3, 20, ink, 1.2);
        oval(c, x - 5, 22, 1, 1.5, ink);
      }
      line(c, x + 1, 23, x + 2, 27, p.shade, 1.1);
      line(c, x, 30, x + 5, 29, ink, 0.8);
      if (model === "developer" || model === "director") {
        c.strokeStyle = "#253244";
        c.lineWidth = 1.2;
        c.strokeRect(eye - 4, 20, 7, 5);
        if (!profile) {
          c.strokeRect(x - 9, 20, 7, 5);
          line(c, x - 2, 22, x + 1, 22, ink);
        }
      }
      if (model === "designer" || model === "admin") {
        oval(c, x - w - 1, 10, 4, 5, p.hair, true);
        line(c, x - 5, 14, x + 3, 11, p.hair, 2.5);
      }
    }
    if (model === "chef") {
      poly(
        c,
        [
          [x - 14, 13],
          [x - 16, 7],
          [x - 11, 2],
          [x - 5, 3],
          [x + 1, 0],
          [x + 8, 3],
          [x + 13, 3],
          [x + 15, 8],
          [x + 12, 15],
        ],
        p.light,
      );
      line(c, x - 11, 13, x + 11, 13, p.shadow, 1.5);
    }
    if (model === "security") {
      poly(
        c,
        [
          [x - 15, 15],
          [x - 11, 6],
          [x + 3, 4],
          [x + 13, 11],
          [x + 14, 17],
        ],
        p.cloth,
      );
      poly(
        c,
        [
          [x - 14, 16],
          [x + 13, 16],
          [x + 17, 20],
          [x - 11, 19],
        ],
        p.shadow,
      );
    }
    if (model === "technician") {
      poly(
        c,
        [
          [x - 14, 13],
          [x - 10, 5],
          [x + 5, 4],
          [x + 13, 12],
          [x + 12, 17],
          [x - 14, 17],
        ],
        "#d9aa62",
      );
      line(c, x - 16, 17, x + 15, 17, ink, 2);
      line(c, x - 2, 5, x - 2, 13, "#f0d69a", 2);
    }
    return;
  }
  if (part === "torso") {
    const pts = g.polygon!.map(([x, y]) => [x * 126, y * 157.5]);
    poly(c, pts, p.cloth);
    c.save();
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.clip();
    poly(
      c,
      [
        [66, 40],
        [83, 42],
        [84, 98],
        [67, 96],
      ],
      p.shadow,
      false,
    );
    poly(
      c,
      [
        [49, 41],
        [58, 39],
        [59, 88],
        [47, 91],
      ],
      p.light,
      false,
    );
    if (back) {
      line(c, 49, 49, 72, 49, p.shadow, 1.1);
      line(c, 63, 52, 63, 88, p.shadow, 0.8);
      if (model === "security" || model === "technician") {
        c.fillStyle = p.shadow;
        c.fillRect(49, 53, 28, 18);
        line(c, 53, 58, 73, 58, p.light, 2);
        line(c, 53, 63, 70, 63, p.light, 1);
      }
    } else {
      poly(
        c,
        [
          [53, 40],
          [62, 45],
          [58, 53],
          [52, 46],
        ],
        p.light,
        false,
      );
      poly(
        c,
        [
          [65, 43],
          [73, 40],
          [72, 50],
          [66, 53],
        ],
        p.light,
        false,
      );
      if (model === "director" || model === "developer") {
        poly(
          c,
          [
            [61, 45],
            [65, 45],
            [68, 70],
            [63, 78],
            [60, 70],
          ],
          model === "director" ? p.accent : "#697f8c",
          false,
        );
      }
      line(c, 63, 54, 63, 91, p.shadow, 1);
      if (model === "chef") {
        for (let i = 0; i < 4; i++) {
          oval(c, 58, 57 + i * 8, 1, 1, ink);
          oval(c, 68, 57 + i * 8, 1, 1, ink);
        }
        line(c, 47, 80, 76, 80, p.shadow, 2);
      }
      if (model === "security") {
        poly(
          c,
          [
            [49, 50],
            [75, 50],
            [77, 82],
            [48, 82],
          ],
          p.shadow,
        );
        line(c, 52, 56, 72, 56, p.light, 1.5);
        line(c, 51, 62, 72, 62, p.light, 1);
      }
      if (model === "designer" || model === "workhorse" || model === "chef") {
        poly(
          c,
          [
            [53, 64],
            [71, 64],
            [72, 89],
            [52, 89],
          ],
          p.shadow,
          false,
        );
        line(c, 54, 68, 69, 68, p.accent, 1);
      }
      // ID pass, clip and stitching provide readable office detail without photoreal noise.
      line(c, 71, 48, 70, 66, p.accent, 1);
      poly(
        c,
        [
          [67, 64],
          [75, 64],
          [75, 74],
          [67, 74],
        ],
        "#e9dcc0",
      );
      line(c, 69, 67, 73, 67, p.shadow, 1);
      if (model === "technician") {
        poly(
          c,
          [
            [50, 73],
            [57, 73],
            [57, 82],
            [50, 82],
          ],
          p.shadow,
        );
        line(c, 52, 70, 52, 78, p.accent, 1.5);
      }
    }
    c.restore();
    return;
  }
  const start = g.pivot,
    end = g.tip!,
    sx = start[0] * 126,
    sy = start[1] * 157.5,
    ex = end[0] * 126,
    ey = end[1] * 157.5;
  const dx = ex - sx,
    dy = ey - sy,
    len = Math.hypot(dx, dy) || 1,
    nx = -dy / len,
    ny = dx / len;
  const hand = part.endsWith("Hand"),
    foot = part.endsWith("Foot"),
    arm = part.endsWith("UpperArm"),
    fore = part.endsWith("Forearm"),
    leg = part.endsWith("UpperLeg");
  if (hand) {
    oval(c, (sx + ex) / 2, (sy + ey) / 2, 3.6, 5.3, p.skin, true);
    oval(c, sx + (part.startsWith("left") ? 3 : -3), sy + 3, 1.8, 2.8, p.shade);
    line(c, sx - 2, ey - 1, sx + 1, ey - 1, p.shade, 0.7);
    return;
  }
  if (foot) {
    poly(
      c,
      [
        [sx - 5, sy - 3],
        [sx + 4, sy - 3],
        [ex + 6, ey - 1],
        [ex + 7, ey + 3],
        [sx - 6, ey + 3],
      ],
      "#333445",
    );
    line(c, sx - 4, ey + 2, ex + 6, ey + 2, "#a6aca7", 1.5);
    line(c, sx, sy, ex + 2, ey - 1, p.light, 0.8);
    return;
  }
  const skinFore =
    fore && ["developer", "designer", "chef", "admin"].includes(model);
  const radius = (g.radius || 0.04) * 126 * 0.9,
    base = skinFore ? p.skin : arm || fore ? p.cloth : "#424458",
    shadow = skinFore ? p.shade : arm || fore ? p.shadow : "#292d40";
  const r2 = radius * (leg ? 0.8 : 0.76);
  poly(
    c,
    [
      [sx + nx * radius, sy + ny * radius],
      [sx - nx * radius, sy - ny * radius],
      [ex - nx * r2, ey - ny * r2],
      [ex + nx * r2, ey + ny * r2],
    ],
    base,
  );
  oval(c, sx, sy, radius * 0.92, radius * 0.85, base);
  oval(c, ex, ey, r2 * 0.86, r2 * 0.8, base);
  line(
    c,
    sx - nx * radius * 0.6,
    sy - ny * radius * 0.6,
    ex - nx * r2 * 0.6,
    ey - ny * r2 * 0.6,
    shadow,
    Math.max(1, radius * 0.52),
  );
  if (arm) {
    line(
      c,
      sx + nx * radius * 0.4,
      sy + ny * radius * 0.4,
      ex + nx * r2 * 0.4,
      ey + ny * r2 * 0.4,
      p.light,
      1,
    );
    line(
      c,
      ex - nx * r2,
      ey - ny * r2,
      ex + nx * r2,
      ey + ny * r2,
      p.shadow,
      1.3,
    );
  }
  if (fore && !skinFore)
    line(
      c,
      ex - nx * r2,
      ey - ny * r2,
      ex + nx * r2,
      ey + ny * r2,
      p.accent,
      1.5,
    );
  if (leg) line(c, sx + nx, sy + 3, ex + nx, ey - 3, "#6f7381", 0.9);
}

export function makeHumanModelSheet(model: Model) {
  const out = document.createElement("canvas");
  out.width = 1536;
  out.height = 320;
  const c = out.getContext("2d")!;
  for (let col = 0; col < 6; col++) {
    c.save();
    c.translate(col * 256, 0);
    c.scale(256 / 126, 320 / 157.5);
    for (const part of JOINT_PARTS)
      paintHumanPart(
        c,
        model,
        col,
        part.name,
        rigPartGeometry(col, part.name, model),
      );
    c.restore();
  }
  return out;
}
const portraits = new Map<Role, string>();
export function careerPortrait40(role: Role) {
  const cached = portraits.get(role);
  if (cached) return cached;
  const model = gameplayModel(role),
    out = document.createElement("canvas");
  out.width = 192;
  out.height = 216;
  const c = out.getContext("2d")!;
  c.fillStyle = "#2c2b40";
  c.fillRect(0, 0, 192, 216);
  c.fillStyle = "#3d4653";
  c.beginPath();
  c.ellipse(98, 190, 78, 110, -0.3, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(-26, 10);
  c.scale(2, 2);
  for (const part of JOINT_PARTS)
    paintHumanPart(
      c,
      model,
      1,
      part.name,
      rigPartGeometry(1, part.name, model),
    );
  c.restore();
  c.save();
  c.translate(23, 165);
  c.rotate(-0.15);
  c.drawImage(makeProfessionTool(role), 0, 0, 144, 72);
  c.restore();
  const url = out.toDataURL("image/png");
  portraits.set(role, url);
  return url;
}
