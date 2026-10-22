import { makeOfficeChunk } from "./officeMap";
import { makeOfficeHeroAtlas, makeOfficePortrait } from "./officeHero";
import { makeZombieAtlas } from "./zombieArt";
import { makeOrganicEnemyAtlas } from "./enemyArt";
import type { Role } from "../../shared/types";
type C = CanvasRenderingContext2D;
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
