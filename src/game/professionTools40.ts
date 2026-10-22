import type { Role } from "../../shared/types";
import { ROLE_BASICS } from "../../shared/basics";
import { toolGeometry } from "./joints";
/** Role-specific everyday tools, all on the same 80x40 grip coordinate system. */
export function makeProfessionTool(role: Role) {
  const canvas = document.createElement("canvas");
  canvas.width = 80;
  canvas.height = 40;
  const c = canvas.getContext("2d")!;
  const g = toolGeometry(ROLE_BASICS[role].weapon),
    grip = g.origin * 80;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = "#202133";
  c.lineWidth = 2;
  const panel = (x: number, y: number, w: number, h: number, fill: string) => {
    c.fillStyle = fill;
    c.beginPath();
    c.roundRect(x, y, w, h, 2);
    c.fill();
    c.stroke();
  };
  const line = (
    x: number,
    y: number,
    xx: number,
    yy: number,
    color: string,
    w = 2,
  ) => {
    c.strokeStyle = color;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(xx, yy);
    c.stroke();
    c.strokeStyle = "#202133";
    c.lineWidth = 2;
  };
  const oval = (x: number, y: number, rx: number, ry: number, fill: string) => {
    c.fillStyle = fill;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  };
  const paper = () => {
    panel(13, 8, 46, 25, "#e5dcc2");
    panel(21, 4, 43, 25, "#f1e7cc");
    for (let i = 0; i < 3; i++)
      line(30, 10 + i * 5, 56 - (i % 2) * 8, 10 + i * 5, "#68778b", 1);
  };
  if (["hr", "intern", "lawyer", "sales", "ppt"].includes(role)) {
    paper();
    if (role === "lawyer") line(35, 7, 35, 24, "#ad7756", 2);
    if (role === "ppt") {
      panel(40, 9, 16, 12, "#c67f5c");
      line(44, 17, 48, 12, "#f4e2b9", 2);
    }
    if (role === "sales") line(26, 24, 52, 24, "#6eaea4", 2);
  } else if (["scout", "qa", "accountant", "creator"].includes(role)) {
    panel(9, 8, 56, 24, role === "creator" ? "#566375" : "#748b92");
    if (role === "creator") {
      panel(10, 5, 57, 7, "#d4d4bd");
      for (let i = 0; i < 5; i++)
        line(16 + i * 10, 6, 20 + i * 10, 11, "#354052", 3);
    } else {
      for (let y = 0; y < 3; y++)
        for (let x = 0; x < 7; x++) {
          c.fillStyle = (x + y) % 3 ? "#d8d6c1" : "#a9c0b7";
          c.fillRect(15 + x * 6, 12 + y * 5, 4, 3);
        }
      if (role === "accountant") panel(47, 10, 14, 7, "#b9d0ae");
    }
  } else if (["barista", "slacker", "medic"].includes(role)) {
    panel(grip - 3, 8, 27, 25, role === "medic" ? "#8fbbb7" : "#e2d2af");
    panel(grip - 4, 6, 30, 6, "#48545c");
    line(grip + 6, 12, grip + 6, 27, "#f7edd4", 2);
    if (role === "medic") {
      line(grip + 12, 18, grip + 21, 18, "#5d938c", 3);
      line(grip + 16, 14, grip + 16, 23, "#5d938c", 3);
    }
  } else if (role === "logistics") {
    line(grip, 20, 31, 20, "#5d4c46", 6);
    panel(29, 7, 38, 27, "#bd9767");
    line(46, 8, 46, 33, "#e7cf9e", 5);
    line(34, 13, 40, 13, "#f3e2bd", 2);
  } else if (role === "chef" || role === "blametaker") {
    line(grip, 20, 35, 20, "#785b46", 6);
    oval(50, 20, 18, 13, "#394353");
    oval(50, 18, 14, 9, "#66717a");
    line(43, 14, 55, 14, "#b5b9ae", 1.5);
  } else if (role === "director") {
    oval(45, 20, 24, 12, "#b87848");
    oval(45, 17, 22, 10, "#d9b373");
    for (let i = 0; i < 5; i++)
      line(29 + i * 7, 12, 34 + i * 7, 23, "#9e734d", 1);
  } else if (role === "deadline") {
    line(grip, 20, 35, 20, "#a58b66", 5);
    panel(36, 4, 30, 31, "#829596");
    oval(51, 18, 11, 11, "#e8ddbd");
    line(51, 18, 51, 10, "#353549", 1.5);
    line(51, 18, 58, 20, "#353549", 1.5);
  } else if (role === "duck") {
    oval(42, 23, 20, 10, "#d8ae59");
    oval(57, 13, 10, 9, "#e9c26a");
    panel(61, 14, 12, 4, "#bd7656");
    oval(58, 11, 1.5, 1.5, "#252538");
  } else if (role === "investor") {
    oval(40, 20, 19, 15, "#b58448");
    oval(40, 18, 15, 12, "#e2b967");
    line(40, 10, 40, 26, "#92663e", 2);
    line(34, 14, 46, 14, "#92663e", 2);
    line(34, 22, 46, 22, "#92663e", 2);
  } else if (role === "workhorse") {
    line(grip, 20, 41, 20, "#76634d", 6);
    c.strokeStyle = "#bcc1b4";
    c.lineWidth = 8;
    c.beginPath();
    c.arc(51, 19, 13, -1.15, 1.15);
    c.stroke();
    line(53, 7, 60, 7, "#343846", 2);
    line(53, 31, 60, 31, "#343846", 2);
  } else if (role === "cleaner") {
    line(grip, 20, 61, 20, "#ba9e71", 5);
    panel(58, 9, 13, 23, "#94b0a0");
    for (let i = 0; i < 5; i++)
      line(65, 10 + i * 5, 74, 9 + i * 5, "#c7d2b3", 1.5);
  } else if (role === "landlord") {
    oval(grip + 1, 20, 8, 8, "#d2b174");
    line(grip + 8, 20, 64, 20, "#c6ad7d", 6);
    line(56, 20, 56, 28, "#c6ad7d", 5);
    line(64, 20, 64, 26, "#c6ad7d", 5);
  } else if (role === "designer") {
    panel(grip - 2, 15, 28, 10, "#bf8b60");
    c.fillStyle = "#d1d7cb";
    c.beginPath();
    c.moveTo(grip + 26, 15);
    c.lineTo(69, 15);
    c.lineTo(57, 24);
    c.lineTo(grip + 26, 24);
    c.closePath();
    c.fill();
    c.stroke();
  } else if (role === "engineer" || role === "driver") {
    line(grip, 20, 54, 20, "#91a6aa", 7);
    line(grip + 1, 18, 48, 18, "#d3d6c2", 2);
    line(53, 20, 64, 8, "#bdc7bb", 7);
    line(53, 20, 67, 28, "#bdc7bb", 7);
  } else {
    line(grip, 20, 53, 20, role === "teacher" ? "#cfb685" : "#67768b", 7);
    line(grip, 18, 51, 18, "#d6d0b9", 1.4);
    if (role === "manager") panel(42, 5, 22, 29, "#b6a77e");
    if (role === "teacher")
      for (let i = 0; i < 8; i++)
        line(15 + i * 5, 18, 15 + i * 5, 21, "#68564d", 1);
  }
  return canvas;
}
export function makeProjectile(kind: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 40;
  const c = canvas.getContext("2d")!;
  // Tail and payload share one quad; payload center stays at x=64.
  c.strokeStyle = ["shooter", "wraith", "boss", "enemy"].includes(kind)
    ? "#c9a18e"
    : "#c0c9be";
  c.globalAlpha = 0.35;
  c.lineCap = "round";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(3, 20);
  c.lineTo(47, 20);
  c.stroke();
  c.globalAlpha = 1;
  c.translate(32, 0);
  c.lineWidth = 2;
  c.strokeStyle = "#222232";
  if (["paper", "card", "evidence", "report", "film"].includes(kind)) {
    c.fillStyle = "#e9dfbf";
    c.beginPath();
    c.moveTo(7, 8);
    c.lineTo(51, 11);
    c.lineTo(57, 29);
    c.lineTo(15, 32);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = "#778f91";
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(18, 15 + i * 5);
      c.lineTo(42, 16 + i * 5);
      c.stroke();
    }
    if (kind !== "paper") {
      c.fillStyle =
        kind === "card" ? "#648d88" : kind === "film" ? "#645b72" : "#8a7662";
      c.fillRect(21, 11, 9, 9);
    }
  } else if (kind === "cutter" || kind === "blade") {
    c.fillStyle = "#bbc4c0";
    c.beginPath();
    c.moveTo(8, 18);
    c.lineTo(47, 11);
    c.lineTo(60, 19);
    c.lineTo(47, 26);
    c.lineTo(8, 23);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = "#f4e9cb";
    c.beginPath();
    c.moveTo(18, 18);
    c.lineTo(52, 18);
    c.stroke();
  } else if (kind === "frost") {
    c.fillStyle = "#a5d5dc";
    c.beginPath();
    c.moveTo(7, 20);
    c.lineTo(26, 9);
    c.lineTo(60, 20);
    c.lineTo(26, 31);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = "#edf1d8";
    c.beginPath();
    c.moveTo(14, 20);
    c.lineTo(49, 20);
    c.stroke();
  } else if (kind === "venom") {
    c.fillStyle = "#8fb386";
    c.beginPath();
    c.roundRect(22, 8, 25, 25, 5);
    c.fill();
    c.stroke();
    c.fillStyle = "#d7d0ad";
    c.fillRect(27, 4, 14, 6);
    c.fillStyle = "#d8e1b9";
    c.fillRect(28, 16, 9, 5);
  } else if (kind === "flame") {
    c.fillStyle = "#d7895d";
    c.beginPath();
    c.moveTo(5, 20);
    c.quadraticCurveTo(22, 0, 38, 13);
    c.lineTo(59, 20);
    c.lineTo(38, 29);
    c.quadraticCurveTo(20, 40, 5, 20);
    c.fill();
    c.stroke();
    c.fillStyle = "#efcf91";
    c.beginPath();
    c.moveTo(20, 20);
    c.lineTo(43, 15);
    c.lineTo(54, 20);
    c.lineTo(43, 25);
    c.closePath();
    c.fill();
  } else if (kind === "drone") {
    c.fillStyle = "#9cbbb1";
    c.beginPath();
    c.roundRect(21, 13, 24, 14, 3);
    c.fill();
    c.stroke();
    for (const x of [14, 50])
      for (const y of [8, 32]) {
        c.beginPath();
        c.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(33, 20);
        c.stroke();
      }
    c.fillStyle = "#ead39a";
    c.fillRect(35, 16, 8, 5);
  } else if (kind === "seeker") {
    c.fillStyle = "#bf9a79";
    c.beginPath();
    c.moveTo(12, 14);
    c.lineTo(43, 14);
    c.lineTo(59, 20);
    c.lineTo(43, 26);
    c.lineTo(12, 26);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#c86d60";
    c.beginPath();
    c.moveTo(44, 14);
    c.lineTo(59, 20);
    c.lineTo(44, 26);
    c.closePath();
    c.fill();
    c.fillStyle = "#7b9394";
    c.fillRect(13, 8, 9, 6);
    c.fillRect(13, 26, 9, 6);
  } else if (kind === "pulse") {
    c.strokeStyle = "#293142";
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(16, 11);
    c.lineTo(45, 11);
    c.lineTo(45, 29);
    c.lineTo(16, 29);
    c.stroke();
    c.strokeStyle = "#d8ddce";
    c.lineWidth = 4;
    c.stroke();
  } else if (kind === "ricochet") {
    c.fillStyle = "#828e92";
    c.beginPath();
    c.moveTo(14, 12);
    c.lineTo(44, 12);
    c.lineTo(49, 29);
    c.lineTo(10, 29);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = "#dfbc79";
    c.lineWidth = 3;
    c.strokeRect(17, 6, 23, 19);
  } else if (kind === "duck") {
    c.fillStyle = "#e1b85f";
    c.beginPath();
    c.ellipse(29, 25, 16, 9, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.ellipse(42, 14, 8, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#be7858";
    c.fillRect(46, 14, 9, 4);
    c.fillStyle = "#242334";
    c.fillRect(42, 11, 2, 2);
  } else if (kind === "coin") {
    c.fillStyle = "#d9b36b";
    c.beginPath();
    c.ellipse(32, 20, 13, 13, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = "#f5ddb0";
    c.beginPath();
    c.ellipse(32, 20, 9, 9, 0, 0, Math.PI * 2);
    c.stroke();
  } else if (kind === "shooter") {
    c.fillStyle = "#8bb29a";
    c.beginPath();
    c.moveTo(6, 20);
    c.quadraticCurveTo(32, -3, 52, 16);
    c.quadraticCurveTo(62, 33, 35, 31);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#d1d8ae";
    c.fillRect(36, 15, 7, 4);
  } else if (kind === "wraith") {
    c.fillStyle = "#b0a0cd";
    c.beginPath();
    c.roundRect(13, 8, 37, 22, 6);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(19, 29);
    c.lineTo(17, 36);
    c.lineTo(29, 29);
    c.fill();
    c.stroke();
    c.strokeStyle = "#53435f";
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(21 + i * 8, 16);
      c.lineTo(24 + i * 8, 22);
      c.stroke();
    }
  } else if (kind === "boss") {
    c.fillStyle = "#d3a465";
    c.beginPath();
    c.moveTo(10, 8);
    c.lineTo(55, 19);
    c.lineTo(12, 33);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#a7774e";
    c.fillRect(20, 17, 5, 5);
    c.fillRect(31, 18, 4, 4);
  } else if (kind === "keycap") {
    c.fillStyle = "#e3e1c6";
    c.beginPath();
    c.roundRect(17, 9, 31, 21, 4);
    c.fill();
    c.stroke();
    c.strokeStyle = "#789c9b";
    c.beginPath();
    c.moveTo(25, 17);
    c.lineTo(38, 17);
    c.lineTo(38, 23);
    c.lineTo(30, 23);
    c.stroke();
  } else {
    c.fillStyle = kind === "enemy" ? "#db8a7c" : "#a8cad0";
    c.beginPath();
    c.moveTo(9, 20);
    c.lineTo(35, 10);
    c.lineTo(59, 20);
    c.lineTo(35, 30);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = "#ece9cc";
    c.beginPath();
    c.moveTo(22, 20);
    c.lineTo(49, 20);
    c.stroke();
  }
  return canvas;
}
