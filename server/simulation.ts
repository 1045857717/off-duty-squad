import { ROLE_BASICS } from "../shared/basics";
import { ENEMY_DEFS, ATTACK_MOTIONS } from "../shared/combatProfiles";
import { workerQuote } from "../shared/humor";
import { skillMetrics } from "../shared/careers";
import {
  setupOffice,
  useOffice,
  tickOffice,
  officeNoise,
  openVote,
} from "./office";
import { BALANCE, squadPressure, ledger } from "../shared/balance";
import { attackAvailable, augmentAvailable } from "../shared/growth";
import { addArea, tickAreas } from "./areas";
import {
  ROLE_SIGNATURE,
  startingOffers,
  ATTACKS,
  attackStats,
  ATTACK_IDS,
} from "../shared/arsenal";
import { ROLES, MISSIONS, EMPTY_INPUT } from "../shared/content";
import { ABILITIES, generateOffers, applyAugment } from "../shared/rogue";
import {
  generateWorld,
  seededRandom,
  worldBlocked,
  moveWorld,
  randomFloor,
} from "../shared/world";
import type {
  Game,
  GameState,
  Player,
  Role,
  Input,
  Vec,
  Enemy,
  EnemyKind,
  Effect,
  Ability,
  AttackId,
} from "../shared/types";
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const valid = (n: unknown, f = 0) =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.max(-1, Math.min(1, n))
    : f;
