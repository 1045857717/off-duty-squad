import { MAP_WALLS, ROLES, WORLD } from "../../shared/content";
import type { Role } from "../../shared/types";
export const ART_SCALE = 2,
  HERO_FRAME = { w: 96, h: 112, columns: 24, rows: 8 };
type C = CanvasRenderingContext2D;
function surface(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * 2);
  canvas.height = Math.ceil(h * 2);
  const c = canvas.getContext("2d")!;
  c.scale(2, 2);
  return { canvas, c };
}
function rect(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
  stroke?: string,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = 1;
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function ellipse(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
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
function light(c: C, x: number, y: number, r: number, color: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ellipse(c, x, y, r, r, g);
}
function seeded(n: number) {
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function plant(
  c: C,
  x: number,
  y: number,
  seed: number,
  variant = 0,
  scale = 1,
) {
  const random = seeded(seed);
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  ellipse(c, 0, 8, 18, 6, "#0b192b80");
  rect(c, -11, 0, 22, 13, 3, "#50666c", "#8ba29a");
  rect(c, -12, -2, 24, 5, 2, "#b9c0a0");
  ellipse(c, 0, -1, 10, 3, "#263e36");
  for (let i = 0; i < 8; i++) {
    const a = i * 2.399 + seed,
      r = 8 + random() * 7,
      dy = Math.sin(a) * 9 - 8,
      dx = Math.cos(a) * r;
    c.save();
    c.translate(dx, dy);
    c.rotate(a * 0.5);
    ellipse(
      c,
      0,
      0,
      4.5,
      9,
      ["#286b59", "#459b6c", "#85c88a", "#addc91"][i % 4],
    );
    line(c, 0, -6, 0, 5, "#b6d99280");
    c.restore();
    if (variant && i % 3 === 0) {
      ellipse(c, dx, dy - 5, 3, 3, variant === 2 ? "#d3a5e9" : "#eeca82");
      ellipse(c, dx, dy - 5, 1, 1, "#fff5d6");
    }
  }
  c.restore();
}
function terminal(c: C, x: number, y: number, color: string) {
  ellipse(c, x + 18, y + 35, 31, 8, "#0c1f2d88");
  rect(c, x - 6, y + 22, 53, 14, 4, "#4c696c", "#8aaba7");
  rect(c, x, y - 4, 35, 30, 4, "#122c3b", "#739c98");
  const g = c.createLinearGradient(x, y, x + 34, y + 24);
  g.addColorStop(0, "#23566a");
  g.addColorStop(1, "#102b3c");
  rect(c, x + 3, y, 29, 21, 2, g);
  rect(c, x + 7, y + 4, 12, 2, 1, color);
  for (let i = 0; i < 3; i++)
    rect(c, x + 7, y + 9 + i * 4, 18 - i * 4, 1, 0, "#85b6b8");
  rect(c, x + 37, y + 25, 5, 5, 1, color);
  line(c, x + 1, y + 29, x + 25, y + 29, "#a4bca2");
}
export function makeMapHD(sector = 0) {
  const { canvas, c } = surface(WORLD.w, WORLD.h),
    random = seeded(702),
    accent = ["#b4e8a8", "#8edbdc", "#d5b3eb"][sector];
  c.fillStyle = "#132c3b";
  c.fillRect(0, 0, WORLD.w, WORLD.h);
  for (let y = 32; y < 640; y += 32)
    for (let x = 32; x < 1120; x += 32) {
      const zone = x < 256 ? 0 : x < 704 ? 1 : 2;
      const palette =
        sector === 2
          ? ["#2e3b4a", "#34424c", "#2b3e4b"]
          : ["#26494c", "#354e4d", "#27464f"];
      rect(c, x + 0.5, y + 0.5, 31, 31, 1, palette[zone], "#48646738");
      line(c, x + 4, y + 3, x + 13, y + 3, "#75928c12");
      if (random() < 0.15) {
        rect(c, x + 5, y + 23, 13, 1, 0, "#74989022");
        ellipse(c, x + 25, y + 6, 1, 1, "#88a9a035");
      }
    }
  // Quiet service lanes make navigable space read instantly.
  for (const y of [240, 432]) {
    rect(c, 32, y - 10, 1088, 20, 0, "#455a5a");
    line(c, 32, y - 11, 1120, y - 11, "#8b9f8760", 2);
    line(c, 32, y + 11, 1120, y + 11, "#172e3b", 2);
    for (let x = 48; x < 1104; x += 64) {
      rect(c, x, y - 3, 24, 1, 0, "#cfca9c70");
      rect(c, x, y + 3, 24, 1, 0, "#cfca9c30");
    }
  }
  for (const x of [320, 672, 768]) {
    rect(c, x - 3, 34, 8, 604, 1, "#1a3542");
    rect(c, x, 34, 1, 604, 0, "#88c6b136");
    for (let y = 62; y < 628; y += 112)
      rect(c, x - 1, y, 3, 14, 1, "#8be1c1a0");
  }
  // Airlock landing and floor markings.
  rect(c, 62, 270, 160, 145, 10, "#46615a", "#839b7a");
  rect(c, 67, 275, 150, 135, 7, "#36514b");
  for (let i = 0; i < 6; i++) {
    rect(c, 78 + i * 22, 287, 12, 2, 1, "#b4c6a160");
    rect(c, 78 + i * 22, 397, 12, 2, 1, "#b4c6a160");
  }
  ellipse(c, 143, 344, 45, 45, "#96c99c08");
  c.strokeStyle = "#a7c69b4d";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(143, 344, 44, 0, Math.PI * 2);
  c.stroke();
  for (const w of MAP_WALLS) {
    const edge = w.x === 0 || w.y === 0 || w.x === 1120 || w.y === 640;
    if (edge) continue;
    rect(c, w.x - 5, w.y + 8, w.w + 10, w.h + 6, 5, "#0e2634a8");
    rect(c, w.x, w.y - 6, w.w, w.h, 4, "#45636b", "#88a29a");
    rect(c, w.x + 3, w.y - 5, w.w - 6, w.h - 12, 3, "#a7b7a3");
    rect(c, w.x + 5, w.y - 2, w.w - 10, w.h - 18, 2, "#42675d");
    if (w.w > 40) {
      const g = c.createLinearGradient(0, w.y, 0, w.y + w.h);
      g.addColorStop(0, "#294e54");
      g.addColorStop(1, "#4b7965");
      rect(c, w.x + 7, w.y, w.w - 14, w.h - 21, 2, g);
      for (let j = 0; j < 4; j++) {
        plant(
          c,
          w.x + 16 + (j * (w.w - 28)) / 3,
          w.y + 20,
          j * 5 + w.x,
          sector === 2 ? 2 : 1,
          0.55,
        );
      }
      rect(c, w.x + 6, w.y + w.h - 17, w.w - 12, 5, 1, "#bcc5ac");
      for (let x = w.x + 14; x < w.x + w.w - 5; x += 18)
        rect(c, x, w.y + w.h - 9, 8, 2, 1, accent);
      c.fillStyle = "#b8e6e31a";
      c.beginPath();
      c.moveTo(w.x + 7, w.y);
      c.lineTo(w.x + w.w - 7, w.y);
      c.lineTo(w.x + w.w - 7, w.y + 9);
      c.lineTo(w.x + 7, w.y + 27);
      c.closePath();
      c.fill();
    } else {
      for (let y = w.y + 7; y < w.y + w.h - 20; y += 36) {
        rect(c, w.x + 6, y, 20, 25, 3, "#193d45", "#6d9e86");
        plant(c, w.x + 16, y + 17, w.x + y, sector === 2 ? 2 : 0, 0.55);
      }
      rect(c, w.x + 8, w.y + w.h - 13, 16, 3, 1, accent);
    }
    line(c, w.x + 2, w.y - 4, w.x + w.w - 2, w.y - 4, "#e0e6bc", 1.5);
  }
  for (const [x, y] of [
    [56, 48],
    [348, 44],
    [846, 45],
    [794, 552],
  ]) {
    rect(c, x - 5, y + 19, 118, 26, 5, "#112e3d80");
    rect(c, x, y + 14, 108, 22, 4, "#6f8581", "#b5c4b0");
    line(c, x + 5, y + 16, x + 103, y + 16, "#f0e9c5");
    terminal(c, x + 8, y - 9, accent);
    plant(c, x + 91, y + 18, x, 1, 0.75);
    rect(c, x + 58, y + 20, 16, 10, 1, "#d9d2b1");
    line(c, x + 61, y + 23, x + 70, y + 23, "#71918a");
  }
  // Cooling tanks, specimen cases, maintenance crates and glass pipelines.
  for (const [x, y] of [
    [68, 560],
    [354, 544],
    [794, 75],
    [1048, 539],
  ]) {
    ellipse(c, x + 17, y + 42, 29, 8, "#11273588");
    rect(c, x, y + 2, 38, 43, 4, "#4c6a6d", "#93aca1");
    rect(c, x + 4, y + 5, 30, 29, 3, "#203f4c", "#658d89");
    rect(c, x + 7, y + 8, 24, 19, 2, "#4c8079");
    for (let j = 0; j < 3; j++)
      line(c, x + 10, y + 12 + j * 5, x + 28, y + 12 + j * 5, "#a2cbb459");
    rect(c, x + 10, y + 36, 18, 3, 1, accent);
    rect(c, x + 5, y + 6, 4, 22, 1, "#c2e6d225");
  }
  for (const [x, y] of [
    [66, 94],
    [218, 99],
    [218, 548],
    [330, 118],
    [659, 581],
    [803, 541],
    [1080, 120],
    [1080, 584],
    [623, 401],
    [1022, 115],
    [440, 615],
  ])
    plant(c, x, y, x + y, sector === 2 ? 2 : 1, 1);
  for (const [x, y] of [
    [62, 216],
    [224, 422],
    [320, 56],
    [671, 216],
    [770, 421],
    [1090, 248],
    [1090, 425],
    [480, 608],
  ]) {
    light(c, x, y, 63, "#f4d79519");
    rect(c, x - 8, y - 5, 16, 10, 3, "#546b64", "#b3bca1");
    rect(c, x - 5, y - 4, 10, 5, 1, "#f9e5ad");
  }
  for (let i = 0; i < 20; i++) {
    const x = 48 + ((i * 173) % 1050),
      y = 52 + ((i * 97) % 560);
    if (
      MAP_WALLS.some(
        (w) =>
          x > w.x - 20 &&
          x < w.x + w.w + 20 &&
          y > w.y - 20 &&
          y < w.y + w.h + 20,
      )
    )
      continue;
    ellipse(c, x, y, 1, 1, "#bbcbb34a");
  }
  // Specimen vitrines are painted at 2x, keeping glass highlights fine at high DPI.
  for (const [x, y] of [
    [76, 208],
    [498, 68],
    [826, 560],
  ]) {
    rect(c, x, y, 42, 16, 4, "#1c3948", "#6f9a91");
    rect(c, x + 4, y - 21, 34, 32, 5, "#8fd8ce28", "#91c7b480");
    plant(c, x + 21, y + 3, x + y, 2, 0.6);
    line(c, x + 7, y - 16, x + 7, y + 1, "#e3f9e871", 2);
    rect(c, x + 13, y + 11, 16, 2, 1, accent);
  }
  c.font = '600 11px "Microsoft YaHei",sans-serif';
  c.textBaseline = "middle";
  c.fillStyle = "#c4d5b980";
  c.fillText("温室入口 / AIRLOCK", 80, 259);
  c.fillText(
    [
      "开放办公区 / OPEN OFFICE",
      "会议室走廊 / MEETING HALL",
      "地下停车场 / PARKING B2",
    ][sector],
    386,
    271,
  );
  c.fillText("能源转运 / TRANSFER", 850, 403);
  for (let x = 0; x < 1152; x += 31) {
    plant(c, x, 15, x + 4, sector === 2 ? 2 : 0, 0.76);
    plant(c, x, 664, x + 8, sector === 2 ? 2 : 1, 0.9);
  }
  for (let y = 55; y < 630; y += 35) {
    plant(c, 10, y, y + 3, 0, 0.85);
    plant(c, 1145, y, y + 7, 1, 0.85);
  }
  const vignette = c.createRadialGradient(576, 336, 240, 576, 336, 660);
  vignette.addColorStop(0, "transparent");
  vignette.addColorStop(1, "#08182738");
  c.fillStyle = vignette;
  c.fillRect(0, 0, 1152, 672);
  return canvas;
}
function drawHero(c: C, role: Role, frame: number, direction: number) {
  const color = ROLES[role].color,
    a = (direction * Math.PI) / 4,
    front = Math.sin(a) > -0.5,
    side = Math.cos(a),
    gait = (frame / 24) * Math.PI * 2,
    stride = Math.sin(gait) * 3.5,
    lift = Math.cos(gait * 2) * 0.55;
  c.save();
  c.translate(24, 29 + lift);
  // Weighted backpack and articulated boots give a readable silhouette.
  rect(c, -12, -8, 24, 23, 5, "#142d3d", "#63818a");
  rect(c, -15, -5, 6, 15, 2, "#547779");
  rect(c, 9, -5, 6, 15, 2, "#547779");
  for (const sign of [-1, 1]) {
    const footY = 17 + stride * sign,
      footX = sign * 6.5;
    line(c, footX, 7, footX, footY - 1, "#183040", 7);
    rect(c, footX - 4, footY - 2, 9, 6, 2, "#9eafa4", "#1b3443");
    line(c, footX - 2, footY + 2, footX + 4, footY + 2, "#eef0cf");
  }
  const torso = c.createLinearGradient(-10, 0, 10, 10);
  torso.addColorStop(0, color);
  torso.addColorStop(1, "#587c7c");
  rect(c, -11, -7, 22, 22, 5, torso, "#183746");
  rect(c, -8, 7, 16, 5, 2, "#35515d");
  rect(c, -6, 11, 3, 3, 1, "#d6dfbf");
  rect(c, 3, 11, 3, 3, 1, "#d6dfbf");
  line(c, -7, -3, -7, 6, "#e3efd0a0", 2);
  line(c, 7, -3, 7, 6, "#253e4d", 2);
  rect(c, -3, -3, 6, 5, 2, "#eff0cc");
  rect(c, -1, -2, 2, 3, 1, color);
  for (const sign of [-1, 1]) {
    const sy = Math.sin(gait + sign) * 2;
    line(c, sign * 11, -2, sign * 14, 7 + sy, color, 6);
    ellipse(c, sign * 14, 8 + sy, 3.3, 3.5, "#193a49");
    line(c, sign * 11, -2, sign * 13, 4 + sy, "#edf3c45c", 2);
  }
  if (role === "scout") {
    c.beginPath();
    c.moveTo(-8, -6);
    c.lineTo(-12 + Math.sin(gait) * 2, 12);
    c.lineTo(-3, 5);
    c.closePath();
    c.fillStyle = "#538b5b";
    c.fill();
  }
  if (role === "engineer") {
    rect(c, -10, 4, 5, 9, 1, "#f8d192", "#273f49");
    rect(c, 4, 5, 6, 5, 1, "#284451");
    line(c, -12, 1, -17, 9, "#afc5bd", 2);
  }
  if (role === "medic") {
    rect(c, 9, 2, 7, 11, 2, "#dae6ce", "#203f4a");
    rect(c, 11, 5, 3, 5, 0, "#4ca6af");
    rect(c, 10, 6, 5, 2, 0, "#4ca6af");
  }
  if (role === "guardian") {
    rect(c, -15, -7, 9, 9, 3, "#d2b8e7", "#385062");
    rect(c, 6, -7, 9, 9, 3, "#d2b8e7", "#385062");
    rect(c, -17, 5, 7, 14, 3, "#708e9e", "#b7c6cd");
  }
  // Helmet uses eight distinct view directions instead of just mirroring.
  ellipse(c, 0, -13, 13.8, 14.5, "#173343");
  const helmet = c.createLinearGradient(-10, -24, 11, -4);
  helmet.addColorStop(0, "#e3e8ce");
  helmet.addColorStop(0.3, color);
  helmet.addColorStop(1, "#6f9290");
  ellipse(c, 0, -14, 12.2, 12.8, helmet);
  ellipse(c, -8, -21, 4, 2, "#f3f5df88");
  const visorX = side * 2.3;
  if (front) {
    rect(c, -10 + visorX, -18, 20, 12, 5, "#18394b", "#a1c6b5");
    const g = c.createLinearGradient(0, -17, 0, -7);
    g.addColorStop(0, "#508d9c");
    g.addColorStop(1, "#234b60");
    rect(c, -8.5 + visorX, -16.5, 17, 9, 4, g);
    line(c, -6 + visorX, -14, 4 + visorX, -14, "#b8e5d6b0", 1.4);
    ellipse(c, -3 + visorX, -10, 1.2, 1.3, "#ddf3df");
    ellipse(c, 4 + visorX, -10, 1.2, 1.3, "#ddf3df");
  } else {
    rect(c, -8, -19, 16, 11, 4, "#739991");
    line(c, -4, -16, 4, -16, "#bfd5b6", 2);
    rect(c, -4, -11, 8, 3, 1, "#334f60");
  }
  ellipse(c, -12, -13, 2.8, 4.5, color);
  ellipse(c, 12, -13, 2.8, 4.5, color);
  rect(c, -11, -5, 22, 3, 1, "#d4dfbe");
  if (role === "engineer") {
    rect(c, -9, -28, 18, 6, 3, "#e5b766", "#243c49");
    rect(c, -2, -28, 4, 7, 1, "#ffe2a1");
  }
  if (role === "scout") {
    rect(c, -8, -28, 17, 5, 3, "#6baf66");
    line(c, 6, -25, 10, -32, "#d2e7aa", 2);
  }
  if (role === "medic") {
    rect(c, -8, -28, 16, 5, 2, "#dcead1");
    rect(c, -1, -28, 3, 5, 0, "#69baca");
  }
  if (role === "guardian") {
    rect(c, -10, -28, 20, 6, 3, "#b9a2d2", "#31495f");
    rect(c, -2, -28, 4, 5, 1, "#e8d6eb");
  }
  c.restore();
}
export function makeHeroAtlas(role: Role) {
  const { canvas, c } = surface(48 * 24, 56 * 8);
  for (let d = 0; d < 8; d++)
    for (let f = 0; f < 24; f++) {
      c.save();
      c.translate(f * 48, d * 56);
      drawHero(c, role, f, d);
      c.restore();
    }
  return canvas;
}
export function makePortrait(role: Role) {
  const { canvas, c } = surface(48, 56);
  drawHero(c, role, 0, 2);
  return canvas;
}
export function makeWeapon(role: Role) {
  const { canvas, c } = surface(40, 18);
  const color = ROLES[role].color;
  rect(c, 4, 5, 26, 9, 3, "#152e41", "#8caeac");
  rect(c, 10, 6, 16, 5, 1, "#698c8c");
  rect(c, 26, 7, 11, 5, 1, "#e2dbc0", "#2f535f");
  rect(c, 16, 3, 8, 3, 1, color);
  rect(c, 7, 11, 5, 6, 1, "#263e51");
  line(c, 13, 8, 23, 8, color, 2);
  return canvas;
}
export function makeEnemyAtlas(kind: string) {
  const logical = kind === "boss" ? 100 : 52,
    { canvas, c } = surface(logical * 8, logical);
  for (let f = 0; f < 8; f++) {
    c.save();
    c.translate(f * logical + logical / 2, logical / 2);
    const t = (f / 8) * Math.PI * 2;
    if (kind === "boss") {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.sin(t + i) * 0.07;
        line(
          c,
          Math.cos(a) * 22,
          Math.sin(a) * 19,
          Math.cos(a) * 42,
          Math.sin(a) * 34,
          "#4c6373",
          8,
        );
        ellipse(c, Math.cos(a) * 42, Math.sin(a) * 34, 4, 4, "#c3add2");
      }
      ellipse(c, 0, 1, 33, 28, "#253f58");
      ellipse(c, 0, -2 + Math.sin(t), 30, 28, "#b291b4");
      ellipse(c, 0, -6, 23, 22, "#d9b8cc");
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047;
        ellipse(c, Math.cos(a) * 22, Math.sin(a) * 19 - 4, 5, 4, "#efd0bc");
        ellipse(c, Math.cos(a) * 22, Math.sin(a) * 19 - 4, 2, 1.8, "#a3e5d0");
      }
      rect(c, -16, -6, 32, 18, 7, "#33485d");
      ellipse(c, -9, -5, 4, 3, "#f5d38f");
      ellipse(c, 9, -5, 4, 3, "#f5d38f");
      rect(c, -10, 8, 20, 4, 2, "#eee2c4");
    } else if (kind === "shooter") {
      const bob = Math.sin(t) * 1.4;
      for (const sign of [-1, 1])
        rect(
          c,
          sign * 6 - 3,
          10 + Math.sin(t + sign) * 2,
          6,
          9,
          2,
          "#abb8ac",
          "#2d4a56",
        );
      rect(c, -10, -2 + bob, 20, 17, 5, "#b6bda0", "#2e4955");
      ellipse(c, 0, -3 + bob, 20, 10, "#c78584");
      ellipse(c, 0, -9 + bob, 14, 10, "#e8b3a0");
      ellipse(c, -6, -11 + bob, 3, 2, "#f9d5b4");
      ellipse(c, 7, -8 + bob, 3.5, 2, "#ab6877");
      ellipse(c, 0, -13 + bob, 3, 2, "#c5ecd6");
      ellipse(c, -4, 6 + bob, 1.5, 2, "#263e52");
      ellipse(c, 5, 6 + bob, 1.5, 2, "#263e52");
    } else {
      const tank = kind === "tank";
      for (let i = 0; i < 3; i++)
        for (const sign of [-1, 1]) {
          const y = -9 + i * 9,
            shift = Math.sin(t + i * 1.4) * 3;
          line(
            c,
            sign * 10,
            y,
            sign * (21 + shift * 0.3),
            y + shift,
            "#244554",
            4,
          );
          ellipse(c, sign * (20 + shift * 0.3), y + shift, 2.5, 2, "#adbaa1");
        }
      ellipse(c, 0, 2, 16, 18, "#183c49");
      const shell = c.createLinearGradient(-12, -18, 14, 10);
      shell.addColorStop(0, tank ? "#c5d3aa" : "#f0c18f");
      shell.addColorStop(1, tank ? "#698f7b" : "#ab7169");
      ellipse(c, 0, -3, 15, 17, shell);
      line(c, 0, -18, 0, 4, tank ? "#496f6a" : "#936364", 2);
      ellipse(c, -6, -10, 4, 5, "#f3e6b660");
      rect(c, -10, 5, 20, 10, 4, "#2e4b5a");
      ellipse(c, -5, 8, 2.3, 2.7, "#e8efb9");
      ellipse(c, 5, 8, 2.3, 2.7, "#e8efb9");
      if (tank) {
        rect(c, -15, -16, 9, 6, 2, "#d0d8ac", "#3f6c66");
        rect(c, 6, -16, 9, 6, 2, "#d0d8ac", "#3f6c66");
      }
    }
    c.restore();
  }
  return canvas;
}
export function makeGlow(color = "#8bf1c6") {
  const { canvas, c } = surface(64, 64);
  light(c, 32, 32, 31, color + "55");
  return canvas;
}
export function makeCrystal() {
  const { canvas, c } = surface(36, 44);
  light(c, 18, 22, 17, "#b8f3ac22");
  c.beginPath();
  c.moveTo(18, 4);
  c.lineTo(29, 20);
  c.lineTo(18, 38);
  c.lineTo(7, 20);
  c.closePath();
  const g = c.createLinearGradient(8, 9, 27, 30);
  g.addColorStop(0, "#f3ffe0");
  g.addColorStop(0.45, "#aeedb3");
  g.addColorStop(1, "#4baa9e");
  c.fillStyle = g;
  c.fill();
  line(c, 18, 4, 16, 21, "#fffbe1", 1.4);
  line(c, 7, 20, 16, 21, "#efffd18a");
  line(c, 16, 21, 18, 38, "#e3fbd19e");
  return canvas;
}
export function makeRelay(active = false) {
  const { canvas, c } = surface(54, 65);
  ellipse(c, 27, 54, 24, 7, "#0d273c80");
  rect(c, 9, 15, 36, 42, 7, "#456f79", "#b2c6b5");
  rect(c, 13, 18, 28, 23, 4, "#132f44", "#88aea5");
  rect(c, 16, 21, 22, 17, 2, active ? "#457d67" : "#3d6d75");
  line(c, 19, 27, 25, 32, active ? "#d0f3b0" : "#d0e8d2", 2);
  line(c, 25, 32, 35, 25, active ? "#d0f3b0" : "#d0e8d2", 2);
  for (let i = 0; i < 3; i++)
    rect(c, 16 + i * 8, 46, 5, 4, 1, active ? "#b9ef82" : "#eac583");
  rect(c, 19, 9, 16, 7, 3, "#aac2ae", "#2e535f");
  rect(c, 22, 6, 10, 5, 2, active ? "#c9f5aa" : "#95d7d0");
  return canvas;
}
export function makeDrone() {
  const { canvas, c } = surface(62, 56);
  ellipse(c, 31, 45, 27, 6, "#0e263a88");
  rect(c, 9, 16, 44, 26, 7, "#9ab9b6", "#254857");
  rect(c, 14, 18, 34, 17, 5, "#235069", "#c2ddd0");
  rect(c, 20, 22, 8, 4, 2, "#beefda");
  rect(c, 35, 22, 8, 4, 2, "#beefda");
  rect(c, 26, 31, 11, 2, 1, "#8dc0b6");
  rect(c, 7, 38, 12, 8, 3, "#223f51", "#779d9b");
  rect(c, 43, 38, 12, 8, 3, "#223f51", "#779d9b");
  line(c, 31, 16, 31, 9, "#a2bbae", 2);
  ellipse(c, 31, 7, 3, 3, "#c1f3bd");
  return canvas;
}
