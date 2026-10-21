import type { World, Vec, Rect, Mode } from "./types";
export function seededRandom(seed: number) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateWorld(
  seed: number,
  mode: Mode = "expedition",
  theme = 0,
): World {
  if (mode === "survival") return generateCataclysm(seed, theme);
  const random = seededRandom(seed),
    cols = 40,
    rows = 28,
    tile = 64,
    tiles = new Array(cols * rows).fill(0),
    rooms: Rect[] = [],
    centers: Vec[] = [];
  const carve = (x: number, y: number, w: number, h: number) => {
    for (let yy = Math.max(1, y); yy < Math.min(rows - 1, y + h); yy++)
      for (let xx = Math.max(1, x); xx < Math.min(cols - 1, x + w); xx++)
        tiles[yy * cols + xx] = 1;
  };
  const nx = 5,
    ny = 4,
    cw = Math.floor((cols - 2) / nx),
    ch = Math.floor((rows - 2) / ny);
  for (let ry = 0; ry < ny; ry++)
    for (let rx = 0; rx < nx; rx++) {
      const rw = 4 + Math.floor(random() * (cw - 3)),
        rh = 4 + Math.floor(random() * (ch - 3)),
        x = 1 + rx * cw + Math.floor(random() * Math.max(1, cw - rw)),
        y = 1 + ry * ch + Math.floor(random() * Math.max(1, ch - rh));
      carve(x, y, rw, rh);
      rooms.push({ x: x * tile, y: y * tile, w: rw * tile, h: rh * tile });
      centers.push({ x: Math.floor(x + rw / 2), y: Math.floor(y + rh / 2) });
    }
  const connect = (a: Vec, b: Vec) => {
    carve(Math.min(a.x, b.x), a.y - 1, Math.abs(a.x - b.x) + 2, 3);
    carve(b.x - 1, Math.min(a.y, b.y), 3, Math.abs(a.y - b.y) + 2);
  };
  for (let i = 0; i < centers.length; i++) {
    if (i % nx) connect(centers[i - 1], centers[i]);
    if (i >= nx && (i % nx === 0 || random() > 0.35))
      connect(centers[i - nx], centers[i]);
  }
  // Scatter low cover, leaving 3-cell corridors and central routes usable.
  for (let i = 1; i < rooms.length - 1; i++) {
    const r = rooms[i],
      cx = centers[i].x,
      cy = centers[i].y;
    if (random() > 0.25) {
      const x = Math.floor(r.x / tile) + 1,
        y = Math.floor(r.y / tile) + 1;
      if (Math.abs(x - cx) > 1 || Math.abs(y - cy) > 1) tiles[y * cols + x] = 0;
    }
  }
  const points = centers.map((v) => ({
      x: v.x * tile + 32,
      y: v.y * tile + 32,
    })),
    walls: Rect[] = [];
  for (let y = 0; y < rows; y++) {
    let start = -1;
    for (let x = 0; x <= cols; x++) {
      if (x < cols && tiles[y * cols + x] === 0) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        walls.push({
          x: start * tile,
          y: y * tile,
          w: (x - start) * tile,
          h: tile,
        });
        start = -1;
      }
    }
  }
  return {
    w: cols * tile,
    h: rows * tile,
    tile,
    cols,
    rows,
    tiles,
    walls,
    rooms,
    spawn: points[0],
    exit: points.at(-1)!,
    points,
    seed,
    theme,
    biome: "facility",
  };
}
// A broad irregular crater joined to satellite ruins. Every pocket has two
// winding routes; generation never depends on an orthogonal room lattice.
function generateCataclysm(seed: number, theme: number): World {
  const random = seededRandom(seed),
    cols = 48,
    rows = 32,
    tile = 64;
  const tiles = new Array(cols * rows).fill(0),
    cx = 24,
    cy = 16;
  const phase = random() * Math.PI * 2;
  for (let y = 2; y < rows - 2; y++)
    for (let x = 2; x < cols - 2; x++) {
      const dx = (x - cx) / 22,
        dy = (y - cy) / 13.5;
      const angle = Math.atan2(dy, dx);
      const edge =
        1 +
        0.1 * Math.sin(angle * 5 + phase) +
        0.07 * Math.cos(angle * 9 - phase);
      if (dx * dx + dy * dy < edge) tiles[y * cols + x] = 1;
    }
  const disc = (x: number, y: number, r: number, value = 1) => {
    for (
      let yy = Math.max(2, Math.floor(y - r));
      yy <= Math.min(rows - 3, y + r);
      yy++
    )
      for (
        let xx = Math.max(2, Math.floor(x - r));
        xx <= Math.min(cols - 3, x + r);
        xx++
      )
        if (Math.hypot(xx - x, yy - y) <= r) tiles[yy * cols + xx] = value;
  };
  const points: Vec[] = [{ x: cx * tile + 32, y: cy * tile + 32 }],
    rooms: Rect[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + phase * 0.15,
      r = 0.67 + random() * 0.2;
    const x = Math.round(cx + Math.cos(a) * 19 * r),
      y = Math.round(cy + Math.sin(a) * 11 * r);
    const radius = 2.2 + random() * 1.8;
    disc(x, y, radius);
    points.push({ x: x * tile + 32, y: y * tile + 32 });
    rooms.push({
      x: (x - 2) * tile,
      y: (y - 2) * tile,
      w: 5 * tile,
      h: 5 * tile,
    });
    // Broken pylons and wreckage force changes of direction but leave broad routes.
    const ox = Math.round(
      cx + Math.cos(a + 0.2) * 11 * (0.45 + random() * 0.55),
    );
    const oy = Math.round(
      cy + Math.sin(a + 0.2) * 7 * (0.45 + random() * 0.55),
    );
    disc(ox, oy, 0.6 + random() * 1.1, 0);
  }
  // Keep a generous arrival area and all objective locations clear.
  disc(cx, cy, 3);
  for (const p of points)
    disc(Math.floor(p.x / tile), Math.floor(p.y / tile), 1.6);
  const start = cy * cols + cx,
    seen = new Set([start]),
    queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i];
    for (const n of [k - 1, k + 1, k - cols, k + cols])
      if (n >= 0 && n < tiles.length && tiles[n] && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
  }
  for (let i = 0; i < tiles.length; i++) if (!seen.has(i)) tiles[i] = 0;
  const reachable = points.filter((p) =>
    seen.has(Math.floor(p.y / tile) * cols + Math.floor(p.x / tile)),
  );
  const walls: Rect[] = [];
  for (let y = 0; y < rows; y++) {
    let start = -1;
    for (let x = 0; x <= cols; x++) {
      if (x < cols && !tiles[y * cols + x]) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        walls.push({
          x: start * tile,
          y: y * tile,
          w: (x - start) * tile,
          h: tile,
        });
        start = -1;
      }
    }
  }
  return {
    w: cols * tile,
    h: rows * tile,
    tile,
    cols,
    rows,
    tiles,
    walls,
    rooms,
    points: reachable,
    spawn: reachable[0],
    exit: reachable.at(-1)!,
    seed,
    theme,
    biome: "cataclysm",
  };
}
export function worldBlocked(world: World, x: number, y: number, r = 12) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x - r < 0 ||
    y - r < 0 ||
    x + r >= world.w ||
    y + r >= world.h
  )
    return true;
  if (
    world.dynamicWalls?.some(
      (w) =>
        x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h,
    )
  )
    return true;
  for (const dx of [-r, r])
    for (const dy of [-r, r])
      if (
        !world.tiles[
          Math.floor((y + dy) / world.tile) * world.cols +
            Math.floor((x + dx) / world.tile)
        ]
      )
        return true;
  return false;
}
export function moveWorld(
  world: World,
  p: Vec,
  dx: number,
  dy: number,
  r = 12,
) {
  const count = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 12),
  );
  for (let i = 0; i < count; i++) {
    if (!worldBlocked(world, p.x + dx / count, p.y, r)) p.x += dx / count;
    if (!worldBlocked(world, p.x, p.y + dy / count, r)) p.y += dy / count;
  }
}
export function randomFloor(
  world: World,
  random: () => number,
  avoid?: Vec,
  distance = 0,
): Vec {
  for (let i = 0; i < 120; i++) {
    const p = {
      x: 96 + random() * (world.w - 192),
      y: 96 + random() * (world.h - 192),
    };
    if (
      !worldBlocked(world, p.x, p.y, 28) &&
      (!avoid || Math.hypot(p.x - avoid.x, p.y - avoid.y) > distance)
    )
      return p;
  }
  return { ...world.points[Math.floor(random() * world.points.length)] };
}
