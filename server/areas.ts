import type { Game, Player, Enemy, Vec, AreaEffect } from "../shared/types";
import { attackStats } from "../shared/arsenal";
import { moveWorld } from "../shared/world";
export function addArea(
  g: Game,
  p: Player,
  kind: AreaEffect["kind"],
  point: Vec,
  level: number,
  angle = p.angle,
) {
  const st = attackStats(kind, level),
    life = kind === "venom" ? 4.2 : kind === "gravity" ? 3.2 : 1.05;
  const existing = g.state.areas.find(
    (a) =>
      a.owner === p.id &&
      a.kind === kind &&
      Math.hypot(a.x - point.x, a.y - point.y) < st.radius * 0.5,
  );
  if (existing) {
    Object.assign(existing, {
      x: point.x,
      y: point.y,
      level,
      life,
      maxLife: life,
      angle,
      radius: kind === "flame" ? 210 + level * 12 : st.radius,
    });
    return;
  }
  g.state.areas.push({
    id: ++g.state.serial,
    owner: p.id,
    kind,
    x: point.x,
    y: point.y,
    level,
    radius: kind === "flame" ? 210 + level * 12 : st.radius,
    life,
    maxLife: life,
    tickCd: 0,
    angle,
  });
  if (g.state.areas.length > 60)
    g.state.areas.splice(0, g.state.areas.length - 60);
}
export function tickAreas(
  g: Game,
  dt: number,
  damage: (e: Enemy, amount: number, owner: string, crit?: boolean) => void,
  visible: (a: Vec, b: Vec) => boolean,
) {
  const s = g.state;
  for (const p of s.players) {
    const passive = p.upgrades.filter((id) => id === "orbiting").length;
    const level = p.arsenal.orbit || Math.min(8, passive);
    if (!p.alive || !p.connected || !level) continue;
    let a = s.areas.find((a) => a.kind === "orbit" && a.owner === p.id);
    const st = attackStats("orbit", level);
    if (!a) {
      a = {
        id: ++s.serial,
        owner: p.id,
        kind: "orbit",
        x: p.x,
        y: p.y,
        level,
        life: 1,
        maxLife: 1,
        tickCd: 0,
        radius: st.radius + 25,
        angle: 0,
      };
      s.areas.push(a);
    }
    a.x = p.x;
    a.y = p.y;
    a.level = level;
    a.radius = p.arsenal.orbit ? st.radius + 25 : 130;
    a.visualOnly = !p.arsenal.orbit;
    a.life = 1;
  }
  s.areas = s.areas.filter((a) => {
    const p = s.players.find((p) => p.id === a.owner);
    if (!p?.alive || !p.connected) return false;
    if (
      a.kind === "orbit" &&
      !p.arsenal.orbit &&
      !p.upgrades.includes("orbiting")
    )
      return false;
    if (a.kind !== "orbit") a.life -= dt;
    if (a.life <= 0) return false;
    a.tickCd -= dt;
    const pulse = a.tickCd <= 0;
    if (pulse) a.tickCd = a.kind === "orbit" ? 0.35 : 0.5;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - a.x, e.y - a.y);
      if (d > a.radius || !visible(a, e)) continue;
      if (
        a.kind === "flame" &&
        Math.abs(
          Math.atan2(
            Math.sin(Math.atan2(e.y - a.y, e.x - a.x) - a.angle),
            Math.cos(Math.atan2(e.y - a.y, e.x - a.x) - a.angle),
          ),
        ) > 0.7
      )
        continue;
      if (a.kind === "gravity") {
        moveWorld(
          s.world,
          e,
          ((a.x - e.x) / Math.max(1, d)) * dt * (50 + a.level * 6),
          ((a.y - e.y) / Math.max(1, d)) * dt * (50 + a.level * 6),
          16,
        );
        e.gravityTime = 0.6;
      }
      if (!pulse || a.visualOnly) continue;
      const st = attackStats(a.kind, a.level),
        power =
          a.kind === "orbit"
            ? 0.22
            : a.kind === "gravity"
              ? 0.2
              : a.kind === "venom"
                ? 0.3
                : 0.42;
      let amount = p.damage * st.power * power;
      if (a.kind === "flame" && p.arsenal.frost && (e.slow || 0) > 0)
        amount *= 1.35;
      const crit = g.random() < p.crit;
      damage(e, amount * (crit ? p.critPower : 1), p.id, crit);
    }
    return true;
  });
}
