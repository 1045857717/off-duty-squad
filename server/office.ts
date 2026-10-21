import type { Game, Player, Enemy, Vec, RouteId } from "../shared/types";
import { moveWorld, worldBlocked, randomFloor } from "../shared/world";
export function officeNoise(
  g: Game,
  point: Vec,
  power: number,
  label: string,
  life = 3,
) {
  g.state.noise = Math.min(100, g.state.noise + power * 0.1);
  if (g.state.noises.length > 12) g.state.noises.shift();
  g.state.noises.push({
    ...point,
    id: ++g.state.serial,
    life,
    radius: power,
    label,
  });
}
export function setupOffice(g: Game) {
  const s = g.state;
  s.officeProps = s.world.points
    .slice(1, Math.min(9, s.world.points.length - 1))
    .map((p, i) => ({
      ...(!worldBlocked(s.world, p.x + 78, p.y + 62, 20)
        ? { x: p.x + 78, y: p.y + 62 }
        : p),
      id: ++s.serial,
      kind: (["printer", "sprinkler", "cabinet", "shutter"] as const)[i % 4],
      label: [
        "打印机：最后一份报告",
        "消防喷淋：全员降温",
        "档案柜：推倒挡尸",
        "卷帘门：到点关门",
      ][i % 4],
      progress: 0,
      active: 0,
      cd: 0,
      used: 0,
    }));
  s.world.dynamicWalls = [];
  s.noises = [];
  s.noise = 0;
  s.pings = [];
}
export function useOffice(
  g: Game,
  p: Player,
  dt: number,
  damage: (e: Enemy, n: number, owner: string) => void,
) {
  const s = g.state,
    obj = s.officeProps.find(
      (o) => !o.cd && Math.hypot(o.x - p.x, o.y - p.y) < 78,
    );
  if (!obj) return false;
  obj.progress = Math.min(1, obj.progress + dt / 0.9);
  p.interaction = {
    label: obj.label,
    type: "object",
    progress: obj.progress,
    targetX: obj.x,
    targetY: obj.y,
    cost: 0,
    status: "charging",
  };
  if (obj.progress < 1) return true;
  obj.used++;
  obj.progress = 0;
  obj.active = obj.kind === "printer" ? 8 : obj.kind === "sprinkler" ? 10 : 5;
  obj.cd = 30;
  p.interaction = {
    ...p.interaction,
    status: "complete",
    progress: 1,
    until: s.elapsed + 1.2,
  };
  if (obj.kind === "printer") officeNoise(g, obj, 900, "最后一份打印报告", 8);
  if (obj.kind === "cabinet") {
    const wall = { x: obj.x - 38, y: obj.y + 40, w: 76, h: 20 };
    if (
      !s.players.some(
        (q) =>
          q.alive &&
          Math.abs(q.x - obj.x) < 55 &&
          Math.abs(q.y - (obj.y + 50)) < 28,
      )
    ) {
      s.world = {
        ...s.world,
        dynamicWalls: [...(s.world.dynamicWalls || []), wall],
      };
    }
    for (const e of s.enemies)
      if (Math.hypot(e.x - obj.x, e.y - obj.y) < 100) {
        damage(e, 65 + p.damage, p.id);
        e.stun = 1;
      }
  }
  if (obj.kind === "shutter") {
    const wall = { x: obj.x - 55, y: obj.y + 40, w: 110, h: 18 };
    if (
      !s.players.some(
        (q) =>
          q.alive &&
          Math.abs(q.x - obj.x) < 70 &&
          Math.abs(q.y - (obj.y + 49)) < 27,
      )
    )
      s.world = {
        ...s.world,
        dynamicWalls: [...(s.world.dynamicWalls || []), wall],
      };
    for (const e of s.enemies)
      if (Math.abs(e.x - obj.x) < 90 && Math.abs(e.y - obj.y) < 45) {
        damage(e, 110 + p.damage, p.id);
        e.stun = 2;
      }
    officeNoise(g, obj, 350, "卷帘门巨响", 2);
  }
  s.message = [
    "打印机终于有用了：把它们引到加班区。",
    "喷淋已开，今天不用浇绿植了。",
    "档案柜推倒，已归档的风险重新分配。",
    "卷帘门关闭，超时不候。",
  ][
    (["printer", "sprinkler", "cabinet", "shutter"] as string[]).indexOf(
      obj.kind,
    )
  ];
  return true;
}
export function pingTeam(
  g: Game,
  id: string,
  kind: "danger" | "supply" | "gather",
) {
  const p = g.state.players.find((p) => p.id === id);
  if (!p || g.state.phase !== "playing") return false;
  if (g.state.pings.some((p) => p.owner === id && p.life > 5)) return false;
  const distance = 120;
  const x = p.x + Math.cos(p.angle) * distance,
    y = p.y + Math.sin(p.angle) * distance;
  g.state.pings.push({
    id: ++g.state.serial,
    owner: id,
    name: p.name,
    x: worldBlocked(g.state.world, x, y, 8) ? p.x : x,
    y: worldBlocked(g.state.world, x, y, 8) ? p.y : y,
    kind,
    life: 7,
  });
  g.state.pings = g.state.pings.slice(-8);
  return true;
}
export function openVote(g: Game) {
  if (g.state.routeVote && !g.state.routeVote.resolved) return;
  g.state.routeVote = { id: ++g.state.routeSerial, remaining: 8, ballots: {} };
}
export function voteRoute(g: Game, id: string, route: RouteId) {
  const vote = g.state.routeVote;
  if (
    !vote ||
    vote.resolved ||
    !g.state.players.some((p) => p.id === id && !p.bot && p.connected) ||
    !["supply", "overtime", "detour"].includes(route)
  )
    return false;
  vote.ballots[id] = route;
  return true;
}
export function tickOffice(
  g: Game,
  dt: number,
  damage: (e: Enemy, n: number, owner: string) => void,
  spawn: (kind?: any, point?: Vec) => void,
) {
  const s = g.state;
  s.noise = Math.max(0, s.noise - dt * 2);
  s.noises = s.noises.filter((n) => (n.life -= dt) > 0);
  s.pings = s.pings.filter((p) => (p.life -= dt) > 0);
  for (const obj of s.officeProps) {
    obj.cd = Math.max(0, obj.cd - dt);
    if (obj.active > 0) {
      obj.active = Math.max(0, obj.active - dt);
      if (obj.kind === "sprinkler")
        for (const e of s.enemies)
          if (Math.hypot(e.x - obj.x, e.y - obj.y) < 170)
            e.slow = Math.max(e.slow || 0, 0.5);
      if (!obj.active && (obj.kind === "cabinet" || obj.kind === "shutter"))
        s.world = {
          ...s.world,
          dynamicWalls: (s.world.dynamicWalls || []).filter(
            (w) =>
              Math.abs(w.x - (obj.x - (obj.kind === "shutter" ? 55 : 38))) > 1,
          ),
        };
    }
  }
  const vote = s.routeVote;
  if (vote && !vote.resolved) {
    vote.remaining = Math.max(0, vote.remaining - dt);
    const humans = s.players.filter((p) => !p.bot && p.connected);
    if (!vote.remaining || humans.every((p) => vote.ballots[p.id])) {
      const keys = ["supply", "overtime", "detour"] as RouteId[],
        counts = keys.map(
          (k) => Object.values(vote.ballots).filter((v) => v === k).length,
        );
      const result = keys[counts.indexOf(Math.max(...counts))];
      vote.resolved = result;
      s.route = result;
      if (result === "supply") {
        for (const p of s.players) p.hp = Math.min(p.maxHp, p.hp + 12);
        s.coins += 8;
        s.message = "补给路线：茶水间还有半盒饼干。";
      }
      if (result === "overtime") {
        s.message = "高风险路线：今晚的加班费，向加班怪讨。";
        s.coins += 15;
      }
      if (result === "detour") {
        s.eventCd += 18;
        s.message = "安静绕行：不惊动整层楼也能下班。";
      }
    }
  }
  for (const e of s.enemies) {
    if (e.kind !== "boss" || e.hp <= 0) continue;
    const ratio = e.hp / e.maxHp,
      phase = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2;
    if ((e.bossPhase ?? 0) !== phase) {
      e.bossPhase = phase;
      e.cd = 0.2;
      s.message =
        phase === 1
          ? "总监领带一松：开始追着人讲PPT！"
          : "总监发起全员会议：加班怪正在入群！";
      if (phase === 2)
        for (let i = 0; i < 5; i++)
          spawn("mite", randomFloor(s.world, g.random, e, 150));
    }
    if (phase === 2) {
      e.screamCd = (e.screamCd || 9) - dt;
      if (e.screamCd <= 0) {
        e.screamCd = 12;
        for (let i = 0; i < 3; i++) spawn("hound");
      }
    }
  }
}
