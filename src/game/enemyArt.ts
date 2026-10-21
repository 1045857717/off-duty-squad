// Procedural material atlas: curved anatomy and layered lighting are baked once.
const SIZE = 112,
  COLS = 16,
  FRAMES = 68;
type C = CanvasRenderingContext2D;
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
function plate(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  colors: string[],
  angle = 0,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  const g = c.createLinearGradient(-rx, -ry, rx, ry);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.45, colors[1]);
  g.addColorStop(1, colors[2]);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#080e15dd";
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = colors[3] || "#c9ccae60";
  c.lineWidth = 0.8;
  c.beginPath();
  c.ellipse(-1, -1, rx * 0.81, ry * 0.86, 0, Math.PI, Math.PI * 1.86);
  c.stroke();
  c.restore();
}
function glow(c: C, x: number, y: number, r: number, color: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}
function limb(
  c: C,
  x: number,
  y: number,
  kx: number,
  ky: number,
  ex: number,
  ey: number,
  width: number,
  col = "#4d5960",
) {
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = "#090e15";
  c.lineWidth = width + 3;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(kx, ky, ex, ey);
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = width;
  c.stroke();
  c.strokeStyle = "#a2aca466";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x - 1, y - 1);
  c.quadraticCurveTo(kx - 1, ky - 1, ex - 1, ey - 1);
  c.stroke();
  ellipse(
    c,
    kx * 0.5 + ex * 0.5,
    ky * 0.5 + ey * 0.5,
    width * 0.55,
    width * 0.55,
    "#72796c",
  );
}
function horn(c: C, x: number, y: number, side: number, height: number) {
  c.beginPath();
  c.moveTo(x - 3, y);
  c.quadraticCurveTo(x + side * 6, y - height * 0.45, x + side * 5, y - height);
  c.quadraticCurveTo(x + side * 15, y - height * 0.4, x + 4, y + 3);
  const g = c.createLinearGradient(x, y - height, x, y);
  g.addColorStop(0, "#e0d7b8");
  g.addColorStop(0.5, "#9a9b83");
  g.addColorStop(1, "#454c49");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = "#141a1e";
  c.lineWidth = 1;
  c.stroke();
}
const dark = ["#7b8b83", "#394a4e", "#15232b", "#c6d3bd80"],
  red = ["#ad8c79", "#684d4e", "#271f2b", "#d5b49a77"],
  bone = ["#c1bd9e", "#6c776b", "#263c41", "#e4dcc088"],
  violet = ["#a9a2be", "#5b5a77", "#222d42", "#d6ced188"];
