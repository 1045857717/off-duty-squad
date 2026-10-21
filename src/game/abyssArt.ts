import { makeOfficeChunk } from "./officeMap";
import { makeOfficeHeroAtlas, makeOfficePortrait } from "./officeHero";
import { makeZombieAtlas } from "./zombieArt";
import { makeOrganicEnemyAtlas } from "./enemyArt";
import type { World, Role } from "../../shared/types";
type C = CanvasRenderingContext2D;
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { canvas: c, c: c.getContext("2d")! };
}
function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function poly(c: C, points: number[][], color: string) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function line(
  c: C,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
const accent = ["#b9b28e", "#c29c62", "#7db2b1", "#ae8eaa"];
export const makeDungeonChunk = makeOfficeChunk;
function hero(c: C, role: Role, frame: number, d: number) {
  const t = (frame / 24) * Math.PI * 2,
    a = (d * Math.PI) / 4,
    front = Math.sin(a) > -0.35,
    side = Math.cos(a),
    col = accent[["scout", "engineer", "medic", "guardian"].indexOf(role)];
  c.save();
  c.translate(24, 29);
  const stride = Math.sin(t) * 3.5,
    bob = Math.cos(t * 2) * 0.35;
  c.translate(0, bob);
  // Long, angular armored silhouette with a narrow visor, no cartoon eyes.
  poly(
    c,
    [
      [-12, -5],
      [-8, -11],
      [8, -11],
      [12, -5],
      [10, 15],
      [-10, 15],
    ],
    "#101b28",
  );
  rect(c, -13, -4, 5, 15, "#35474c");
  rect(c, 8, -4, 5, 15, "#35474c");
  for (const sign of [-1, 1]) {
    const y = 19 + stride * sign;
    poly(
      c,
      [
        [sign * 6 - 3, 8],
        [sign * 6 + 4, 8],
        [sign * 7 + 4, y + 3],
        [sign * 7 - 4, y + 3],
      ],
      "#26323d",
    );
    rect(c, sign * 7 - 5, y, 10, 5, "#111e2d");
    rect(c, sign * 7 - 4, y, 8, 2, "#626c70");
  }
  poly(
    c,
    [
      [-10, -6],
      [-6, -11],
      [6, -11],
      [10, -6],
      [9, 8],
      [4, 12],
      [-4, 12],
      [-9, 8],
    ],
    "#536269",
  );
  poly(
    c,
    [
      [-8, -6],
      [-4, -9],
      [0, -5],
      [0, 6],
      [-7, 3],
    ],
    "#6b7976",
  );
  poly(
    c,
    [
      [1, -5],
      [6, -9],
      [9, -4],
      [7, 6],
      [1, 7],
    ],
    "#364951",
  );
  line(c, -6, -3, 6, -3, col, 2);
  rect(c, -8, 9, 16, 3, "#182b3a");
  rect(c, -2, 8, 4, 4, col);
  for (const sign of [-1, 1]) {
    const arm = Math.sin(t + (sign * Math.PI) / 2) * 5.5;
    c.save();
    c.translate(sign * 10, -5);
    c.rotate(Math.sin(t + (sign * Math.PI) / 2) * 0.19);
    c.translate(-sign * 10, 5);
    poly(
      c,
      [
        [sign * 10 - 3, -7],
        [sign * 10 + 4, -5],
        [sign * 14 + 3, 7 + arm],
        [sign * 14 - 3, 9 + arm],
      ],
      "#3e535e",
    );
    rect(c, sign * 14 - 3, 5 + arm, 6, 5, "#111c2a");
    poly(
      c,
      [
        [sign * 10 - 5, -8],
        [sign * 10 + 4, -10],
        [sign * 13 + 4, -3],
        [sign * 9 - 4, -1],
      ],
      col,
    );
    c.restore();
  }
  poly(
    c,
    [
      [-10, -25],
      [-5, -30],
      [5, -30],
      [10, -25],
      [11, -12],
      [7, -7],
      [-7, -7],
      [-11, -13],
    ],
    "#0d1927",
  );
  poly(
    c,
    [
      [-8, -25],
      [-4, -28],
      [5, -28],
      [8, -24],
      [9, -14],
      [5, -10],
      [-6, -11],
      [-9, -15],
    ],
    "#697879",
  );
  poly(
    c,
    [
      [-7, -25],
      [-3, -28],
      [3, -28],
      [4, -22],
      [-6, -20],
    ],
    "#92988a",
  );
  if (front) {
    poly(
      c,
      [
        [-8 + side, -21],
        [7 + side, -21],
        [7 + side, -16],
        [-7 + side, -16],
      ],
      "#101f30",
    );
    line(
      c,
      -6 + side,
      -18,
      6 + side,
      -18,
      role === "guardian" ? "#bf9b9e" : "#c8c8a3",
      2,
    );
    line(c, -5, -12, 5, -12, "#202f3d", 2);
  } else {
    rect(c, -6, -22, 12, 9, "#3a4f58");
    rect(c, -3, -18, 6, 2, col);
  }
  line(c, 8, -23, 12, -32, "#8b9391", 1);
  rect(c, -12, -20, 3, 8, "#293e4c");
  rect(c, 9, -20, 3, 8, "#293e4c");
  if (role === "scout")
    poly(
      c,
      [
        [-9, -5],
        [-12, 16],
        [-3, 8],
      ],
      "#3d4d43",
    );
  if (role === "guardian") {
    poly(
      c,
      [
        [-18, 0],
        [-11, -3],
        [-9, 15],
        [-15, 20],
        [-19, 11],
      ],
      "#596974",
    );
    line(c, -16, 2, -14, 15, col, 2);
  }
  if (role === "medic") {
    rect(c, 8, 3, 7, 11, "#6e7c73");
    rect(c, 10, 6, 3, 5, "#82aaa0");
  }
  if (role === "engineer") {
    rect(c, -13, 3, 5, 10, "#a88b5f");
    line(c, -11, 4, -11, 12, "#dec692", 1);
  }
  c.restore();
}
export const makeDarkHeroAtlas = makeOfficeHeroAtlas;
export const makeDarkPortrait = makeOfficePortrait;
export const ENEMY_ATLAS = {
  cell: 112,
  columns: 16,
  move: 32,
  attack: 16,
  death: 20,
  frames: 68,
};
export const makeDarkEnemyAtlas = makeZombieAtlas;

function makeCataclysmChunk(world: World, chunkX: number, chunkY: number) {
  const { canvas: out, c } = canvas(1024, 1024);
  c.scale(2, 2);
  const sx = chunkX * 512,
    sy = chunkY * 512;
  rect(c, 0, 0, 512, 512, "#100d12");
  // Global waves of fractured basalt cross tile boundaries with no visible grid.
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const gx = chunkX * 8 + x,
        gy = chunkY * 8 + y,
        k = gy * world.cols + gx,
        px = x * 64,
        py = y * 64;
      if (gx >= world.cols || gy >= world.rows) continue;
      const h = ((gx * 73856093) ^ (gy * 19349663) ^ world.seed) >>> 0;
      if (world.tiles[k]) {
        rect(
          c,
          px,
          py,
          64,
          64,
          ["#312b2a", "#302b2a", "#312c2b", "#302b2a"][h % 4],
        );
        for (let i = 0; i < 9; i++) {
          const xx = px + ((h * (i + 3)) % 61),
            yy = py + ((h >>> i) % 61);
          rect(c, xx, yy, 2 + (h % 5), 1, "#8a736b30");
        }
        if (h % 4 === 0) {
          const crackY = (gy * 31 + gx * 17 + world.seed) % 51;
          line(c, px - 2, py + crackY, px + 32, py + crackY + 12, "#151219", 2);
          line(
            c,
            px + 32,
            py + crackY + 12,
            px + 66,
            py + crackY - 4,
            "#66504a60",
            1,
          );
        }
        if (h % 31 === 0) {
          poly(
            c,
            [
              [px + 7, py + 12],
              [px + 47, py + 8],
              [px + 55, py + 39],
              [px + 15, py + 48],
            ],
            "#1c2528",
          );
          line(c, px + 12, py + 16, px + 43, py + 12, "#8c837866", 2);
          line(c, px + 18, py + 44, px + 52, py + 35, "#a67a4b55", 3);
        }
        if (h % 29 === 0) {
          line(c, px + 8, py + 48, px + 49, py + 16, "#4f5350", 5);
          line(c, px + 13, py + 49, px + 54, py + 17, "#151b20", 2);
        }
        if (h % 59 === 0) {
          c.font = "9px Consolas";
          c.fillStyle = "#b28a6355";
          c.fillText("EVAC / 07", px + 5, py + 35);
        }
        if (!world.tiles[k - world.cols])
          line(c, px, py + 5, px + 64, py + 3, "#ba654b75", 3);
      } else {
        // Connected piles read as collapsed landforms, not individual wall tiles.
        rect(c, px, py, 64, 64, "#171519");
        const up = world.tiles[k - world.cols],
          left = world.tiles[k - 1],
          right = world.tiles[k + 1],
          down = world.tiles[k + world.cols];
        poly(
          c,
          [
            [px + (left ? 6 : 0), py + (up ? 7 : 0)],
            [px + 64 - (right ? 5 : 0), py + (up ? 4 : 0)],
            [px + 64 - (right ? 8 : 0), py + 64 - (down ? 6 : 0)],
            [px + (left ? 3 : 0), py + 64 - (down ? 4 : 0)],
          ],
          "#242125",
        );
        if (up) line(c, px + 4, py + 6, px + 60, py + 4, "#74625788", 2);
        if (left) line(c, px + 5, py + 8, px + 3, py + 60, "#6c4e4166", 2);
        if (h % 3 === 0) {
          line(c, px + 9, py + 3, px + 26, py + 33, "#9a453d88", 2);
          line(c, px + 26, py + 33, px + 55, py + 48, "#e482533b", 1);
        }
        if (h % 5 === 0) {
          line(c, px + 14, py + 17, px + 52, py + 52, "#5b4e4b", 5);
          line(c, px + 17, py + 18, px + 55, py + 53, "#14141c", 2);
        }
      }
    }
  c.save();
  c.beginPath();
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      if (world.tiles[(chunkY * 8 + y) * world.cols + chunkX * 8 + x])
        c.rect(x * 64, y * 64, 64, 64);
  c.clip();
  // Large scorched impact sites and broken evacuation lanes span many cells.
  for (let i = 1; i < world.points.length; i += 2) {
    const p = world.points[i],
      x = p.x - sx,
      y = p.y - sy;
    if (x < -200 || y < -160 || x > 712 || y > 672) continue;
    c.save();
    c.translate(x, y);
    c.rotate(((world.seed % 17) + i) * 0.31);
    const g = c.createRadialGradient(0, 0, 5, 0, 0, 120);
    g.addColorStop(0, "#100e14bb");
    g.addColorStop(0.65, "#1e181e55");
    g.addColorStop(1, "transparent");
    c.fillStyle = g;
    c.fillRect(-125, -125, 250, 250);
    c.beginPath();
    c.ellipse(0, 0, 100, 65, 0, Math.PI * 0.12, Math.PI * 1.8);
    c.strokeStyle = "#8c6d4a33";
    c.lineWidth = 3;
    c.stroke();
    line(c, -115, 45, 88, 34, "#584c3f40", 25);
    c.setLineDash([21, 28]);
    line(c, -115, 45, 88, 34, "#c2a06940", 2);
    c.setLineDash([]);
    line(c, -80, -41, 55, -13, "#70635b66", 9);
    line(c, -77, -39, 56, -11, "#171b20", 3);
    c.restore();
  }
  c.restore();
  // Deterministic faults sweep diagonally across the complete map.
  c.save();
  c.globalCompositeOperation = "screen";
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const wx = sx + x,
        wy =
          world.h * (0.16 + i * 0.28) +
          Math.sin(wx * 0.003 + world.seed + i) * 95 +
          wx * 0.08;
      const yy = wy - sy;
      if (x === 0) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.strokeStyle = "#bd593a22";
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = "#edb46b22";
    c.lineWidth = 1;
    c.stroke();
  }
  c.restore();
  return out;
}
