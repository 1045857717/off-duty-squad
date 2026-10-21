import { directionView } from "./actorPose";
import type { Role } from "../../shared/types";
export const GAMEPLAY_MODELS = [
  "developer",
  "technician",
  "security",
  "admin",
  "workhorse",
  "chef",
  "director",
  "designer",
] as const;
export function gameplayModel(role: Role): (typeof GAMEPLAY_MODELS)[number] {
  if (["engineer", "logistics", "qa", "duck"].includes(role))
    return "technician";
  if (["guardian", "driver", "blametaker"].includes(role)) return "security";
  if (["medic", "hr", "cleaner", "slacker", "landlord"].includes(role))
    return "admin";
  if (role === "workhorse") return "workhorse";
  if (["chef", "barista"].includes(role)) return "chef";
  if (["manager", "sales", "lawyer", "director", "investor"].includes(role))
    return "director";
  if (["designer", "creator", "ppt"].includes(role)) return "designer";
  return "developer";
}
export function makePaintedAtlas(
  source: HTMLImageElement | HTMLCanvasElement,
  role: Role,
  action: "walk" | "idle" | "cast" | "assist" = "walk",
) {
  const frames = action === "walk" || action === "idle" ? 24 : 16,
    canvas = document.createElement("canvas");
  canvas.width = 96 * frames;
  canvas.height = 112 * 8;
  const c = canvas.getContext("2d")!;
  const sw = source.width / (source.width >= 1500 ? 6 : 4),
    sh = source.height;
  for (let d = 0; d < 8; d++)
    for (let f = 0; f < frames; f++) {
      const phase = (f / frames) * Math.PI * 2,
        stride = Math.sin(phase),
        cast =
          action === "walk" || action === "idle"
            ? 0
            : Math.sin((f / (frames - 1)) * Math.PI),
        bob = action === "walk" ? Math.cos(phase * 2) * 0.85 : cast * 1.6;
      const view = directionView((d * Math.PI) / 4),
        col = source.width >= 1500 ? view.column : Math.min(3, view.column),
        flip = view.flip;
      c.save();
      c.translate(f * 96 + 48, d * 112 + 55 + bob);
      if (flip) c.scale(-1, 1);
      if (action === "assist") {
        c.translate(0, 7);
        c.scale(1, 0.83);
        c.rotate(-0.12 * cast);
      }
      const w = 84,
        h = 105,
        dx = -42,
        dy = -53;
      function piece(
        x: number,
        y: number,
        pw: number,
        ph: number,
        px: number,
        py: number,
        angle = 0,
        oy = 0,
      ) {
        c.save();
        c.translate(dx + px * w, dy + py * h + oy);
        c.rotate(angle);
        c.drawImage(
          source,
          col * sw + x * sw,
          y * sh,
          pw * sw,
          ph * sh,
          (x - px) * w,
          (y - py) * h,
          pw * w,
          ph * h,
        );
        c.restore();
      }
      // Limbs have their own hip/shoulder pivots; motion is baked once, not segmented every render frame.
      piece(
        0.29,
        0.61,
        0.21,
        0.39,
        0.43,
        0.63,
        action === "walk" ? stride * 0.09 : cast * 0.06,
        action === "walk" ? stride * 1.5 : 0,
      );
      piece(
        0.5,
        0.61,
        0.21,
        0.39,
        0.57,
        0.63,
        action === "walk" ? -stride * 0.09 : -cast * 0.06,
        action === "walk" ? -stride * 1.5 : 0,
      );
      piece(
        0.06,
        0.28,
        0.24,
        0.37,
        0.28,
        0.32,
        action === "walk" ? -stride * 0.11 : -cast * 0.8,
      );
      piece(
        0.7,
        0.28,
        0.24,
        0.37,
        0.72,
        0.32,
        action === "walk" ? stride * 0.11 : cast * 0.7,
      );
      piece(0.285, 0.27, 0.43, 0.38, 0.5, 0.5, Math.sin(phase) * 0.012);
      piece(
        0,
        0,
        1,
        0.29,
        0.5,
        0.285,
        Math.sin(phase) * 0.017,
        Math.sin(phase) * 0.2,
      );
      // Occupation accessories add distinct readable silhouettes within shared natural-proportion rigs.
      if (col !== 3) {
        c.save();
        c.translate(0, -3);
        c.strokeStyle = "#f0d8a0";
        c.lineWidth = 0.8;
        if (role === "duck") {
          c.fillStyle = "#dfb640";
          c.beginPath();
          c.ellipse(0, -46, 5, 3, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "#b77932";
          c.fillRect(3, -47, 4, 2);
        }
        if (role === "blametaker") {
          c.fillStyle = "#354044";
          c.beginPath();
          c.ellipse(0, -44, 8, 3, 0, 0, Math.PI * 2);
          c.fill();
        }
        if (role === "intern") {
          c.fillStyle = "#e8c76f";
          c.fillRect(-6, 4, 5, 4);
          c.fillRect(4, -4, 5, 4);
        }
        if (role === "cleaner") {
          c.fillStyle = "#6faaa4";
          c.fillRect(-8, 2, 16, 10);
          c.strokeRect(-8, 2, 16, 10);
        }
        if (role === "slacker") {
          c.fillStyle = "#688f99";
          c.fillRect(-6, -42, 12, 3);
        }
        if (role === "creator") {
          c.fillStyle = "#364c50";
          c.fillRect(-4, 0, 8, 5);
          c.fillStyle = "#a5c6c1";
          c.beginPath();
          c.arc(0, 2, 2, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
      // Eyelid micro-action only a few frames per cycle; high-resolution face remains from generated painting.
      if ((f === 0 || f === 1) && col === 0) {
        c.strokeStyle = "#5e4b40";
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(-3.3, -36);
        c.lineTo(-1.5, -36);
        c.moveTo(1.3, -36);
        c.lineTo(3.1, -36);
        c.stroke();
      }
      c.restore();
    }
  return canvas;
}
