import { drawOfficeHuman } from "./officeHero";
import type { Role } from "../../shared/types";
export function makeZombieAtlas(kind: string) {
  const cell = 112,
    cols = 16,
    out = document.createElement("canvas");
  out.width = cell * cols;
  out.height = cell * 5;
  const c = out.getContext("2d")!;
  const roles: Role[] =
    kind === "tank"
      ? ["guardian"]
      : kind === "shooter"
        ? ["cleaner"]
        : kind === "hound"
          ? ["driver"]
          : kind === "wraith"
            ? ["teacher"]
            : kind === "bomber"
              ? ["chef"]
              : kind === "boss"
                ? ["manager"]
                : ["scout", "accountant", "sales", "medic"];
  for (let f = 0; f < 68; f++) {
    const dead = f >= 48 ? (f - 48) / 19 : 0,
      attack = f >= 32 && f < 48 ? (f - 32) / 15 : 0,
      t = f < 32 ? f / 32 : 0,
      strike = Math.sin(attack * Math.PI),
      scale =
        kind === "boss"
          ? 1.85
          : kind === "tank"
            ? 1.6
            : kind === "bomber"
              ? 1.45
              : 1.3;
    c.save();
    c.translate(
      (f % cols) * cell + cell / 2,
      Math.floor(f / cols) * cell + cell / 2,
    );
    c.scale(scale, scale);
    c.rotate(
      kind === "hound"
        ? 0.18 + strike * 0.2
        : Math.sin(t * Math.PI * 2) * 0.045,
    );
    c.translate(-24, -27 + strike * 4);
    drawOfficeHuman(c, roles[0], t, 2, true, 0, strike, dead);
    c.strokeStyle = "#81917e";
    c.lineWidth = 2.6;
    c.lineCap = "round";
    for (const side of [-1, 1]) {
      const x = 24 + side * 8,
        y = 27 + Math.sin(t * 6.28 + side) * 2 - strike * 3;
      c.beginPath();
      c.moveTo(x, 22);
      c.quadraticCurveTo(x + side * 4, 23, x + side * 4, 31 + strike * 4);
      c.stroke();
      c.strokeStyle = "#b2b39b";
      c.lineWidth = 0.55;
      for (let n = 0; n < 3; n++) {
        c.beginPath();
        c.moveTo(x + side * 4 + n * 0.6, 30 + strike * 4);
        c.lineTo(x + side * 4 + n * 0.6, 34 + strike * 4);
        c.stroke();
      }
      c.strokeStyle = "#81917e";
      c.lineWidth = 2.6;
    }
    c.fillStyle = "#425552";
    c.beginPath();
    c.ellipse(22, 11.5, 1.5, 1, 0, 0, Math.PI * 2);
    c.ellipse(27, 11.5, 1.5, 1, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#c5b995";
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(22, 16);
    c.lineTo(27, 17 + strike * 2);
    c.stroke();
    if (kind === "mite") {
      c.strokeStyle = "#4b5049";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(18, 15);
      c.lineTo(16, 29 + Math.sin(t * 6) * 2);
      c.stroke();
    }
    if (kind === "tank") {
      c.fillStyle = "#46534b";
      c.beginPath();
      c.roundRect(12, 20, 23, 13, 3);
      c.fill();
      c.strokeStyle = "#9fa587";
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = "#b6ab79";
      c.fillRect(17, 22, 12, 2);
    }
    if (kind === "shooter") {
      c.fillStyle = "#628b76";
      c.beginPath();
      c.ellipse(24, 17, 6, 8, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#a5b78f";
      c.fillRect(21, 18, 7, 3);
    }
    if (kind === "bomber") {
      const g = c.createRadialGradient(24, 28, 2, 24, 28, 11);
      g.addColorStop(0, "#bda067");
      g.addColorStop(0.5, "#817e5c");
      g.addColorStop(1, "#3f5148");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(24, 29, 12, 10 + strike * 2, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#a1a180";
      c.lineWidth = 0.8;
      c.stroke();
    }
    if (kind === "wraith") {
      c.fillStyle = "#222c2c";
      c.beginPath();
      c.ellipse(25, 15, 2, 3 + strike * 2, 0, 0, Math.PI * 2);
      c.fill();
      if (strike > 0.5) {
        c.strokeStyle = "#c5bda466";
        c.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          c.arc(25, 15, 8 + i * 5, -1.4, 1.4);
          c.stroke();
        }
      }
    }
    if (kind === "boss") {
      c.fillStyle = "#635f59";
      c.beginPath();
      c.roundRect(8, 21, 9, 13, 2);
      c.fill();
      c.fillStyle = "#aaa48a";
      c.fillRect(9, 22, 7, 2);
      c.strokeStyle = "#d7c892";
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(14, 17);
      c.lineTo(10, 12);
      c.lineTo(8, 17);
      c.lineTo(5, 13);
      c.stroke();
    }
    c.restore();
  }
  return out;
}
