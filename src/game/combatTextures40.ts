import type Phaser from "phaser";
import { FX_STAMPS } from "./combatGeometry";
/** Authored vector effects, rasterized once; no painted-atlas directional ambiguity or per-frame texture uploads. */
export function ensureCombatTextures(scene: Phaser.Scene) {
  const key = "combat-fx-40";
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement("canvas");
  canvas.width = 256 * FX_STAMPS.length;
  canvas.height = 256;
  const c = canvas.getContext("2d")!;
  FX_STAMPS.forEach((shape, index) => {
    c.save();
    c.translate(index * 256 + 128, 128);
    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = "#f5ecd9";
    c.fillStyle = "#f5ecd9";
    c.lineWidth = 4;
    const ring = (r: number, start = 0, end = Math.PI * 2) => {
      c.beginPath();
      c.arc(0, 0, r, start, end);
      c.stroke();
    };
    const line = (x: number, y: number, x2: number, y2: number, w = 4) => {
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x2, y2);
      c.stroke();
    };
    if (shape === "slash") {
      c.beginPath();
      c.arc(0, 0, 105, -0.98, 0.98);
      c.quadraticCurveTo(70, 25, 56, -8);
      c.arc(0, 0, 75, -0.1, -0.98, true);
      c.closePath();
      c.fill();
      c.globalAlpha = 0.45;
      c.lineWidth = 2;
      ring(115, -0.9, 0.68);
      ring(90, -0.5, 0.94);
    } else if (shape === "electric") {
      for (let j = 0; j < 3; j++) {
        c.save();
        c.rotate((j - 1) * 0.65);
        c.beginPath();
        c.moveTo(14, 0);
        c.lineTo(45, -8);
        c.lineTo(37, 9);
        c.lineTo(72, -6);
        c.lineTo(100, 0);
        c.stroke();
        c.restore();
      }
    } else if (shape === "frost") {
      for (let j = 0; j < 6; j++) {
        c.save();
        c.rotate((j * Math.PI) / 3);
        line(0, 0, 88, 0, 3);
        line(47, 0, 67, -15, 2);
        line(47, 0, 67, 15, 2);
        c.beginPath();
        c.moveTo(65, 0);
        c.lineTo(86, -6);
        c.lineTo(104, 0);
        c.lineTo(86, 6);
        c.closePath();
        c.fill();
        c.restore();
      }
    } else if (shape === "shield") {
      c.beginPath();
      c.moveTo(0, -88);
      c.lineTo(65, -57);
      c.lineTo(54, 31);
      c.quadraticCurveTo(40, 62, 0, 86);
      c.quadraticCurveTo(-40, 62, -54, 31);
      c.lineTo(-65, -57);
      c.closePath();
      c.stroke();
      line(-25, -3, -5, 18, 5);
      line(-5, 18, 31, -25, 5);
      c.globalAlpha = 0.15;
      c.fill();
    } else if (shape === "heal") {
      c.beginPath();
      c.roundRect(-10, -45, 20, 90, 3);
      c.roundRect(-45, -10, 90, 20, 3);
      c.fill();
      c.globalAlpha = 0.4;
      c.lineWidth = 2;
      ring(68, 0.15, 2.55);
      ring(68, 3.3, 5.7);
    } else if (shape === "critical") {
      for (let j = 0; j < 4; j++) {
        c.save();
        c.rotate((j * Math.PI) / 2 + 0.3);
        c.beginPath();
        c.moveTo(15, 0);
        c.lineTo(40, -5);
        c.lineTo(97, 0);
        c.lineTo(40, 5);
        c.closePath();
        c.fill();
        c.restore();
      }
    } else if (shape === "coffee" || shape === "mist") {
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4,
          r = 45 + (j % 3) * 9;
        c.globalAlpha = 0.22;
        c.beginPath();
        c.ellipse(
          Math.cos(a) * r,
          Math.sin(a) * r,
          20 + (j % 3) * 6,
          14,
          a,
          0,
          Math.PI * 2,
        );
        c.fill();
        c.globalAlpha = 0.75;
        line(
          Math.cos(a) * r,
          Math.sin(a) * r,
          Math.cos(a) * (r + 13),
          Math.sin(a) * (r + 13),
          2,
        );
      }
    } else if (shape === "orbit") {
      for (let j = 0; j < 3; j++) {
        c.save();
        c.rotate((j * Math.PI * 2) / 3);
        c.lineWidth = 2;
        ring(82, -0.65, 0.65);
        c.beginPath();
        c.moveTo(90, 0);
        c.lineTo(103, 7);
        c.lineTo(90, 22);
        c.lineTo(83, 7);
        c.closePath();
        c.fill();
        c.restore();
      }
    } else if (shape === "summon") {
      c.lineWidth = 2;
      c.beginPath();
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI) / 3;
        j ? c.lineTo(Math.cos(a) * 68, Math.sin(a) * 68) : c.moveTo(68, 0);
      }
      c.closePath();
      c.stroke();
      c.strokeRect(-20, -20, 40, 40);
    } else {
      for (let j = 0; j < 9; j++) {
        c.save();
        c.rotate((j * Math.PI * 2) / 9);
        c.beginPath();
        c.moveTo(25, -2);
        c.lineTo(65 + (j % 3) * 12, -5);
        c.lineTo(92 + (j % 2) * 10, 0);
        c.lineTo(65 + (j % 3) * 12, 5);
        c.closePath();
        c.fill();
        c.restore();
      }
      c.globalAlpha = 0.35;
      c.lineWidth = 2;
      ring(55);
    }
    c.restore();
  });
  const texture = scene.textures.addCanvas(key, canvas)!;
  FX_STAMPS.forEach((s, i) => texture.add(s, 0, i * 256, 0, 256, 256));
  return key;
}