export function createGame(
  code: string,
  host: string,
  seed = Date.now() >>> 0,
): Game {
  const random = seededRandom(seed);
  const world = generateWorld(seed);
  const state: GameState = {
    code,
    host,
    phase: "lobby",
    countdown: 0,
    nextLevelAt: 0,
    areas: [],
    players: [],
    enemies: [],
    bullets: [],
    pickups: [],
    effects: [],
    mission: 0,
    difficulty: "normal",
    mode: "expedition",
    elapsed: 0,
    stageTime: 0,
    spawnCd: 2,
    coins: 0,
    seed,
    serial: 0,
    objective: {
      type: "collect",
      target: 10,
      progress: 0,
      relays: [],
      drone: { ...world.spawn, hp: 100, progress: 0 },
      done: false,
    },
    stats: { kills: 0, rescued: 0, crystals: 0, time: 0 },
    message: "队伍集结 · 每次进入都是新的办公楼",
    exitProgress: 0,
    exitOpen: false,
    tick: 0,
    world,
    wave: 1,
    waveKills: 0,
    waveTarget: 28,
    waveEnds: 70,
    breakTime: 0,
    level: 1,
    xp: 0,
    xpNext: BALANCE.initialXp,
    event: {
      name: "静默之前",
      desc: "搜寻补给，保持移动",
      kind: "none",
      remaining: 0,
    },
    eventCd: 28,
    objects: [],
    spectators: [],
    chat: [],
    squadName: "办公楼小队",
    runId: `${seed}-${Math.floor(random() * 1e9)}`,
    rankedRecorded: false,
    teamPeak: 0,
    officeProps: [],
    noise: 0,
    noises: [],
    pings: [],
    route: "supply",
    routeSerial: 0,
  };
  return { state, inputs: new Map(), queuedAbilities: new Map(), random };
}
export function addPlayer(
  g: Game,
  id: string,
  name: string,
  role: Role,
  bot = false,
) {
  const s = g.state;
  if (
    s.players.length >= 4 ||
    s.players.some((p) => p.id === id) ||
    !Object.hasOwn(ROLES, role)
  )
    return false;
  const r = ROLES[role],
    anchor = s.players.find((p) => p.connected && p.alive) || s.world.spawn;
  let spawn = {
    x: anchor.x + (s.players.length % 2) * 38,
    y: anchor.y + Math.floor(s.players.length / 2) * 36,
  };
  if (worldBlocked(s.world, spawn.x, spawn.y, 20)) spawn = { ...s.world.spawn };
  const ability = ROLE_SIGNATURE[role];
  const p: Player = {
    id,
    name: name.trim().slice(0, 12) || "匿名干员",
    role,
    color: r.color,
    ...spawn,
    hp: r.hp,
    maxHp: r.hp,
    angle: 0,
    alive: true,
    downTime: 0,
    revive: 0,
    connected: true,
    ready: bot || id === s.host,
    initialChosen: false,
    upgradeCd: 0,
    arsenal: {},
    attackCooldowns: {},
    signatureLevel: 1,
    hitSeq: 0,
    hitShield: false,
    basicCd: 0,
    fireCd: 0,
    skillCd: 0,
    dashCd: 0,
    invulnerable: 4,
    speed: r.speed + 18,
    damage: r.damage,
    rate: 0.32,
    regen: 0,
    shield: role === "guardian" ? 30 : 0,
    shieldCap: role === "guardian" ? 30 : 0,
    kills: 0,
    damageDealt: 0,
    healingDone: 0,
    damageTaken: 0,
    criticalHits: 0,
    rescues: 0,
    partsCollected: 0,
    bot,
    upgradePicked: false,
    upgrades: [],
    ability,
    offers: [],
    pendingUpgrades:
      s.phase === "lobby" || s.phase === "countdown"
        ? 0
        : 1 + Math.max(0, s.level - 1),
    crit: 0.07,
    critPower: 1.8,
    projectiles: 1,
    pierce: 0,
    lifesteal: 0,
    magnet: 50,
    thorns: 0,
    cooldownScale: 1,
    dashTime: 0,
    dashVx: 0,
    dashVy: 0,
    attackSeq: 0,
    skillSeq: 0,
    dashSeq: 0,
    rescueCd: 0,
    orbitCd: 1,
    curse: 0,
  };
  s.players.push(p);
  if (!["lobby", "countdown"].includes(s.phase)) {
    const previous = Math.max(1, s.teamPeak, s.players.length - 1),
      next = Math.max(previous, s.players.length);
    s.teamPeak = next;
    if (next > previous)
      for (const e of s.enemies) {
        const fraction = e.hp / Math.max(1, e.maxHp);
        e.maxHp = Math.round((e.maxHp * next) / previous);
        e.hp = ledger(e.maxHp * fraction);
      }
  }
  g.inputs.set(id, { ...EMPTY_INPUT });
  if (s.phase !== "lobby" && s.phase !== "countdown") {
    p.offers = startingOffers(g.random, p);
    if (bot) {
      applyAugment(p, p.offers[0].id);
      p.initialChosen = true;
      if (p.pendingUpgrades) p.offers = generateOffers(g, p);
    }
  }
  if (s.phase === "countdown") cancelLaunch(g);
  return true;
}
export function removePlayer(g: Game, id: string) {
  cancelLaunch(g);
  g.state.players = g.state.players.filter((p) => p.id !== id);
  g.inputs.delete(id);
  g.queuedAbilities.delete(id);
  if (g.state.host === id)
    g.state.host =
      g.state.players.find((p) => !p.bot && p.connected)?.id ||
      g.state.players.find((p) => !p.bot)?.id ||
      "";
  checkStageChoices(g);
}
export function queueAbilities(g: Game, id: string, input: Partial<Input>) {
  if (!input || !g.inputs.has(id)) return;
  if (input.skill !== true && input.dash !== true) return;
  const q = g.queuedAbilities.get(id) || { skill: false, dash: false };
  q.skill ||= input.skill === true;
  q.dash ||= input.dash === true;
  g.queuedAbilities.set(id, q);
}
export function setInput(g: Game, id: string, input: Partial<Input>) {
  if (!input || typeof input !== "object" || !g.inputs.has(id)) return;
  queueAbilities(g, id, input);
  let x = valid(input.x),
    y = valid(input.y),
    ax = valid(input.aimX, 1),
    ay = valid(input.aimY);
  const len = Math.hypot(x, y) || 1;
  if (len > 1) {
    x /= len;
    y /= len;
  }
  const aim = Math.hypot(ax, ay) || 1;
  g.inputs.set(id, {
    x,
    y,
    aimX: ax / aim,
    aimY: ay / aim,
    fire: input.fire === true,
    dash: input.dash === true,
    skill: input.skill === true,
    interact: input.interact === true,
  });
}
export function cancelLaunch(g: Game) {
  if (g.state.phase !== "countdown") return false;
  g.state.phase = "lobby";
  g.state.countdown = 0;
  g.state.message = "出发已取消 · 确认准备后再出发";
  return true;
}
function allReady(g: Game) {
  return (
    g.state.players.length > 0 &&
    g.state.players.every(
      (p) => p.bot || (p.connected && (p.id === g.state.host || p.ready)),
    )
  );
}
export function startGame(g: Game, id: string) {
  if (id !== g.state.host || g.state.phase !== "lobby" || !allReady(g))
    return false;
  g.state.phase = "countdown";
  g.state.countdown = 3;
  g.state.message = "打卡成功，正在接入快乐";
  return true;
}
function beginDraft(g: Game) {
  const s = g.state;
  s.teamPeak = s.players.length;
  s.world = generateWorld(s.seed, s.mode);
  setupStage(g, true);
  s.enemies = [];
  s.phase = "draft";
  s.countdown = 0;
  s.message = "等待全员选择初始攻击 · 战斗尚未开始";
  for (const p of s.players) {
    p.arsenal = {};
    p.initialChosen = false;
    p.pendingUpgrades = 1;
    p.offers = startingOffers(g.random, p);
    if (p.bot) {
      applyAugment(p, p.offers[0].id);
      p.initialChosen = true;
    }
  }
}
function checkDraft(g: Game) {
  const s = g.state;
  if (
    s.phase === "draft" &&
    s.players.length &&
    s.players.every((p) => p.initialChosen)
  ) {
    s.phase = "playing";
    s.spawnCd = 2;
    s.stageTime = 0;
    for (const p of s.players) {
      p.invulnerable = 4;
      g.inputs.set(p.id, { ...EMPTY_INPUT });
      g.queuedAbilities.delete(p.id);
    }
    s.message = "全员就绪 · 保持移动，带同伴回家";
  }
}
export function restartGame(g: Game, id: string) {
  if (id !== g.state.host || !["won", "lost"].includes(g.state.phase))
    return false;
  const old = g.state,
    players = old.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      bot: p.bot,
      connected: p.connected,
    })),
    fresh = createGame(old.code, id);
  fresh.state.mode = old.mode;
  fresh.state.difficulty = old.difficulty;
  fresh.state.squadName = old.squadName;
  fresh.state.spectators = old.spectators;
  fresh.state.chat = old.chat;
  g.state = fresh.state;
  g.random = fresh.random;
  g.inputs.clear();
  g.queuedAbilities.clear();
  for (const p of players) {
    addPlayer(g, p.id, p.name, p.role, p.bot);
    g.state.players.at(-1)!.connected = p.connected;
  }
  return true;
}
export function gainExperience(g: Game, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  g.state.xp += amount;
  advanceExperience(g);
}
function advanceExperience(g: Game) {
  const s = g.state;
  if (s.xp < s.xpNext || s.elapsed < s.nextLevelAt) return;
  s.xp -= s.xpNext;
  s.level++;
  s.xpNext = Math.round(180 + Math.pow(s.level, 1.5) * 45);
  s.nextLevelAt = s.elapsed + BALANCE.levelInterval;
  for (const p of s.players) {
    p.pendingUpgrades++;
    if (!p.offers.length) p.offers = generateOffers(g, p);
  }
  s.message = `LV.${s.level} · 新的生存改装已就绪 [U]`;
  effect(g, s.players[0] || s.world.spawn, "skill", "#cfb478", 100);
}
export function chooseUpgrade(g: Game, id: string, upgrade: string) {
  const p = g.state.players.find((p) => p.id === id),
    s = g.state;
  if (
    !p ||
    !["draft", "playing", "upgrade"].includes(s.phase) ||
    (p.upgradeCd > 0 && s.phase === "playing")
  )
    return false;
  if (!p.initialChosen && !p.offers.find((o) => o.id === upgrade)?.attackSkill)
    return false;
  const offered = p.offers.find((c) => c.id === upgrade);
  if (!offered) return false;
  if (p.initialChosen) {
    if (
      offered.attackSkill &&
      !attackAvailable(p, offered.attackSkill, s.level)
    )
      return false;
    if (
      !offered.attackSkill &&
      upgrade !== "signature" &&
      !augmentAvailable(p, upgrade, s.level, s.players.length)
    )
      return false;
  }
  if (!applyAugment(p, upgrade)) return false;
  p.initialChosen = true;
  p.upgradeCd = s.phase === "draft" ? 0 : 0.45;
  if (p.pendingUpgrades > 0) p.offers = generateOffers(g, p);
  p.upgradePicked = true;
  checkDraft(g);
  checkStageChoices(g);
  return true;
}
function checkStageChoices(g: Game) {
  const s = g.state;
  if (
    s.phase === "upgrade" &&
    (!s.routeVote || !!s.routeVote.resolved) &&
    s.players.filter((p) => !p.bot && p.connected).every((p) => p.upgradePicked)
  ) {
    s.mission++;
    s.wave = s.mission + 1;
    s.phase = "playing";
    s.world = generateWorld(
      (s.seed + s.mission * 8171) >>> 0,
      s.mode,
      Math.floor(s.mission / 2),
    );
    setupStage(g, true);
  }
}
function setupObjects(g: Game) {
  const s = g.state;
  s.objects = [];
  const shuffled = [...s.world.points.slice(1, -1)].sort(
    () => g.random() - 0.5,
  );
  for (
    let i = 0;
    i < Math.min(s.mode === "survival" ? 5 : 7, shuffled.length);
    i++
  ) {
    const kind =
      i % 4 === 0
        ? "shrine"
        : i % 4 === 1
          ? "fountain"
          : i % 4 === 2
            ? "cache"
            : "chest";
    s.objects.push({
      ...shuffled[i],
      x: shuffled[i].x + 48,
      id: ++s.serial,
      kind,
      used: false,
      cost:
        kind === "shrine"
          ? 35
          : kind === "cache"
            ? 45
            : kind === "chest"
              ? 20
              : 0,
      label:
        kind === "shrine"
          ? "加班审批台"
          : kind === "fountain"
            ? "医药补给点"
            : kind === "cache"
              ? "工具补给箱"
              : "应急物资柜",
      progress: 0,
    });
  }
}
function setupStage(g: Game, resetPosition = false) {
  const s = g.state;
  s.stageTime = 0;
  s.spawnCd = 1.8;
  s.waveKills = 0;
  s.waveTarget = Math.round((20 + s.wave * 8) * squadPressure(s).size);
  s.waveEnds = 65 + Math.min(35, s.wave * 3);
  s.breakTime = 0;
  s.enemies = [];
  s.bullets = [];
  s.pickups = [];
  s.effects = [];
  s.areas = [];
  s.exitOpen = false;
  s.exitProgress = 0;
  g.nav = undefined;
  const mission = MISSIONS[s.mission % 6],
    world = s.world;
  s.objective = {
    type: s.mode === "survival" ? "survive" : mission.type,
    target:
      s.mode === "survival"
        ? s.waveTarget
        : mission.type === "collect"
          ? 10 + s.mission * 2
          : mission.target,
    progress: 0,
    relays: [
      3,
      Math.floor(world.points.length * 0.5),
      world.points.length - 3,
    ].map((i) => ({ ...world.points[i], active: false, charge: 0 })),
    drone: { ...world.spawn, hp: 100, progress: 0 },
    done: false,
  };
  s.players.forEach((p, i) => {
    if (resetPosition) {
      p.x = world.spawn.x + (i % 2) * 35;
      p.y = world.spawn.y + Math.floor(i / 2) * 35;
    }
    p.alive = true;
    p.hp = Math.max(p.hp, p.maxHp * 0.65);
    p.downTime = 0;
    p.revive = 0;
    p.invulnerable = 4;
    p.dashTime = 0;
    p.skillCd = 0;
    p.dashCd = 0;
    p.upgradePicked = false;
    p.attackCooldowns = {};
    if (p.shieldCap) p.shield = p.shieldCap;
    g.inputs.set(p.id, { ...EMPTY_INPUT });
    g.queuedAbilities.delete(p.id);
  });
  setupObjects(g);
  setupOffice(g);
  if (s.objective.type === "collect") {
    const points = [...world.points.slice(1)].sort(() => g.random() - 0.5);
    for (let i = 0; i < s.objective.target; i++)
      s.pickups.push({
        ...points[i % points.length],
        x: points[i % points.length].x + ((i % 3) - 1) * 28,
        id: ++s.serial,
        kind: "crystal",
      });
  }
  if (
    s.objective.type === "boss" ||
    (s.mode === "survival" && s.wave % 5 === 0)
  )
    spawnEnemy(g, "boss", world.points.at(-2));
  for (let i = 0; i < 8 + s.players.length * 3 + s.mission; i++) spawnEnemy(g);
  s.message =
    s.mode === "survival"
      ? `园区发癫局 · 第 ${s.wave} 波 · 存活并歼灭 ${s.waveTarget} 个敌人`
      : `第 ${s.mission + 1} 章 · ${mission.title} · 每一次进入都不同`;
}
function effect(
  g: Game,
  p: Vec,
  kind: Effect["kind"],
  color: string,
  size = 25,
  extra: Partial<Effect> = {},
) {
  const duration =
    kind === "attack"
      ? 0.65
      : kind === "rescue"
        ? 5
        : kind === "skill"
          ? 0.75
          : 0.48;
  g.state.effects.push({
    id: ++g.state.serial,
    x: p.x,
    y: p.y,
    kind,
    color,
    life: duration,
    maxLife: duration,
    size,
    ...extra,
  });
}
function danger(g: Game) {
  const s = g.state;
  return (
    1 +
    (s.mode === "survival" ? s.wave * 0.2 : s.mission * 0.3) +
    s.players.reduce((a, p) => a + p.curse, 0) * 0.12
  );
}
function spawnEnemy(g: Game, forced?: EnemyKind, point?: Vec) {
  const s = g.state;
  if (s.enemies.length >= 150) return;
  const level = s.mode === "survival" ? s.wave : s.mission + 1,
    r = g.random();
  let kind: EnemyKind =
    forced ||
    (r < 0.25
      ? "hound"
      : r < 0.44
        ? "shooter"
        : r < 0.58
          ? "mite"
          : r < 0.73
            ? "tank"
            : r < 0.87
              ? "wraith"
              : "bomber");
  if (level === 1 && kind === "wraith" && g.random() < 0.5) kind = "mite";
  const anchor = s.players.find((p) => p.alive && p.connected) || s.world.spawn;
  let pos = point || randomFloor(s.world, g.random, anchor, 440);
  if (!point) {
    for (let i = 0; i < 10 && dist(pos, anchor) > 1100; i++)
      pos = randomFloor(s.world, g.random, anchor, 420);
  }
  const multi =
    s.difficulty === "relaxed" ? 0.72 : s.difficulty === "nightmare" ? 1.38 : 1;
  const base = ENEMY_DEFS[kind].hp;
  const elite =
    !forced && g.random() < Math.min(0.35, 0.08 + level * 0.014)
      ? (["swift", "armored", "vampiric", "volatile"] as const)[
          Math.floor(g.random() * 4)
        ]
      : undefined;
  const hp = Math.round(
    base *
      BALANCE.enemyHp *
      squadPressure(s).hp *
      danger(g) *
      multi *
      (elite === "armored" ? 1.7 : elite ? 1.25 : 1),
  );
  s.enemies.push({
    ...pos,
    id: ++s.serial,
    kind,
    hp,
    maxHp: hp,
    speed:
      ENEMY_DEFS[kind].speed *
      (1 + Math.min(0.75, level * 0.025)) *
      (elite === "swift" ? 1.45 : 1),
    cd: 0.7 + g.random() * 1.7,
    angle: 0,
    hitFlash: 0,
    windup: 0,
    attackSeq: 0,
    slow: 0,
    elite,
    stun: 0,
  });
}
function visible(g: Game, a: Vec, b: Vec) {
  const steps = Math.ceil(dist(a, b) / 28);
  for (let i = 1; i < steps; i++)
    if (
      worldBlocked(
        g.state.world,
        a.x + ((b.x - a.x) * i) / steps,
        a.y + ((b.y - a.y) * i) / steps,
        3,
      )
    )
      return false;
  return true;
}
function flowTo(g: Game, target: Vec) {
  const w = g.state.world,
    index =
      Math.floor(target.y / w.tile) * w.cols + Math.floor(target.x / w.tile);
  if (g.nav && g.nav.target === index && g.state.elapsed - g.nav.at < 0.45)
    return;
  const flow = new Int32Array(w.cols * w.rows).fill(-1),
    q = [index];
  flow[index] = 0;
  for (let i = 0; i < q.length; i++) {
    const n = q[i],
      x = n % w.cols,
      y = Math.floor(n / w.cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        k = ny * w.cols + nx;
      if (
        nx < 0 ||
        nx >= w.cols ||
        ny < 0 ||
        ny >= w.rows ||
        !w.tiles[k] ||
        flow[k] >= 0
      )
        continue;
      flow[k] = flow[n] + 1;
      q.push(k);
    }
  }
  g.nav = { flow, target: index, at: g.state.elapsed };
}
function steer(g: Game, p: Vec, target: Vec) {
  if (visible(g, p, target)) return target;
  const w = g.state.world,
    nav = g.nav;
  if (!nav) return target;
  const x = Math.floor(p.x / w.tile),
    y = Math.floor(p.y / w.tile);
  let best = 1e9,
    result = target;
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx,
      ny = y + dy,
      k = ny * w.cols + nx,
      value = nav.flow[k];
    if (nx < 0 || nx >= w.cols || ny < 0 || ny >= w.rows || value < 0) continue;
    const score =
      value + dist(p, { x: nx * w.tile + 32, y: ny * w.tile + 32 }) * 0.0002;
    if (score < best) {
      best = score;
      result = { x: nx * w.tile + 32, y: ny * w.tile + 32 };
    }
  }
  return result;
}
function shoot(
  g: Game,
  p: Player,
  angle = p.angle,
  damage = p.damage,
  bonusPierce = 0,
) {
  const crit =
    g.random() < Math.min(0.95, p.crit + ((p.critBoost || 0) > 0 ? 0.18 : 0));
  g.state.bullets.push({
    basic: false,
    id: ++g.state.serial,
    x: p.x + Math.cos(angle) * 23,
    y: p.y + Math.sin(angle) * 23,
    vx: Math.cos(angle) * 620,
    vy: Math.sin(angle) * 620,
    owner: p.id,
    damage: damage * (crit ? p.critPower : 1),
    life: 1.35,
    enemy: false,
    color: p.color,
    pierce: p.pierce + bonusPierce,
    critical: crit,
    hitIds: [],
  });
}
function dealDamage(
  g: Game,
  e: Enemy,
  amount: number,
  owner: string,
  critical = false,
) {
  if (e.hp <= 0) return;
  const p = g.state.players.find((p) => p.id === owner);
  if (
    p?.upgrades.includes("execution") &&
    e.kind !== "boss" &&
    e.hp < e.maxHp * 0.18
  )
    amount *=
      2 +
      Math.max(0, p!.upgrades.filter((id) => id === "execution").length - 1) *
        0.25;
  if (e.kind === "boss" && (e.bossPhase || 0) === 0) amount *= 0.78;
  const actual = Math.min(e.hp, Math.max(0, amount));
  e.hp -= actual;
  e.hitFlash = 0.14;
  e.lastHit = owner;
  if (p) {
    p.damageDealt = ledger(p.damageDealt + actual);
    if (critical) p.criticalHits++;
    if (p.lifesteal) p.hp = Math.min(p.maxHp, p.hp + actual * p.lifesteal);
  }
  effect(
    g,
    e,
    "hit",
    critical ? "#ffe1a0" : p?.color || "#edb57c",
    critical ? 32 : 18,
    {
      amount: Math.max(1, Math.round(actual)),
      owner,
      critical,
    },
  );
}
function hurt(
  g: Game,
  p: Player,
  amount: number,
  e?: Enemy,
  source?: {
    kind?: EnemyKind;
    x: number;
    y: number;
    id?: number;
    name?: string;
  },
) {
  if (!p.alive || p.invulnerable > 0) return;
  const effective = Math.min(amount, p.hp + p.shield);
  const absorbed = Math.min(p.shield, amount);
  p.shield -= absorbed;
  p.hp = ledger(Math.max(0, p.hp - amount + absorbed));
  p.damageTaken = ledger(p.damageTaken + effective);
  p.invulnerable = 0.32;
  p.hitSeq++;
  p.hitShield = absorbed > 0;
  const origin = e || source;
  p.lastHit = {
    sourceId: origin?.id,
    sourceKind: origin?.kind,
    sourceName: origin?.kind
      ? ENEMY_DEFS[origin.kind].name
      : source?.name || "环境伤害",
    x: origin?.x ?? p.x,
    y: origin?.y ?? p.y,
    at: g.state.elapsed,
    amount: Math.round(effective),
    shieldAbsorbed: Math.round(absorbed),
  };
  effect(g, p, "hit", absorbed ? "#83b7da" : "#e56d6c", 22, {
    amount: Math.round(effective),
    owner: "enemy",
    targetPlayer: p.id,
  });
  if (e && p.thorns) dealDamage(g, e, p.thorns, p.id);
  if (e?.elite === "vampiric") e.hp = Math.min(e.maxHp, e.hp + amount * 0.7);
  if (!p.hp) {
    p.alive = false;
    p.downTime = 80;
    p.revive = 0;
    p.dashTime = 0;
    g.state.message = `${p.name} 倒地 · H 呼救 · 队友靠近按住E救援`;
  }
}
function revive(g: Game, p: Player, helper?: Player) {
  p.alive = true;
  p.hp = p.maxHp * 0.42;
  p.downTime = 0;
  p.revive = 0;
  p.invulnerable = 4;
  g.state.stats.rescued++;
  if (helper) helper.rescues++;
  if (helper?.upgrades.includes("guardian")) {
    const shield =
      45 +
      Math.max(
        0,
        helper.upgrades.filter((id) => id === "guardian").length - 1,
      ) *
        20;
    p.shield += shield;
    helper.shield += shield;
  }
  effect(g, p, "heal", "#9bc7b6", 55);
}
export function rescueCall(g: Game, id: string) {
  const p = g.state.players.find((p) => p.id === id);
  if (!p || p.alive || p.rescueCd > 0 || g.state.phase !== "playing")
    return false;
  p.rescueCd = 5;
  g.state.rescuePing = {
    playerId: p.id,
    x: p.x,
    y: p.y,
    name: p.name,
    until: g.state.elapsed + 6,
  };
  effect(g, p, "rescue", "#eea76e", 120);
  g.state.message = `救援请求：${p.name}！距离过远请查看雷达上的橙色信号。`;
  return true;
}
function skill(g: Game, p: Player) {
  const metrics = skillMetrics(p),
    power = metrics.power;
  p.skillCd = metrics.cooldown;
  p.skillSeq++;
  effect(g, p, "skill", ABILITIES[p.ability].color, 170, {
    ability: p.ability,
    attackLevel: p.signatureLevel,
    angle: p.angle,
  });
  if (p.ability === "volley")
    for (let i = -3; i <= 3; i++)
      shoot(g, p, p.angle + i * 0.12, p.damage * 1.8 * power, 2);
  if (p.ability === "nova")
    for (const e of g.state.enemies)
      if (dist(e, p) < 220) {
        dealDamage(g, e, (70 + p.damage * 2) * power, p.id);
        e.stun = 0.8;
        const d = dist(e, p) || 1;
        moveWorld(
          g.state.world,
          e,
          ((e.x - p.x) / d) * 45,
          ((e.y - p.y) / d) * 45,
        );
      }
  if (p.ability === "mend")
    for (const q of g.state.players)
      if (dist(q, p) < 260) {
        if (!q.alive) revive(g, q, p);
        const heal = Math.min(q.maxHp - q.hp, (50 + p.maxHp * 0.1) * power);
        q.hp += heal;
        p.healingDone = ledger(p.healingDone + heal);
        effect(g, q, "heal", "#9bc7b6", 50);
      }
  if (p.ability === "aegis")
    for (const q of g.state.players)
      if (q.alive && dist(q, p) < 270) {
        q.shieldCap = Math.max(65, q.shieldCap);
        q.shield = Math.min(180, q.shield + 65 * power);
        q.invulnerable = 1.5;
      }
  if (p.ability === "frost")
    for (const e of g.state.enemies)
      if (dist(e, p) < 280) {
        e.stun = e.kind === "boss" ? 0.8 : 2.2;
        e.slow = 6;
        dealDamage(g, e, p.damage * 1.6 * power, p.id);
      }
  if (p.ability === "chain") {
    const targets = g.state.enemies
      .filter((e) => dist(e, p) < 650)
      .sort((a, b) => dist(a, p) - dist(b, p))
      .slice(0, 8);
    let from: Vec = p;
    for (const e of targets) {
      effect(g, from, "lightning", "#edc77c", 40, { toX: e.x, toY: e.y });
      dealDamage(g, e, p.damage * 3 * power, p.id);
      from = e;
    }
  }
  if (p.ability === "orbit")
    for (let i = 0; i < 16; i++)
      shoot(g, p, (i * Math.PI) / 8, p.damage * 1.5 * power, 1);
  if (p.ability === "reaper")
    for (const e of g.state.enemies)
      if (dist(e, p) < 300) {
        dealDamage(
          g,
          e,
          e.kind !== "boss" && e.hp < e.maxHp * 0.45
            ? e.hp
            : p.damage * 3 * power,
          p.id,
        );
        p.hp = Math.min(p.maxHp, p.hp + 5);
      }
  if (p.ability === "decoy") {
    officeNoise(
      g,
      { x: p.x + Math.cos(p.angle) * 130, y: p.y + Math.sin(p.angle) * 130 },
      900,
      "销售的最后一通电话",
      8,
    );
    p.invulnerable = 1.2;
  }
  if (p.ability === "supply") {
    for (const q of g.state.players)
      if (q.connected && q.alive && dist(q, p) < 260) {
        const heal = Math.min(q.maxHp - q.hp, 24 * power);
        q.hp += heal;
        p.healingDone = ledger(p.healingDone + heal);
        q.shieldCap = Math.max(q.shieldCap, 20);
        q.shield += 18 * power;
      }
    g.state.coins += 5;
  }
  if (
    p.ability === "wok" ||
    p.ability === "bell" ||
    p.ability === "flash" ||
    p.ability === "injunction"
  )
    for (const e of g.state.enemies)
      if (dist(e, p) < (p.ability === "flash" ? 280 : 220)) {
        dealDamage(
          g,
          e,
          p.damage *
            power *
            (p.ability === "wok" ? 4 : p.ability === "bell" ? 1.8 : 2.5),
          p.id,
        );
        e.stun = e.kind === "boss" ? 0.4 : p.ability === "wok" ? 1.2 : 2;
        e.slow = 4;
        const d = dist(e, p) || 1;
        if (p.ability === "wok")
          moveWorld(
            g.state.world,
            e,
            ((e.x - p.x) / d) * 50,
            ((e.y - p.y) / d) * 50,
          );
      }
  if (p.ability === "bell")
    for (const q of g.state.players) if (dist(q, p) < 270) q.dashCd = 0;
  if (p.ability === "flash") {
    p.critBoost = 4;
    p.invulnerable = 1;
  }
  if (p.ability === "injunction")
    for (const q of g.state.players)
      if (q.alive && dist(q, p) < 250) q.shield += 25 * power;
  if (p.ability === "sanitize") {
    addArea(g, p, "venom", p, Math.min(8, p.signatureLevel + 2));
    for (const q of g.state.players)
      if (q.alive && dist(q, p) < 200) q.shield += 15 * power;
  }
  if (p.ability === "rush") {
    p.dashVx = Math.cos(p.angle) * 900;
    p.dashVy = Math.sin(p.angle) * 900;
    p.dashTime = 0.38;
    p.invulnerable = 0.65;
    p.dashSeq++;
    for (const e of g.state.enemies)
      if (dist(e, p) < 150) {
        dealDamage(g, e, p.damage * 3 * power, p.id);
        e.stun = 0.7;
      }
  }
  if (
    [
      "stampede",
      "takeblame",
      "paperstorm",
      "quack",
      "crunch",
      "espresso",
      "bugfix",
    ].includes(p.ability)
  ) {
    for (const e of g.state.enemies)
      if (e.hp > 0 && dist(e, p) < metrics.radius) {
        dealDamage(g, e, metrics.damage, p.id);
        e.stun = e.kind === "boss" ? Math.min(0.4, metrics.stun) : metrics.stun;
        e.slow = p.ability === "paperstorm" ? 3 : 4;
        if (p.ability === "stampede") {
          const d = dist(e, p) || 1;
          moveWorld(
            g.state.world,
            e,
            ((e.x - p.x) / d) * 40,
            ((e.y - p.y) / d) * 40,
          );
        }
      }
  }
  if (p.ability === "stampede") {
    p.shield += metrics.shield;
    p.dashVx = Math.cos(p.angle) * 820;
    p.dashVy = Math.sin(p.angle) * 820;
    p.dashTime = 0.35;
    p.invulnerable = 0.5;
    p.dashSeq++;
  }
  if (p.ability === "takeblame") {
    for (const q of g.state.players)
      if (q.alive && dist(q, p) < 240) q.shield += metrics.shield;
    officeNoise(g, p, 600, "背锅侠把锅敲响了", 6);
  }
  if (p.ability === "quack")
    officeNoise(
      g,
      { x: p.x + Math.cos(p.angle) * 110, y: p.y + Math.sin(p.angle) * 110 },
      900,
      "小黄鸭：嘎？",
      7,
    );
  if (p.ability === "paidbreak" || p.ability === "espresso") {
    for (const q of g.state.players)
      if (q.alive && q.connected && dist(q, p) < metrics.radius) {
        const amount = Math.min(q.maxHp - q.hp, metrics.heal);
        q.hp += amount;
        p.healingDone = ledger(p.healingDone + amount);
        if (p.ability === "paidbreak") q.dashCd = 0;
      }
    if (p.ability === "paidbreak")
      officeNoise(
        g,
        { x: p.x + Math.cos(p.angle) * 100, y: p.y + Math.sin(p.angle) * 100 },
        650,
        "摸鱼闹钟：会议开始了",
        6,
      );
    else addArea(g, p, "flame", p, Math.min(8, p.signatureLevel + 1));
  }
  if (p.ability === "crunch") {
    p.dashCd = 0;
    p.invulnerable = 0.8;
  }
  if (p.ability === "bugfix")
    for (const q of g.state.players)
      if (q.alive && dist(q, p) < 300) q.dashCd = 0;

  if (p.ability === "pie" || p.ability === "funding" || p.ability === "rent") {
    const list = g.state.enemies
      .filter((e) => e.hp > 0 && dist(e, p) < metrics.radius)
      .sort((a, b) => dist(a, p) - dist(b, p))
      .slice(0, p.ability === "funding" ? 6 : 150);
    for (const e of list) {
      dealDamage(g, e, metrics.damage, p.id);
      e.stun = p.ability === "pie" ? (e.kind === "boss" ? 0.4 : 1) : 0.25;
      e.slow = 4;
      if (p.ability === "rent") p.hp = Math.min(p.maxHp, p.hp + metrics.heal);
      if (p.ability === "funding")
        effect(g, p, "lightning", p.color, 40, { toX: e.x, toY: e.y });
    }
    if (p.ability === "pie")
      for (const q of g.state.players)
        if (q.alive && dist(q, p) < 280) q.shield += metrics.shield;
  }
  if (p.ability === "slides")
    for (let i = 0; i < 16; i++)
      shoot(g, p, (i * Math.PI) / 8, metrics.damage, 1);
}
const pendingAttacks = new WeakMap<
  Game,
  {
    player: string;
    id: AttackId;
    release: number;
    world: number;
    run: string;
    basic?: boolean;
    angle?: number;
  }[]
