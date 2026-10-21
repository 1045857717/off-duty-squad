import type Phaser from "phaser";
import { GAMEPLAY_MODELS } from "./paintedActors";
import { JOINT_PARTS } from "./joints";
import { ROLES } from "../../shared/content";
import { ENEMY_DEFS } from "../../shared/combatProfiles";
export function ensureRigAtlas(scene: Phaser.Scene) {
  const key = "joint-atlas-v34";
  if (scene.textures.exists(key)) return key;
  const roles = Object.keys(ROLES),
    enemies = Object.keys(ENEMY_DEFS),
    props = [...roles, ...enemies.map((k) => "enemy-" + k), "blink"];
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 320 * 8 + Math.ceil(props.length / 16) * 112;
  const c = canvas.getContext("2d")!;
  for (let m = 0; m < GAMEPLAY_MODELS.length; m++)
    c.drawImage(
      scene.textures
        .get("painted-" + GAMEPLAY_MODELS[m])
        .getSourceImage() as HTMLImageElement,
      0,
      m * 320,
    );
  const rects: Record<string, { x: number; y: number; w: number; h: number }> =
    {};
  for (let m = 0; m < GAMEPLAY_MODELS.length; m++)
    for (let col = 0; col < 6; col++)
      for (const part of JOINT_PARTS) {
        const [x, y, w, h] = part.rect;
        rects[`${GAMEPLAY_MODELS[m]}-${col}-${part.name}`] = {
          x: Math.round(col * 256 + x * 256),
          y: Math.round(m * 320 + y * 320),
          w: Math.round(w * 256),
          h: Math.round(h * 320),
        };
      }
  props.forEach((prop, i) => {
    const x = (i % 16) * 96,
      y = 2560 + Math.floor(i / 16) * 112;
    c.save();
    c.translate(x + 48, y + 56);
    drawProp(c, prop);
    c.restore();
    rects["prop-" + prop] = { x, y, w: 96, h: 112 };
  });
  const atlas = scene.textures.addCanvas(key, canvas)!;
  for (const [id, r] of Object.entries(rects))
    atlas.add(id, 0, r.x, r.y, r.w, r.h);
  return key;
}
export function drawProp(c: CanvasRenderingContext2D, id: string) {
  c.lineWidth = 1.2;
  c.strokeStyle = "#46524d";
  if (id === "blink") {
    c.strokeStyle = "#584336";
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-3.3, -36);
    c.lineTo(-1.5, -36);
    c.moveTo(1.3, -36);
    c.lineTo(3.1, -36);
    c.stroke();
  }
  if (id === "duck") {
    c.fillStyle = "#e7ba38";
    c.beginPath();
    c.ellipse(0, -46, 6, 3.5, 0, 0, 6.29);
    c.fill();
    c.fillStyle = "#bb782e";
    c.fillRect(4, -46, 5, 3);
  }
  if (id === "blametaker") {
    c.fillStyle = "#394446";
    c.beginPath();
    c.ellipse(0, -45, 8.5, 3, 0, 0, 6.29);
    c.fill();
    c.stroke();
  }
  if (id === "intern") {
    c.fillStyle = "#f0cd72";
    c.fillRect(-7, 2, 5, 5);
    c.fillRect(4, -5, 5, 5);
  }
  if (id === "cleaner") {
    c.fillStyle = "#689d96";
    c.fillRect(-9, -1, 18, 14);
    c.strokeRect(-4, 3, 8, 5);
  }
  if (id === "slacker") {
    c.fillStyle = "#638e9e";
    c.fillRect(-6, -37, 12, 3);
  }
  if (id === "creator") {
    c.fillStyle = "#334a50";
    c.fillRect(-5, -1, 10, 7);
    c.fillStyle = "#a5c4c3";
    c.beginPath();
    c.arc(0, 2.5, 2.4, 0, 6.29);
    c.fill();
  }
  if (id === "director" || id === "investor") {
    c.fillStyle = "#e3b452";
    c.beginPath();
    c.arc(7, -14, 2, 0, 6.29);
    c.fill();
  }
  if (id === "enemy-mite") {
    c.fillStyle = "#b87541";
    c.fillRect(12, 3, 12, 16);
    c.fillStyle = "#efdeb4";
    for (let i = 0; i < 3; i++) c.fillRect(14, 5 + i * 3, 8, 1);
  }
  if (id === "enemy-shooter") {
    c.fillStyle = "#dcd4b9";
    c.beginPath();
    c.roundRect(-15, -5, 31, 20, 3);
    c.fill();
    c.stroke();
    c.fillStyle = "#3f5964";
    c.fillRect(-11, -1, 22, 4);
    c.fillStyle = "#f6f0dd";
    c.fillRect(-8, 8, 16, 18);
    c.strokeStyle = "#8d9884";
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-5, 11 + i * 3);
      c.lineTo(4, 11 + i * 3);
      c.stroke();
    }
  }
  if (id === "enemy-tank") {
    c.fillStyle = "#aaa58d";
    c.fillRect(-19, -1, 13, 28);
    c.fillRect(6, -1, 13, 28);
    c.strokeRect(-19, -1, 13, 28);
    c.strokeRect(6, -1, 13, 28);
    c.fillStyle = "#f1e8ce";
    for (let i = 0; i < 4; i++) {
      c.fillRect(-18, 2 + i * 6, 10, 1);
      c.fillRect(7, 2 + i * 6, 10, 1);
    }
  }
  if (id === "enemy-hound") {
    c.strokeStyle = "#8b6b43";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-14, 45);
    c.lineTo(14, 45);
    c.stroke();
    c.fillStyle = "#293e49";
    for (const x of [-13, 13]) {
      c.beginPath();
      c.arc(x, 48, 4, 0, 6.29);
      c.fill();
    }
  }
  if (id === "enemy-wraith") {
    c.strokeStyle = "#313d48";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(11, -32);
    c.lineTo(17, -15);
    c.stroke();
    c.strokeStyle = "#d6a75e";
    c.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(19, -25, 5 + i * 5, -0.8, 0.8);
      c.stroke();
    }
  }
  if (id === "enemy-bomber") {
    const g = c.createLinearGradient(-16, 0, 16, 28);
    g.addColorStop(0, "#cd9856");
    g.addColorStop(1, "#71533d");
    c.fillStyle = g;
    c.beginPath();
    c.roundRect(-16, 0, 32, 29, 7);
    c.fill();
    c.stroke();
    c.fillStyle = "#dfc699";
    c.beginPath();
    c.ellipse(0, 0, 16, 4, 0, 0, 6.29);
    c.fill();
    c.fillStyle = "#44645a";
    c.fillRect(-7, 9, 14, 9);
  }
  if (id === "enemy-boss") {
    c.fillStyle = "#d79749";
    c.beginPath();
    c.ellipse(0, 8, 25, 13, 0, 0, 6.29);
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
    c.closePath();
    c.fill();
  }
}
