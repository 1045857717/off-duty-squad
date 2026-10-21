import type { Role } from "../../shared/types";
import { MAP_WALLS, ROLES, WORLD } from "../../shared/content";

type Ctx = CanvasRenderingContext2D;
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}
function box(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function plant(ctx: Ctx, x: number, y: number, scale = 1, variant = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  box(ctx, -13, 2, 28, 9, "#0e1d18");
  box(ctx, -10, -3, 22, 13, "#554b37");
  box(ctx, -8, 1, 18, 11, "#736244");
  box(ctx, -8, 10, 18, 3, "#292e22");
  const shades =
    variant === 1
      ? ["#47643c", "#719451", "#a3bc70"]
      : ["#244e39", "#3d7350", "#6b9860"];
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7,
      dx = Math.cos(a) * 12,
      dy = Math.sin(a) * 8;
    box(ctx, dx - 5, dy - 10, 9, 11, shades[i % 3]);
    box(ctx, dx - 3, dy - 14, 5, 9, shades[(i + 1) % 3]);
  }
  box(ctx, -2, -14, 4, 14, "#a5ba72");
  if (variant === 2) {
    box(ctx, -10, -16, 6, 6, "#e8b9aa");
    box(ctx, 7, -12, 5, 5, "#e9c78e");
  }
  ctx.restore();
}
function monitor(ctx: Ctx, x: number, y: number, accent = "#8ecbb0") {
  box(ctx, x - 3, y + 18, 40, 8, "#101e1d");
  box(ctx, x, y, 34, 24, "#142a29");
  box(ctx, x + 3, y + 3, 28, 16, "#244944");
  box(ctx, x + 6, y + 6, 8, 3, accent);
  box(ctx, x + 6, y + 12, 21, 2, "#42705a");
  box(ctx, x + 18, y + 6, 8, 3, "#609a7b");
  box(ctx, x + 13, y + 24, 8, 4, "#263d31");
  box(ctx, x + 7, y + 28, 22, 3, "#768975");
}
function lamp(ctx: Ctx, x: number, y: number) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 72);
  glow.addColorStop(0, "rgba(242,204,136,.17)");
  glow.addColorStop(1, "rgba(242,204,136,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 72, y - 72, 144, 144);
  box(ctx, x - 7, y - 7, 14, 12, "#293c32");
  box(ctx, x - 5, y - 6, 10, 6, "#e9cd8b");
  box(ctx, x - 2, y - 4, 4, 3, "#fff1c5");
}
export function makeMap(sector = 0): HTMLCanvasElement {
  const { c, ctx } = canvas(WORLD.w, WORLD.h),
    rand = rng(67);
  box(ctx, 0, 0, WORLD.w, WORLD.h, "#14271f");
  // An inhabited station: timber, botanical beds, service passages, worn brass.
  for (let y = 32; y < 640; y += 32)
    for (let x = 32; x < 1120; x += 32) {
      const region = x < 256 ? 0 : x < 704 ? 1 : 2;
      const colors = [
        ["#243c32", "#263e34", "#294137"],
        ["#343e32", "#354033", "#384234"],
        ["#293e3c", "#2b4140", "#2d4441"],
      ][region];
      box(ctx, x, y, 32, 32, colors[Math.floor(rand() * 3)]);
      box(ctx, x, y + 30, 32, 2, "#22352b");
      box(ctx, x + 30, y, 2, 30, "#26372d");
      if (rand() < 0.22)
        box(
          ctx,
          x + 6,
          y + 8,
          10 + Math.floor(rand() * 10),
          2,
          region === 1 ? "#414a37" : "#30493d",
        );
      if (rand() < 0.11) {
        box(ctx, x + 4, y + 4, 2, 2, "#5a6350");
        box(ctx, x + 26, y + 26, 2, 2, "#1f3029");
      }
    }
  // Walkway inlays and cables.
  for (const y of [240, 432]) {
    box(ctx, 32, y, 1088, 3, "#58705a");
    box(ctx, 32, y + 4, 1088, 2, "#1e3028");
    for (let x = 48; x < 1120; x += 64) {
      box(ctx, x, y - 4, 18, 2, "#79846b");
    }
  }
  for (const x of [320, 672, 768]) {
    box(ctx, x, 40, 2, 592, "#546b59");
    box(ctx, x + 4, 40, 2, 592, "#1e332b");
  }
  box(ctx, 48, 272, 176, 144, "#293e34");
  box(ctx, 52, 276, 168, 136, "#30483c");
  box(ctx, 56, 280, 160, 128, "#344e40");
  for (let i = 0; i < 5; i++) {
    box(ctx, 72 + i * 28, 288, 16, 3, "#49634e");
    box(ctx, 72 + i * 28, 397, 16, 3, "#49634e");
  }
  // Timber lab islands, each with its own set dressing.
  for (const w of MAP_WALLS) {
    const outer = w.x === 0 || w.y === 0 || w.x === 1120 || w.y === 640;
    if (outer) {
      box(ctx, w.x, w.y, w.w, w.h, "#14271f");
      for (let y = w.y; y < w.y + w.h; y += 16)
        for (let x = w.x; x < w.x + w.w; x += 16)
          box(ctx, x + 2, y + 2, 13, 13, rand() > 0.5 ? "#1a3025" : "#1d3528");
      continue;
    }
    box(ctx, w.x - 5, w.y + 5, w.w + 10, w.h + 9, "#14281f");
    box(ctx, w.x, w.y, w.w, w.h, "#1c342a");
    box(ctx, w.x, w.y - 6, w.w, w.h - 8, "#4c5b40");
    box(ctx, w.x + 3, w.y - 4, w.w - 6, 5, "#81906a");
    box(ctx, w.x + 3, w.y + 2, w.w - 6, w.h - 20, "#536448");
    box(ctx, w.x + 4, w.y + w.h - 10, w.w - 8, 5, "#334735");
    if (w.w === 32) {
      for (let y = w.y + 8; y < w.y + w.h - 16; y += 32) {
        box(ctx, w.x + 6, y, 20, 20, "#2b4434");
        box(ctx, w.x + 8, y + 2, 16, 5, "#6a7751");
        if (rand() > 0.3) plant(ctx, w.x + 16, y + 16, 0.72, 1);
      }
      for (let y = w.y + 40; y < w.y + w.h; y += 96) lamp(ctx, w.x + 16, y);
    } else {
      box(ctx, w.x + 6, w.y + 3, w.w - 12, w.h - 25, "#334737");
      for (let x = w.x + 18; x < w.x + w.w - 15; x += 27)
        plant(ctx, x, w.y + 22, 0.75, rand() > 0.6 ? 2 : 0);
      box(ctx, w.x + 4, w.y + w.h - 12, w.w - 8, 4, "#839472");
      box(ctx, w.x + 8, w.y + w.h - 5, 8, 3, "#b5b17b");
    }
  }
  // Work benches and useful clutter in the alcoves.
  for (const [x, y] of [
    [58, 46],
    [346, 40],
    [850, 40],
    [800, 554],
  ]) {
    box(ctx, x, y + 24, 108, 13, "#1d3027");
    box(ctx, x, y + 10, 108, 20, "#66715b");
    box(ctx, x + 3, y + 10, 102, 3, "#8a9272");
    monitor(ctx, x + 12, y - 10);
    box(ctx, x + 57, y + 15, 19, 10, "#2b4439");
    box(ctx, x + 59, y + 17, 15, 2, "#afba86");
    plant(ctx, x + 91, y + 14, 0.7);
  }
  for (const [x, y] of [
    [65, 560],
    [352, 544],
    [800, 80],
    [1062, 542],
  ]) {
    box(ctx, x, y + 6, 42, 44, "#172c23");
    box(ctx, x, y, 38, 42, "#4a5940");
    box(ctx, x + 4, y + 3, 30, 5, "#6d7a57");
    box(ctx, x + 5, y + 12, 28, 21, "#354c37");
    box(ctx, x + 16, y + 14, 4, 13, "#b3b68d");
    box(ctx, x + 4, y + 36, 30, 3, "#253d2e");
  }
  for (const [x, y, scale] of [
    [64, 97, 1],
    [222, 98, 1],
    [218, 550, 1.1],
    [330, 120, 0.8],
    [660, 580, 1.2],
    [805, 540, 1],
    [1080, 120, 1.2],
    [1080, 584, 1],
    [622, 400, 0.7],
    [1020, 115, 0.7],
    [440, 615, 0.8],
  ])
    plant(ctx, x, y, scale, 2);
  for (const [x, y] of [
    [64, 216],
    [224, 424],
    [320, 56],
    [672, 216],
    [768, 424],
    [1090, 248],
    [1090, 424],
    [480, 608],
  ])
    lamp(ctx, x, y);
  // Crossings, directional stripes and the entry airlock.
  box(ctx, 44, 323, 29, 30, "#69765c");
  box(ctx, 48, 326, 21, 24, "#87967a");
  box(ctx, 51, 331, 15, 14, "#374f3e");
  box(ctx, 54, 335, 9, 6, "#badb95");
  for (let i = 0; i < 4; i++) {
    box(ctx, 284 + i * 8, 233, 4, 12, "#a7a171");
    box(ctx, 732 + i * 8, 457, 4, 12, "#819b8c");
  }
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#8c9e7a";
  ctx.fillText("G / 01", 96, 80);
  ctx.fillStyle = "#738572";
  ctx.fillText("BOTANICAL RESEARCH", 360, 600);
  ctx.fillStyle = "#718f82";
  ctx.fillText("SECTOR 02", 852, 280);
  // Overgrown border is kept at the perimeter so gameplay remains readable.
  for (let x = 0; x < 1152; x += 29) {
    plant(ctx, x, 20, 0.85);
    plant(ctx, x, 664, 0.9);
  }
  for (let y = 60; y < 620; y += 35) {
    plant(ctx, 12, y, 0.85);
    plant(ctx, 1142, y, 0.85);
  }
  const vignette = ctx.createRadialGradient(576, 336, 130, 576, 336, 680);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(4,14,11,.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1152, 672);
  if (sector > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle =
      sector === 1 ? "rgba(44,113,136,.13)" : "rgba(122,72,131,.13)";
    ctx.fillRect(0, 0, 1152, 672);
    ctx.restore();
    for (const [x, y] of [
      [96, 128],
      [352, 160],
      [512, 448],
      [864, 160],
      [896, 448],
    ]) {
      if (sector === 1) {
        box(ctx, x + 8, y + 4, 28, 26, "#345a60");
        box(ctx, x + 10, y + 6, 24, 20, "#567c7a");
        box(ctx, x + 14, y + 8, 16, 4, "#9cbfa5");
        box(ctx, x + 14, y + 15, 16, 3, "#2d585e");
      } else {
        for (let j = 0; j < 3; j++) {
          box(ctx, x + 8 + j * 28, y + 6, 7, 17, "#abb29b");
          box(ctx, x + j * 28, y, 23, 8, "#a687a9");
          box(ctx, x + 4 + j * 28, y - 5, 15, 7, "#c5a0bf");
          box(ctx, x + 7 + j * 28, y - 3, 5, 3, "#e5cebe");
        }
      }
    }
  }
  return c;
}
export function makeHero(role: Role, frame = 0): HTMLCanvasElement {
  const { c, ctx } = canvas(40, 48),
    color = ROLES[role].color;
  const step = frame % 2 === 1 ? 2 : 0;
  box(ctx, 8, 39, 25, 6, "#122a21");
  box(ctx, 12, 35 + step, 7, 7 - step, "#263c30");
  box(ctx, 24, 35 - step, 7, 7 + step, "#263c30");
  box(ctx, 10, 40, 10, 4, "#c1c7a5");
  box(ctx, 23, 40, 10, 4, "#b4bb9b");
  box(ctx, 7, 22, 6, 13, color);
  box(ctx, 29, 23, 6, 12, color);
  box(ctx, 5, 25, 5, 9, "#4b6050");
  box(ctx, 13, 24, 16, 13, color);
  box(ctx, 16, 30, 10, 4, "#56735b");
  box(ctx, 18, 26, 5, 4, "#edf3ca");
  box(ctx, 9, 6, 23, 23, "#1a332b");
  box(ctx, 7, 10, 27, 14, color);
  box(ctx, 11, 5, 19, 23, color);
  box(ctx, 11, 10, 20, 13, "#eef0ca");
  box(ctx, 14, 12, 17, 10, "#b2d0b6");
  box(ctx, 15, 13, 15, 7, "#314c44");
  box(ctx, 16, 14, 13, 3, "#89c0b0");
  box(ctx, 18, 17, 3, 3, "#d4e9c6");
  box(ctx, 26, 17, 3, 3, "#d4e9c6");
  box(ctx, 12, 23, 18, 3, "#75957a");
  box(ctx, 11, 7, 20, 3, "#e2e8b8");
  if (role === "scout") {
    box(ctx, 12, 1, 17, 7, "#6e9c54");
    box(ctx, 9, 6, 25, 4, "#b9ef82");
    box(ctx, 26, 0, 4, 7, "#e5eec0");
  }
  if (role === "engineer") {
    box(ctx, 11, 2, 19, 8, "#d39d51");
    box(ctx, 8, 8, 25, 4, "#f2cf83");
    box(ctx, 18, 1, 4, 9, "#f6daa0");
  }
  if (role === "medic") {
    box(ctx, 12, 2, 18, 8, "#b9ddc9");
    box(ctx, 18, 3, 6, 8, "#83cfdb");
    box(ctx, 17, 5, 8, 3, "#e3f0d4");
    box(ctx, 6, 24, 5, 10, "#edf0cb");
  }
  if (role === "guardian") {
    box(ctx, 10, 3, 22, 9, "#9584b2");
    box(ctx, 8, 8, 26, 5, "#c2a2e8");
    box(ctx, 5, 28, 9, 15, "#899aa0");
    box(ctx, 7, 29, 5, 10, "#d3c7e1");
  }
  return c;
}
export function makeEnemy(kind: string): HTMLCanvasElement {
  const boss = kind === "boss",
    size = boss ? 112 : 48;
  const { c, ctx } = canvas(size, size);
  ctx.translate(size / 2, size / 2);
  if (boss) {
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((Math.PI * i) / 4);
      box(ctx, -5, 12, 10, 29, "#56684f");
      box(ctx, -8, 32, 16, 8, "#9e82bc");
      box(ctx, -5, 39, 10, 8, "#b09ac7");
      ctx.restore();
    }
    box(ctx, -28, -25, 56, 54, "#6b527e");
    box(ctx, -33, -17, 66, 36, "#826594");
    box(ctx, -22, -32, 44, 67, "#9b7ba5");
    box(ctx, -19, -22, 38, 47, "#c3a6c6");
    box(ctx, -17, -8, 34, 23, "#302f40");
    for (let i = 0; i < 4; i++) {
      box(ctx, -15 + i * 8, -8, 5, 9, "#f0e0bf");
      box(ctx, -13 + i * 8, 8, 5, 7, "#f0e0bf");
    }
    box(ctx, -20, -23, 11, 8, "#e7bf8f");
    box(ctx, 10, -23, 11, 8, "#e7bf8f");
    box(ctx, -16, -22, 4, 5, "#382e3c");
    box(ctx, 13, -22, 4, 5, "#382e3c");
  } else if (kind === "shooter") {
    box(ctx, -10, 1, 20, 16, "#b9b197");
    box(ctx, -7, 12, 6, 7, "#827c64");
    box(ctx, 4, 12, 6, 7, "#827c64");
    box(ctx, -18, -5, 36, 11, "#b67565");
    box(ctx, -14, -13, 28, 11, "#d58b79");
    box(ctx, -7, -18, 15, 8, "#e2a78c");
    box(ctx, -10, -10, 5, 5, "#f4d0a2");
    box(ctx, 8, -5, 5, 5, "#f4d0a2");
    box(ctx, -6, 5, 4, 4, "#273e30");
    box(ctx, 5, 5, 4, 4, "#273e30");
  } else {
    const tank = kind === "tank";
    for (const x of [-18, 12])
      for (const y of [-10, 3, 12]) {
        box(ctx, x, y, 7, 4, tank ? "#697666" : "#8e6b52");
        box(ctx, x + (x < 0 ? -3 : 3), y + 3, 6, 5, "#293d30");
      }
    box(ctx, -13, -14, 26, 31, tank ? "#6b7e68" : "#bc8b66");
    box(ctx, -17, -8, 34, 20, tank ? "#879477" : "#d4a877");
    box(ctx, -10, -17, 20, 8, tank ? "#a3ad85" : "#e6bd87");
    box(ctx, -9, 0, 18, 13, tank ? "#475d50" : "#916d4d");
    box(ctx, -10, -6, 7, 7, "#f2d49c");
    box(ctx, 4, -6, 7, 7, "#f2d49c");
    box(ctx, -7, -5, 3, 4, "#24382c");
    box(ctx, 6, -5, 3, 4, "#24382c");
    if (tank) {
      box(ctx, -11, -17, 8, 9, "#b4bd93");
      box(ctx, 4, -17, 8, 9, "#b4bd93");
    }
  }
  return c;
}
