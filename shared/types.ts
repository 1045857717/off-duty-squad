export type Role =
  | "scout"
  | "engineer"
  | "medic"
  | "guardian"
  | "designer"
  | "accountant"
  | "hr"
  | "manager"
  | "sales"
  | "logistics"
  | "chef"
  | "cleaner"
  | "teacher"
  | "driver"
  | "creator"
  | "lawyer"
  | "workhorse"
  | "blametaker"
  | "slacker"
  | "intern"
  | "duck"
  | "deadline"
  | "barista"
  | "qa"
  | "director"
  | "investor"
  | "ppt"
  | "landlord";
export type Phase =
  | "lobby"
  | "countdown"
  | "draft"
  | "playing"
  | "upgrade"
  | "won"
  | "lost";
export type Mode = "expedition" | "survival";
export type Difficulty = "normal" | "relaxed" | "nightmare";
export type Ability =
  | "volley"
  | "nova"
  | "mend"
  | "aegis"
  | "frost"
  | "chain"
  | "orbit"
  | "reaper"
  | "decoy"
  | "supply"
  | "wok"
  | "sanitize"
  | "bell"
  | "rush"
  | "flash"
  | "injunction"
  | "stampede"
  | "takeblame"
  | "paidbreak"
  | "paperstorm"
  | "quack"
  | "crunch"
  | "espresso"
  | "bugfix"
  | "pie"
  | "funding"
  | "slides"
  | "rent";
export type AttackId =
  | "pulse"
  | "arc"
  | "frost"
  | "blade"
  | "orbit"
  | "meteor"
  | "venom"
  | "drone"
  | "flame"
  | "seeker"
  | "gravity"
  | "ricochet"
  | "bat"
  | "mop"
  | "wrench"
  | "coffee";
export type ObjectiveType = "collect" | "relay" | "escort" | "boss" | "survive";
export type Vec = { x: number; y: number };
export type Rect = Vec & { w: number; h: number };
export type Input = {
  x: number;
  y: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  dash: boolean;
  skill: boolean;
  interact: boolean;
};
export type World = {
  w: number;
  h: number;
  tile: number;
  cols: number;
  rows: number;
  tiles: number[];
  walls: Rect[];
  rooms: Rect[];
  spawn: Vec;
  exit: Vec;
  points: Vec[];
  seed: number;
  theme: number;
  biome: "facility" | "cataclysm";
  dynamicWalls?: Rect[];
};
export type Offer = {
  id: string;
  rarity: "common" | "rare" | "epic" | "cursed";
  name: string;
  desc: string;
  icon: string;
  ability?: Ability;
  attackSkill?: AttackId;
  currentLevel?: number;
  nextLevel?: number;
  growthPath?: string;
};
export type Player = Vec & {
  id: string;
  name: string;
  role: Role;
  color: string;
  hp: number;
  maxHp: number;
  angle: number;
  alive: boolean;
  downTime: number;
  revive: number;
  connected: boolean;
  ready: boolean;
  arsenal: Partial<Record<AttackId, number>>;
  attackCooldowns: Partial<Record<AttackId, number>>;
  signatureLevel: number;
  hitSeq: number;
  hitShield: boolean;
  lastHit?: {
    sourceId?: number;
    sourceKind?: EnemyKind;
    sourceName: string;
    x: number;
    y: number;
    at: number;
    amount: number;
    shieldAbsorbed: number;
  };
  attackMotion?: {
    id: AttackId;
    seq: number;
    at: number;
    angle: number;
    source?: "basic" | "module";
  };
  initialChosen: boolean;
  upgradeCd: number;
  interactionLatched?: boolean;
  interactionFeedback?: {
    seq: number;
    at: number;
    message: string;
    status: "failed" | "complete";
    label?: string;
  };
  interaction?: {
    label: string;
    type: "object" | "relay" | "revive";
    progress: number;
    targetX: number;
    targetY: number;
    cost: number;
    status: "charging" | "blocked" | "complete";
    until?: number;
    message?: string;
  };
  basicCd: number;
  fireCd: number;
  skillCd: number;
  dashCd: number;
  invulnerable: number;
  speed: number;
  damage: number;
  rate: number;
  regen: number;
  shield: number;
  kills: number;
  damageDealt: number;
  healingDone: number;
  damageTaken: number;
  criticalHits: number;
  rescues: number;
  partsCollected: number;
  bot: boolean;
  upgradePicked: boolean;
  upgrades: string[];
  ability: Ability;
  offers: Offer[];
  pendingUpgrades: number;
  crit: number;
  critPower: number;
  critBoost?: number;
  projectiles: number;
  pierce: number;
  lifesteal: number;
  magnet: number;
  thorns: number;
  cooldownScale: number;
  dashTime: number;
  dashVx: number;
  dashVy: number;
  attackSeq: number;
  skillSeq: number;
  dashSeq: number;
  rescueCd: number;
  orbitCd: number;
  curse: number;
  shieldCap: number;
};
export type EnemyKind =
  | "mite"
  | "shooter"
  | "tank"
  | "boss"
  | "hound"
  | "wraith"
  | "bomber";
