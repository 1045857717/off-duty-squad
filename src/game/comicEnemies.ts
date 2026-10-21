import type { EnemyKind } from "../../shared/types";
import { makePaintedAtlas } from "./paintedActors";
export const COMIC_ENEMY_MODELS: Record<EnemyKind, string> = {
  mite: "developer",
  hound: "technician",
  tank: "security",
  shooter: "designer",
  wraith: "director",
  bomber: "chef",
  boss: "director",
};
export function makeComicEnemyAtlas(
  source: HTMLImageElement | HTMLCanvasElement,
  kind: EnemyKind,
) {
  const role =
    kind === "boss"
      ? "director"
      : kind === "tank"
        ? "guardian"
        : kind === "bomber"
          ? "chef"
          : "scout";
  const walk = makePaintedAtlas(source, role, "walk"),
    cast = makePaintedAtlas(source, role, "cast"),
    out = document.createElement("canvas");
  out.width = 112 * 16;
  out.height = 112 * 5;
  const c = out.getContext("2d")!;
  for (let f = 0; f < 68; f++) {
    const dead = f >= 48 ? (f - 48) / 19 : 0,
      attack = f >= 32 && f < 48 ? (f - 32) / 15 : 0,
      gait = f < 32 ? f / 32 : 0;
    c.save();
    c.translate((f % 16) * 112 + 56, Math.floor(f / 16) * 112 + 58);
    c.globalAlpha = 1 - dead * 0.45;
    c.rotate(dead * 1.5 + (kind === "hound" ? 0.1 : 0));
    c.scale(1 - dead * 0.15, 1 - dead * 0.4);
    const frame = f >= 32 && f < 48 ? f - 32 : Math.floor(gait * 24) % 24,
      atlas = attack ? cast : walk;
    c.drawImage(atlas, frame * 96, 112, 96, 112, -48, -56, 96, 112);
    c.lineWidth = 1.2;
    c.strokeStyle = "#4b5144";
    if (kind === "mite") {
      c.fillStyle = "#b87541";
      c.fillRect(13, 6, 10, 12);
      c.fillStyle = "#edd9b0";
      c.fillRect(14, 6, 8, 2);
    }
    if (kind === "shooter") {
      c.fillStyle = "#dbd4b7";
      c.beginPath();
      c.roundRect(-15, -5, 31, 19, 3);
      c.fill();
      c.stroke();
      c.fillStyle = "#45636d";
      c.fillRect(-11, -1, 22, 4);
      c.fillStyle = "#faf2d8";
      c.fillRect(-8, 7, 16, 15 + attack * 9);
      c.strokeStyle = "#8d9884";
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(-5, 10 + i * 3);
        c.lineTo(4, 10 + i * 3);
        c.stroke();
      }
    }
    if (kind === "tank") {
      c.fillStyle = "#bbb397";
      c.fillRect(-18, -1, 12, 28);
      c.fillRect(6, -1, 12, 28);
      c.fillStyle = "#f0e6cd";
      for (let i = 0; i < 4; i++) c.fillRect(-17, 2 + i * 6, 10, 1);
    }
    if (kind === "hound") {
      c.strokeStyle = "#846c4c";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-15, 20);
      c.lineTo(14, 20);
      c.stroke();
      for (const x of [-12, 12]) {
        c.fillStyle = "#263f48";
        c.beginPath();
        c.arc(x, 25, 4, 0, 6.29);
        c.fill();
      }
    }
    if (kind === "wraith") {
      c.strokeStyle = "#333f48";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(11, -31);
      c.lineTo(16, -16);
      c.stroke();
      c.strokeStyle = "#d6a75e";
      c.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(18, -25, 5 + i * 5, -0.8, 0.8);
        c.stroke();
      }
    }
    if (kind === "bomber") {
      const g = c.createLinearGradient(-16, 0, 16, 20);
      g.addColorStop(0, "#c78b4d");
      g.addColorStop(1, "#765b41");
      c.fillStyle = g;
      c.beginPath();
      c.roundRect(-16, 0, 32, 29, 7);
      c.fill();
      c.stroke();
      c.fillStyle = "#dfc699";
      c.beginPath();
      c.ellipse(0, 0, 16, 4, 0, 0, 6.29);
      c.fill();
      c.fillStyle = "#4d645e";
      c.fillRect(-7, 9, 14, 9);
    }
    if (kind === "boss") {
      c.fillStyle = "#d79749";
      c.beginPath();
      c.ellipse(0, 8 + Math.sin(attack * Math.PI) * 5, 25, 13, 0, 0, 6.29);
      c.fill();
      c.strokeStyle = "#f2d5a0";
      c.lineWidth = 2;
      for (let i = -16; i <= 16; i += 8) {
        c.beginPath();
        c.moveTo(i - 5, 0);
        c.lineTo(i + 7, 18);
        c.moveTo(i + 7, 0);
        c.lineTo(i - 5, 18);
        c.stroke();
      }
      c.fillStyle = "#d7b968";
      c.beginPath();
      c.moveTo(-9, -43);
      c.lineTo(-10, -52);
      c.lineTo(-4, -47);
      c.lineTo(0, -54);
      c.lineTo(4, -47);
      c.lineTo(10, -52);
      c.lineTo(9, -43);
      c.fill();
    }
    c.restore();
  }
  return out;
}
