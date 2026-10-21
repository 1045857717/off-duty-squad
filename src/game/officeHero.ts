import type { Role } from "../../shared/types";
import { ROLES } from "../../shared/content";
type C = CanvasRenderingContext2D;
const SKINS = ["#c9aa90", "#b88e76", "#d8bba2", "#a9846d"],
  HAIR = ["#29272b", "#4b3a2c", "#2e2f32", "#625244"];
function line(
  c: C,
  x: number,
  y: number,
  x2: number,
  y2: number,
  w: number,
  col: string,
) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
}
function ellipse(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  col: string,
) {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function panel(c: C, x: number, y: number, w: number, h: number, col: string) {
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, col);
  g.addColorStop(1, "#18232c");
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x, y, w, h, 2);
  c.fill();
  c.strokeStyle = "#0c172366";
  c.lineWidth = 0.7;
  c.stroke();
}
export function drawOfficeHuman(
  c: C,
  role: Role,
  phase: number,
  direction: number,
  zombie = false,
  variant = 0,
  attack = 0,
  death = 0,
) {
  const info = ROLES[role],
    index = Object.keys(ROLES).indexOf(role),
    a = (direction * Math.PI) / 4,
    front = Math.sin(a) > -0.35,
    side = Math.cos(a),
    t = phase * Math.PI * 2,
    stride = Math.sin(t) * 4.2,
    bob = Math.cos(t * 2) * 0.45,
    skin = zombie ? "#8e9c86" : SKINS[(index + variant) % SKINS.length],
    accent = info.color;
  c.save();
  c.translate(24, 29 + bob);
  c.rotate(death * 0.9);
  c.scale(1 - death * 0.15, 1 - death * 0.5);
  c.globalAlpha = 1 - death * 0.8;
  const jacket = [
    "security",
    "overalls",
    "jacket",
    "sales",
    "delivery",
    "driver",
    "suit",
    "blazer",
  ].includes(info.outfit || "");
  const cloth = zombie
    ? ["#777b70", "#575a57", "#686b60"][variant % 3]
    : info.outfit === "chef"
      ? "#ddd8c7"
      : info.outfit === "cleaner"
        ? "#8aaead"
        : info.outfit === "delivery"
          ? "#bfa36b"
          : jacket
            ? accent
            : "#c7d0ce";
  // Counter-swing trouser legs; individual boots and crease highlights.
  for (const s of [-1, 1]) {
    const step = stride * s,
      z = side * step * 0.18,
      hipX = s * 4,
      footY = 19 + step * 0.45;
    line(
      c,
      hipX,
      7,
      hipX + z,
      footY,
      5.5,
      info.outfit === "chef" ? "#55575b" : "#303e4b",
    );
    line(c, hipX - 1, 10, hipX + z - 1, footY - 2, 1, "#74808066");
    ellipse(c, hipX + z + side * 1.2, footY + 1, 4, 2.2, "#1d2730");
    line(
      c,
      hipX + z - 2,
      footY + 0.2,
      hipX + z + 2,
      footY + 0.2,
      0.7,
      "#879092",
    );
  }
  // Backpacks have structure, seams and a strap; actual workers rather than armor suits.
  if (!front || side < -0.6) {
    panel(
      c,
      -9,
      -5,
      17,
      16,
      info.outfit === "delivery" ? "#b49567" : "#465963",
    );
    line(c, -7, -3, -7, 8, 1, "#b6b3a166");
    line(c, -4, -4, 5, -4, 1, "#aebabc44");
  }
  c.fillStyle = cloth;
  c.beginPath();
  c.moveTo(-7, -10);
  c.quadraticCurveTo(0, -14, 7, -10);
  c.lineTo(9, 7);
  c.quadraticCurveTo(0, 11, -8, 7);
  c.closePath();
  c.fill();
  c.strokeStyle = "#18253188";
  c.lineWidth = 0.8;
  c.stroke();
  if (front) {
    line(c, 0, -8, 0, 7, 0.6, "#e7e4d455");
    for (let i = 0; i < 3; i++)
      ellipse(c, 1, -4 + i * 4, 0.45, 0.45, "#657978");
    c.fillStyle = "#e3e6d7";
    c.beginPath();
    c.moveTo(-4, -10);
    c.lineTo(0, -6);
    c.lineTo(4, -10);
    c.lineTo(0, -11);
    c.fill();
    if (["tie", "suit", "sales", "vest"].includes(info.outfit || "")) {
      c.fillStyle = index % 2 ? "#a06c60" : "#697e94";
      c.beginPath();
      c.moveTo(0, -7);
      c.lineTo(-1, 4 + Math.sin(t) * 0.8);
      c.lineTo(1, 6);
      c.lineTo(2, -5);
      c.fill();
    }
  }
  // Arms rotate about the shoulder independently of gait; reaching for melee/Q.
  for (const s of [-1, 1]) {
    const swing = Math.sin(t + (s * Math.PI) / 2) * 4.5,
      reach = attack * (s === 1 ? 6 : 3),
      xx = s * 9 + side * reach,
      y = 3 + swing * 0.55 - reach * 0.3;
    line(c, s * 6, -8, s * 10, -1 + swing * 0.3, 4, cloth);
    line(c, s * 10, -1 + swing * 0.3, xx, y, 3.5, jacket ? cloth : skin);
    ellipse(c, xx, y + 1, 2, 2.8, skin);
    line(c, s * 8, -7, s * 10, -1 + swing * 0.3, 0.7, "#e0e3d444");
  }
  // Neck and non-oversized head, side-aware face and hair mass.
  ellipse(c, 0, -12.5, 2, 2.5, skin);
  ellipse(c, side * 0.5, -18.5, 5.1, 6.2, skin);
  ellipse(c, -side * 3.7, -18, 0.8, 1.2, skin);
  if (front) {
    const blink = !zombie && Math.cos(phase * Math.PI * 2) > 0.965;
    // Separate brows, sclera, iris and eyelids; short blinks are baked into the gait frames.
    for (const eyeX of [-2.3, 2.1]) {
      const ex = eyeX + side * 0.8;
      line(
        c,
        ex - 1,
        -20.3,
        ex + 0.9,
        -20.1,
        0.6,
        zombie ? "#5a655a" : "#53463c",
      );
      if (blink) line(c, ex - 0.7, -18.7, ex + 0.8, -18.7, 0.5, "#655147");
      else {
        ellipse(c, ex, -18.7, 0.9, 0.68, zombie ? "#bdbf8d" : "#eee6d7");
        ellipse(
          c,
          ex + side * 0.22,
          -18.65,
          0.46,
          0.55,
          zombie ? "#393d32" : "#333b40",
        );
        ellipse(c, ex + 0.2, -18.9, 0.15, 0.16, "#f5f2e9");
      }
    }
    line(c, side * 0.8, -18, side * 1.5, -16, 0.7, "#ac8b73");
    line(
      c,
      -1 + side * 0.4,
      -14.4,
      1.5 + side * 0.4,
      -14.2,
      0.65,
      zombie ? "#574e48" : "#855e52",
    );
    ellipse(c, -2.6 + side * 0.4, -16, 0.8, 0.4, "#c68f7d55");
  }
  if (info.outfit === "chef") {
    panel(c, -5, -27, 10, 6, "#e9e4d4");
    ellipse(c, 0, -27, 6, 2.5, "#e7e5d8");
  } else if (
    info.outfit === "security" ||
    info.outfit === "driver" ||
    info.outfit === "delivery"
  ) {
    ellipse(
      c,
      0,
      -23,
      5.6,
      3,
      info.outfit === "delivery" ? "#bd995d" : "#354a59",
    );
    line(c, 0, -21, side * 6, -21, 2, "#283945");
  } else {
    c.fillStyle = HAIR[(index + variant) % HAIR.length];
    c.beginPath();
    c.ellipse(0, -20.5, 5.1, 5, 0, Math.PI, Math.PI * 2);
    c.lineTo(4, -18);
    c.lineTo(1, -22);
    c.lineTo(-3, -21);
    c.lineTo(-5, -17);
    c.closePath();
    c.fill();
    if (index % 4 === 1) ellipse(c, -4, -20, 2.5, 3, HAIR[1]);
  }
  if (front && ["scout", "accountant", "lawyer", "teacher"].includes(role)) {
    c.strokeStyle = "#3e525a";
    c.lineWidth = 0.7;
    c.strokeRect(-3 + side * 0.6, -19, 2.6, 1.8);
    c.strokeRect(0.7 + side * 0.6, -19, 2.6, 1.8);
    line(c, -0.3, -18.3, 0.7, -18.3, 0.5, "#394b52");
  }
  // Lanyard, ID and garment-specific tools swing rather than remaining welded.
  if (front && !zombie) {
    line(c, -3, -7, Math.sin(t) * 1.2, 1, 0.7, accent);
    line(c, 3, -7, Math.sin(t) * 1.2, 1, 0.7, accent);
    c.fillStyle = "#e5e1cc";
    c.save();
    c.translate(Math.sin(t) * 1.2, 1);
    c.rotate(Math.sin(t) * 0.1);
    c.fillRect(-1.6, 0, 3.2, 4.7);
    c.fillStyle = accent;
    c.fillRect(-1.4, 0.5, 1.4, 1.6);
    c.restore();
  }
  if (info.outfit === "cleaner") panel(c, -6, -1, 12, 10, "#647e81");
  if (info.outfit === "chef") panel(c, -6, -2, 12, 12, "#c2c1ad");
  if (info.outfit === "overalls") {
    panel(c, -6, -3, 12, 13, "#60757c");
    line(c, -4, -9, -4, 0, 2, "#5c7379");
    line(c, 4, -9, 4, 0, 2, "#5c7379");
  }
  if (info.outfit === "security") panel(c, -7, -8, 14, 15, "#394e56");
  if (info.outfit === "delivery") panel(c, -10, 0, 5, 10, "#be9d63");
  if (!zombie) {
    if (info.outfit === "horse") {
      ellipse(c, -4, -26, 1.5, 4, "#916b4e");
      ellipse(c, 4, -26, 1.5, 4, "#916b4e");
      line(c, -5, -23, 5, -23, 2, "#a37d58");
    }
    if (info.outfit === "pot") {
      ellipse(c, 0, -24, 7, 2.4, "#34434a");
      panel(c, -5, -28, 10, 4, "#47525b");
    }
    if (info.outfit === "duck") {
      ellipse(c, 0, -25, 6, 3, "#b9a55d");
      ellipse(c, 1, -29, 2.7, 2, "#dac65f");
      line(c, 3, -29, 5, -28, 1.5, "#b9894b");
    }
    if (info.outfit === "sleepmask") {
      panel(c, -5, -24, 10, 3, "#789fa2");
    }
    if (info.outfit === "intern") {
      panel(c, -7, -2, 5, 4, "#ccb76f");
      panel(c, 3, 2, 5, 4, "#b5ba94");
    }
    if (info.outfit === "apron") panel(c, -7, -4, 14, 13, "#577568");
    if (info.outfit === "deadline")
      line(c, 3, -7, 2, 6 + Math.sin(t) * 1.2, 2, "#a5634d");
    if (info.outfit === "plaid") {
      for (let i = -4; i <= 4; i += 4) line(c, i, -6, i, 6, 0.7, "#6e8d9c");
      line(c, -6, 1, 6, 1, 0.8, "#3e6476");
    }
  }
  if (zombie) {
    line(c, -6, -5, -1, 0, 1, "#696255");
    line(c, 3, 3, 7, 6, 1, "#7f675b");
    c.fillStyle = "#74695c";
    c.beginPath();
    c.moveTo(-6, 7);
    c.lineTo(-3, 12);
    c.lineTo(-1, 8);
    c.fill();
  }
  c.restore();
}
export function makeOfficeHeroAtlas(role: Role) {
  const out = document.createElement("canvas");
  out.width = 96 * 24;
  out.height = 112 * 8;
  const c = out.getContext("2d")!;
  c.scale(2, 2);
  for (let d = 0; d < 8; d++)
    for (let f = 0; f < 24; f++) {
      c.save();
      c.translate(f * 48, d * 56);
      drawOfficeHuman(c, role, f / 24, d);
      c.restore();
    }
  return out;
}
export function makeOfficeActionAtlas(role: Role, rescue = false) {
  const out = document.createElement("canvas");
  out.width = 96 * 16;
  out.height = 112 * 8;
  const c = out.getContext("2d")!;
  c.scale(2, 2);
  for (let d = 0; d < 8; d++)
    for (let f = 0; f < 16; f++) {
      c.save();
      c.translate(f * 48, d * 56);
      if (rescue) {
        c.translate(0, 9);
        c.scale(1, 0.78);
      }
      drawOfficeHuman(
        c,
        role,
        (f / 16) * 0.12,
        d,
        false,
        0,
        rescue
          ? 0.6 + Math.sin((f / 16) * Math.PI * 2) * 0.15
          : Math.sin((f / 15) * Math.PI),
      );
      c.restore();
    }
  return out;
}
export function makeOfficePortrait(role: Role) {
  const out = document.createElement("canvas");
  out.width = 96;
  out.height = 112;
  const c = out.getContext("2d")!;
  c.scale(2, 2);
  drawOfficeHuman(c, role, 0, 2);
  return out;
}
export function makeOfficeBadge() {
  const out = document.createElement("canvas");
  out.width = 64;
  out.height = 80;
  const c = out.getContext("2d")!;
  c.scale(2, 2);
  c.fillStyle = "#8d5543";
  c.fillRect(14, 1, 4, 7);
  c.fillStyle = "#d1c9a9";
  c.fillRect(10, 6, 12, 26);
  c.fillStyle = "#e8e2cd";
  c.fillRect(11, 7, 10, 23);
  c.fillStyle = "#567d78";
  c.fillRect(13, 10, 6, 6);
  c.fillStyle = "#a35e48";
  c.fillRect(15, 11, 2, 3);
  c.fillStyle = "#667977";
  c.fillRect(12, 18, 8, 2);
  c.fillRect(12, 22, 6, 1);
  c.fillStyle = "#be8255";
  c.fillRect(12, 27, 8, 2);
  return out;
}
export function makeOfficeWeapon(kind: string) {
  const out = document.createElement("canvas");
  out.width = 80;
  out.height = 40;
  const c = out.getContext("2d")!;
  c.scale(2, 2);
  if (kind === "mop") {
    line(c, 3, 10, 30, 10, 2, "#ad9670");
    for (let i = 0; i < 7; i++)
      line(c, 29 + i * 0.6, 5 + (i % 3), 36, 4 + i * 1.6, 1, "#96b6ac");
  } else if (kind === "bat" || kind === "wrench") {
    line(c, 2, 10, 27, 10, kind === "bat" ? 4 : 3, "#566878");
    if (kind === "wrench") {
      line(c, 27, 10, 32, 5, 3, "#aeb7b1");
      line(c, 27, 10, 33, 13, 3, "#aeb7b1");
    }
  } else if (kind === "coffee") {
    panel(c, 10, 3, 11, 14, "#b2b6a6");
    line(c, 15, 4, 15, 15, 1, "#e8e1cd");
  } else if (kind === "frost") {
    panel(c, 9, 3, 14, 14, "#b35b50");
    line(c, 23, 7, 34, 7, 2, "#a9b4ac");
  } else if (kind === "blade" || kind === "ricochet") {
    c.fillStyle = kind === "blade" ? "#cdd4ce" : "#c89459";
    c.beginPath();
    c.moveTo(3, 8);
    c.lineTo(28, 8);
    c.lineTo(35, 4);
    c.lineTo(25, 13);
    c.lineTo(3, 13);
    c.closePath();
    c.fill();
    line(c, 7, 7, 27, 7, 1, "#f4ecd3");
  } else if (kind === "arc" || kind === "gravity") {
    line(c, 4, 10, 20, 10, 3, "#435969");
    c.strokeStyle = kind === "arc" ? "#a4c9d7" : "#b7a4d1";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(26, 10, 6, -1.9, 1.9);
    c.stroke();
  } else if (kind === "venom" || kind === "flame") {
    panel(c, 9, 5, 13, 12, kind === "venom" ? "#729e7f" : "#bc7957");
    line(c, 15, 3, 26, 3, 2, "#c5c9bb");
    line(c, 26, 3, 32, 7, 2, "#9cadad");
  } else if (kind === "drone" || kind === "seeker") {
    panel(c, 12, 7, 11, 7, "#a3b9b4");
    line(c, 11, 7, 7, 3, 2, "#6d8991");
    line(c, 24, 7, 29, 3, 2, "#6d8991");
    line(c, 10, 15, 5, 18, 2, "#6d8991");
    line(c, 25, 15, 31, 18, 2, "#6d8991");
  } else if (kind === "meteor" || kind === "orbit") {
    c.fillStyle = kind === "meteor" ? "#c79b65" : "#9daec6";
    c.beginPath();
    c.ellipse(19, 10, 9, 6, 0, 0, 6.29);
    c.fill();
    line(c, 14, 8, 24, 8, 1, "#e7d9bb");
  } else {
    panel(c, 5, 5, 23, 10, "#8d9c9b");
    line(c, 10, 6, 29, 6, 2, "#c0c4b1");
  }
  return out;
}
