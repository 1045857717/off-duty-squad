import Phaser from "phaser";
import type { GameState, Vec, AreaEffect } from "../../shared/types";
type Visual = {
  boundary: Phaser.GameObjects.Image;
  detail: Phaser.GameObjects.Image;
  seen: number;
};
const COLORS = {
  orbit: "#b9adca",
  venom: "#8fb79d",
  gravity: "#b29bc9",
  flame: "#df9c73",
};
// Outlines are rasterized once; hundreds of animated curves become two cheap
// textured quads per area. The texture radius maps exactly to server radius.
function areaTexture(kind: AreaEffect["kind"], tier: number, detail: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const c = canvas.getContext("2d")!,
    r = 220,
    col = COLORS[kind];
  c.translate(256, 256);
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineWidth = 1.5 + tier * 0.4;
  const circle = (rr: number, alpha: number) => {
    c.globalAlpha = alpha;
    c.beginPath();
    c.arc(0, 0, rr, 0, Math.PI * 2);
    c.stroke();
  };
  if (!detail) {
    if (kind === "flame") {
      c.globalAlpha = 0.45;
      c.beginPath();
      c.arc(0, 0, r, -0.7, 0.7);
      c.stroke();
      for (const a of [-0.7, 0.7]) {
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        c.stroke();
      }
    } else {
      circle(r, 0.4);
      const count = 12 + tier * 6;
      c.globalAlpha = 0.65;
      for (let i = 0; i < count; i++) {
        const a = (i * Math.PI * 2) / count;
        c.beginPath();
        c.moveTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5));
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        c.stroke();
      }
      if (tier) {
        c.strokeStyle = "#f3e7c0";
        circle(r + 5, 0.2);
      }
    }
  } else if (kind === "orbit") {
    for (let i = 0; i < 4 + tier * 2; i++) {
      const a = (i * Math.PI * 2) / (4 + tier * 2),
        rr = r - 14;
      c.globalAlpha = 0.9;
      c.lineWidth = 3 + tier;
      c.beginPath();
      c.arc(0, 0, rr, a - 0.2, a + 0.09);
      c.stroke();
      c.fillStyle = "#f3eddd";
      c.beginPath();
      c.moveTo(
        Math.cos(a) * rr + Math.cos(a) * 7,
        Math.sin(a) * rr + Math.sin(a) * 7,
      );
      c.lineTo(
        Math.cos(a) * rr + Math.cos(a + 2.3) * 5,
        Math.sin(a) * rr + Math.sin(a + 2.3) * 5,
      );
      c.lineTo(
        Math.cos(a) * rr + Math.cos(a - 1.2) * 11,
        Math.sin(a) * rr + Math.sin(a - 1.2) * 11,
      );
      c.fill();
    }
  } else if (kind === "venom") {
    const g = c.createRadialGradient(0, 0, 30, 0, 0, r);
    g.addColorStop(0, "#adcc7a0b");
    g.addColorStop(0.65, "#adcc7a0d");
    g.addColorStop(1, "#adcc7a00");
    c.fillStyle = g;
    c.fillRect(-r, -r, r * 2, r * 2);
    c.fillStyle = col;
    for (let i = 0; i < 12 + tier * 4; i++) {
      const a = i * 2.4,
        rr = r * (0.22 + (i % 4) * 0.19),
        x = Math.cos(a) * rr,
        y = Math.sin(a) * rr;
      c.globalAlpha = 0.3;
      c.beginPath();
      c.arc(x, y, 7 + (i % 3) * 3, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.65;
      c.beginPath();
      c.arc(x + 5, y - 9, 1.5, 0, Math.PI * 2);
      c.fill();
    }
  } else if (kind === "gravity") {
    for (let i = 0; i < 3 + tier; i++) {
      c.globalAlpha = 0.5;
      c.beginPath();
      c.ellipse(
        0,
        0,
        r - 12 - i * 25,
        (r - 12 - i * 25) * 0.4,
        0,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const a = (i * Math.PI) / 7,
        rr = 25 + ((i * 37) % (r - 30));
      c.globalAlpha = 0.7;
      c.beginPath();
      c.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.6, 2, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 0.9;
    c.fillStyle = "#14121f";
    c.beginPath();
    c.arc(0, 0, 13, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#e9d5ff";
    circle(17, 0.7);
  } else {
    for (let i = 0; i < 22 + tier * 7; i++) {
      const a = Math.sin(i * 4) * 0.63,
        rr = 20 + ((i * 41) % (r - 30));
      c.globalAlpha = 0.2 + (i % 5) * 0.12;
      c.lineWidth = 2 + tier;
      c.beginPath();
      c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      c.lineTo(Math.cos(a) * (rr + 12), Math.sin(a) * (rr + 12));
      c.stroke();
    }
  }
  return canvas;
}
export class AreaRenderer {
  private visuals = new Map<number, Visual>();
  private sequence = 0;
  private scene: Phaser.Scene;
  private auras = new Map<string, Phaser.GameObjects.Image>();
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (const kind of Object.keys(COLORS) as AreaEffect["kind"][])
      for (let tier = 0; tier < 3; tier++)
        for (const detail of [false, true])
          scene.textures.addCanvas(
            `area-${kind}-${tier}-${detail ? 1 : 0}`,
            areaTexture(kind, tier, detail),
          );
  }
  draw(
    s: GameState,
    time: number,
    position: (id: string) => Vec | undefined,
    reduced = false,
  ) {
    this.sequence++;
    const seq = this.sequence,
      t = reduced ? 0 : time / 1000,
      view = this.scene.cameras.main.worldView;
    for (const area of s.areas || []) {
      const owner = s.players.find((p) => p.id === area.owner);
      if (!owner?.alive) continue;
      const pos = area.kind === "orbit" ? position(area.owner) || area : area,
        x = pos.x,
        y = pos.y,
        r = area.radius;
      if (
        x + r < view.x ||
        x - r > view.right ||
        y + r < view.y ||
        y - r > view.bottom
      )
        continue;
      const tier = area.level >= 8 ? 2 : area.level >= 4 ? 1 : 0,
        base = `area-${area.kind}-${tier}-`;
      let v = this.visuals.get(area.id);
      if (!v) {
        v = {
          boundary: this.scene.add.image(x, y, base + "0").setDepth(16),
          detail: this.scene.add.image(x, y, base + "1").setDepth(17),
          seen: seq,
        };
        this.visuals.set(area.id, v);
      }
      v.seen = seq;
      const alpha = area.kind === "orbit" ? 1 : Math.min(1, area.life / 0.4),
        size = (r * 512) / 220;
      v.boundary
        .setTexture(base + "0")
        .setPosition(x, y)
        .setDisplaySize(size, size)
        .setRotation(area.kind === "flame" ? area.angle : 0)
        .setAlpha(alpha);
      const rotation =
        area.kind === "orbit"
          ? t * (tier ? 1.35 : 1)
          : area.kind === "gravity"
            ? Math.sin(t * 0.8) * 0.17
            : area.kind === "venom"
              ? t * 0.045
              : area.angle + Math.sin(t * 13) * 0.008;
      v.detail
        .setTexture(base + "1")
        .setPosition(x, y)
        .setDisplaySize(size, size)
        .setRotation(rotation)
        .setAlpha(
          alpha * (area.kind === "flame" ? 0.7 + Math.sin(t * 12) * 0.2 : 1),
        );
    }
    for (const [id, v] of this.visuals)
      if (v.seen !== seq) {
        v.boundary.destroy();
        v.detail.destroy();
        this.visuals.delete(id);
      }
    const alive = new Set<string>();
    for (const p of s.players) {
      const max = Math.max(1, p.signatureLevel, ...Object.values(p.arsenal));
      if (!p.alive || max < 4) continue;
      alive.add(p.id);
      const pos = position(p.id) || p;
      let aura = this.auras.get(p.id);
      if (!aura) {
        aura = this.scene.add
          .image(pos.x, pos.y, "area-orbit-0-0")
          .setDepth(18);
        this.auras.set(p.id, aura);
      }
      aura
        .setPosition(pos.x, pos.y)
        .setDisplaySize(74, 74)
        .setTint(max >= 8 ? 0xe4ca7d : 0x9dc4ba)
        .setAlpha(0.45)
        .setRotation(t * 0.25);
    }
    for (const [id, v] of this.auras)
      if (!alive.has(id)) {
        v.destroy();
        this.auras.delete(id);
      }
  }
}
