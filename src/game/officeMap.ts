import type { World } from "../../shared/types";
type C = CanvasRenderingContext2D;
const rect = (
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  col: string,
) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};
function desk(c: C, x: number, y: number, variant: number) {
  rect(c, x - 1, y + 4, 51, 25, "#111a2060");
  rect(c, x, y, 49, 24, "#526069");
  const g = c.createLinearGradient(x, y, x + 49, y + 24);
  g.addColorStop(0, "#aeaa91");
  g.addColorStop(1, "#767e75");
  c.fillStyle = g;
  c.fillRect(x + 1, y + 1, 47, 20);
  rect(c, x + 16, y - 8, 17, 12, "#1d303b");
  rect(c, x + 17, y - 7, 15, 9, variant % 2 ? "#718d95" : "#6c7c8a");
  rect(c, x + 20, y + 5, 15, 1, "#b7c3b5");
  rect(c, x + 15, y + 9, 19, 5, "#555f61");
  for (let i = 0; i < 4; i++) rect(c, x + 17 + i * 4, y + 10, 2, 1, "#a3ada6");
  rect(c, x + 4, y + 3, 7, 10, "#d2ceba");
  rect(c, x + 6, y + 6, 4, 1, "#8b9b98");
  rect(c, x + 38, y + 6, 5, 5, "#a08068");
  rect(c, x + 39, y + 5, 3, 1, "#d4c1a1");
  rect(c, x + 17, y + 27, 18, 9, "#344b56");
  rect(c, x + 19, y + 34, 13, 2, "#556b70");
}
export function makeOfficeChunk(world: World, chunkX: number, chunkY: number) {
  const out = document.createElement("canvas");
  out.width = 1024;
  out.height = 1024;
  const c = out.getContext("2d")!;
  c.scale(2, 2);
  const sx = chunkX * 512,
    sy = chunkY * 512,
    park = world.biome === "cataclysm";
  rect(c, 0, 0, 512, 512, park ? "#263b48" : "#364853");
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const gx = chunkX * 8 + x,
        gy = chunkY * 8 + y,
        index = gy * world.cols + gx,
        px = x * 64,
        py = y * 64,
        h = ((gx * 1987) ^ (gy * 773) ^ world.seed) >>> 0,
        open = world.tiles[index];
      if (gx >= world.cols || gy >= world.rows) continue;
      if (open) {
        const roomIndex = world.rooms.findIndex(
          (r) =>
            gx * 64 >= r.x &&
            gx * 64 < r.x + r.w &&
            gy * 64 >= r.y &&
            gy * 64 < r.y + r.h,
        );
        const zone = (roomIndex + Math.floor(world.theme)) % 5;
        if (park) {
          rect(c, px, py, 64, 64, ["#52616b", "#576770", "#52616b"][h % 3]);
          rect(c, px, py + 63, 64, 1, "#8a9a9120");
          if (h % 7 === 0) {
            rect(c, px + 8, py + 10, 36, 4, "#aaa88b44");
            rect(c, px + 11, py + 17, 36, 2, "#141e2b55");
          }
          if (h % 11 === 0) {
            c.strokeStyle = "#728d972d";
            c.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
              c.beginPath();
              c.moveTo(px + i * 12, py);
              c.lineTo(px + i * 12 - 7, py + 24);
              c.stroke();
            }
          }
        } else {
          const colors = [
            "#a99d87",
            "#b0a18a",
            "#8d9ca1",
            "#b0a080",
            "#92a7aa",
          ];
          rect(c, px, py, 64, 64, colors[Math.max(0, zone)]);
          rect(c, px, py + 63, 64, 1, "#283b4250");
          rect(c, px + 63, py, 1, 64, "#283b4230");
          if (zone === 0 || zone === 2) {
            for (let i = 0; i < 6; i++)
              rect(c, px + 2, py + 6 + i * 10, 60, 1, "#1c2a3410");
          }
          if (zone === 1) {
            rect(c, px + 4, py, 1, 64, "#c4c8b824");
            rect(c, px + 32, py, 1, 64, "#c4c8b824");
          }
        }
        if (h % 29 === 0) {
          rect(c, px + 13, py + 22, 11, 8, "#d2cfb877");
          c.strokeStyle = "#778b8b55";
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(px + 16, py + 25);
          c.lineTo(px + 21, py + 25);
          c.stroke();
        }
        if (h % 47 === 0) {
          c.save();
          c.translate(px + 20, py + 35);
          c.rotate(0.3);
          rect(c, 0, 0, 21, 11, "#283e4c");
          rect(c, 2, 2, 16, 6, "#719096");
          c.restore();
        }
        if (!world.tiles[index - world.cols]) {
          rect(c, px, py, 64, 5, park ? "#4b645f" : "#a8b3a4");
          if (h % 3 === 0) {
            rect(c, px + 18, py + 3, 29, 3, "#a8d2c46b");
            if (!park) {
              const glow = c.createRadialGradient(
                px + 32,
                py + 5,
                0,
                px + 32,
                py + 5,
                58,
              );
              glow.addColorStop(0, "#d7dec118");
              glow.addColorStop(1, "transparent");
              c.fillStyle = glow;
              c.fillRect(px - 26, py - 30, 116, 90);
            }
          }
        }
      } else {
        rect(c, px, py, 64, 64, park ? "#233b3e" : "#3d5157");
        const up = world.tiles[index - world.cols],
          down = world.tiles[index + world.cols],
          left = world.tiles[index - 1],
          right = world.tiles[index + 1];
        if (!park) {
          rect(c, px + 2, py + 2, 60, 60, "#53666b");
          if (down) {
            rect(c, px, py + 49, 64, 15, "#283e48");
            rect(c, px + 2, py + 48, 60, 2, "#b4bdad");
            if (h % 4 === 0) {
              rect(c, px + 12, py + 36, 40, 9, "#d5d8c1");
              c.font = "5px Microsoft YaHei";
              c.fillStyle = "#465e60";
              c.fillText(
                ["茶水间", "会议室", "禁止加班", "今日准点走"][h % 4],
                px + 14,
                py + 43,
              );
            }
          }
          if (h % 7 === 0) {
            rect(c, px + 5, py + 8, 54, 28, "#294451");
            for (let i = 0; i < 3; i++)
              rect(c, px + 7 + i * 18, py + 9, 2, 25, "#829ea3");
            rect(c, px + 8, py + 10, 47, 1, "#b1c5b844");
          }
        } else {
          rect(c, px + 4, py + 4, 56, 56, "#3e5854");
          if (down) {
            rect(c, px, py + 51, 64, 13, "#142f3c");
            rect(c, px + 3, py + 49, 58, 3, "#9eb7a7");
          }
          if (h % 3 === 0) {
            rect(c, px + 9, py + 13, 46, 22, "#59696a");
            rect(c, px + 12, py + 11, 16, 20, "#263f50");
            rect(c, px + 30, py + 11, 16, 20, "#263f50");
            rect(c, px + 11, py + 35, 8, 8, "#1a2b30");
            rect(c, px + 45, py + 35, 8, 8, "#1a2b30");
          }
        }
      }
    }
  // Large room furniture goes along edges; central movement routes stay clear.
  for (let i = 0; i < world.rooms.length; i++) {
    const r = world.rooms[i],
      x = r.x - sx,
      y = r.y - sy,
      zone = (i + Math.floor(world.theme)) % 5;
    if (x + r.w < 0 || x > 512 || y + r.h < 0 || y > 512) continue;
    if (!park) {
      if (zone === 0 || zone === 2) {
        for (let n = 0; n < Math.min(4, Math.floor(r.w / 64) - 1); n++)
          desk(c, x + 12 + n * 58, y + 22, n + i);
      }
      if (zone === 1) {
        rect(c, x + 15, y + 16, Math.min(r.w - 40, 160), 41, "#817e67");
        for (let n = 0; n < 4; n++) {
          rect(c, x + 22 + n * 31, y + 10, 18, 7, "#334e59");
          rect(c, x + 22 + n * 31, y + 59, 18, 7, "#334e59");
        }
        rect(c, x + 35, y + 23, 52, 17, "#b9b89d");
      }
      if (zone === 3) {
        rect(c, x + 10, y + 11, Math.min(r.w - 20, 180), 31, "#bab8a0");
        rect(c, x + 20, y + 14, 23, 16, "#3a5055");
        rect(c, x + 48, y + 14, 13, 13, "#8d9c92");
        rect(c, x + 75, y + 17, 9, 11, "#9b7660");
        rect(c, x + 91, y + 17, 9, 11, "#9b7660");
      }
      if (zone === 4) {
        for (let n = 0; n < Math.min(5, Math.floor(r.w / 39) - 1); n++) {
          rect(c, x + 12 + n * 34, y + 10, 27, 42, "#263c48");
          for (let j = 0; j < 6; j++) {
            rect(c, x + 15 + n * 34, y + 14 + j * 5, 19, 2, "#526c76");
            rect(c, x + 31 + n * 34, y + 14 + j * 5, 2, 1, "#a9c5a4");
          }
        }
      }
      c.font = "8px Microsoft YaHei";
      c.fillStyle = "#d9dbc19a";
      c.fillText(
        [
          "开放工位 / 工位在，人不一定在",
          "会议室 / 本次会议不延期",
          "项目组 / 先活着交付",
          "茶水间 / 咖啡还热",
          "机房 / 重启解决百分之八十",
        ][zone],
        x + 12,
        y + r.h - 12,
      );
    } else {
      c.strokeStyle = "#b3c4a33b";
      c.lineWidth = 2;
      for (let n = 0; n < 4; n++) {
        const xx = x + n * 48;
        c.beginPath();
        c.moveTo(xx, y + 10);
        c.lineTo(xx, y + 70);
        c.lineTo(xx + 38, y + 70);
        c.stroke();
      }
      c.font = "9px Microsoft YaHei";
      c.fillStyle = "#d1cc9b80";
      c.fillText(
        ["末班车在等人", "物流通道 / 别挡快递", "食堂窗口已下班", "应急通道 →"][
          i % 4
        ],
        x + 8,
        y + r.h - 15,
      );
    }
  }
  if (park) {
    c.strokeStyle = "#abbfb628";
    c.lineWidth = 2;
    c.setLineDash([22, 18]);
    c.beginPath();
    for (let x = 0; x <= 512; x += 32) {
      const yy =
        world.h * 0.49 + Math.sin((sx + x) * 0.002 + world.seed) * 80 - sy;
      if (!x) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();
    c.setLineDash([]);
  }
  return out;
}