export function makeOrganicEnemyAtlas(kind: string) {
  const out = document.createElement("canvas");
  out.width = SIZE * COLS;
  out.height = SIZE * Math.ceil(FRAMES / COLS);
  const c = out.getContext("2d")!;
  for (let f = 0; f < FRAMES; f++) {
    c.save();
    c.translate(
      (f % COLS) * SIZE + SIZE / 2,
      Math.floor(f / COLS) * SIZE + SIZE / 2,
    );
    const dead = f >= 48 ? (f - 48) / 19 : 0,
      attack = f >= 32 && f < 48 ? (f - 32) / 15 : 0,
      t = f < 32 ? (f / 32) * Math.PI * 2 : 0,
      strike = Math.sin(attack * Math.PI);
    c.rotate(dead * 0.5);
    c.scale(1 - dead * 0.2, 1 - dead * 0.65);
    c.globalAlpha = 1 - dead * 0.85;
    ellipse(
      c,
      0,
      23,
      kind === "boss" ? 41 : kind === "tank" ? 34 : 23,
      9,
      "#070b1080",
    );
    if (kind === "mite") {
      for (let i = 0; i < 4; i++)
        for (const s of [-1, 1]) {
          const stride = Math.sin(t + i * 0.9 + s) * 5;
          limb(
            c,
            s * 8,
            -14 + i * 8,
            s * 22,
            -19 + i * 11 + stride,
            s * 30,
            -17 + i * 12 + stride,
            2.4,
            "#63715f",
          );
        }
      plate(c, 0, -5, 13, 25, bone);
      for (let i = 0; i < 5; i++) {
        plate(c, 0, -19 + i * 8, 11 - i * 0.6, 5, i % 2 ? bone : dark);
        ellipse(c, -2, -19 + i * 8, 1, 1, "#d8d2b766");
      }
      plate(c, 0, 17, 11, 10, dark);
      for (const s of [-1, 1]) {
        horn(c, s * 6, 24, s, -13 - strike * 8);
        ellipse(c, s * 5, 16, 2.2, 1.3, "#e5a866");
      }
      glow(c, 0, 16, 10, "#d6af4318");
    } else if (kind === "hound") {
      for (const s of [-1, 1])
        for (const j of [0, 1]) {
          const stride = Math.sin(t + s * 1.4 + j * Math.PI) * 9;
          limb(
            c,
            s * 10,
            -15 + j * 31,
            s * 27,
            -19 + j * 35 + stride,
            s * 33,
            -8 + j * 31 + stride,
            5,
            "#6c6260",
          );
          for (let k = 0; k < 3; k++)
            horn(c, s * 31 + k * 2, -7 + j * 31 + stride, s, -7);
        }
      c.save();
      c.translate(0, strike * 5);
      plate(c, 0, -4, 17, 30, red);
      for (let i = 0; i < 5; i++) {
        plate(c, 0, -24 + i * 10, 11, 7, dark);
        horn(c, -1, -24 + i * 10, 1, 8);
      }
      plate(c, 0, 22, 15, 17, bone);
      ellipse(c, 0, 29, 9, 12 + strike * 4, "#10151c");
      for (const s of [-1, 1]) {
        ellipse(c, s * 9, 15, 4, 1.5, "#e4b08a");
        for (let j = 0; j < 4; j++) {
          c.fillStyle = "#c4c2a4";
          c.beginPath();
          c.moveTo(s * 8, 25 + j * 4);
          c.lineTo(s * 4, 27 + j * 4);
          c.lineTo(s * 8, 29 + j * 4);
          c.fill();
        }
      }
      c.restore();
    } else if (kind === "shooter") {
      for (const s of [-1, 1]) {
        limb(c, s * 9, 12, s * 25, 22 + Math.sin(t + s) * 5, s * 28, 38, 5);
        limb(c, s * 12, -8, s * 30, -7, s * 35, 11 - strike * 9, 3);
      }
      plate(c, 0, 0, 19, 25, violet);
      for (let i = 0; i < 3; i++) {
        plate(c, -13, -16 + i * 11, 7, 9, red, -0.25);
        plate(c, 13, -16 + i * 11, 7, 9, red, 0.25);
      }
      plate(c, 0, -19, 12, 18, dark);
      c.save();
      c.translate(0, -strike * 6);
      plate(c, 0, -30, 8, 16, bone);
      ellipse(c, 0, -39, 5, 7, "#131822");
      ellipse(c, 0, -41, 2.8, 3.7, "#dc8f72");
      glow(c, 0, -41, 10, "#de957027");
      c.restore();
      for (const s of [-1, 1]) ellipse(c, s * 7, 1, 2, 1.2, "#bfa9d7");
    } else if (kind === "tank") {
      for (const s of [-1, 1]) {
        limb(
          c,
          s * 17,
          15,
          s * 26,
          29 + Math.sin(t + s) * 3,
          s * 30,
          41,
          12,
          "#44575a",
        );
        limb(
          c,
          s * 20,
          -14,
          s * 40,
          -2,
          s * (39 + strike * 8),
          23 + strike * 6,
          13,
          "#475b5e",
        );
        plate(c, s * 33, -8, 13, 24, bone, s * 0.28);
        horn(c, s * 32, -23, s, 17);
        plate(c, s * 39, 22, 9, 10, dark);
      }
      plate(c, 0, -1, 29, 36, dark);
      for (let i = 0; i < 4; i++)
        plate(c, 0, -23 + i * 14, 23 - i * 2, 12, bone);
      plate(c, 0, 12, 16, 21, dark);
      ellipse(c, 0, 16, 8, 12, "#101a20");
      for (const s of [-1, 1]) {
        ellipse(c, s * 8, 5, 4, 1.5, "#d2af6f");
        horn(c, s * 10, -25, s, 22);
      }
      for (let i = 0; i < 4; i++)
        ellipse(c, -5 + i * 3.4, 19, 1.1, 4, "#c3c3a5");
    } else if (kind === "wraith") {
      c.save();
      c.translate(0, Math.sin(t) * 3);
      for (const s of [-1, 1]) {
        limb(
          c,
          s * 9,
          -8,
          s * (30 + strike * 7),
          -17,
          s * 37,
          10 + Math.sin(t + s) * 5,
          2.3,
          "#8582a2",
        );
        horn(c, s * 36, 8, s, -12);
      }
      const g = c.createLinearGradient(0, -32, 0, 46);
      g.addColorStop(0, "#7a7a9b");
      g.addColorStop(0.48, "#3e4b66");
      g.addColorStop(1, "#28344815");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, -40);
      c.bezierCurveTo(25, -32, 20, 1, 24, 18);
      c.quadraticCurveTo(18, 35, 31, 45);
      for (let i = 0; i < 6; i++)
        c.quadraticCurveTo(
          19 - i * 8,
          22 + Math.sin(t + i) * 4,
          20 - i * 8,
          43 + (i % 2) * 7,
        );
      c.bezierCurveTo(-21, 6, -24, -26, 0, -40);
      c.fill();
      plate(c, 0, -19, 14, 20, violet);
      ellipse(c, 0, -17, 9, 14, "#172337");
      for (const s of [-1, 1]) {
        ellipse(c, s * 5, -20, 3.4, 1.2, "#b8d9e2");
        glow(c, s * 5, -20, 9, "#9cc7e52a");
      }
      c.strokeStyle = "#adbed066";
      c.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(-11 + i * 5, 0);
        c.quadraticCurveTo(
          -15 + i * 7,
          22,
          -18 + i * 9,
          35 + Math.sin(t + i) * 5,
        );
        c.stroke();
      }
      c.restore();
    } else if (kind === "bomber") {
      for (let i = 0; i < 3; i++)
        for (const s of [-1, 1])
          limb(
            c,
            s * 15,
            -14 + i * 15,
            s * 31,
            -20 + i * 19 + Math.sin(t + i + s) * 5,
            s * 35,
            -9 + i * 18,
            3.5,
            "#6d6257",
          );
      const swell = 1 + Math.sin(t) * 0.025 + strike * 0.08;
      c.save();
      c.scale(swell, swell);
      plate(c, 0, -3, 26, 33, red);
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          plate(c, s * 17, -22 + i * 15, 10, 11, i % 2 ? red : bone, s * 0.32);
      const glowBody = c.createRadialGradient(-4, -12, 3, 0, -3, 24);
      glowBody.addColorStop(0, "#e6bd86");
      glowBody.addColorStop(0.45, "#a76b4f");
      glowBody.addColorStop(1, "#473e3c");
      ellipse(c, 0, -3, 13, 24, "#7f6553");
      c.fillStyle = glowBody;
      c.beginPath();
      c.ellipse(0, -3, 13, 24, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#eed7a866";
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(-10, -19 + i * 11);
        c.quadraticCurveTo(1, -25 + i * 11, 11, -18 + i * 11);
        c.stroke();
      }
      c.restore();
      plate(c, 0, 28, 11, 10, dark);
      ellipse(c, 0, 26, 5, 1.5, "#d9ad6c");
    } else {
      for (let i = 0; i < 4; i++)
        for (const s of [-1, 1]) {
          const step = Math.sin(t + i + s) * 4;
          limb(
            c,
            s * 21,
            -24 + i * 17,
            s * 43,
            -28 + i * 20 + step,
            s * (46 + strike * 4),
            -17 + i * 20 + step,
            7,
            "#635c63",
          );
          horn(c, s * 42, -26 + i * 19, s, 12);
        }
      plate(c, 0, 0, 34, 45, dark);
      for (let i = 0; i < 4; i++) {
        plate(c, -20, -30 + i * 19, 15, 17, red, -0.35);
        plate(c, 20, -30 + i * 19, 15, 17, red, 0.35);
      }
      for (const s of [-1, 1]) {
        horn(c, s * 25, -23, s, 23);
        horn(c, s * 12, -31, s, 21);
      }
      plate(c, 0, -2, 24, 34, bone);
      const throat = c.createRadialGradient(0, 6, 0, 0, 6, 29);
      throat.addColorStop(0, "#050b12");
      throat.addColorStop(1, "#29313a");
      c.fillStyle = throat;
      c.beginPath();
      c.ellipse(0, 10, 14 + strike * 4, 24 + strike * 3, 0, 0, Math.PI * 2);
      c.fill();
      for (const s of [-1, 1]) {
        c.strokeStyle = "#bac4ad";
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.moveTo(s * (12 + Math.sin(i) * 2), -8 + i * 7);
          c.lineTo(s * 6, -5 + i * 7);
          c.stroke();
        }
        ellipse(c, s * 12, -20, 5, 1.8, "#f0b98a");
        glow(c, s * 12, -20, 12, "#d9966b2b");
      }
      plate(c, 0, -29, 9, 12, dark);
    }
    if (dead) {
      c.globalAlpha *= 1 - dead;
      for (let i = 0; i < 8; i++) {
        const a = i * 2.4,
          rr = dead * 45;
        ellipse(
          c,
          Math.cos(a) * rr,
          Math.sin(a) * rr * 0.6,
          1.6,
          3.5,
          "#c2a286",
        );
      }
    }
    c.restore();
  }
  return out;
}