>();
function motionAvailable(g: Game, p: Player) {
  return (
    !p.attackMotion ||
    g.state.elapsed - p.attackMotion.at >=
      ATTACK_MOTIONS[p.attackMotion.id].duration / 1000
  );
}
function beginBasic(g: Game, p: Player) {
  const b = ROLE_BASICS[p.role];
  p.basicCd = Math.max(
    ATTACK_MOTIONS[b.weapon].duration / 1000 + 0.1,
    b.cooldown * (p.rate / 0.32) * (g.state.event.kind === "bonus" ? 0.75 : 1),
  );
  p.fireCd = p.basicCd;
  p.attackSeq++;
  p.attackMotion = {
    id: b.weapon,
    seq: p.attackSeq,
    at: g.state.elapsed,
    angle: p.angle,
    source: "basic",
  };
  const list = pendingAttacks.get(g) || [];
  list.push({
    player: p.id,
    id: b.weapon,
    basic: true,
    angle: p.angle,
    release: g.state.elapsed + ATTACK_MOTIONS[b.weapon].duration * 0.0003,
    world: g.state.world.seed,
    run: g.state.runId,
  });
  pendingAttacks.set(g, list);
}
function fireBasic(g: Game, p: Player, facing = p.angle) {
  const b = ROLE_BASICS[p.role],
    damage = p.damage * b.power;
  effect(g, p, "attack", p.color, b.ranged ? 52 : b.range, {
    angle: facing,
    attackSkill: b.weapon,
    owner: p.id,
    life: 0.22,
    maxLife: 0.22,
  });
  officeNoise(g, p, b.ranged ? 170 : 105, b.name, 0.6);
  if (b.ranged) {
    shoot(g, p, facing, damage);
    const bolt = g.state.bullets.at(-1)!;
    bolt.attackSkill = b.weapon;
    bolt.basic = true;
    bolt.level = 1;
    bolt.life = b.range / 620;
    bolt.color = p.color;
  } else {
    let count = 0;
    for (const e of g.state.enemies) {
      if (e.hp <= 0 || dist(p, e) > b.range || !visible(g, p, e)) continue;
      const angle = Math.atan2(e.y - p.y, e.x - p.x);
      if (Math.abs(PhaserAngle(angle - facing)) > 1.05) continue;
      const crit =
        g.random() <
        Math.min(0.95, p.crit + ((p.critBoost || 0) > 0 ? 0.18 : 0));
      dealDamage(g, e, damage * (crit ? p.critPower : 1), p.id, crit);
      const d = dist(p, e) || 1;
      moveWorld(g.state.world, e, ((e.x - p.x) / d) * 9, ((e.y - p.y) / d) * 9);
      if (++count >= 4) break;
    }
  }
}