export type Enemy = Vec & {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  cd: number;
  angle: number;
  hitFlash: number;
  lastHit?: string;
  windup?: number;
  windupTotal?: number;
  attackStartedAt?: number;
  attackSeq?: number;
  attackX?: number;
  attackY?: number;
  slow?: number;
  elite?: "swift" | "armored" | "vampiric" | "volatile";
  vx?: number;
  vy?: number;
  stun?: number;
  poison?: number;
  poisonOwner?: string;
  poisonCd?: number;
  gravityTime?: number;
  bossPhase?: number;
  screamCd?: number;
};
export type Bullet = Vec & {
  /** Ordinary profession shot; independent from a random module using the same attack id. */
  basic?: boolean;
  sourceEnemyId?: number;
  sourceEnemyKind?: EnemyKind;
  id: number;
  vx: number;
  vy: number;
  owner: string;
  damage: number;
  life: number;
  enemy: boolean;
  color: string;
  pierce?: number;
  critical?: boolean;
  hitIds?: number[];
  attackSkill?: AttackId;
  homing?: boolean;
  level?: number;
};
export type Pickup = Vec & {
  id: number;
  kind: "crystal" | "heal" | "coin" | "xp";
  value?: number;
};
export type Effect = Vec & {
  id: number;
  kind:
    | "hit"
    | "heal"
    | "dash"
    | "skill"
    | "death"
    | "collect"
    | "attack"
    | "rescue"
    | "lightning";
  color: string;
  life: number;
  maxLife: number;
  size: number;
  amount?: number;
  owner?: string;
  critical?: boolean;
  toX?: number;
  toY?: number;
  ability?: Ability;
  angle?: number;
  enemyKind?: EnemyKind;
  warning?: boolean;
  pickupKind?: Pickup["kind"];
  attackSkill?: AttackId;
  targetPlayer?: string;
  attackLevel?: number;
};
export type Objective = {
  type: ObjectiveType;
  target: number;
  progress: number;
  relays: (Vec & { active: boolean; charge: number })[];
  drone: Vec & { hp: number; progress: number };
  done: boolean;
};
export type Interactable = Vec & {
  id: number;
  kind: "chest" | "shrine" | "fountain" | "cache";
  used: boolean;
  label: string;
  cost: number;
  progress: number;
};
export type ChatMessage = {
  id: string;
  name: string;
  text: string;
  at: number;
  spectator: boolean;
  system?: boolean;
  playerId?: string;
};
export type Spectator = { id: string; name: string; connected: boolean };
export type Stats = {
  kills: number;
  rescued: number;
  crystals: number;
  time: number;
};
export type AreaEffect = Vec & {
  id: number;
  owner: string;
  kind: "orbit" | "venom" | "gravity" | "flame";
  radius: number;
  level: number;
  life: number;
  maxLife: number;
  tickCd: number;
  visualOnly?: boolean;
  angle: number;
};
export type OfficeProp = Vec & {
  id: number;
  kind: "printer" | "sprinkler" | "cabinet" | "shutter";
  label: string;
  progress: number;
  active: number;
  cd: number;
  used: number;
};
export type RouteId = "supply" | "overtime" | "detour";
export type TeamVote = {
  id: number;
  remaining: number;
  ballots: Record<string, RouteId>;
  resolved?: RouteId;
};
export type TacticalPing = Vec & {
  id: number;
  owner: string;
  name: string;
  kind: "danger" | "supply" | "gather";
  life: number;
};
export type NoiseSource = Vec & {
  id: number;
  life: number;
  radius: number;
  label: string;
};
export type GameState = {
  code: string;
  host: string;
  phase: Phase;
  countdown: number;
  nextLevelAt: number;
  areas: AreaEffect[];
  players: Player[];
  enemies: Enemy[];
  bullets: Bullet[];
  pickups: Pickup[];
  effects: Effect[];
  mission: number;
  difficulty: Difficulty;
  mode: Mode;
  elapsed: number;
  stageTime: number;
  spawnCd: number;
  coins: number;
  seed: number;
  serial: number;
  objective: Objective;
  stats: Stats;
  message: string;
  exitProgress: number;
  exitOpen: boolean;
  tick: number;
  world: World;
  wave: number;
  waveKills: number;
  waveTarget: number;
  waveEnds: number;
  breakTime: number;
  level: number;
  xp: number;
  xpNext: number;
  event: {
    name: string;
    desc: string;
    kind: "swarm" | "fog" | "blood" | "fortune" | "blackout" | "bonus" | "none";
    remaining: number;
  };
  eventCd: number;
  objects: Interactable[];
  spectators: Spectator[];
  chat: ChatMessage[];
  squadName: string;
  runId: string;
  rankedRecorded: boolean;
  teamPeak: number;
  officeProps: OfficeProp[];
  noise: number;
  noises: NoiseSource[];
  pings: TacticalPing[];
  routeVote?: TeamVote;
  route: RouteId;
  routeSerial: number;
  rescuePing?: Vec & { name: string; until: number; playerId?: string };
  attackWarning?: string;
};
export type Game = {
  state: GameState;
  inputs: Map<string, Input>;
  queuedAbilities: Map<string, { skill: boolean; dash: boolean }>;
  random: () => number;
  nav?: { flow: Int32Array; target: number; at: number };
};
export type RoomSummary = {
  code: string;
  squadName: string;
  mode: Mode;
  difficulty: Difficulty;
  phase: Phase;
  players: number;
  bots: number;
  maxPlayers: number;
  spectators: number;
  wave: number;
  level: number;
  elapsed: number;
};
export type ScoreEntry = {
  id: string;
  squadName: string;
  members: string[];
  mode: Mode;
  difficulty: Difficulty;
  wave: number;
  mission: number;
  level: number;
  kills: number;
  damage: number;
  score: number;
  elapsed: number;
  won: boolean;
  seed: number;
  at: string;
};
export type RoomReply = {
  ok: boolean;
  error?: string;
  code?: string;
  playerId?: string;
  token?: string;
  spectator?: boolean;
  rooms?: RoomSummary[];
  scores?: ScoreEntry[];
  messages?: ChatMessage[];
  presence?: {
    online: number;
    players: number;
    spectators: number;
    lobby: number;
    rooms: number;
  };
  rankingWindow?: {
    start: number;
    end: number;
    timezone: string;
    label: string;
  };
};
export type Settings = {
  volume: number;
  sound: boolean;
  lowMotion: boolean;
  opacity: number;
  compact: boolean;
  autoFire: boolean;
  showGuide: boolean;
  frameCap: 0 | 60 | 144 | 165 | 240;
  quality: "high" | "balanced";
  showDamage: boolean;
  gameOpacity: number;
  shiftDash: boolean;
  workEntry:
    | "last"
    | "random"
    | "tasks"
    | "board"
    | "docs"
    | "sheet"
    | "excel"
    | "mail"
    | "code"
    | "idea"
    | "metrics";
};
export type DesktopBridge = {
  isDesktop: true;
  setOpacity: (v: number) => void;
  setCompact: (v: boolean) => void;
  setPassthrough: (v: boolean) => void;
  setPinned: (v: boolean) => void;
  hide: () => void;
  close: () => void;
  onStatus: (cb: (status: string) => void) => () => void;
};
declare global {
  interface Window {
    desktop?: DesktopBridge;
    __OFFDUTY__?: { state: GameState | null; playerId: string };
  }
}
