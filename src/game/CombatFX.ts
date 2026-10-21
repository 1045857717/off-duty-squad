import Phaser from "phaser";
import type { Effect, Ability } from "../../shared/types";
type Particle = {
  image: Phaser.GameObjects.Image;
  born: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  size: number;
  active: boolean;
  shape: string;
};
const tint = (s: string) => parseInt(s.slice(1), 16);
export class CombatFX {
  private particles: Particle[] = [];
  private index = 0;
  private stamps: {
    image: Phaser.GameObjects.Image;
    born: number;
    life: number;
    size: number;
    active: boolean;
  }[] = [];
  private stampIndex = 0;
  private lastAttackStamp = -1000;
  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < 28; i++)
      this.stamps.push({
        image: scene.add
          .image(0, 0, "art-fx-atlas", 0)
          .setVisible(false)
          .setDepth(62)
          .setBlendMode(Phaser.BlendModes.ADD),
        born: 0,
        life: 0,
        size: 0,
        active: false,
      });
    for (const type of ["spark", "cross", "shard", "blade", "snow", "hex"]) {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 40;
      const ctx = c.getContext("2d")!;
      ctx.strokeStyle = "#fff";
      ctx.fillStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.translate(20, 20);
      if (type === "cross") {
        ctx.fillRect(-2, -8, 4, 16);
        ctx.fillRect(-8, -2, 16, 4);
      } else if (type === "shard") {
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(-3, 0);
        ctx.fill();
      } else if (type === "blade") {
        ctx.beginPath();
        ctx.moveTo(-13, 5);
        ctx.lineTo(3, -8);
        ctx.lineTo(14, -4);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();
      } else if (type === "snow") {
        for (let i = 0; i < 6; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -12);
          ctx.moveTo(0, -6);
          ctx.lineTo(-4, -9);
          ctx.moveTo(0, -6);
          ctx.lineTo(4, -9);
          ctx.stroke();
          ctx.restore();
        }
      } else if (type === "hex") {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          i
            ? ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12)
            : ctx.moveTo(12, 0);
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(2, -1);
        ctx.lineTo(7, 0);
        ctx.lineTo(2, 2);
        ctx.lineTo(0, 7);
        ctx.lineTo(-2, 2);
        ctx.lineTo(-7, 0);
        ctx.lineTo(-2, -1);
        ctx.closePath();
        ctx.fill();
      }
      if (!scene.textures.exists("fx-" + type))
        scene.textures.addCanvas("fx-" + type, c);
    }
    for (let i = 0; i < 360; i++) {
      const image = scene.add
        .image(0, 0, "fx-spark")
        .setVisible(false)
        .setDepth(66)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.particles.push({
        image,
        born: 0,
        life: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        spin: 0,
        size: 0,
        active: false,
        shape: "spark",
      });
    }
  }
  private emit(
    e: Effect,
    time: number,
    shape: string,
    count: number,
    speed: number,
    size: number,
    life = 0.7,
    angle?: number,
    spread = Math.PI * 2,
  ) {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.index++ % this.particles.length];
      const jitter = ((e.id * 37 + i * 71) % 101) / 101,
        a = (angle ?? 0) + (jitter - 0.5) * spread,
        r = 5 + ((i * 13) % 29),
        v = speed * (0.45 + jitter * 0.75);
      Object.assign(p, {
        born: time,
        life,
        x: e.x + Math.cos(a) * r,
        y: e.y + Math.sin(a) * r,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        spin: (jitter - 0.5) * 4,
        size: size * (0.65 + jitter * 0.7),
        active: true,
        shape,
      });
      p.image
        .setTexture("fx-" + shape)
        .setTint(tint(e.color))
        .setPosition(p.x, p.y)
        .setVisible(true)
        .setAlpha(0.9)
        .setRotation(a)
        .setScale(p.size / 40);
    }
  }
  burst(e: Effect, time: number, reduced = false) {
    this.stamp(e, time, reduced);
    const aliases: Record<string, Ability> = {
      decoy: "chain",
      supply: "mend",
      wok: "nova",
      sanitize: "frost",
      bell: "aegis",
      rush: "volley",
      flash: "nova",
      injunction: "reaper",
      stampede: "volley",
      takeblame: "nova",
      paidbreak: "mend",
      paperstorm: "orbit",
      quack: "chain",
      crunch: "nova",
      espresso: "mend",
      bugfix: "frost",
      pie: "nova",
      funding: "chain",
      slides: "orbit",
      rent: "reaper",
    };
    if (e.ability && aliases[e.ability])
      e = { ...e, ability: aliases[e.ability] };
    const c = (n: number) => (reduced ? Math.ceil(n * 0.4) : n);
    if (e.critical && e.kind === "hit") {
      this.emit(e, time, "spark", c(18), 200, 11, 0.4);
      this.emit(e, time, "blade", c(5), 110, 18, 0.4);
      return;
    }
    if (e.attackSkill) {
      const shape =
        e.attackSkill === "frost"
          ? "snow"
          : e.attackSkill === "blade" || e.attackSkill === "orbit"
            ? "blade"
            : e.attackSkill === "gravity" || e.attackSkill === "venom"
              ? "hex"
              : "spark";
      this.emit(
        e,
        time,
        shape,
        c(8 + Math.floor((e.attackLevel || 1) / 2)),
        e.attackSkill === "meteor" ? 230 : 95,
        e.attackSkill === "gravity" ? 18 : 10,
        0.55,
      );
      return;
    }
    switch (e.ability) {
      case "volley":
        this.emit(e, time, "spark", c(28), 330, 14, 0.4, e.angle, 1.1);
        break;
      case "nova":
        this.emit(e, time, "hex", c(22), 220, 20, 0.75);
        this.emit(e, time, "spark", c(20), 340, 10, 0.48);
        break;
      case "mend":
        this.emit(e, time, "cross", c(24), 70, 14, 1.05);
        break;
      case "aegis":
        this.emit(e, time, "hex", c(22), 105, 22, 1);
        break;
      case "frost":
        this.emit(e, time, "snow", c(28), 200, 20, 1.05);
        this.emit(e, time, "shard", c(20), 270, 18, 0.75);
        break;
      case "chain":
        this.emit(e, time, "spark", c(18), 160, 12, 0.4);
        break;
      case "orbit":
        this.emit(e, time, "blade", c(32), 215, 23, 0.85);
        break;
      case "reaper":
        this.emit(e, time, "blade", c(28), 150, 25, 0.9);
        this.emit(e, time, "spark", c(16), 230, 11, 0.65);
        break;
      default:
        if (e.kind === "hit")
          this.emit(e, time, "spark", c(e.critical ? 12 : 6), 120, 7, 0.28);
        if (e.kind === "death") {
          this.emit(e, time, "shard", c(14), 140, 14, 0.7);
          this.emit(e, time, "spark", c(10), 180, 6, 0.45);
        }
        if (e.kind === "heal") this.emit(e, time, "cross", c(9), 38, 11, 0.8);
        if (e.kind === "attack" && !e.warning)
          this.emit(
            e,
            time,
            e.enemyKind === "bomber" ? "shard" : "spark",
            c(e.enemyKind === "bomber" ? 28 : 9),
            e.enemyKind === "bomber" ? 220 : 120,
            13,
            0.6,
          );
        if (e.kind === "lightning")
          this.emit(e, time, "spark", c(8), 130, 10, 0.3);
    }
  }
  private stamp(e: Effect, time: number, reduced: boolean) {
    if (e.warning || e.kind === "death" || e.kind === "rescue") return;
    if (e.attackSkill) {
      if (time - this.lastAttackStamp < 45) return;
      this.lastAttackStamp = time;
    }
    const ability = e.ability,
      attack = e.attackSkill;
    let shape = "slash";
    if (e.critical) shape = "critical";
    else if (
      e.kind === "heal" ||
      ["mend", "supply", "paidbreak"].includes(ability || "")
    )
      shape = "heal";
    else if (["aegis", "injunction", "takeblame"].includes(ability || ""))
      shape = "shield";
    else if (["frost", "bugfix"].includes(ability || "") || attack === "frost")
      shape = "frost";
    else if (
      ["sanitize"].includes(ability || "") ||
      attack === "venom" ||
      attack === "gravity"
    )
      shape = "mist";
    else if (
      ["chain", "decoy", "quack"].includes(ability || "") ||
      attack === "arc" ||
      attack === "ricochet"
    )
      shape = "electric";
    else if (
      ability === "espresso" ||
      attack === "coffee" ||
      attack === "flame"
    )
      shape = "coffee";
    if (e.kind === "hit" && !e.critical) return;
    if (reduced && e.kind !== "skill" && !e.critical) return;
    const p = this.stamps[this.stampIndex++ % this.stamps.length];
    const size =
      e.kind === "skill"
        ? Math.min(270, e.size * 1.2)
        : e.critical
          ? 64
          : Math.min(135, Math.max(46, e.size * 0.8));
    Object.assign(p, {
      born: time,
      life: e.kind === "skill" ? 650 : 340,
      size,
      active: true,
    });
    p.image
      .setTexture(
        "art-fx-atlas",
        [
          "slash",
          "electric",
          "frost",
          "mist",
          "shield",
          "coffee",
          "critical",
          "heal",
        ].indexOf(shape),
      )
      .setPosition(e.x, e.y)
      .setDisplaySize(size, size)
      .setRotation(shape === "slash" ? e.angle || 0 : 0)
      .setAlpha(e.kind === "skill" ? 0.62 : 0.5)
      .setVisible(true);
  }
  update(time: number) {
    for (const p of this.stamps) {
      if (!p.active) continue;
      const t = (time - p.born) / p.life;
      if (t >= 1) {
        p.active = false;
        p.image.setVisible(false);
        continue;
      }
      p.image
        .setAlpha((1 - t) * 0.64)
        .setDisplaySize(p.size * (0.8 + t * 0.35), p.size * (0.8 + t * 0.35));
    }
    for (const p of this.particles) {
      if (!p.active) continue;
      const age = (time - p.born) / 1000,
        t = age / p.life;
      if (t >= 1) {
        p.active = false;
        p.image.setVisible(false);
        continue;
      }
      const damping = 1 - Math.exp(-age * 2);
      p.image
        .setPosition(
          p.x + p.vx * damping * 0.5,
          p.y + p.vy * damping * 0.5 - (p.shape === "cross" ? age * 25 : 0),
        )
        .setAlpha((1 - t) * 0.85)
        .setScale(
          (p.size / 40) * (p.shape === "hex" ? 1 + t * 0.5 : 1 - t * 0.6),
        )
        .setRotation(p.spin * age);
    }
  }
  draw(g: Phaser.GameObjects.Graphics, e: Effect, time: number, age: number) {
    const aliases: Record<string, Ability> = {
      decoy: "chain",
      supply: "mend",
      wok: "nova",
      sanitize: "frost",
      bell: "aegis",
      rush: "volley",
      flash: "nova",
      injunction: "reaper",
      stampede: "volley",
      takeblame: "nova",
      paidbreak: "mend",
      paperstorm: "orbit",
      quack: "chain",
      crunch: "nova",
      espresso: "mend",
      bugfix: "frost",
      pie: "nova",
      funding: "chain",
      slides: "orbit",
      rent: "reaper",
    };
    if (e.ability && aliases[e.ability])
      e = { ...e, ability: aliases[e.ability] };
    const t = Math.max(0, Math.min(1, age / e.maxLife)),
      alpha = 1 - t,
      col = tint(e.color),
      a = e.angle || 0,
      spin = time * 0.002;
    if ((e.attackLevel || 1) >= 4 && e.kind === "skill") {
      const level = e.attackLevel || 4;
      g.lineStyle(
        level >= 8 ? 2 : 1,
        level >= 8 ? 0xf2d384 : col,
        alpha * 0.5,
      ).strokeCircle(e.x, e.y, 20 + t * 50);
      for (let i = 0; i < (level >= 8 ? 8 : 4); i++) {
        const a = (i * Math.PI * 2) / (level >= 8 ? 8 : 4) + spin;
        g.fillStyle(level >= 8 ? 0xf4d694 : col, alpha * 0.6).fillCircle(
          e.x + Math.cos(a) * (25 + t * 40),
          e.y + Math.sin(a) * (25 + t * 40),
          1.5,
        );
      }
    }
    if (e.critical && e.kind === "hit") {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.lineStyle(i % 2 ? 1 : 2, 0xffdfa0, alpha).lineBetween(
          e.x + Math.cos(a) * (7 + t * 15),
          e.y + Math.sin(a) * (7 + t * 15),
          e.x + Math.cos(a) * (18 + t * 30),
          e.y + Math.sin(a) * (18 + t * 30),
        );
      }
    }
    if (e.attackSkill) {
      const id = e.attackSkill,
        r = e.size,
        phase = time * 0.004;
      if (id === "arc" || id === "ricochet")
        for (let i = 0; i < 4; i++) {
          const angle = a + i * 0.4;
          g.lineStyle(1.5, col, alpha).lineBetween(
            e.x + Math.cos(angle) * 10,
            e.y + Math.sin(angle) * 10,
            e.x + Math.cos(angle) * 40,
            e.y + Math.sin(angle) * 40,
          );
        }
      if (["bat", "mop", "wrench"].includes(id)) {
        const reach = id === "mop" ? 130 : 100,
          angle = a - Math.PI * 0.5 + t * Math.PI;
        g.lineStyle(id === "wrench" ? 7 : 4, col, alpha * 0.8)
          .beginPath()
          .arc(e.x, e.y, reach, a - 0.9, a - 0.9 + t * 1.8)
          .strokePath();
        g.lineStyle(2, 0xe6dfbd, alpha * 0.5)
          .beginPath()
          .arc(e.x, e.y, reach - 8, a - 0.9, a - 0.9 + t * 1.8)
          .strokePath();
      }
      if (id === "coffee") {
        for (let i = 0; i < 7; i++) {
          const angle = a + (i - 3) * 0.16,
            rad = 20 + t * 130;
          g.fillStyle(0xb8875a, alpha * 0.7).fillEllipse(
            e.x + Math.cos(angle) * rad,
            e.y + Math.sin(angle) * rad,
            4,
            8,
          );
        }
      }
      if (id === "pulse" || id === "drone" || id === "seeker")
        for (let i = 0; i < (id === "drone" ? 2 : 3); i++) {
          const angle = a + (i - 1) * 0.16,
            x = e.x + Math.cos(angle) * (15 + t * 60),
            y = e.y + Math.sin(angle) * (15 + t * 60);
          g.lineStyle(2, col, alpha).lineBetween(
            x,
            y,
            x + Math.cos(angle) * 20,
            y + Math.sin(angle) * 20,
          );
          if (id === "drone")
            g.lineStyle(1, col, alpha).strokeRect(x - 5, y - 5, 10, 10);
          if (id === "seeker") g.lineStyle(1, col, alpha).strokeCircle(x, y, 5);
        }
      if (id === "frost")
        for (let i = 0; i < 5; i++) {
          const angle = a + (i - 2) * 0.11,
            x = e.x + Math.cos(angle) * (15 + t * 140),
            y = e.y + Math.sin(angle) * (15 + t * 140);
          g.lineStyle(2, col, alpha).lineBetween(
            x,
            y,
            x - Math.cos(angle) * 20,
            y - Math.sin(angle) * 20,
          );
          g.lineStyle(1, 0xf3faff, alpha).lineBetween(
            x,
            y,
            x - Math.cos(angle + 0.5) * 10,
            y - Math.sin(angle + 0.5) * 10,
          );
        }
      if (id === "blade" || id === "orbit")
        for (let i = 0; i < 5; i++) {
          const angle = phase + (i * Math.PI * 2) / 5,
            rad = id === "orbit" ? r * (0.6 + t * 0.4) : 35 + t * r;
          g.lineStyle(3, col, alpha)
            .beginPath()
            .arc(e.x, e.y, rad, angle, angle + 0.45)
            .strokePath();
        }
      if (id === "meteor") {
        g.lineStyle(3, col, alpha).lineBetween(
          e.x - 60 * (1 - t),
          e.y - 190 * (1 - t),
          e.x,
          e.y,
        );
        g.lineStyle(2, col, alpha).strokeEllipse(
          e.x,
          e.y,
          r * t * 2,
          r * t,
          32,
        );
      }
      if (id === "venom")
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 + phase * 0.1;
          g.lineStyle(1, col, alpha * 0.6).strokeCircle(
            e.x + Math.cos(angle) * r * 0.5,
            e.y + Math.sin(angle) * r * 0.5,
            15 + t * 25,
          );
        }
      if (id === "flame")
        for (let i = 0; i < 7; i++) {
          const angle = a + (i - 3) * 0.16;
          g.lineStyle(3, col, alpha * 0.8).lineBetween(
            e.x + Math.cos(angle) * 20,
            e.y + Math.sin(angle) * 20,
            e.x + Math.cos(angle) * (50 + t * 170),
            e.y + Math.sin(angle) * (50 + t * 170),
          );
        }
      if (id === "gravity")
        for (let i = 0; i < 3; i++) {
          const radius = Math.max(5, r * (1 - t) + i * 7);
          g.lineStyle(2, col, alpha * 0.8).strokeEllipse(
            e.x,
            e.y,
            radius * 2,
            radius,
            40,
          );
        }
      return;
    }
    if (e.ability === "volley") {
      g.lineStyle(2, col, alpha * 0.75);
      for (let i = -4; i <= 4; i++) {
        const angle = a + i * 0.12,
          r = 40 + t * 190;
        g.lineBetween(
          e.x + Math.cos(angle) * r,
          e.y + Math.sin(angle) * r,
          e.x + Math.cos(angle) * (r + 23),
          e.y + Math.sin(angle) * (r + 23),
        );
      }
    }
    if (e.ability === "nova") {
      g.lineStyle(5 * alpha + 1, col, alpha * 0.8).strokeCircle(
        e.x,
        e.y,
        30 + t * 205,
      );
      g.lineStyle(1, 0xffe8be, alpha * 0.45).strokeCircle(
        e.x,
        e.y,
        20 + t * 175,
      );
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        g.lineStyle(2, col, alpha * 0.65).lineBetween(
          e.x + Math.cos(angle) * (40 + t * 160),
          e.y + Math.sin(angle) * (40 + t * 160),
          e.x + Math.cos(angle) * (55 + t * 190),
          e.y + Math.sin(angle) * (55 + t * 190),
        );
      }
    }
    if (e.ability === "mend") {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - spin,
          r = 40 + t * 125,
          x = e.x + Math.cos(angle) * r,
          y = e.y + Math.sin(angle) * r;
        g.fillStyle(col, alpha * 0.7)
          .fillRect(x - 2, y - 7, 4, 14)
          .fillRect(x - 7, y - 2, 14, 4);
      }
      g.lineStyle(1, col, alpha * 0.5).strokeEllipse(
        e.x,
        e.y + 15,
        70 + t * 250,
        30 + t * 100,
        32,
      );
    }
    if (e.ability === "aegis") {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + spin * 0.18,
          r = 40 + t * 45;
        g.lineStyle(2, col, alpha * 0.8).lineBetween(
          e.x + Math.cos(angle) * r,
          e.y + Math.sin(angle) * r,
          e.x + Math.cos(angle + Math.PI / 3) * r,
          e.y + Math.sin(angle + Math.PI / 3) * r,
        );
      }
      g.lineStyle(1, 0xe3f6ff, alpha * 0.7).strokeCircle(e.x, e.y, 37 + t * 47);
    }
    if (e.ability === "frost") {
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6,
          r = 30 + t * 240,
          x = e.x + Math.cos(angle) * r,
          y = e.y + Math.sin(angle) * r;
        g.lineStyle(2, col, alpha * 0.9).lineBetween(
          e.x + Math.cos(angle) * (r - 30),
          e.y + Math.sin(angle) * (r - 30),
          x,
          y,
        );
        g.lineStyle(1, 0xebfcff, alpha * 0.7).lineBetween(
          x,
          y,
          x + Math.cos(angle + 0.6) * 10,
          y + Math.sin(angle + 0.6) * 10,
        );
      }
    }
    if (e.ability === "chain") {
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 0.4 + spin;
        g.lineStyle(2, col, alpha * 0.9).lineBetween(
          e.x,
          e.y,
          e.x + Math.cos(angle) * 45,
          e.y + Math.sin(angle) * 45,
        );
      }
    }
    if (e.ability === "orbit" || e.ability === "reaper") {
      const reverse = e.ability === "reaper" ? -1 : 1;
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 0.4 + spin * reverse,
          r = 35 + t * (e.ability === "reaper" ? 200 : 150);
        g.lineStyle(3, col, alpha * 0.8)
          .beginPath()
          .arc(e.x, e.y, r, angle, angle + 0.35, false)
          .strokePath();
        g.lineStyle(1, 0xffe9d3, alpha * 0.6)
          .beginPath()
          .arc(e.x, e.y, r - 6, angle, angle + 0.2, false)
          .strokePath();
      }
    }
    if (e.kind === "lightning" && e.toX !== undefined && e.toY !== undefined) {
      const dx = e.toX - e.x,
        dy = e.toY - e.y,
        len = Math.hypot(dx, dy) || 1;
      let x = e.x,
        y = e.y;
      for (let i = 1; i <= 7; i++) {
        const f = i / 7,
          jitter =
            i === 7 ? 0 : Math.sin(i * 11 + e.id + Math.floor(time / 45)) * 12,
          nx = e.x + dx * f - (dy / len) * jitter,
          ny = e.y + dy * f + (dx / len) * jitter;
        g.lineStyle(4, 0xd9bd78, alpha * 0.32).lineBetween(x, y, nx, ny);
        g.lineStyle(1.4, 0xfff4d5, alpha).lineBetween(x, y, nx, ny);
        x = nx;
        y = ny;
      }
    }
  }
}