function beginModule(g: Game, p: Player, id: AttackId) {
  const level = p.arsenal[id] || 1,
    stats = attackStats(id, level);
  p.attackCooldowns[id] = Math.max(
    0.12,
    ((stats.cooldown * p.rate) / 0.32) *
      (g.state.event.kind === "bonus" ? 0.62 : 1) *
      (id === "drone" || id === "seeker"
        ? p.arsenal.drone && p.arsenal.seeker
          ? 0.8
          : 1
        : 1),
  );
  p.fireCd = p.attackCooldowns[id];
  p.attackSeq++;
  if (
    motionAvailable(g, p) &&
    p.basicCd > ATTACK_MOTIONS[id].duration / 1000 + 0.06
  )
    p.attackMotion = {
      id,
      seq: p.attackSeq,
      at: g.state.elapsed,
      angle: p.angle,
      source: "module",
    };
  const list = pendingAttacks.get(g) || [];
  list.push({
    player: p.id,
    id,
    release: g.state.elapsed + ATTACK_MOTIONS[id].duration * 0.0003,
    world: g.state.world.seed,
    run: g.state.runId,
  });
  pendingAttacks.set(g, list);
}
function releaseAttacks(g: Game) {
  const list = pendingAttacks.get(g) || [],
    future: typeof list = [];
  for (const a of list) {
    if (a.world !== g.state.world.seed || a.run !== g.state.runId) continue;
    if (g.state.elapsed < a.release) {
      future.push(a);
      continue;
    }
    const p = g.state.players.find((p) => p.id === a.player);
    if (p?.alive && p.connected) {
      if (a.basic) fireBasic(g, p, a.angle);
      else if (p.arsenal[a.id]) fireModule(g, p, a.id);
    }
  }
  pendingAttacks.set(g, future);
}
// Attack modules coexist; each has its own authoritative cooldown and level.
function fireModule(g: Game, p: Player, id: AttackId) {
  const level = p.arsenal[id] || 1,
    stats = attackStats(id, level),
    a = ATTACKS[id];
  const targets = g.state.enemies
    .filter((e) => e.hp > 0 && dist(e, p) < 650 && visible(g, p, e))
    .sort((a, b) => dist(a, p) - dist(b, p));
  const target = targets[0];
  const hit = (e: Enemy, power = 1) => {
    let bonus = 1;
    if (
      (id === "flame" || id === "meteor") &&
      p.arsenal.frost &&
      (e.slow || 0) > 0
    )
      bonus *= 1.35;
    if (id === "arc" && p.arsenal.gravity && (e.gravityTime || 0) > 0)
      bonus *= 1.3;
    const crit =
      g.random() < Math.min(0.95, p.crit + ((p.critBoost || 0) > 0 ? 0.18 : 0));
    dealDamage(
      g,
      e,
      p.damage * stats.power * power * bonus * (crit ? p.critPower : 1),
      p.id,
      crit,
    );
  };
  const visualPoint =
    (id === "meteor" || id === "gravity") && target ? target : p;
  if (id !== "orbit")
    effect(g, visualPoint, "skill", a.color, stats.radius, {
      attackSkill: id,
      attackLevel: level,
      ability: a.visual,
      angle: p.angle,
      life: 0.55,
      maxLife: 0.55,
    });
  const bolt = (angle: number, power = 1, pierce = 0) => {
    shoot(g, p, angle, p.damage * stats.power * power, pierce);
    const b = g.state.bullets.at(-1)!;
    b.attackSkill = id;
    b.level = level;
    b.color = a.color;
    if (id === "seeker") b.homing = true;
  };
  officeNoise(
    g,
    p,
    ["bat", "mop", "wrench"].includes(id) ? 120 : id === "meteor" ? 500 : 260,
    ATTACKS[id].name,
    1,
  );
  if (id === "bat" || id === "mop" || id === "wrench") {
    const reach =
      id === "wrench"
        ? 110 + level * 6
        : id === "mop"
          ? 155 + level * 8
          : 135 + level * 7;
    let hits = 0;
    for (const e of targets) {
      const angle = PhaserAngle(Math.atan2(e.y - p.y, e.x - p.x) - p.angle);
      if (dist(e, p) > reach || (id !== "mop" && Math.abs(angle) > 0.95))
        continue;
      hit(e);
      e.stun = id === "wrench" ? 0.8 : 0.15;
      e.slow = id === "mop" ? 2 : e.slow;
      const d = dist(e, p) || 1;
      moveWorld(
        g.state.world,
        e,
        ((e.x - p.x) / d) * 18,
        ((e.y - p.y) / d) * 18,
      );
      hits++;
      if (id === "wrench" && hits >= 1 + stats.tier) break;
    }
  }
  if (id === "coffee") addArea(g, p, "flame", p, level);
  const extra = p.projectiles - 1;
  if (id === "pulse") {
    const count = Math.min(12, stats.count + extra);
    for (let i = 0; i < count; i++)
      bolt(p.angle + (i - (count - 1) / 2) * 0.11, 1, stats.tier);
  }
  if (id === "frost") {
    const count = Math.min(9, 1 + stats.tier + extra);
    for (let i = 0; i < count; i++)
      bolt(p.angle + (i - (count - 1) / 2) * 0.17, 1, 2 + stats.tier);
  }
  if (id === "blade") {
    const count = Math.min(12, 2 + stats.count + extra);
    for (let i = 0; i < count; i++)
      bolt(p.angle + (i - (count - 1) / 2) * 0.22, 0.7, 2);
  }
  if (id === "drone" || id === "seeker")
    for (let i = 0; i < Math.min(12, stats.count + 1 + extra); i++) {
      const aim = targets[i % Math.max(1, targets.length)];
      bolt(
        aim ? Math.atan2(aim.y - p.y, aim.x - p.x) : p.angle + (i - 0.5) * 0.15,
        0.9,
        id === "drone" ? stats.tier : 0,
      );
    }
  if (id === "arc" || id === "ricochet") {
    let from: Vec = p;
    for (const e of targets.slice(
      0,
      2 + stats.count + (id === "ricochet" ? 1 : 0),
    )) {
      effect(g, from, "lightning", a.color, 35, {
        toX: e.x,
        toY: e.y,
        attackSkill: id,
      });
      hit(e);
      from = e;
    }
  }
  if (id === "orbit") {
  }
  if (id === "flame" || id === "venom" || id === "gravity")
    addArea(g, p, id, id === "gravity" && target ? target : p, level);
  if (id === "meteor" && target)
    for (const e of targets) if (dist(e, target) < stats.radius) hit(e);
}
function PhaserAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
function botInput(g: Game, p: Player): Input {
  const live = g.state.players.filter((q) => !q.bot && q.connected),
    target = live.find((q) => !q.alive) || live[0];
  if (!target) return { ...EMPTY_INPUT };
  let closest: Enemy | undefined,
    best = 650;
  for (const e of g.state.enemies) {
    const d = dist(p, e);
    if (d < best && visible(g, p, e)) {
      best = d;
      closest = e;
    }
  }
  let goal: Vec = target;
  if (target.alive && dist(p, target) < 80) goal = p;
  if (closest && best < 150)
    goal = { x: p.x + (p.x - closest.x), y: p.y + (p.y - closest.y) };
  const st = steer(g, p, goal),
    d = dist(st, p),
    aim = closest ? Math.atan2(closest.y - p.y, closest.x - p.x) : p.angle;
  return {
    x: d > 8 ? (st.x - p.x) / d : 0,
    y: d > 8 ? (st.y - p.y) / d : 0,
    aimX: Math.cos(aim),
    aimY: Math.sin(aim),
    fire: !!closest,
    skill:
      !!closest &&
      (p.ability !== "mend" ||
        live.some((p) => p.hp < p.maxHp * 0.6 || !p.alive)),
    dash: best < 70,
    interact: true,
  };
}
function enemyAttack(g: Game, e: Enemy) {
  const s = g.state,
    damage =
      ENEMY_DEFS[e.kind].damage *
      danger(g) *
      squadPressure(s).damage *
      (s.difficulty === "nightmare"
        ? 1.2
        : s.difficulty === "relaxed"
          ? 0.7
          : 1);
  e.attackSeq = (e.attackSeq || 0) + 1;
  e.attackStartedAt = s.elapsed;
  if (e.kind === "shooter" || e.kind === "wraith" || e.kind === "boss") {
    const count = e.kind === "boss" ? 18 : e.kind === "wraith" ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const a =
        e.kind === "boss"
          ? e.angle + (i * Math.PI * 2) / count
          : e.angle + (i - (count - 1) / 2) * 0.15;
      s.bullets.push({
        basic: false,
        id: ++s.serial,
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * (e.kind === "boss" ? 195 : 255),
        vy: Math.sin(a) * (e.kind === "boss" ? 195 : 255),
        owner: "enemy",
        sourceEnemyId: e.id,
        sourceEnemyKind: e.kind,
        damage: damage * 0.72,
        life: 3.5,
        enemy: true,
        color: e.kind === "wraith" ? "#bf8dc7" : "#d97969",
      });
    }
    effect(g, e, "attack", "#dc7b67", e.kind === "boss" ? 120 : 45, {
      enemyKind: e.kind,
      warning: false,
      angle: e.angle,
    });
  } else if (e.kind === "hound") {
    e.vx = Math.cos(e.angle) * 580;
    e.vy = Math.sin(e.angle) * 580;
    e.stun = 0;
  } else {
    const point =
        e.kind === "bomber"
          ? { x: e.x, y: e.y }
          : { x: e.attackX ?? e.x, y: e.attackY ?? e.y },
      radius = e.kind === "bomber" ? 118 : e.kind === "tank" ? 92 : 64;
    effect(g, point, "attack", "#e67d65", radius, {
      enemyKind: e.kind,
      warning: false,
      angle: e.angle,
    });
    for (const p of s.players)
      if (p.connected && p.alive && dist(p, point) < radius)
        hurt(g, p, damage, e);
    if (e.kind === "bomber") e.hp = 0;
  }
  e.cd =
    e.kind === "boss"
      ? 2.1
      : e.kind === "shooter"
        ? 1.8
        : e.kind === "hound"
          ? 2.3
          : 1.25;
}
function eventDirector(g: Game, dt: number) {
  const s = g.state;
  s.eventCd -= dt;
  s.event.remaining = Math.max(0, s.event.remaining - dt);
  if (s.event.remaining === 0 && s.event.kind !== "none")
    s.event = {
      name: "茶水间休息时间",
      desc: "打印机正在酝酿新的离谱事件",
      kind: "none",
      remaining: 0,
    };
  if (s.eventCd > 0) return;
  s.eventCd = 38 + g.random() * 18;
  const events = [
    {
      name: "老板不在，效率翻倍",
      desc: "攻击间隔缩短38%，移速+20%，持续16秒。正经工作不见得这么快。",
      kind: "bonus" as const,
    },
    {
      name: "晚高峰尸潮",
      desc: "疾行变种追猎者正在集结",
      kind: "swarm" as const,
    },
    {
      name: "咖啡机开始喷仙气",
      desc: "远处区域弥漫毒雾，留意地面危险区",
      kind: "fog" as const,
    },
    {
      name: "老板突然宣布：团建！",
      desc: "敌人狂暴，击杀经验提升50%",
      kind: "blood" as const,
    },
    {
      name: "老板说的福利竟然到账了",
      desc: "新的应急物资柜和经验碎片出现在地图中",
      kind: "fortune" as const,
    },
    {
      name: "IT：谁又拔服务器插头了",
      desc: "照明衰减，精英怪开始游荡",
      kind: "blackout" as const,
    },
  ];
  s.event = {
    ...events[Math.floor(g.random() * events.length)],
    remaining: 24,
  };
  if (s.event.kind === "bonus") s.event.remaining = 16;
  s.message = `随机事件：${s.event.name} · ${s.event.desc}｜${workerQuote(s.seed + s.wave + s.serial)}`;
  if (s.event.kind === "swarm")
    for (let i = 0; i < 9; i++) spawnEnemy(g, "hound");
  if (s.event.kind === "fortune") {
    for (let i = 0; i < 3; i++)
      s.pickups.push({
        ...randomFloor(s.world, g.random),
        id: ++s.serial,
        kind: "xp",
        value: 25,
      });
    const jackpot = Math.floor(g.random() * 3);
    s.coins += jackpot === 0 ? 12 : jackpot === 1 ? 20 : 30;
    s.message += ` · 福利盲盒开出${jackpot === 0 ? 12 : jackpot === 1 ? 20 : 30}零件！`;
    s.objects.push({
      ...randomFloor(s.world, g.random),
      id: ++s.serial,
      kind: "chest",
      used: false,
      cost: 0,
      label: "不扣年终奖的福利箱",
      progress: 0,
    });
  }
}
function interactionFailed(g: Game, p: Player, message: string) {
  if (p.bot || g.state.elapsed - (p.interactionFeedback?.at ?? -99) < 0.85)
    return;
  p.interactionFeedback = {
    seq: (p.interactionFeedback?.seq || 0) + 1,
    at: g.state.elapsed,
    message,
    status: "failed",
  };
}
function interact(g: Game, p: Player, dt: number) {
  const s = g.state;
  if (useOffice(g, p, dt, (e, n, owner) => dealDamage(g, e, n, owner))) return;
  const ally = s.players.find(
    (q) => !q.alive && q.connected && dist(p, q) < 70,
  );
  if (ally) {
    ally.revive += dt * (p.role === "medic" ? 1.5 : 1);
    p.interaction = {
      label: `救援 ${ally.name}`,
      type: "revive",
      progress: Math.min(1, ally.revive / 2.7),
      targetX: ally.x,
      targetY: ally.y,
      cost: 0,
      status: "charging",
    };
    if (ally.revive >= 2.7) {
      revive(g, ally, p);
      p.interaction.status = "complete";
      p.interaction.progress = 1;
      p.interaction.until = s.elapsed + 1.2;
    }
    return;
  }
  const relay =
    s.objective.type === "relay"
      ? s.objective.relays.find((r) => !r.active && dist(p, r) < 74)
      : undefined;
  if (relay) {
    p.interaction = {
      label: "配电箱充能",
      type: "relay",
      progress: relay.charge,
      targetX: relay.x,
      targetY: relay.y,
      cost: 0,
      status: "charging",
    };
    return;
  }
  const obj = s.objects
    .filter((o) => !o.used && dist(o, p) < 70)
    .sort((a, b) => dist(a, p) - dist(b, p))[0];
  if (!obj) {
    if (
      p.interaction?.status === "complete" &&
      (p.interaction.until || 0) > s.elapsed
    )
      return;
    interactionFailed(g, p, "这里还不能交互，再靠近目标一点。");
    return;
  }
  if (p.bot && obj.cost > 0) return;
  p.interaction = {
    label: obj.label,
    type: "object",
    progress: Math.min(1, obj.progress / 0.7),
    targetX: obj.x,
    targetY: obj.y,
    cost: obj.cost,
    status: "charging",
  };
  if (obj.cost > s.coins) {
    p.interaction.status = "blocked";
    interactionFailed(
      g,
      p,
      `还缺 ${obj.cost - s.coins} 零件，先清怪攒点家底。`,
    );
    p.interaction.message = `还缺 ${obj.cost - s.coins} 零件`;
    s.message = `${obj.label}需要 ${obj.cost} 零件`;
    return;
  }
  obj.progress += dt;
  p.interaction.progress = Math.min(1, obj.progress / 0.7);
  if (obj.progress < 0.7) return;
  obj.used = true;
  s.coins -= obj.cost;
  p.interaction.status = "complete";
  p.interaction.progress = 1;
  p.interaction.until = s.elapsed + 1.2;
  p.interaction.message = obj.cost ? `已使用 ${obj.cost} 零件` : "互动完成";
  effect(g, obj, "collect", obj.kind === "shrine" ? "#b18bbd" : "#dfc18a", 75, {
    owner: p.id,
    amount: obj.cost ? -obj.cost : undefined,
  });
  if (obj.kind === "fountain") {
    for (const q of s.players)
      if (dist(q, obj) < 190) {
        if (!q.alive) revive(g, q, p);
        q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.35);
        q.shield = Math.min(q.shieldCap + 20, q.shield + 20);
      }
    s.message = "医药补给点已耗尽 · 治疗与护盾已补充";
  } else {
    p.pendingUpgrades++;
    if (!p.offers.length) p.offers = generateOffers(g, p);
    gainExperience(g, 8);
    if (obj.kind === "shrine") {
      p.curse++;
      p.hp = Math.max(1, p.hp - p.maxHp * 0.18);
      s.message = "加班审批已盖章：获得高风险强化，敌潮永久加重";
    } else s.message = `${obj.label}已开启 · 获得强化，消耗${obj.cost}零件`;
  }
}
const escortPaths = new WeakMap<Game, { points: Vec[]; index: number }>();
function makeEscort(g: Game) {
  const w = g.state.world,
    start = Math.floor(w.spawn.y / 64) * w.cols + Math.floor(w.spawn.x / 64),
    end = Math.floor(w.exit.y / 64) * w.cols + Math.floor(w.exit.x / 64),
    q = [start],
    prev = new Map([[start, -1]]);
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (n === end) break;
    const x = n % w.cols,
      y = Math.floor(n / w.cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        k = ny * w.cols + nx;
      if (
        nx < 0 ||
        nx >= w.cols ||
        ny < 0 ||
        ny >= w.rows ||
        !w.tiles[k] ||
        prev.has(k)
      )
        continue;
      prev.set(k, n);
      q.push(k);
    }
  }
  const points: Vec[] = [];
  let n = end;
  while (n !== start && n !== -1) {
    points.unshift({
      x: (n % w.cols) * 64 + 32,
      y: Math.floor(n / w.cols) * 64 + 32,
    });
    n = prev.get(n) ?? -1;
  }
  const path = { points, index: 0 };
  escortPaths.set(g, path);
  return path;
}
export function tickGame(g: Game, delta: number) {
  const s = g.state;
  const dt = Math.max(0, Math.min(0.08, Number.isFinite(delta) ? delta : 0));
  if (s.phase === "countdown") {
    if (!allReady(g)) {
      cancelLaunch(g);
      return;
    }
    s.countdown = Math.max(0, s.countdown - dt);
    if (!s.countdown) beginDraft(g);
    return;
  }
  if (s.phase === "upgrade") {
    tickOffice(
      g,
      dt,
      (e, n, owner) => dealDamage(g, e, n, owner),
      (kind, point) => spawnEnemy(g, kind, point),
    );
    checkStageChoices(g);
    return;
  }
  if (s.phase === "draft") {
    checkDraft(g);
    return;
  }
  if (s.phase !== "playing" || !s.players.some((p) => p.connected && !p.bot))
    return;
  s.tick++;
  s.elapsed += dt;
  s.stageTime += dt;
  s.stats.time = s.elapsed;
  advanceExperience(g);
  tickOffice(
    g,
    dt,
    (e, n, owner) => dealDamage(g, e, n, owner),
    (kind, point) => spawnEnemy(g, kind, point),
  );
  s.effects = s.effects.filter((e) => (e.life -= dt) > 0).slice(-200);
  if (s.breakTime > 0) {
    s.breakTime = Math.max(0, s.breakTime - dt);
    s.stageTime = 0;
  }
  const active = s.players.filter((p) => p.connected && p.alive);
  if (!active.length) {
    s.phase = "lost";
    s.rescuePing = undefined;
    s.message = "全队失守 · 办公楼记住了这一次远征";
    return;
  }
  flowTo(g, active.find((p) => !p.bot) || active[0]);
  for (const p of s.players) {
    if (!p.connected) {
      g.queuedAbilities.delete(p.id);
      continue;
    }
    for (const key of [
      "upgradeCd",
      "fireCd",
      "skillCd",
      "dashCd",
      "invulnerable",
      "rescueCd",
      "orbitCd",
    ] as const)
      p[key] = Math.max(0, p[key] - dt);
    if (!p.alive) {
      g.queuedAbilities.delete(p.id);
      p.downTime = Math.max(0, p.downTime - dt);
      continue;
    }
    p.critBoost = Math.max(0, (p.critBoost || 0) - dt);
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    if (
      p.interaction?.status !== "complete" ||
      (p.interaction.until || 0) < s.elapsed
    )
      p.interaction = undefined;
    const input = {
        ...(p.bot ? botInput(g, p) : g.inputs.get(p.id) || EMPTY_INPUT),
      },
      queued = g.queuedAbilities.get(p.id);
    if (queued) {
      input.skill ||= queued.skill;
      input.dash ||= queued.dash;
      g.queuedAbilities.delete(p.id);
    }
    p.angle = Math.atan2(input.aimY, input.aimX);
    if (p.bot && p.offers.length) {
      const id = p.offers[Math.floor(g.random() * p.offers.length)].id;
      chooseUpgrade(g, p.id, id);
    }
    if (input.dash && p.dashCd <= 0) {
      const len = Math.hypot(input.x, input.y),
        dx = len ? input.x : Math.cos(p.angle),
        dy = len ? input.y : Math.sin(p.angle);
      p.dashVx = dx * 760;
      p.dashVy = dy * 760;
      p.dashTime = 0.22;
      p.dashCd = Math.max(
        1.4,
        3 - p.upgrades.filter((u) => u === "speed").length * 0.18,
      );
      p.invulnerable = 0.28;
      p.dashSeq++;
      effect(g, p, "dash", p.color, 42);
    }
    if (p.dashTime > 0) {
      moveWorld(s.world, p, p.dashVx * dt, p.dashVy * dt, 15);
      p.dashTime = Math.max(0, p.dashTime - dt);
      if (p.upgrades.includes("dashfire"))
        for (const e of s.enemies)
          if (dist(e, p) < 85)
            dealDamage(
              g,
              e,
              p.damage *
                dt *
                (6 +
                  2 *
                    (p.upgrades.filter((id) => id === "dashfire").length - 1)),
              p.id,
            );
    } else
      moveWorld(
        s.world,
        p,
        input.x * p.speed * dt * (s.event.kind === "bonus" ? 1.2 : 1),
        input.y * p.speed * dt * (s.event.kind === "bonus" ? 1.2 : 1),
        15,
      );
    p.basicCd = Math.max(0, (p.basicCd || 0) - dt);
    if (input.fire && !p.basicCd && motionAvailable(g, p)) beginBasic(g, p);
    for (const attack of ATTACK_IDS) {
      p.attackCooldowns[attack] = Math.max(
        0,
        (p.attackCooldowns[attack] || 0) - dt,
      );
      if (input.fire && p.arsenal[attack] && !p.attackCooldowns[attack])
        beginModule(g, p, attack);
    }
    if (input.skill && p.skillCd <= 0) skill(g, p);
    if (input.interact) interact(g, p, dt);
    if (p.upgrades.includes("orbiting") && p.orbitCd <= 0) {
      const level = p.upgrades.filter((id) => id === "orbiting").length;
      p.orbitCd = Math.max(0.5, 1.3 - (level - 1) * 0.12);
      for (const e of s.enemies)
        if (dist(e, p) < 130)
          dealDamage(
            g,
            e,
            p.damage *
              (1.6 +
                0.4 *
                  (p.upgrades.filter((id) => id === "orbiting").length - 1)),
            p.id,
          );
      effect(g, p, "skill", "#c4b2d8", 130);
    }
  }
  releaseAttacks(g);
  tickAreas(
    g,
    dt,
    (e, amount, owner, crit) => dealDamage(g, e, amount, owner, crit),
    (a, b) => visible(g, a, b),
  );
  const live = s.players.filter((p) => p.alive && p.connected);
  if (s.breakTime <= 0) {
    eventDirector(g, dt);
    s.spawnCd -= dt;
    if (s.spawnCd <= 0 && !s.exitOpen) {
      const count =
        1 +
        Math.floor((s.mode === "survival" ? s.wave : s.mission + 1) / 3) +
        Math.floor(s.players.length / 2);
      for (let i = 0; i < Math.min(7, count); i++) spawnEnemy(g);
      s.spawnCd =
        (Math.max(0.26, 1.8 - danger(g) * 0.14) *
          (s.difficulty === "nightmare"
            ? 0.64
            : s.difficulty === "relaxed"
              ? 1.6
              : 1)) /
        squadPressure(s).spawn /
        (s.route === "overtime" ? 1.18 : s.route === "detour" ? 0.84 : 1) /
        (1 + s.noise * 0.004);
    }
  }
  for (const e of s.enemies) {
    if (e.hp <= 0 || s.breakTime > 0) continue;
    e.cd -= dt;
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.slow = Math.max(0, (e.slow || 0) - dt);
    e.gravityTime = Math.max(0, (e.gravityTime || 0) - dt);
    if ((e.poison || 0) > 0) {
      e.poison = Math.max(0, e.poison! - dt);
      const owner = s.players.find((p) => p.id === e.poisonOwner);
      e.poisonCd = Math.max(0, (e.poisonCd || 0) - dt);
      if (owner && !e.poisonCd) {
        dealDamage(
          g,
          e,
          owner.damage * 0.3 * (owner.arsenal.venom || 1),
          owner.id,
        );
        e.poisonCd = 0.5;
      }
    }

    e.stun = Math.max(0, (e.stun || 0) - dt);
    if (e.stun! > 0) continue;
    let target = live[0],
      best = 1e9;
    for (const p of live) {
      const d = dist(p, e);
      if (d < best) {
        best = d;
        target = p;
      }
    }
    if (!target) continue;
    const lure = s.noises
      .filter((n) => dist(n, e) < n.radius && dist(e, target) > 90)
      .sort((a, b) => dist(a, e) - dist(b, e))[0];
    if (lure && e.kind !== "boss" && e.kind !== "wraith") {
      const d = dist(e, lure) || 1;
      if (d > 30)
        moveWorld(
          s.world,
          e,
          ((lure.x - e.x) / d) * e.speed * dt,
          ((lure.y - e.y) / d) * e.speed * dt,
          16,
        );
      e.angle = Math.atan2(lure.y - e.y, lure.x - e.x);
      continue;
    }
    if (e.kind === "wraith") {
      e.screamCd = (e.screamCd || 6) - dt;
      if (e.screamCd <= 0 && best < 600) {
        e.screamCd = 12;
        officeNoise(g, e, 900, "尖啸加班怪", 3);
        for (let i = 0; i < 2; i++) spawnEnemy(g, "mite");
      }
    }
    if (e.windup! > 0) {
      e.windup = Math.max(0, e.windup! - dt);
      if (!e.windup) enemyAttack(g, e);
      continue;
    }
    if (e.vx || e.vy) {
      moveWorld(s.world, e, (e.vx || 0) * dt, (e.vy || 0) * dt, 17);
      e.vx = (e.vx || 0) * Math.exp(-dt * 8);
      e.vy = (e.vy || 0) * Math.exp(-dt * 8);
      for (const p of live)
        if (dist(e, p) < 40)
          hurt(g, p, 22 * danger(g) * squadPressure(s).damage, e);
      if (Math.hypot(e.vx, e.vy) < 30) {
        e.vx = 0;
        e.vy = 0;
      }
      continue;
    }
    const ranged = ["shooter", "wraith", "boss"].includes(e.kind),
      range = ranged
        ? 560
        : e.kind === "hound"
          ? 230
          : e.kind === "bomber"
            ? 80
            : e.kind === "tank"
              ? 90
              : 65;
    e.angle = Math.atan2(target.y - e.y, target.x - e.x);
    if (best < range && e.cd <= 0 && visible(g, e, target)) {
      e.windup = ENEMY_DEFS[e.kind].windup;
      e.windupTotal = e.windup;
      e.attackX = target.x;
      e.attackY = target.y;
      effect(g, e, "attack", "#e48065", range, {
        toX: e.kind === "bomber" ? e.x : target.x,
        toY: e.kind === "bomber" ? e.y : target.y,
        enemyKind: e.kind,
        warning: true,
        angle: e.angle,
        life: e.windup,
        maxLife: e.windup,
      });
    } else if (best > (ranged ? 230 : 35)) {
      const goal = steer(g, e, target),
        d = dist(e, goal) || 1,
        speed =
          e.speed *
          (e.kind === "boss" && e.bossPhase === 1 ? 1.8 : 1) *
          (e.slow! > 0 ? 0.5 : 1) *
          (s.event.kind === "blood" ? 1.2 : 1);
      moveWorld(
        s.world,
        e,
        ((goal.x - e.x) / d) * speed * dt,
        ((goal.y - e.y) / d) * speed * dt,
        e.kind === "boss" ? 25 : 16,
      );
    }
  }
  for (const b of s.bullets) {
    b.life -= dt;
    if (b.homing) {
      const target = s.enemies
        .filter((e) => e.hp > 0 && !b.hitIds?.includes(e.id))
        .sort((a, c) => dist(a, b) - dist(c, b))[0];
      if (target) {
        const angle = Math.atan2(target.y - b.y, target.x - b.x);
        b.vx += (Math.cos(angle) * 500 - b.vx) * Math.min(1, dt * 8);
        b.vy += (Math.sin(angle) * 500 - b.vy) * Math.min(1, dt * 8);
      }
    }
    const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 14));
    for (let i = 0; i < steps && b.life > 0; i++) {
      b.x += (b.vx * dt) / steps;
      b.y += (b.vy * dt) / steps;
      if (worldBlocked(s.world, b.x, b.y, 3)) {
        b.life = 0;
        break;
      }
      if (b.enemy) {
        for (const p of live)
          if (dist(p, b) < 20) {
            hurt(
              g,
              p,
              b.damage,
              s.enemies.find((e) => e.id === b.sourceEnemyId),
              {
                id: b.sourceEnemyId,
                kind: b.sourceEnemyKind,
                x: b.x - b.vx * 0.1,
                y: b.y - b.vy * 0.1,
                name: "敌方弹丸",
              },
            );
            b.life = 0;
            break;
          }
      } else
        for (const e of s.enemies) {
          if (
            e.hp <= 0 ||
            b.hitIds?.includes(e.id) ||
            dist(e, b) > (e.kind === "boss" ? 38 : e.kind === "tank" ? 25 : 20)
          )
            continue;
          dealDamage(g, e, b.damage, b.owner, b.critical);
          if (b.attackSkill === "frost") e.slow = 3;

          b.hitIds ??= [];
          b.hitIds.push(e.id);
          if ((b.pierce || 0) > 0) b.pierce!--;
          else b.life = 0;
          break;
        }
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0).slice(-650);
  let dead = s.enemies.find((e) => e.hp <= 0),
    guard = 0;
  while (dead && guard++ < 155) {
    const e = dead;
    s.enemies = s.enemies.filter((enemy) => enemy.id !== e.id);
    s.stats.kills++;
    s.waveKills++;
    const parts =
      e.kind === "boss"
        ? BALANCE.bossParts
        : e.elite
          ? BALANCE.eliteParts
          : BALANCE.normalParts;
    s.coins += parts + (s.route === "overtime" ? 1 : 0);
    const owner = s.players.find((p) => p.id === e.lastHit);
    if (owner) {
      owner.kills++;
      owner.partsCollected += parts;
    }
    effect(
      g,
      e,
      "death",
      e.kind === "boss" ? "#e09485" : "#a85f57",
      e.kind === "boss" ? 110 : 30,
    );
    const xp =
      (e.kind === "boss" ? 80 : e.elite ? 9 : 3) *
      (s.event.kind === "blood" ? 1.5 : 1);
    gainExperience(g, xp * 0.4);
    s.pickups.push({
      id: ++s.serial,
      x: e.x,
      y: e.y,
      kind: "xp",
      value: xp * 0.6,
    });
    if (
      g.random() <
        (s.difficulty === "nightmare"
          ? BALANCE.nightmareHealDrop
          : BALANCE.healDrop) &&
      s.pickups.filter((p) => p.kind === "heal").length < BALANCE.healCap
    )
      s.pickups.push({ id: ++s.serial, x: e.x + 10, y: e.y, kind: "heal" });
    if (e.kind === "boss" && s.objective.type === "boss") {
      s.objective.progress = 1;
      s.objective.done = true;
    }
    if (owner?.upgrades.includes("explosive") || e.elite === "volatile") {
      for (const q of s.enemies)
        if (dist(q, e) < 105)
          dealDamage(
            g,
            q,
            owner
              ? owner.damage *
                  (1.4 +
                    0.4 *
                      Math.max(
                        0,
                        owner.upgrades.filter((id) => id === "explosive")
                          .length - 1,
                      ))
              : 25,
            owner?.id || "",
          );
      effect(g, e, "skill", "#c67757", 105);
    }
    dead = s.enemies.find((e) => e.hp <= 0);
  }
  s.pickups = s.pickups
    .filter((item) => {
      let recipient: Player | undefined;
      for (const p of live) {
        const d = dist(p, item),
          range = item.kind === "xp" ? p.magnet + 35 : 29;
        if (item.kind === "xp" && d < range + 70 && d > 22) {
          item.x += (p.x - item.x) * Math.min(1, dt * 8);
          item.y += (p.y - item.y) * Math.min(1, dt * 8);
        }
        if (d < range && (item.kind !== "heal" || p.hp < p.maxHp)) {
          recipient = p;
          break;
        }
      }
      if (!recipient) return true;
      if (item.kind !== "xp" || (item.value || 0) >= 10)
        effect(
          g,
          item,
          "collect",
          item.kind === "heal" ? "#9bbaa9" : "#d8b978",
          24,
          {
            owner: recipient.id,
            pickupKind: item.kind,
            amount: item.kind === "crystal" ? 1 : item.value || 4,
          },
        );
      if (item.kind === "xp")
        gainExperience(
          g,
          (item.value || 4) *
            (1 +
              recipient.upgrades.filter((u) => u === "magnet").length * 0.12),
        );
      if (item.kind === "crystal") {
        s.objective.progress++;
        s.stats.crystals++;
        s.coins += BALANCE.crystalParts;
        recipient.partsCollected += BALANCE.crystalParts;
        gainExperience(g, 6);
      }
      if (item.kind === "heal") {
        recipient.hp = Math.min(
          recipient.maxHp,
          recipient.hp + BALANCE.healAmount,
        );
        effect(g, recipient, "heal", "#9bbaa9", 25);
      }
      return false;
    })
    .slice(-550);
  if (s.objective.type === "relay")
    for (const r of s.objective.relays) {
      if (r.active) continue;
      const operators = live.filter(
        (p) => dist(p, r) < 74 && (p.bot || g.inputs.get(p.id)?.interact),
      );
      r.charge = Math.min(
        1,
        r.charge +
          operators.reduce(
            (v, p) => v + (p.role === "engineer" ? 0.2 : 0.14),
            0,
          ) *
            dt,
      );
      if (r.charge >= 1) {
        r.active = true;
        for (const p of operators)
          if (p.interaction) {
            p.interaction.status = "complete";
            p.interaction.progress = 1;
            p.interaction.until = s.elapsed + 1.2;
          }
        s.objective.progress++;
        gainExperience(g, 20);
        effect(g, r, "skill", "#b4c194", 100);
        for (let i = 0; i < 7; i++) spawnEnemy(g);
      }
    }
  if (s.objective.type === "escort" && !s.objective.done) {
    const d = s.objective.drone,
      path = escortPaths.get(g) || makeEscort(g);
    if (live.some((p) => dist(p, d) < 165)) {
      const point = path.points[path.index];
      if (point) {
        const distance = dist(d, point);
        if (distance < 8) path.index++;
        else
          moveWorld(
            s.world,
            d,
            ((point.x - d.x) / distance) * 72 * dt,
            ((point.y - d.y) / distance) * 72 * dt,
            18,
          );
      }
      d.progress = path.points.length
        ? Math.min(100, (path.index / path.points.length) * 100)
        : 100;
      s.objective.progress = Math.floor(d.progress);
    }
    for (const e of s.enemies)
      if (dist(e, d) < 65 && e.cd < 0.1) d.hp = Math.max(0, d.hp - dt * 3);
    if (!d.hp) {
      s.phase = "lost";
      s.rescuePing = undefined;
      s.message = "运输载体损毁 · 远征失败";
      return;
    }
  }
  if (s.mode === "survival") {
    s.objective.type = "survive";
    s.objective.target = s.waveTarget;
    s.objective.progress = Math.min(s.waveKills, s.waveTarget);
    if (
      s.breakTime <= 0 &&
      (s.stageTime >= s.waveEnds ||
        (s.waveKills >= s.waveTarget && s.stageTime > 32)) &&
      !s.enemies.some((e) => e.kind === "boss")
    ) {
      openVote(g);
      s.wave++;
      s.mission = (s.wave - 1) % 6;
      s.coins += BALANCE.waveParts;
      gainExperience(g, 30 + s.wave * 4);
      s.enemies = [];
      s.bullets = [];
      s.stageTime = 0;
      s.waveKills = 0;
      s.waveTarget = Math.round((20 + s.wave * 8) * squadPressure(s).size);
      s.waveEnds = 65 + Math.min(35, s.wave * 3);
      s.breakTime = 9;
      s.spawnCd = 1;
      s.message = `第 ${s.wave - 1} 波已守住 · 9秒整备 · 第 ${s.wave} 波更强敌潮`;
      if (s.wave % 5 === 0)
        spawnEnemy(g, "boss", randomFloor(s.world, g.random, live[0], 600));
      if (s.wave % 3 === 0) setupObjects(g);
      for (const p of s.players) {
        if (!p.alive) revive(g, p);
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.07);
        p.shield = Math.max(p.shield, p.shieldCap);
      }
    }
  } else {
    if (s.objective.progress >= s.objective.target) {
      if (!s.exitOpen) {
        s.message = "目标已完成 · 全队存活队员前往出口集合";
        s.coins += 30;
        gainExperience(g, 25);
      }
      s.objective.done = true;
      s.exitOpen = true;
    }
    if (s.exitOpen) {
      const humans = live.filter((p) => !p.bot),
        all =
          humans.length > 0 && humans.every((p) => dist(p, s.world.exit) < 100);
      s.exitProgress = all ? s.exitProgress + dt : 0;
      if (s.exitProgress > 1.5) {
        if (s.mission >= 5) {
          s.phase = "won";
          s.message = "办公楼已封锁 · 所有人带着故事回来了";
        } else {
          s.phase = "upgrade";
          openVote(g);
          for (const p of s.players) {
            p.pendingUpgrades++;
            p.offers = generateOffers(g, p);
            p.upgradePicked = p.bot || !p.connected;
          }
          checkStageChoices(g);
        }
        return;
      }
    }
  }
  if (s.event.kind === "fog") {
    const cycle = s.stageTime % 9;
    if (cycle > 6)
      for (const point of s.world.points.filter((_, i) => i % 4 === 2))
        for (const p of live)
          if (dist(p, point) < 115)
            hurt(g, p, 7 * danger(g), undefined, {
              ...point,
              name: "咖啡蒸汽",
            });
  }
  if (!s.players.some((p) => p.alive && p.connected)) {
    s.phase = "lost";
    s.rescuePing = undefined;
    s.message = "全队失守 · 下一次重来，补给和构筑将重新洗牌";
  }
}
