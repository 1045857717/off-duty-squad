import type { Rect, World } from "../../shared/types";

type C = CanvasRenderingContext2D;

// 夜班办公室奇谭: quiet slate circulation, cutaway ink-purple architecture,
// brass hardware and chalky painted edges. All geometry is baked into chunks.
export const ENV40 = {
  ink: "#191722",
  outline: "#211e2b",
  roof: "#302c3b",
  roofLight: "#3b3547",
  wall: "#494353",
  wallFace: "#292735",
  edge: "#787180",
  floor: ["#444d5c", "#464f5e", "#424b5a", "#454e5c"],
  ruinedFloor: ["#3d4554", "#3f4756", "#3c4453", "#3e4655"],
  seam: "#242b3c38",
  brass: "#a78b62",
  brassLight: "#c6ac7c",
  brassShade: "#6c5b50",
  paper: "#b3afa6",
  paperShade: "#817f80",
  patina: "#638b86",
  glass: "#344957",
  glassLight: "#799196",
  coral: "#ae706f",
} as const;

export function environmentHash(seed: number, x: number, y: number, salt = 0) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ salt;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function environmentRect(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string | CanvasGradient,
) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
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

function polygon(
  c: C,
  points: readonly (readonly [number, number])[],
  color: string,
) {
  c.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

function ellipse(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
}

export function openEnvironmentTile(world: World, x: number, y: number) {
  return (
    x >= 0 &&
    y >= 0 &&
    x < world.cols &&
    y < world.rows &&
    !!world.tiles[y * world.cols + x]
  );
}

export function clipEnvironmentFloor(
  c: C,
  world: World,
  chunkX: number,
  chunkY: number,
) {
  c.beginPath();
  for (let y = chunkY * 8; y < Math.min(world.rows, chunkY * 8 + 8); y++)
    for (let x = chunkX * 8; x < Math.min(world.cols, chunkX * 8 + 8); x++)
      if (openEnvironmentTile(world, x, y)) c.rect(x * 64, y * 64, 64, 64);
  c.clip();
}

export function paintFloorPanel(c: C, world: World, gx: number, gy: number) {
  const x = gx * 64,
    y = gy * 64,
    ruined = world.biome === "cataclysm",
    h = environmentHash(world.seed, gx, gy),
    palette = ruined ? ENV40.ruinedFloor : ENV40.floor;
  const panel = environmentHash(
    world.seed,
    Math.floor(gx / 2),
    Math.floor(gy / 2),
    17,
  );
  environmentRect(c, x, y, 64, 64, palette[panel % 4]);
  // Broad paired access panels; only one restrained seam per tile, no noisy grain.
  if (gy % 2 === 0) line(c, x, y + 0.5, x + 64, y + 0.5, ENV40.seam);
  if (gx % 2 === 0) {
    line(c, x + 0.5, y, x + 0.5, y + 64, ENV40.seam);
    line(c, x + 1.5, y + 1, x + 1.5, y + 62, "#82929c12");
  }
  if (h % 11 === 0) {
    line(c, x + 8, y + 56, x + 23, y + 56, "#a2acb518");
    environmentRect(c, x + 53, y + 7, 3, 2, "#222b3a45");
  }
  if (!openEnvironmentTile(world, gx, gy - 1)) {
    environmentRect(c, x, y, 64, 7, "#19172445");
    line(c, x + 2, y + 8, x + 62, y + 8, "#a5b4b815");
  }
  if (!openEnvironmentTile(world, gx - 1, gy))
    environmentRect(c, x, y, 5, 64, "#19172435");
  if (ruined && h % 9 === 0) {
    line(c, x + 5, y + 47, x + 26, y + 39, "#27273465");
    line(c, x + 26, y + 39, x + 43, y + 44, "#27273465");
    line(c, x + 26, y + 40, x + 40, y + 44, "#8e899126");
  }
}

function paper(
  c: C,
  x: number,
  y: number,
  angle: number,
  scale = 1,
  faded = false,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  environmentRect(c, -5, -6, 12, 15, "#17172532");
  polygon(
    c,
    [
      [-6, -8],
      [3, -8],
      [6, -5],
      [6, 7],
      [-6, 7],
    ],
    faded ? "#92979a4d" : "#a6aaa78a",
  );
  polygon(
    c,
    [
      [3, -8],
      [3, -5],
      [6, -5],
    ],
    "#d1c8b447",
  );
  line(c, -3, -2, 3, -2, "#40455360");
  line(c, -3, 1, 1, 1, "#40455350");
  c.restore();
}

export function paintFloorEphemera(c: C, world: World, gx: number, gy: number) {
  const h = environmentHash(world.seed, gx, gy, 811),
    x = gx * 64 + 32,
    y = gy * 64 + 32;
  // Keep arrivals, objectives and their visual breathing room completely clean.
  if (
    world.points.some((p) => Math.abs(p.x - x) < 84 && Math.abs(p.y - y) < 84)
  )
    return;
  if (h % 19 === 0) paper(c, x - 11, y + 10, (h % 13) * 0.13, 0.75, true);
  if (world.biome === "cataclysm" && h % 23 === 0) {
    paper(c, x + 7, y - 8, -0.6, 0.85, true);
    line(c, x - 12, y + 12, x + 14, y + 4, "#292a3966", 2);
  }
}

export function paintOfficeRoom(
  c: C,
  room: Rect,
  index: number,
  theme: number,
  seed: number,
) {
  const { x, y, w, h } = room,
    zone = (index + Math.floor(theme)) % 5,
    tints = ["#56607515", "#6d62792a", "#59647813", "#79807412", "#4559631a"],
    rh = environmentHash(seed, index, zone);
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  environmentRect(c, x + 8, y + 8, w - 16, h - 16, tints[zone]);
  // Inlaid room perimeter is flush with the floor, never a pretend obstacle.
  c.strokeStyle = "#a0a2aa16";
  c.lineWidth = 1;
  c.strokeRect(x + 16.5, y + 16.5, w - 33, h - 33);
  if (zone === 1) {
    // A broad acoustic carpet makes briefing rooms recognizable at camera scale.
    environmentRect(c, x + 30, y + 34, w - 60, h - 68, "#383c5059");
    line(c, x + 34, y + h - 36, x + w - 34, y + h - 36, "#b7a8871c", 2);
  } else if (zone === 3) {
    environmentRect(c, x + 10, y + 10, w - 20, 48, "#7d80741c");
    line(c, x + 12, y + 58, x + w - 12, y + 58, "#b2a48b20");
  } else if (zone === 4) {
    // Cable trays sit flush with the service-room floor.
    environmentRect(c, x + 20, y + 12, 7, h - 24, "#242b3a40");
    line(c, x + 24, y + 14, x + 24, y + h - 14, "#80929328");
  }
  const lx = x + w * (rh % 2 ? 0.35 : 0.65),
    ly = y + 26,
    radius = Math.min(w, h) * 0.72,
    light = c.createRadialGradient(lx, ly, 8, lx, ly, radius);
  light.addColorStop(0, zone === 3 ? "#d3b78020" : "#adbfce1c");
  light.addColorStop(1, "#aabbcc00");
  environmentRect(c, lx - radius, ly - radius, radius * 2, radius * 2, light);
  // Soft, slanted window-light shapes are room-sized and continuous across chunks.
  if (zone === 0 || zone === 2) {
    for (let n = 0; n < 3; n++) {
      const wx = x + 24 + n * 36;
      polygon(
        c,
        [
          [wx, y + 10],
          [wx + 20, y + 10],
          [wx + 83, y + 119],
          [wx + 49, y + 119],
        ],
        "#a3b5c609",
      );
    }
  }
  // Small physical department stencils, deliberately below gameplay contrast.
  c.font = "10px monospace";
  c.fillStyle = "#c1b79f32";
  c.fillText(String(index + 1).padStart(2, "0"), x + 23, y + h - 24);
  line(c, x + 45, y + h - 28, x + 72, y + h - 28, "#b5a38528", 2);
  c.restore();
}

// All raised furniture is drawn inside an existing solid 64px footprint. The
// bevel, south face and cast shadow share a consistent upper-left light source.
function furnitureBody(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  top: string,
  face: string = ENV40.wallFace,
) {
  environmentRect(c, x - 2, y + 6, w + 4, h + 5, "#15131f70");
  polygon(
    c,
    [
      [x, y + 5],
      [x + w, y + 5],
      [x + w, y + h + 7],
      [x, y + h + 7],
    ],
    ENV40.outline,
  );
  environmentRect(c, x + 2, y + h - 1, w - 4, 6, face);
  polygon(
    c,
    [
      [x + 3, y],
      [x + w - 3, y],
      [x + w, y + 3],
      [x + w, y + h - 2],
      [x, y + h - 2],
      [x, y + 3],
    ],
    top,
  );
  line(c, x + 3, y + 1, x + w - 4, y + 1, "#d2c7b543");
  line(c, x + 1, y + 4, x + 1, y + h - 4, "#c6bba026");
}

function mug(c: C, x: number, y: number, brass = false) {
  environmentRect(c, x - 3, y - 1, 7, 7, brass ? ENV40.brassShade : "#666c79");
  ellipse(c, x, y - 1, 3.5, 2, brass ? ENV40.brassLight : "#a5aaa8");
  ellipse(c, x, y - 1, 2, 1, "#2c252c");
  c.strokeStyle = brass ? ENV40.brass : "#858f94";
  c.lineWidth = 1.5;
  c.strokeRect(x + 3, y, 3, 3);
}

function workstation(c: C, h: number, ruined: boolean) {
  furnitureBody(c, -25, -17, 50, 30, "#69616a", "#443c4a");
  // Monitor: trapezoid housing, recessed glass, stem and footprint.
  environmentRect(c, -3, -8, 6, 6, ENV40.outline);
  environmentRect(c, -9, -2, 19, 3, "#34313f");
  polygon(
    c,
    [
      [-15, -25],
      [13, -25],
      [16, -8],
      [-13, -8],
    ],
    ENV40.outline,
  );
  polygon(
    c,
    [
      [-12, -23],
      [11, -23],
      [13, -11],
      [-11, -11],
    ],
    ruined ? "#3c3d4e" : "#4e6c78",
  );
  polygon(
    c,
    [
      [-12, -23],
      [-3, -23],
      [5, -11],
      [-11, -11],
    ],
    "#a2bec51e",
  );
  if (!ruined) {
    line(c, -8, -19, 5, -19, "#a3b7b287");
    line(c, -8, -16, 0, -16, "#89a3a780");
  } else line(c, -4, -23, 3, -11, "#242331", 1.5);
  furnitureBody(c, -13, 3, 25, 6, "#383643");
  for (let i = 0; i < 5; i++)
    environmentRect(c, -10 + i * 4, 4, 2, 1, "#a1a19b70");
  environmentRect(c, 16, 6, 4, 6, "#383746");
  environmentRect(c, -23, -8, 7, 12, ENV40.paperShade);
  environmentRect(c, -22, -10, 7, 11, "#a6a49a");
  line(c, -20, -6, -17, -6, "#646573");
  mug(c, 20, -9, h % 2 === 0);
  // A tucked chair stays wholly on the blocked footprint.
  environmentRect(c, -6, 16, 12, 8, "#252331");
  furnitureBody(c, -10, 17, 20, 5, "#535460");
  line(c, -8, 26, 8, 26, "#7a778242");
}

function printer(c: C, h: number, ruined: boolean) {
  furnitureBody(c, -23, -9, 46, 32, "#5e626e", "#3d3b4b");
  furnitureBody(c, -21, -18, 42, 22, "#89868a");
  environmentRect(c, -15, -14, 29, 13, "#34323f");
  environmentRect(c, -11, -27, 23, 17, ENV40.paperShade);
  polygon(
    c,
    [
      [-10, -29],
      [9, -29],
      [12, -26],
      [12, -13],
      [-10, -13],
    ],
    "#b7b0a0",
  );
  line(c, -6, -23, 6, -23, "#777784");
  line(c, -6, -19, 4, -19, "#777784");
  environmentRect(c, -16, 7, 32, 7, ENV40.outline);
  environmentRect(c, -11, 8, 24, 4, "#a2a09a");
  environmentRect(c, 10, -4, 7, 4, ruined ? "#876368" : ENV40.brass);
  line(c, -15, 19, 11, 19, "#94909355");
  if (ruined) {
    // A jammed, folded paper tongue, contained within the collider.
    polygon(
      c,
      [
        [-10, 10],
        [9, 10],
        [15, 20],
        [6, 25],
        [-8, 23],
        [-14, 17],
      ],
      "#9e9c96",
    );
    line(c, -7, 14, 10, 16, "#555867");
    line(c, -8, 19, 7, 21, "#555867");
    line(c, -18, -11, -6, -3, "#403340", 2);
    environmentRect(c, 18, 16, 3, 5, ENV40.coral + "66");
  } else if (h % 2 === 0) environmentRect(c, -18, -6, 9, 2, "#bdb3a06b");
}

function archive(c: C, h: number, ruined: boolean) {
  furnitureBody(c, -24, -25, 48, 47, "#5b5362", "#393141");
  for (let row = 0; row < 3; row++) {
    const y = -21 + row * 14;
    environmentRect(c, -20, y, 40, 11, row % 2 ? "#65606b" : "#6c626b");
    line(c, -19, y + 10, 19, y + 10, "#292432");
    environmentRect(c, -7, y + 2, 14, 4, "#34303e");
    environmentRect(c, -4, y + 3, 8, 2, ENV40.brass);
  }
  if (ruined) {
    polygon(
      c,
      [
        [-17, 8],
        [16, 8],
        [21, 16],
        [-13, 18],
      ],
      "#77717a",
    );
    paper(c, 6, 14, -0.2, 0.6);
  } else {
    environmentRect(c, -17, -28, 14, 3, ENV40.paperShade);
    environmentRect(c, -15, -30, 13, 2, ENV40.paper);
    environmentRect(c, 10, -29, 8, 4, h % 2 ? ENV40.brassShade : "#5a7575");
  }
}

function pantry(c: C, ruined: boolean) {
  furnitureBody(c, -25, -22, 50, 43, "#716b70", "#4b4250");
  furnitureBody(c, -20, -25, 25, 24, "#4d464f");
  environmentRect(c, -17, -22, 19, 9, "#2b2935");
  line(c, -15, -19, -2, -19, ENV40.brass, 2);
  environmentRect(c, -14, -10, 14, 9, "#292531");
  environmentRect(c, -9, -10, 3, 4, ENV40.brassLight);
  line(c, -17, 1, 2, 1, "#a29a8b", 2);
  mug(c, -8, -3, true);
  mug(c, 14, -8);
  ellipse(c, 15, 11, 8, 4, "#a3957c");
  ellipse(c, 15, 11, 5, 2, "#5b5863");
  environmentRect(c, -20, 8, 20, 9, "#3b3543");
  line(c, -17, 10, -3, 10, ENV40.brassShade, 2);
  if (ruined) {
    ellipse(c, -5, 18, 12, 5, "#374745");
    line(c, 3, 17, 12, 24, "#6b817161", 2);
  }
}

function serverRack(c: C, h: number, ruined: boolean) {
  furnitureBody(c, -23, -27, 46, 49, "#383843");
  environmentRect(c, -19, -23, 38, 43, "#252632");
  for (let row = 0; row < 5; row++) {
    const y = -20 + row * 8;
    environmentRect(c, -16, y, 31, 5, "#50505e");
    line(c, -13, y + 2, 4, y + 2, "#242733");
    environmentRect(
      c,
      10,
      y + 1,
      2,
      2,
      ruined && row === h % 5 ? "#9c7071" : "#749791",
    );
  }
  line(c, -18, -25, 16, -25, "#78838c6b");
  if (ruined) line(c, 17, -19, 9, 16, "#1c1c29", 2);
}

function planter(c: C) {
  furnitureBody(c, -22, 3, 44, 18, "#5e5661");
  ellipse(c, 0, 6, 18, 7, "#262934");
  line(c, 0, 4, -1, -20, "#6c7970", 2);
  polygon(
    c,
    [
      [-1, -4],
      [-20, -16],
      [-24, -25],
      [-9, -21],
      [1, -9],
    ],
    "#536e69",
  );
  polygon(
    c,
    [
      [0, -10],
      [7, -27],
      [20, -30],
      [17, -15],
      [1, 0],
    ],
    "#6b8074",
  );
  polygon(
    c,
    [
      [1, 1],
      [14, -11],
      [25, -11],
      [18, 0],
      [1, 6],
    ],
    "#405e5c",
  );
  line(c, -15, -19, -1, -6, "#9caa8b40");
}

export function paintOfficeSolid(c: C, world: World, gx: number, gy: number) {
  const x = gx * 64,
    y = gy * 64,
    up = openEnvironmentTile(world, gx, gy - 1),
    down = openEnvironmentTile(world, gx, gy + 1),
    left = openEnvironmentTile(world, gx - 1, gy),
    right = openEnvironmentTile(world, gx + 1, gy),
    exposed = up || down || left || right,
    isolated = up && down && left && right,
    ruined = world.biome === "cataclysm",
    h = environmentHash(world.seed, gx, gy, 430);
  environmentRect(c, x, y, 64, 64, ENV40.ink);
  environmentRect(c, x, y, 64, 64, exposed ? ENV40.roofLight : ENV40.roof);
  // Connected roof masses have no per-cell outlines. Only real collision edges
  // receive a cutaway face, so a whole block reads as architecture, not tiles.
  if (!exposed) {
    if (gy % 2 === 0) line(c, x, y + 32, x + 64, y + 32, "#7771840d");
    if (gx % 4 === 0) environmentRect(c, x + 28, y, 6, 64, "#201f2c30");
    return;
  }
  if (up) {
    environmentRect(c, x, y, 64, 6, ENV40.wallFace);
    line(c, x + 1, y + 6.5, x + 63, y + 6.5, "#a49a9a66", 2);
  }
  if (left) {
    environmentRect(c, x, y, 6, 64, "#484151");
    line(c, x + 1.5, y + 2, x + 1.5, y + 62, "#9b929e66");
  }
  if (right) environmentRect(c, x + 58, y, 6, 64, "#25222f");
  if (down) {
    environmentRect(c, x, y + 47, 64, 17, ENV40.wallFace);
    environmentRect(c, x, y + 48, 64, 3, "#5d5365");
    line(c, x + 1, y + 47.5, x + 63, y + 47.5, "#a1959e99", 2);
    environmentRect(c, x, y + 61, 64, 3, "#171722");
    if (!ruined && gx % 3 === 1) {
      // Brass wall sconce, with its light baked separately onto walkable floor.
      environmentRect(c, x + 24, y + 53, 16, 4, ENV40.brassShade);
      environmentRect(c, x + 26, y + 53, 12, 2, ENV40.brassLight + "b0");
    }
  }
  if (
    officeBay(world, gx - (gx % 2), gy) ||
    ruinedBlock(world, gx - (gx % 2), gy - (gy % 2))
  )
    return;
  const fixture =
    isolated || (down && h % 3 !== 0) || (up && !down && h % 3 === 0);
  c.save();
  c.beginPath();
  c.rect(x, y, 64, 64);
  c.clip();
  c.translate(x + 32, y + (down ? 24 : 32));
  c.scale(0.94, down ? 0.72 : 0.88);
  if (fixture) {
    // Use room identity where available, so archive/pantry/office wings have
    // authored prop families instead of unrelated random furniture.
    const zone = officeZone(world, gx, gy);
    if (ruined) {
      const kind = h % 6;
      if (kind < 2) printer(c, h, true);
      else if (kind === 2) pantry(c, true);
      else if (kind === 3) archive(c, h, true);
      else if (kind === 4) workstation(c, h, true);
      else serverRack(c, h, true);
    } else if (h % 13 === 0) planter(c);
    else if (zone === 3) pantry(c, false);
    else if (zone === 4) serverRack(c, h, false);
    else if (zone === 1) archive(c, h, false);
    else if (h % 5 === 0) printer(c, h, false);
    else workstation(c, h, false);
  } else if (!ruined && down && h % 3 === 0) {
    // Dark glass partitions and mullions occupy the wall cap, not the lane.
    furnitureBody(c, -29, -12, 58, 24, ENV40.glass);
    polygon(
      c,
      [
        [-25, -9],
        [-13, -9],
        [3, 9],
        [-9, 9],
      ],
      "#9cb4c01b",
    );
    line(c, -8, -11, -8, 10, "#7c7c8c", 2);
    line(c, 13, -11, 13, 10, "#7c7c8c", 2);
    line(c, -26, -10, 25, -10, "#bbc0b642");
  } else if ((left || right) && !up && !down) {
    // Continuous glazed side walls have a wide reflection and connected frame,
    // rather than a separate square ventilation tile at every collision cell.
    environmentRect(c, -23, -36, 46, 72, "#353644");
    environmentRect(c, -19, -34, 37, 68, ENV40.glass);
    polygon(
      c,
      [
        [-18, -32],
        [-7, -32],
        [16, -6],
        [16, 18],
      ],
      "#91acb31c",
    );
    line(c, -21, -36, -21, 36, "#817989", 2);
    line(c, 20, -36, 20, 36, "#211f2c", 3);
    line(c, -18, 15, 18, 15, "#777482", 2);
    if (gy % 3 === 1) {
      // A modest wall-mounted pinboard, with paper rather than unreadable text.
      furnitureBody(c, -16, -20, 32, 29, "#76686c");
      environmentRect(c, -12, -16, 10, 15, "#a9a394");
      environmentRect(c, 3, -12, 9, 12, "#889d96");
      line(c, -10, -12, -5, -12, "#676775");
    }
  } else {
    // Recessed maintenance panels use alternating long ribs and a service tag.
    environmentRect(c, -22, -17, 44, 30, "#2b2937");
    line(c, -19, -14, 18, -14, "#8f879444");
    for (let n = 0; n < 3; n++)
      line(c, -16, -6 + n * 6, 15, -6 + n * 6, "#53505f", 2);
    if (h % 3 === 0) environmentRect(c, 12, -11, 5, 3, ENV40.brassShade);
  }
  c.restore();
  if (ruined) {
    polygon(
      c,
      [
        [x + 4, y + 9],
        [x + 16, y + 7],
        [x + 11, y + 15],
      ],
      "#79707a60",
    );
    line(c, x + 46, y + 3, x + 39, y + 14, "#171624", 2);
    if (h % 5 === 0 && down)
      line(c, x + 9, y + 54, x + 21, y + 54, ENV40.coral + "60", 2);
  }
}

function officeZone(world: World, gx: number, gy: number) {
  const down = openEnvironmentTile(world, gx, gy + 1),
    x = gx * 64 + 32,
    y =
      gy * 64 + (down ? 65 : openEnvironmentTile(world, gx, gy - 1) ? -1 : 32),
    room = world.rooms.findIndex(
      (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
    );
  return (
    ((room < 0
      ? environmentHash(world.seed, Math.floor(gx / 3), Math.floor(gy / 3)) % 5
      : room) +
      Math.floor(world.theme)) %
    5
  );
}

function officeBay(world: World, gx: number, gy: number) {
  return (
    world.biome !== "cataclysm" &&
    gx >= 0 &&
    gy >= 0 &&
    gx + 1 < world.cols &&
    gy < world.rows &&
    !openEnvironmentTile(world, gx, gy) &&
    !openEnvironmentTile(world, gx + 1, gy) &&
    openEnvironmentTile(world, gx, gy + 1) &&
    openEnvironmentTile(world, gx + 1, gy + 1) &&
    environmentHash(world.seed, gx, gy, 1201) % 4 !== 0
  );
}

function ruinedBlock(world: World, gx: number, gy: number) {
  if (
    world.biome !== "cataclysm" ||
    gx < 0 ||
    gy < 0 ||
    gx + 1 >= world.cols ||
    gy + 1 >= world.rows
  )
    return false;
  for (let y = gy; y < gy + 2; y++)
    for (let x = gx; x < gx + 2; x++)
      if (openEnvironmentTile(world, x, y)) return false;
  return (
    (openEnvironmentTile(world, gx, gy - 1) ||
      openEnvironmentTile(world, gx + 1, gy - 1) ||
      openEnvironmentTile(world, gx, gy + 2) ||
      openEnvironmentTile(world, gx + 1, gy + 2) ||
      openEnvironmentTile(world, gx - 1, gy) ||
      openEnvironmentTile(world, gx + 2, gy)) &&
    environmentHash(world.seed, gx, gy, 731) % 3 !== 0
  );
}

function briefingBoard(c: C) {
  furnitureBody(c, -57, -25, 114, 48, "#66616e");
  environmentRect(c, -51, -21, 102, 33, "#798087");
  // Chalk flowchart, clipped meeting notes and an eraser on the actual wall.
  line(c, -44, -16, -10, -16, "#c4c4b58c", 2);
  c.strokeStyle = "#c4c4b57a";
  c.lineWidth = 1;
  c.strokeRect(-42, -9, 18, 9);
  c.strokeRect(-8, -7, 19, 10);
  line(c, -24, -4, -8, -2, "#c4c4b57a");
  line(c, 11, -2, 24, -12, "#c4c4b57a");
  environmentRect(c, 27, -17, 10, 10, "#b5a683");
  environmentRect(c, 38, -4, 8, 11, "#8caaa0");
  environmentRect(c, -48, 15, 96, 3, ENV40.brassShade);
  environmentRect(c, -22, 13, 16, 3, "#394352");
  line(c, -49, -23, 47, -23, "#d6c6ab60");
}

function pantryBay(c: C) {
  furnitureBody(c, -57, -18, 114, 37, "#82777a", "#4b4252");
  c.save();
  c.translate(-25, -1);
  c.scale(0.86, 0.86);
  pantry(c, false);
  c.restore();
  // Steel sink, brass faucet, draining grooves and a jar of emergency biscuits.
  furnitureBody(c, 7, -14, 32, 21, "#aaa39a");
  environmentRect(c, 11, -10, 24, 12, "#485360");
  line(c, 29, -10, 29, -24, ENV40.brass, 3);
  line(c, 29, -24, 21, -24, ENV40.brassLight, 2);
  for (let n = 0; n < 3; n++)
    line(c, 43, -11 + n * 5, 51, -11 + n * 5, "#484453");
  environmentRect(c, -2, 4, 8, 11, "#a18a70");
  ellipse(c, 2, 4, 4, 2, "#c3b08e");
  for (const x of [-40, 20]) {
    line(c, x - 12, 24, x + 12, 24, "#242532", 2);
    line(c, x - 4, 20, x + 4, 20, ENV40.brass, 2);
  }
}

function officeWorkBay(c: C, h: number) {
  furnitureBody(c, -58, -17, 116, 31, "#6b626d", "#49404f");
  for (const x of [-29, 29]) {
    c.save();
    c.translate(x, 0);
    c.scale(0.87, 0.95);
    workstation(c, h + x, false);
    c.restore();
  }
  // One shared task lamp ties the paired desks into an authored work bay.
  line(c, -1, -3, -1, -24, ENV40.brassShade, 2);
  line(c, -1, -24, 6, -29, ENV40.brass, 2);
  polygon(
    c,
    [
      [3, -29],
      [12, -29],
      [15, -24],
      [0, -24],
    ],
    ENV40.brassLight,
  );
  line(c, -5, -2, 4, -2, ENV40.brassShade, 2);
}

function coffeeBoiler(c: C) {
  // A derelict catering boiler, towering on a solid island. No extra collider.
  furnitureBody(c, -48, -35, 96, 75, "#4b414e");
  polygon(
    c,
    [
      [-31, -34],
      [30, -34],
      [28, 22],
      [20, 31],
      [-22, 31],
      [-31, 20],
    ],
    "#74605a",
  );
  polygon(
    c,
    [
      [-29, -32],
      [-12, -34],
      [-13, 26],
      [-23, 22],
    ],
    "#a18a6e",
  );
  ellipse(c, 0, -33, 31, 13, "#a18a70");
  ellipse(c, 0, -33, 25, 9, "#373e3b");
  ellipse(c, -3, -34, 19, 5, "#5c716155");
  line(c, -34, -19, -41, -19, "#b09b80", 4);
  line(c, 33, -19, 40, -19, "#60515a", 4);
  environmentRect(c, -5, 15, 10, 11, ENV40.brassShade);
  line(c, 0, 22, 0, 34, ENV40.brassLight, 3);
  line(c, -7, 19, 7, 19, "#c0aa84", 2);
  ellipse(c, 2, 42, 30, 7, "#374945");
  line(c, -8, 43, -27, 48, "#6f877246", 2);
  mug(c, 31, 34, true);
}

export function paintEnvironmentFixtures(
  c: C,
  world: World,
  sx: number,
  sy: number,
) {
  const ruined = world.biome === "cataclysm",
    startX = Math.max(0, Math.floor((sx / 64 - 2) / 2) * 2),
    startY = Math.max(0, Math.floor((sy / 64 - 2) / 2) * 2);
  for (
    let gy = startY;
    gy < Math.min(world.rows, sy / 64 + 8);
    gy += ruined ? 2 : 1
  )
    for (let gx = startX; gx < Math.min(world.cols, sx / 64 + 8); gx += 2) {
      const big = ruinedBlock(world, gx, gy);
      if (!big && !officeBay(world, gx, gy)) continue;
      const x = gx * 64,
        y = gy * 64,
        h = environmentHash(world.seed, gx, gy, 561);
      if (x + 128 <= sx || y + (big ? 128 : 64) <= sy) continue;
      c.save();
      c.beginPath();
      c.rect(x + 3, y + 2, 122, big ? 122 : 45);
      c.clip();
      c.translate(x + 64, y + (big ? 60 : 24));
      if (big) {
        if (h % 3 === 0) coffeeBoiler(c);
        else if (h % 3 === 1) {
          c.scale(1.85, 1.65);
          printer(c, h, true);
          // Jammed continuous form paper folds into a disconnected staircase.
          polygon(
            c,
            [
              [-16, 22],
              [14, 21],
              [22, 27],
              [11, 31],
              [-18, 30],
            ],
            "#b0aaa0",
          );
        } else {
          c.scale(1.85, 1.62);
          archive(c, h, true);
          line(c, -19, -19, 16, -4, "#2d2938", 2);
        }
      } else {
        c.scale(1, 0.72);
        const zone = officeZone(world, gx, gy);
        if (zone === 1) briefingBoard(c);
        else if (zone === 3) pantryBay(c);
        else if (zone === 4) {
          for (const dx of [-29, 29]) {
            c.save();
            c.translate(dx, 0);
            serverRack(c, h, false);
            c.restore();
          }
          line(c, -3, -19, -3, 23, ENV40.brassShade, 2);
        } else officeWorkBay(c, h);
      }
      c.restore();
    }
}

export function paintWallLight(c: C, world: World, gx: number, gy: number) {
  if (
    world.biome === "cataclysm" ||
    gx % 3 !== 1 ||
    !openEnvironmentTile(world, gx, gy + 1)
  )
    return;
  const x = gx * 64 + 32,
    y = gy * 64 + 66,
    glow = c.createRadialGradient(x, y, 1, x, y, 66);
  glow.addColorStop(0, "#d0b17c13");
  glow.addColorStop(1, "#d0b17c00");
  environmentRect(c, x - 66, y - 66, 132, 132, glow);
}

function coffeeSpill(c: C, h: number) {
  // Old oxidized coffee is a low-value stain, not a live green damage telegraph.
  polygon(
    c,
    [
      [-95, -10],
      [-75, -35],
      [-39, -38],
      [-19, -56],
      [20, -44],
      [41, -21],
      [82, -12],
      [92, 12],
      [61, 23],
      [34, 42],
      [-5, 35],
      [-34, 45],
      [-61, 22],
      [-92, 18],
    ],
    "#2937395e",
  );
  ellipse(c, -13, -3, 66, 29, "#42575030");
  c.beginPath();
  c.ellipse(-13, -3, 65, 28, -0.1, 0.2, Math.PI * 1.22);
  c.strokeStyle = "#79937d24";
  c.lineWidth = 2;
  c.stroke();
  line(c, 15, 24, 88, 68, "#2b373e45", 9);
  line(c, 19, 24, 91, 67, "#76836c17", 2);
  for (let n = 0; n < 3; n++)
    ellipse(c, 31 + n * 21, 45 + n * 11, 6 - n, 3, "#59685e30");
  // Coffee-ring stamps and abandoned flat cup lids reinforce the office origin.
  c.beginPath();
  c.ellipse(-66, 35, 12, 7, 0.3, 0, Math.PI * 1.8);
  c.strokeStyle = "#91907a32";
  c.lineWidth = 2;
  c.stroke();
  paper(c, -82, -23, (h % 8) * 0.1, 0.8, true);
}

function paperStorm(c: C, h: number) {
  // Static circulation of abandoned paperwork, painted under every actor.
  for (let n = 0; n < 2; n++) {
    c.beginPath();
    c.ellipse(
      0,
      0,
      99 + n * 20,
      43 + n * 15,
      -0.24,
      0.2 + n * 0.7,
      4.6 + n * 0.4,
    );
    c.strokeStyle = n ? "#a7afb112" : "#a7afb11b";
    c.lineWidth = n ? 1 : 2;
    c.stroke();
  }
  for (let n = 0; n < 10; n++) {
    const a = n * 0.62 + (h % 17) * 0.11,
      radius = 52 + (n % 3) * 25,
      x = Math.cos(a) * radius,
      y = Math.sin(a) * radius * 0.47;
    paper(c, x, y, a + 0.8, 0.55 + (n % 3) * 0.1, true);
  }
  polygon(
    c,
    [
      [-24, -8],
      [11, -15],
      [32, -4],
      [20, 9],
      [-14, 12],
    ],
    "#2c303e30",
  );
}

function tonerTrail(c: C) {
  polygon(
    c,
    [
      [-98, -15],
      [-49, -31],
      [9, -24],
      [60, -43],
      [99, -27],
      [88, 0],
      [33, 7],
      [3, 32],
      [-42, 24],
      [-85, 34],
    ],
    "#24243350",
  );
  // Flat, ghosted printer registration bars; never the coral of active attacks.
  for (let n = 0; n < 5; n++) {
    const x = -72 + n * 30,
      y = -8 + Math.sin(n) * 16;
    environmentRect(c, x, y, 14, 20, "#969c9c16");
    line(c, x + 3, y + 6, x + 11, y + 6, "#25293855");
  }
  line(c, -110, 42, 94, 12, "#84717c1c", 2);
  line(c, -104, 49, 100, 19, "#84717c12");
  paper(c, -81, 20, 0.35, 0.8, true);
  paper(c, 69, -13, -0.2, 0.65, true);
}

export function paintDisasterFloor(c: C, world: World, sx: number, sy: number) {
  // World-coordinate anchors and conservative bounds give identical results at
  // every chunk seam and in any chunk generation order. At most 4x4 sites/chunk.
  const spacing = 384,
    reach = 152;
  for (
    let gy = Math.floor((sy - reach) / spacing);
    gy <= Math.floor((sy + 512 + reach) / spacing);
    gy++
  )
    for (
      let gx = Math.floor((sx - reach) / spacing);
      gx <= Math.floor((sx + 512 + reach) / spacing);
      gx++
    ) {
      const h = environmentHash(world.seed, gx, gy, 9067),
        x = gx * spacing + 72 + (h % 190),
        y = gy * spacing + 72 + ((h >>> 8) % 190);
      if (
        x < sx - reach ||
        x > sx + 512 + reach ||
        y < sy - reach ||
        y > sy + 512 + reach
      )
        continue;
      if (world.points.some((p) => Math.hypot(x - p.x, y - p.y) < 200))
        continue;
      c.save();
      c.translate(x, y);
      c.rotate((((h >>> 16) % 9) - 4) * 0.12);
      if (h % 3 === 0) coffeeSpill(c, h);
      else if (h % 3 === 1) paperStorm(c, h);
      else tonerTrail(c);
      c.restore();
    }
}
