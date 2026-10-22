import { CombatGraphics } from "./CombatGraphics";
import { ensureRigAtlas } from "./RigAtlas";
import { projectileVisual } from "./projectileIdentity";
import { ROLE_BASICS } from "../../shared/basics";
import { PlayerVitals } from "./PlayerVitals";
import { WeaponRibbon } from "./WeaponRibbon";
import { visibleAttack, weaponPose, toolGeometry } from "./joints";
import { ENEMY_DEFS, ATTACK_MOTIONS } from "../../shared/combatProfiles";
import { windupProgress, MovementFacing } from "./actorPose";
import { ensureDamageFont } from "./damageFont";
import { ArticulatedActor } from "./ArticulatedActor";
import {
  GAMEPLAY_MODELS,
  gameplayModel,
  makePaintedAtlas,
} from "./paintedActors";
import {
  makeOfficeBadge,
  makeOfficeWeapon,
  makeOfficeActionAtlas,
} from "./officeHero";
import { AreaRenderer } from "./AreaRenderer";
import { ATTACKS, ATTACK_IDS } from "../../shared/arsenal";
import { editableTarget, gameKeyAction } from "./inputKeys";
import Phaser from "phaser";
import { CombatFX } from "./CombatFX";
import { isBlastWarning } from "../../shared/effects";
import {
  makeMapHD,
  makeHeroAtlas,
  makeEnemyAtlas,
  makeWeapon,
  makeGlow,
  makeCrystal,
  makeRelay,
  makeDrone,
} from "./artHD";
import {
  makeDungeonChunk,
  makeDarkHeroAtlas,
  makeDarkEnemyAtlas,
  ENEMY_ATLAS,
} from "./abyssArt";
import { generateWorld, worldBlocked } from "../../shared/world";
import { predictPosition } from "../renderMotion";
import {
  EMPTY_INPUT,
  MAP_WALLS,
  ROLES,
  EXIT,
  RELAYS,
  SPORE_ZONES,
} from "../../shared/content";
import type {
  GameState,
  Input,
  Settings,
  Role,
  Player,
  Vec,
} from "../../shared/types";
export type SceneBridge = {
  state: GameState | null;
  playerId: string;
  settings: Settings;
  enabled: boolean;
  hidden: boolean;
  metrics: {
    fps: number;
    view?: { x: number; y: number; w: number; h: number };
    positions?: Record<string, Vec>;
  };
  send: (input: Input) => void;
  touch: {
    x: number;
    y: number;
    fire: boolean;
    dash: boolean;
    skill: boolean;
    interact: boolean;
  };
  sound: (kind: string) => void;
};
type Actor = {
  rig?: ArticulatedActor;
  vitals?: PlayerVitals;
  ribbon?: WeaponRibbon;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text | null;
  hp: Phaser.GameObjects.Rectangle;
  hpBg: Phaser.GameObjects.Rectangle;
  weapon: Phaser.GameObjects.Image | null;
  muzzle: Phaser.GameObjects.Image | null;
  x: number;
  y: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  gait: number;
  fire: number;
  skill: number;
  dash: number;
  recoilUntil: number;
  castUntil: number;
  prevHp: number;
  hitUntil: number;
  seen: number;
  depth: number;
  aim: number;
  hitSeq: number;
  failureSeq?: number;
  warned?: boolean;
};
type Item = {
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  bar?: Phaser.GameObjects.Rectangle;
  seen: number;
};
type Float = {
  text: Phaser.GameObjects.BitmapText;
  born: number;
  x: number;
  y: number;
  active: boolean;
};
const color = (s: string) => parseInt(s.slice(1), 16);
export class StationScene extends Phaser.Scene {
  private rigTexture = "joint-atlas-v40";
  private bridge: SceneBridge;
  private map!: Phaser.GameObjects.Image;
  private fx!: CombatGraphics;
  private weather!: CombatGraphics;
  private combatFX!: CombatFX;
  private areaRenderer!: AreaRenderer;
  private actors = new Map<string, Actor>();
  private movementFacing = new MovementFacing();
  private items = new Map<string, Item>();
  private bullets = new Map<number, Phaser.GameObjects.Image>();
  private lastMission = -2;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private held = new Set<string>();
  private pendingSkill = false;
  private pendingDash = false;
  private control: Input = { ...EMPTY_INPUT };
  private inputAt = 0;
  private aimAt = 0;
  private aim = { x: 1, y: 0 };
  private snapshot: GameState | null = null;
  private snapshotAt = 0;
  private snapshotGap = 1 / 30;
  private fresh = false;
  private age = 0;
  private serial = 0;
  private fpsAt = 0;
  private frames = 0;
  private floats: Float[] = [];
  private seenEffects = new Set<number>();
  private trails: { sprite: Phaser.GameObjects.Image; born: number }[] = [];
  private environment: Phaser.GameObjects.Image[] = [];
  private playing = false;
  private ratio = 1;
  private frameNow = 0;
  private dashPredictedUntil = 0;
  private nextDashAt = 0;
  private dashDirection = { x: 0, y: 0 };
  private localDashUntil = 0;
  private chunks: Phaser.GameObjects.Image[] = [];
  private worldSeed = -1;
  private nextFootstep = 0;
  private officeSounds = new Map<number, boolean>();
  private corpses: {
    sprite: Phaser.GameObjects.Sprite | ArticulatedActor;
    born: number;
  }[] = [];
  private previewWorld = generateWorld(774);
  constructor(bridge: SceneBridge) {
    super("station");
    this.bridge = bridge;
  }
  preload() {}
  create() {
    this.playing = !!this.bridge.state && this.bridge.state.phase !== "lobby";
    const add = (key: string, canvas: HTMLCanvasElement) =>
      this.textures.addCanvas(key, canvas)!;
    this.rigTexture = ensureRigAtlas(this);
    const dash = document.createElement("canvas");
    dash.width = 96;
    dash.height = 112;
    const dc = dash.getContext("2d")!;
    dc.fillStyle = "#ecf3df";
    dc.beginPath();
    dc.ellipse(48, 24, 10, 13, 0, 0, Math.PI * 2);
    dc.fill();
    dc.beginPath();
    dc.moveTo(37, 37);
    dc.lineTo(60, 37);
    dc.lineTo(65, 76);
    dc.lineTo(55, 105);
    dc.lineTo(47, 105);
    dc.lineTo(48, 78);
    dc.lineTo(40, 102);
    dc.lineTo(31, 102);
    dc.lineTo(34, 72);
    dc.lineTo(29, 56);
    dc.closePath();
    dc.fill();
    add("dash-silhouette-40", dash);
    // Actor state still keeps an invisible compatibility sprite. Actual enemies are
    // articulated zombies; avoid allocating seven unused full-body atlases.
    for (const k of Object.keys(ENEMY_DEFS)) {
      const placeholder = document.createElement("canvas");
      placeholder.width = 1;
      placeholder.height = 1;
      const texture = add("enemy-" + k, placeholder);
      for (let i = 0; i < 68; i++) texture.add(i, 0, 0, 0, 1, 1);
    }
    add("glow", makeGlow());
    add("crystal", makeOfficeBadge());
    add("relay", makeRelay());
    add("relay-on", makeRelay(true));
    add("drone", makeDrone());
    for (const kind of ["printer", "sprinkler", "cabinet", "shutter"]) {
      const c = document.createElement("canvas");
      c.width = 100;
      c.height = 100;
      const ctx = c.getContext("2d")!;
      ctx.translate(50, 50);
      ctx.fillStyle = "#142b3599";
      ctx.beginPath();
      ctx.ellipse(0, 23, 33, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = kind === "cabinet" ? "#a39576" : "#91aaa8";
      ctx.beginPath();
      ctx.roundRect(-24, -18, 48, 40, 3);
      ctx.fill();
      ctx.strokeStyle = "#304e58";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (kind === "printer") {
        ctx.fillStyle = "#d9dcc8";
        ctx.fillRect(-15, -29, 30, 25);
        ctx.fillStyle = "#3d5861";
        ctx.fillRect(-18, 9, 36, 6);
        ctx.fillStyle = "#a6c49b";
        ctx.fillRect(10, -8, 7, 4);
      }
      if (kind === "cabinet") {
        ctx.strokeStyle = "#5a665a";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.strokeRect(-20, -14 + i * 11, 40, 10);
          ctx.fillStyle = "#c4bc93";
          ctx.fillRect(-4, -10 + i * 11, 8, 2);
        }
      }
      if (kind === "shutter") {
        ctx.strokeStyle = "#597378";
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(-20, -12 + i * 7);
          ctx.lineTo(20, -12 + i * 7);
          ctx.stroke();
        }
      }
      if (kind === "sprinkler") {
        ctx.fillStyle = "#b8ccca";
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#46727d";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(18, 0);
        ctx.moveTo(0, -18);
        ctx.lineTo(0, 18);
        ctx.stroke();
      }
      add("office-" + kind, c);
    }

    const tiny = document.createElement("canvas");
    tiny.width = 16;
    tiny.height = 16;
    const c = tiny.getContext("2d")!;
    c.fillStyle = "#fff";
    c.beginPath();
    c.roundRect(0, 5, 16, 6, 3);
    c.fill();
    add("bullet", tiny);
    const shadow = document.createElement("canvas");
    shadow.width = 80;
    shadow.height = 32;
    const sc = shadow.getContext("2d")!,
      g = sc.createRadialGradient(40, 16, 2, 40, 16, 38);
    g.addColorStop(0, "#071d3199");
    g.addColorStop(1, "#071d3100");
    sc.fillStyle = g;
    sc.fillRect(0, 0, 80, 32);
    add("shadow", shadow);
    this.loadMap(0);
    this.fx = this.add.existing(new CombatGraphics(this)).setDepth(45);
    this.weather = this.add.existing(new CombatGraphics(this)).setDepth(105);
    this.combatFX = new CombatFX(this);
    this.areaRenderer = new AreaRenderer(this);
    this.fit();
    this.scale.on("resize", this.fit, this);
    const clear = () => {
      this.held.clear();
      this.pendingSkill = false;
      this.pendingDash = false;
      this.control = { ...EMPTY_INPUT };
      this.bridge.send({ ...EMPTY_INPUT });
    };
    const down = (e: KeyboardEvent) => {
      if (!this.bridge.enabled || editableTarget(e.target)) return;
      const action = gameKeyAction(e, this.bridge.settings.shiftDash);
      if (action === "hold") {
        e.preventDefault();
        this.held.add(e.code);
        if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code))
          this.movementFacing.press();
      }
      if (action === "dash") {
        e.preventDefault();
        this.pendingDash = true;
      }
      if (action === "skill") {
        e.preventDefault();
        this.pendingSkill = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (
        this.held.delete(e.code) &&
        /^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)
      )
        this.movementFacing.release(performance.now());
    };
    const composing = () => clear();
    const pointer = (e: MouseEvent) => {
      if (e.button === 2 && this.bridge.enabled) {
        e.preventDefault();
        this.pendingDash = true;
      }
    };
    const context = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    window.addEventListener("compositionstart", composing);
    this.game.canvas.addEventListener("mousedown", pointer);
    this.game.canvas.addEventListener("contextmenu", context);
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.setAttribute("inputmode", "none");
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      window.removeEventListener("compositionstart", composing);
      this.game.canvas?.removeEventListener("mousedown", pointer);
      this.game.canvas?.removeEventListener("contextmenu", context);
    });
    // Environment lighting is baked into the furnished floor chunks.
    const font = ensureDamageFont(this);
    for (let i = 0; i < 24; i++) {
      const text = this.add
        .bitmapText(0, 0, font, "", 15)
        .setOrigin(0.5)
        .setDepth(95)
        .setVisible(false);
      this.floats.push({ text, born: 0, x: 0, y: 0, active: false });
    }
  }
  private inputPlugin() {
    return this.input.keyboard!;
  }
  private loadMap(_sector: number) {
    const w =
      this.playing && this.bridge.state
        ? this.bridge.state.world
        : this.previewWorld;
    if (this.worldSeed !== w.seed) {
      for (const chunk of this.chunks) {
        const key = chunk.texture.key;
        chunk.destroy();
        this.textures.remove(key);
      }
      this.chunks = [];
      this.worldSeed = w.seed;
      for (let cy = 0; cy < Math.ceil(w.h / 512); cy++)
        for (let cx = 0; cx < Math.ceil(w.w / 512); cx++) {
          const key = `dungeon-${w.seed}-${cx}-${cy}`;
          this.textures.addCanvas(key, makeDungeonChunk(w, cx, cy));
          this.chunks.push(
            this.add
              .image(cx * 512, cy * 512, key)
              .setOrigin(0)
              .setDisplaySize(512, 512)
              .setDepth(0),
          );
        }
    }
    this.cameras.main.setBounds(0, 0, w.w, w.h);
  }
  private fit() {
    const w = this.scale.width,
      h = this.scale.height,
      css = this.game.canvas.getBoundingClientRect().width || w;
    this.ratio = w / css;
    this.cameras.main
      .setViewport(0, 0, w, h)
      .setZoom(
        (this.playing ? (this.bridge.settings.compact ? 0.86 : 0.82) : 0.68) *
          this.ratio,
      );
    if (!this.playing)
      this.cameras.main.centerOn(
        this.previewWorld.spawn.x + 480,
        this.previewWorld.spawn.y + 120,
      );
  }
  private actor(id: string, texture: string, name?: string) {
    const shadow = this.add
        .image(0, 0, "shadow")
        .setDisplaySize(54, 22)
        .setDepth(12),
      sprite = this.add.sprite(0, 0, texture, 0).setScale(0.5);
    const text =
      name !== undefined
        ? this.add
            .text(0, 0, name, {
              fontFamily: '"Microsoft YaHei",sans-serif',
              fontSize: "11px",
              color: "#eee5d2",
              stroke: "#211e2b",
              strokeThickness: 3,
              resolution: 2,
            })
            .setOrigin(0.5)
            .setDepth(80)
        : null;
    const hpBg = this.add
        .rectangle(0, 0, 34, 4, 0x163749, 0.95)
        .setOrigin(0, 0.5)
        .setDepth(78),
      hp = this.add
        .rectangle(0, 0, 34, 3, 0xb9ef82)
        .setOrigin(0, 0.5)
        .setDepth(79);
    const a: Actor = {
      sprite,
      shadow,
      name: text,
      hp,
      hpBg,
      weapon: null,
      muzzle: null,
      x: NaN,
      y: NaN,
      sx: NaN,
      sy: NaN,
      vx: 0,
      vy: 0,
      gait: 0,
      fire: 0,
      skill: 0,
      dash: 0,
      recoilUntil: 0,
      castUntil: 0,
      prevHp: 0,
      hitUntil: 0,
      seen: this.serial,
      depth: 0,
      aim: 0,
      hitSeq: 0,
    };
    this.actors.set(id, a);
    return a;
  }
  private position(a: Actor, p: Vec, dt: number, local = false) {
    if (this.fresh) {
      const displacement = Math.hypot(p.x - a.sx, p.y - a.sy);
      a.vx = displacement < 70 ? (p.x - a.sx) / this.snapshotGap : 0;
      a.vy = displacement < 70 ? (p.y - a.sy) / this.snapshotGap : 0;
      a.sx = p.x;
      a.sy = p.y;
    }
    if (!Number.isFinite(a.x) || Math.hypot(p.x - a.x, p.y - a.y) > 140) {
      a.x = p.x;
      a.y = p.y;
    }
    if (local && this.bridge.enabled) {
      const me = p as Player,
        move = predictPosition(
          { x: a.x, y: a.y },
          this.frameNow < this.localDashUntil
            ? { x: this.dashDirection.x * 760, y: this.dashDirection.y * 760 }
            : { x: this.control.x * me.speed, y: this.control.y * me.speed },
          dt / 1000,
          this.bridge.state?.world,
        );
      a.x = move.x;
      a.y = move.y;
      const target = predictPosition(
          p,
          { x: this.control.x * me.speed, y: this.control.y * me.speed },
          this.age + 0.018,
          this.bridge.state?.world,
        ),
        error = Math.hypot(target.x - a.x, target.y - a.y),
        f = 1 - Math.exp(-dt / 95);
      if (error > 3 && this.frameNow > this.dashPredictedUntil) {
        a.x += (target.x - a.x) * f;
        a.y += (target.y - a.y) * f;
      }
    } else {
      const target = predictPosition(
        p,
        { x: a.vx, y: a.vy },
        this.age,
        this.bridge.state?.world,
      );
      const f = 1 - Math.exp(-dt / 14);
      a.x += (target.x - a.x) * f;
      a.y += (target.y - a.y) * f;
    }
  }
  update(time: number, delta: number) {
    this.frameNow = time;
    const dt = Math.min(delta, 40);
    if (!this.fpsAt) this.fpsAt = time;
    this.frames++;
    if (time - this.fpsAt >= 1000) {
      this.bridge.metrics.fps = Math.round(
        (this.frames * 1000) / (time - this.fpsAt),
      );
      this.fpsAt = time;
      this.frames = 0;
    }
    const s = this.bridge.state,
      active = !!s && s.phase !== "lobby";
    this.serial++;
    if (active !== this.playing) {
      this.playing = active;
      this.fit();
    }
    this.fresh = !!s && s !== this.snapshot;
    if (s && this.fresh) {
      this.snapshotGap = this.snapshot
        ? Math.max(
            1 / 90,
            Math.min(0.12, s.elapsed - this.snapshot.elapsed || 1 / 30),
          )
        : 1 / 30;
      this.snapshot = s;
      this.snapshotAt = performance.now();
    }
    this.age = Math.min(0.075, (performance.now() - this.snapshotAt) / 1000);
    const t = time / 1000;
    const mission = active ? s!.world.seed : -1;
    if (this.lastMission !== mission) {
      this.lastMission = mission;
      this.loadMap(active ? s!.world.theme : 0);
      this.seenEffects.clear();
    }
    const self = s?.players.find((p) => p.id === this.bridge.playerId);
    const me =
      self ||
      s?.players.filter((p) => p.alive)[
        Math.floor(time / 12000) %
          Math.max(1, s.players.filter((p) => p.alive).length)
      ];
    if (active && s) this.readInput(time, me, s);
    this.environment.forEach((light, i) => {
      light.setAlpha(
        this.bridge.settings.lowMotion
          ? 0.1
          : 0.13 + Math.sin(t * 1.4 + i) * 0.07,
      );
    });
    if (active && s) {
      for (const p of s.players) this.drawPlayer(p, time, dt);
      for (const e of s.enemies) this.drawEnemy(e, time, dt);
      this.weather.clear();
      if (s.mode === "survival" && !this.bridge.settings.lowMotion) {
        const v = this.cameras.main.worldView;
        this.weather.lineStyle(1, 0xb6cbd0, 0.13);
        for (let i = 0; i < 32; i++) {
          const x =
              v.x + ((((i * 83 - time * 0.025) % v.width) + v.width) % v.width),
            y = v.y + ((i * 137 + time * 0.55) % v.height);
          this.weather.lineBetween(x, y, x - 3, y + 17);
        }
      }
      this.drawPickups(s, time);
      this.drawBullets(s);
      this.drawObjectives(s, time);
      this.drawEffects(s, time);
      this.areaRenderer.draw(
        s,
        time,
        (id) => {
          const a = this.actors.get(id);
          return a ? { x: a.x, y: a.y } : undefined;
        },
        this.bridge.settings.lowMotion,
      );
      if (me) {
        const a = this.actors.get(me.id);
        if (a) {
          const camera = this.cameras.main,
            targetX = Math.max(
              camera.displayWidth / 2,
              Math.min(s.world.w - camera.displayWidth / 2, a.x),
            ),
            targetY = Math.max(
              camera.displayHeight / 2,
              Math.min(s.world.h - camera.displayHeight / 2, a.y),
            );
          const f = 1 - Math.exp(-dt / 95);
          camera.centerOn(
            camera.midPoint.x + (targetX - camera.midPoint.x) * f,
            camera.midPoint.y + (targetY - camera.midPoint.y) * f,
          );
        }
      }
    } else {
      const roles = Object.keys(ROLES) as Role[];
      for (let i = 0; i < 4; i++) {
        const p = {
          id: "preview" + i,
          name: ROLES[roles[i]].name,
          role: roles[i],
          x:
            this.previewWorld.spawn.x +
            60 +
            i * 75 +
            Math.sin(t * 0.34 + i) * 18,
          y: this.previewWorld.spawn.y + Math.cos(t * 0.31 + i) * 18,
          hp: 100,
          maxHp: 100,
          alive: true,
          connected: true,
          angle: t * 0.32 + i,
          color: ROLES[roles[i]].color,
          fireCd: 0,
          skillCd: 0,
          dashCd: 0,
          attackSeq: 0,
          skillSeq: 0,
          dashTime: 0,
          upgrades: [],
          shield: 0,
          invulnerable: 0,
        } as unknown as Player;
        this.drawPlayer(p, time, dt, true);
      }
      this.drawObjectives(null, time);
      for (let i = 0; i < 3; i++) {
        const pos = [
          { x: 453, y: 346 },
          { x: 813, y: 345 },
          { x: 960, y: 575 },
        ][i];
        this.item(
          "preview-crystal" + i,
          "crystal",
          pos.x,
          pos.y,
          18,
          22,
        ).sprite.setY(pos.y + Math.sin(t * 2 + i) * 3);
      }
    }
    for (const [id, a] of this.actors)
      if (a.seen !== this.serial) this.destroyActor(id, a);
    for (const [id, item] of this.items)
      if (item.seen !== this.serial) {
        item.sprite.destroy();
        item.glow?.destroy();
        item.label?.destroy();
        item.bar?.destroy();
        this.items.delete(id);
      }
    this.corpses = this.corpses.filter((c) => {
      const life = (time - c.born) / 680;
      if (life >= 1) {
        c.sprite.destroy();
        return false;
      }
      if (c.sprite instanceof ArticulatedActor) c.sprite.fall(time, c.born);
      else
        c.sprite
          .setFrame(48 + Math.min(19, Math.floor(life * 20)))
          .setAlpha(1 - life * 0.6);
      return true;
    });
    const camera = this.cameras.main;
    this.bridge.metrics.view = {
      x: camera.midPoint.x - camera.displayWidth / 2,
      y: camera.midPoint.y - camera.displayHeight / 2,
      w: camera.displayWidth,
      h: camera.displayHeight,
    };
    const positions: Record<string, Vec> = {};
    for (const p of s?.players || []) {
      const a = this.actors.get(p.id);
      if (a) positions[p.id] = { x: a.x, y: a.y };
    }
    this.bridge.metrics.positions = positions;
    this.combatFX.update(time);
    for (const f of this.floats)
      if (f.active) {
        const age = (time - f.born) / 1000;
        if (age > 0.75) {
          f.active = false;
          f.text.setVisible(false);
        } else
          f.text
            .setPosition(f.x + Math.sin(f.born) * age * 10, f.y - 34 * age)
            .setAlpha(Math.min(1, (0.75 - age) * 4));
      }
    for (const trail of this.trails) {
      const age = (time - trail.born) / 230;
      trail.sprite.setAlpha(Math.max(0, 0.35 * (1 - age)));
    }
    this.trails = this.trails.filter((tr) => {
      if (time - tr.born > 230) {
        tr.sprite.destroy();
        return false;
      }
      return true;
    });
  }
  private ensureRole(role: Role) {
    if (this.textures.exists("hero-" + role)) return;
    // Actual bodies live in the joint atlas; the hidden compatibility sprite needs no 192-frame painted atlas.
    const placeholder = document.createElement("canvas");
    placeholder.width = 1;
    placeholder.height = 1;
    const atlas = this.textures.addCanvas("hero-" + role, placeholder)!;
    for (let i = 0; i < 192; i++) atlas.add(i, 0, 0, 0, 1, 1);
  }

  private ensureAction(role: Role, rescue: boolean) {
    const key = (rescue ? "assist-" : "action-") + role;
    if (this.textures.exists(key)) return key;
    const atlas = this.textures.addCanvas(
      key,
      this.textures.exists("painted-" + gameplayModel(role))
        ? makePaintedAtlas(
            this.textures
              .get("painted-" + gameplayModel(role))
              .getSourceImage() as HTMLImageElement,
            role,
            rescue ? "assist" : "cast",
          )
        : makeOfficeActionAtlas(role, rescue),
    )!;
    for (let d = 0; d < 8; d++)
      for (let f = 0; f < 16; f++)
        atlas.add(d * 16 + f, 0, f * 96, d * 112, 96, 112);
    return key;
  }
  private drawPlayer(p: Player, time: number, dt: number, preview = false) {
    this.ensureRole(p.role);
    let a = this.actors.get(p.id);
    if (!a) {
      a = this.actor(p.id, "hero-" + p.role, p.name);
      a.weapon = this.add
        .image(0, 0, this.rigTexture, "tool-pulse")
        .setScale(0.5)
        .setOrigin(0.22, 0.5);
      a.muzzle = this.add
        .image(0, 0, "glow")
        .setScale(0.38)
        .setTint(color(p.color))
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false);
      a.prevHp = p.hp;
      a.vitals = new PlayerVitals(this, p.id);
      a.ribbon = new WeaponRibbon(this, p.id);
    }
    if (!a.rig || a.rig.role !== p.role) {
      a.rig?.destroy();
      a.rig = new ArticulatedActor(this, p.role, p.id).setDepth(a.depth);
    }
    a.seen = this.serial;
    const px = a.x,
      py = a.y;
    this.position(a, p, dt, p.id === this.bridge.playerId && p.alive);
    const travel = Number.isFinite(px) ? Math.hypot(a.x - px, a.y - py) : 0,
      moving = travel > 0.02;
    a.gait += Math.min(travel, 6) * 0.29;
    if (moving && p.id === this.bridge.playerId && time > this.nextFootstep) {
      this.nextFootstep = time + 285;
      this.bridge.sound("step");
    }
    const actionAge =
      (this.bridge.state?.elapsed || 0) +
      this.age -
      (p.attackMotion?.at ?? -999);
    const actionLocked =
      !preview &&
      p.attackMotion?.source === "basic" &&
      actionAge >= 0 &&
      actionAge < ATTACK_MOTIONS[p.attackMotion.id].duration / 1000;
    const targetFacing = actionLocked
      ? p.attackMotion!.angle
      : p.id === this.bridge.playerId && !preview
        ? Math.atan2(this.control.aimY, this.control.aimX)
        : p.angle;
    a.aim = Phaser.Math.Angle.RotateTo(a.aim, targetFacing, dt * 0.022);
    const facing = a.aim,
      dir = (Math.round(facing / (Math.PI / 4)) + 8) % 8,
      frame =
        dir * 24 +
        (moving ? Math.floor(a.gait) % 24 : Math.floor(time / 95) % 24);
    a.sprite
      .setTexture(
        !moving && this.textures.exists("idle-" + p.role)
          ? "idle-" + p.role
          : "hero-" + p.role,
        frame,
      )
      .setScale(
        0.68 * (p.dashTime > 0 ? 1.08 : 1),
        0.68 * (p.dashTime > 0 ? 0.94 : 1),
      )
      .setPosition(
        a.x,
        a.y - 10 + (moving ? 0 : Math.sin(time * 0.002 + p.x) * 1.3),
      )
      .setAngle(
        p.alive ? (moving ? 0 : Math.sin(time * 0.0014 + p.x) * 0.7) : 80,
      )
      .setAlpha(!p.connected ? 0.35 : 1);
    a.sprite.setVisible(false);
    const depth = 20 + a.y * 0.005;
    if (a.depth !== depth) {
      a.depth = depth;
      a.sprite.setDepth(depth);
      a.rig?.setDepth(depth);
      a.weapon?.setDepth(depth + 1);
      a.muzzle?.setDepth(depth + 2);
    }
    a.shadow.setPosition(a.x, a.y + 12).setAlpha(p.alive ? 0.8 : 0.4);
    if (
      !a.rig &&
      p.alive &&
      p.interaction?.type === "revive" &&
      p.interaction.status === "charging"
    ) {
      const key = this.ensureAction(p.role, true);
      a.sprite.setTexture(key, dir * 16 + (Math.floor(time / 40) % 16));
    } else if (
      !a.rig &&
      p.alive &&
      (time < a.recoilUntil || time < a.castUntil)
    ) {
      const key = this.ensureAction(p.role, false),
        phase =
          time < a.recoilUntil
            ? 1 - Math.max(0, (a.recoilUntil - time) / 115)
            : 1 - Math.max(0, (a.castUntil - time) / 650);
      a.sprite.setTexture(key, dir * 16 + Math.min(15, Math.floor(phase * 16)));
    }

    if (this.fresh && p.attackSeq !== a.fire) {
      a.recoilUntil = time + 115;
    }
    if (this.fresh && p.skillSeq !== a.skill) {
      a.castUntil = time + 650;
    }
    if (
      (p.dashTime > 0 ||
        (p.id === this.bridge.playerId && time < this.localDashUntil)) &&
      time - a.dash > 24
    ) {
      a.dash = time;
      for (let i = 1; i <= 1; i++) {
        const sp = this.add
          .image(
            a.x - Math.cos(facing) * i * 15,
            a.y - 10 - Math.sin(facing) * i * 15,
            "dash-silhouette-40",
          )
          .setScale(0.68)
          .setTint(color(p.color))
          .setDepth(depth - 1)
          .setAlpha(0.2);
        this.trails.push({ sprite: sp, born: time - i * 18 });
      }
    }
    if (this.fresh) {
      a.fire = p.attackSeq;
      a.skill = p.skillSeq;
      // Dash trail clock is local and independent from replicated cooldown.
      if (p.hitSeq !== a.hitSeq || p.hp < a.prevHp) {
        a.hitUntil = time + 260;
        if (p.id === this.bridge.playerId)
          this.bridge.sound(p.hitShield ? "shield-hit" : "player-hit");
        if (p.id === this.bridge.playerId && !this.bridge.settings.lowMotion)
          this.cameras.main.shake(85, 0.0017);
      }
      a.hitSeq = p.hitSeq;
      a.prevHp = p.hp;
    }
    if (time < a.hitUntil) {
      a.sprite.setTint(p.hitShield ? 0xb7e0ff : 0xffa9a0);
      const recoil = Math.sin(((a.hitUntil - time) / 260) * Math.PI) * 3;
      a.sprite.x -= Math.cos(p.angle) * recoil;
    } else a.sprite.clearTint();
    a.rig!.setPosition(a.sprite.x, a.sprite.y).setScale(
      0.68 * (p.dashTime > 0 ? 1.08 : 1),
      0.68 * (p.dashTime > 0 ? 0.94 : 1),
    );
    a.rig!.updatePose(
      p,
      facing,
      travel,
      dt,
      time,
      a.recoilUntil,
      a.castUntil,
      preview ? undefined : (this.bridge.state?.elapsed || 0) + this.age,
    );
    a.rig!.tint(time < a.hitUntil ? (p.hitShield ? 0xb7e0ff : 0xffa9a0) : null);
    if (
      p.id === this.bridge.playerId &&
      p.interactionFeedback &&
      p.interactionFeedback.seq !== a.failureSeq
    ) {
      a.failureSeq = p.interactionFeedback.seq;
      if ((this.bridge.state?.elapsed || 0) - p.interactionFeedback.at < 1) {
        this.bridge.sound("failure");
        if (!this.bridge.settings.lowMotion)
          this.cameras.main.shake(100, 0.0012);
      }
    }

    const motion = a.rig!.attackFrame;
    const held = visibleAttack(
      motion,
      p.arsenal || {},
      ROLE_BASICS[p.role].weapon,
    );
    const transform = weaponPose(motion, facing);
    const signatureFrame = a.rig!.castFrame;
    if (signatureFrame) {
      const casting = weaponPose(signatureFrame, facing);
      const delta = Math.atan2(
        Math.sin(casting.rotation - transform.rotation),
        Math.cos(casting.rotation - transform.rotation),
      );
      transform.rotation += delta * a.rig!.castWeight;
      transform.trail =
        a.rig!.castWeight > 0.5 ? casting.trail : transform.trail;
    }
    const hand = a.rig!.handWorld();
    const wx = hand.x;
    const wy = hand.y;
    const geometry = toolGeometry(held || ROLE_BASICS[p.role].weapon);
    const reach = (geometry.tip - geometry.origin * 80) * transform.scale;
    const tipX = wx + Math.cos(transform.rotation) * reach;
    const tipY = wy + Math.sin(transform.rotation) * reach;
    const basicVisual =
      held === ROLE_BASICS[p.role].weapon &&
      (!motion.active || p.attackMotion?.source === "basic");
    a.weapon!.setTexture(
      this.rigTexture,
      basicVisual ? "basic-tool-" + p.role : "tool-" + (held || "pulse"),
    )
      .setOrigin(geometry.origin, 0.5)
      .setPosition(wx, wy)
      .setRotation(transform.rotation)
      .setDepth(depth + (Math.sin(facing) < -0.2 ? -0.3 : 1))
      .setScale(transform.scale)
      .setFlipY(Math.cos(facing) < 0)
      .setVisible(p.alive && !!held)
      .setData("attack", {
        id: held || "",
        phase: motion.progress,
        active: motion.active,
        source: basicVisual ? "basic" : "module",
        handX: hand.x,
        handY: hand.y,
        tipX,
        tipY,
      });
    a.ribbon?.sample(
      tipX,
      tipY,
      p.alive && !!held && transform.trail,
      time,
      held ? color(ATTACKS[held].color) : 0xeac489,
      this.bridge.settings.lowMotion,
      depth + (Math.sin(facing) < -0.2 ? -0.15 : 0.8),
    );
    a.muzzle!.setPosition(tipX, tipY)
      .setVisible(p.alive && held === "pulse" && motion.strike > 0.45)
      .setAlpha(motion.strike * 0.85)
      .setScale(0.32 + motion.strike * 0.2, 0.17 + motion.strike * 0.1);
    if (a.name) {
      const localPlayer = this.bridge.state?.players.find(
        (v) => v.id === this.bridge.playerId,
      );
      const wanted =
        preview ||
        (p.id !== this.bridge.playerId &&
          (!localPlayer ||
            !p.alive ||
            !p.connected ||
            p.hp / p.maxHp < 0.35 ||
            Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y) >
              (a.name.visible ? 90 : 115)));
      const target = wanted ? (p.connected ? 1 : 0.4) : 0;
      const nameAlpha =
        a.name.alpha + (target - a.name.alpha) * (1 - Math.exp(-dt / 90));
      a.name.setVisible(wanted || nameAlpha > 0.02);
      const text = (p.id === this.bridge.playerId ? "你 · " : "") + p.name;
      if (a.name.text !== text) a.name.setText(text);
      if (a.name.style.color !== "#fff2da")
        a.name
          .setColor("#fff2da")
          .setBackgroundColor("#211e2b")
          .setPadding(3, 1);
      a.name.setPosition(a.x, a.y - 77).setAlpha(nameAlpha);
    }
    a.hpBg.setVisible(false);
    a.hp.setVisible(false);
    a.vitals?.setVisible(!preview);
    const shieldBroken = a.vitals?.updatePlayer(
      p,
      a.x,
      a.y,
      time,
      p.id === this.bridge.playerId,
      this.cameras.main.zoom / this.ratio,
      this.bridge.state?.phase === "playing" &&
        this.bridge.state.players.some(
          (player) => player.alive && player.connected,
        ),
    );
    if (shieldBroken && p.id === this.bridge.playerId)
      this.bridge.sound("shield-break");
    if (p.id === this.bridge.playerId && !preview) {
      const ring = this.item("self-ring", "glow", a.x, a.y + 10, 58, 23);
      ring.sprite
        .setTint(color(p.color))
        .setAlpha(0.2)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
    if (
      p.shield > 0 ||
      (["mend", "aegis"].includes(p.ability) && time < a.castUntil)
    ) {
      const bubble = this.item("shield-" + p.id, "glow", a.x, a.y - 8, 78, 78);
      bubble.sprite
        .setTint(color(p.color))
        .setAlpha(
          p.shield > 0 ? 0.19 : Math.max(0, (a.castUntil - time) / 650) * 0.44,
        )
        .setBlendMode(Phaser.BlendModes.ADD);
    }
  }
  private drawEnemy(e: GameState["enemies"][number], time: number, dt: number) {
    const key = "e" + e.id;
    let a = this.actors.get(key);
    if (!a) {
      a = this.actor(key, "enemy-" + e.kind);
      a.sprite.setVisible(false).setActive(false);
    }
    a.seen = this.serial;
    const beforeX = a.x,
      beforeY = a.y;
    if (!a.rig)
      a.rig = new ArticulatedActor(
        this,
        ENEMY_DEFS[e.kind].role as Role,
        key,
        e.kind,
      );
    this.position(a, e, dt);
    const travel = Number.isFinite(beforeX)
      ? Math.hypot(a.x - beforeX, a.y - beforeY)
      : 0;
    a.aim = Phaser.Math.Angle.RotateTo(a.aim, e.angle, dt * 0.015);

    const view = this.cameras.main.worldView,
      onScreen =
        a.x > view.x - 130 &&
        a.x < view.right + 130 &&
        a.y > view.y - 140 &&
        a.y < view.bottom + 140;
    a.rig.setVisible(onScreen);
    a.shadow.setVisible(onScreen);
    if (!onScreen) {
      a.sprite.setVisible(false);
      a.hp.setVisible(false);
      a.hpBg.setVisible(false);
      return;
    }
    const scale = {
      mite: 0.48,
      hound: 0.6,
      shooter: 0.65,
      tank: 0.91,
      wraith: 0.68,
      bomber: 0.73,
      boss: 1.3,
    }[e.kind];
    a.shadow.setPosition(a.x, a.y + 12).setDisplaySize(80 * scale, 30 * scale);
    const depth = 20 + a.y * 0.005,
      windup = e.windup || 0;
    a.depth = depth;
    const hitBack = this.bridge.settings.lowMotion
      ? 0
      : Math.sin(Math.max(0, e.hitFlash / 0.14) * Math.PI) * 3;
    const visualAge =
        (this.bridge.state?.elapsed || 0) +
        this.age -
        (e.attackStartedAt ?? -999),
      punch =
        visualAge >= 0 && visualAge < 0.28
          ? Math.sin((visualAge / 0.28) * Math.PI) *
            (e.kind === "tank" ? 8 : e.kind === "mite" ? 11 : 4)
          : 0;
    a.rig
      .setPosition(
        a.x + Math.cos(e.angle) * (punch - hitBack),
        a.y - 3 + Math.sin(e.angle) * (punch - hitBack),
      )
      .setScale(scale * (windup ? 1.02 : 1));
    if (windup && !a.warned) {
      a.warned = true;
      const me = this.bridge.state?.players.find(
        (p) => p.id === this.bridge.playerId,
      );
      if (me && Math.hypot(me.x - e.x, me.y - e.y) < 330)
        this.bridge.sound("enemy-windup");
    } else if (!windup) a.warned = false;
    if (a.rig.depth !== depth) a.rig.setDepth(depth);
    a.rig.updateEnemy(
      e,
      a.aim,
      travel,
      dt,
      time,
      (this.bridge.state?.elapsed || 0) + this.age,
      this.age,
    );
    a.rig.tint(
      e.hitFlash > 0
        ? 0xffd7bb
        : e.elite === "armored"
          ? 0xcbd5d4
          : (e.slow || 0) > 0
            ? 0x9fcde0
            : null,
    );
    const width = e.kind === "boss" ? 90 : 32,
      y = a.y - 52 * scale,
      visible = e.hp < e.maxHp || e.kind === "boss";
    a.hpBg
      .setPosition(a.x - width / 2, y)
      .setDisplaySize(width, 4)
      .setVisible(visible);
    a.hp
      .setPosition(a.x - width / 2, y)
      .setDisplaySize(width * Math.max(0.001, e.hp / e.maxHp), 3)
      .setFillStyle(e.kind === "boss" ? 0xe4b4df : 0xf0c38d)
      .setVisible(visible);
  }
  private destroyActor(id: string, a: Actor) {
    if (id.startsWith("e") && this.bridge.state?.phase === "playing") {
      if (this.corpses.length >= 28) this.corpses.shift()!.sprite.destroy();
      if (a.rig) {
        this.corpses.push({ sprite: a.rig, born: this.frameNow });
        a.rig = undefined;
        a.sprite.destroy();
      } else {
        a.sprite.setFrame(48).setDepth(14).clearTint();
        this.corpses.push({ sprite: a.sprite, born: this.frameNow });
      }
    } else a.sprite.destroy();
    a.rig?.destroy();
    a.shadow.destroy();
    a.name?.destroy();
    a.hp.destroy();
    a.hpBg.destroy();
    a.vitals?.destroy();
    a.ribbon?.destroy();
    a.weapon?.destroy();
    a.muzzle?.destroy();
    this.actors.delete(id);
  }
  private item(
    key: string,
    texture: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    let item = this.items.get(key);
    if (!item) {
      item = { sprite: this.add.image(x, y, texture), seen: this.serial };
      this.items.set(key, item);
    }
    item.sprite
      .setTexture(texture)
      .setPosition(x, y)
      .setDisplaySize(w, h)
      .setDepth(13);
    item.seen = this.serial;
    return item;
  }
  private drawPickups(s: GameState, time: number) {
    for (const p of s.pickups) {
      const y =
        p.y +
        (this.bridge.settings.lowMotion
          ? 0
          : Math.sin(time * 0.0028 + p.id) * 3.2);
      if (p.kind === "xp") {
        const gem = this.item(
          "pickup-" + p.id,
          "crystal",
          p.x,
          y,
          9 + (p.value || 0) * 0.08,
          13 + (p.value || 0) * 0.08,
        );
        gem.sprite.setTint(0x8a9cb4);
        continue;
      }
      if (p.kind === "crystal") {
        this.item("pickup-" + p.id, "crystal", p.x, y, 25, 31);
        const glow = this.item("pick-glow-" + p.id, "glow", p.x, p.y, 68, 68);
        glow.sprite.setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD);
      } else {
        const heal = this.item("pickup-" + p.id, "relay-on", p.x, y, 25, 30);
        heal.sprite.setTint(0x8fe7db);
      }
    }
  }
  private drawBullets(s: GameState) {
    const seen = new Set<number>();
    for (const b of s.bullets) {
      seen.add(b.id);
      let sp = this.bullets.get(b.id);
      if (!sp) {
        sp = this.add
          .image(0, 0, "bullet")
          .setDepth(65)
          .setOrigin(2 / 3, 0.5);
        this.bullets.set(b.id, sp);
      }
      const owner = s.players.find((p) => p.id === b.owner);
      const shape = projectileVisual(b, owner?.role);
      const frame = "projectile-" + shape;
      if (sp.frame.name !== frame || sp.getData("level") !== (b.level || 1)) {
        sp.setTexture(this.rigTexture, frame)
          .setData("level", b.level || 1)
          .setDisplaySize(
            (b.enemy
              ? 23
              : shape === "coin"
                ? 21
                : 26 + Math.min(8, b.level || 1)) * 1.5,
            b.enemy ? 15 : shape === "ricochet" ? 16 : 15,
          )
          .setTint(0xffffff)
          .setAlpha(0.95);
      }
      sp.setPosition(
        b.x + b.vx * this.age,
        b.y + b.vy * this.age - 10,
      ).setRotation(Math.atan2(b.vy, b.vx));
    }
    for (const [id, sp] of this.bullets)
      if (!seen.has(id)) {
        sp.destroy();
        this.bullets.delete(id);
      }
  }
  private drawObjectives(s: GameState | null, time: number) {
    const EXIT = s?.world.exit || { x: 1056, y: 336 };
    const t = time / 1000,
      open = !!s?.exitOpen;
    this.fx.clear();
    if (s?.mode !== "survival") {
      const portal = this.item(
        "portal-light",
        "glow",
        EXIT.x,
        EXIT.y,
        110,
        135,
      );
      portal.sprite
        .setTint(open ? 0xb9ef82 : 0x7ed8d0)
        .setAlpha(open ? 0.65 : 0.23)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.fx
        .lineStyle(7, 0x648e90, 0.8)
        .strokeEllipse(EXIT.x, EXIT.y, 68, 91, 40);
      this.fx
        .lineStyle(2, open ? 0xc8f8b1 : 0x95d9ce, 0.8)
        .strokeEllipse(EXIT.x, EXIT.y, 57, 80, 32);
      for (let i = 0; i < 4; i++) {
        const a = t * 0.65 + (i * Math.PI) / 2;
        this.fx
          .fillStyle(open ? 0xe0f7b7 : 0xa5e8d4, 0.9)
          .fillCircle(
            EXIT.x + Math.cos(a) * 29,
            EXIT.y + Math.sin(a) * 39,
            2.4,
          );
      }
      if (s && s.exitProgress > 0)
        this.fx
          .lineStyle(4, 0xebf2c3, 0.95)
          .beginPath()
          .arc(
            EXIT.x,
            EXIT.y,
            53,
            -Math.PI / 2,
            -Math.PI / 2 + Math.min(1, s.exitProgress / 1.5) * Math.PI * 2,
            false,
          )
          .strokePath();
    }
    if (s?.mode === "expedition") {
      const label = this.item("exit-label", "glow", EXIT.x, EXIT.y + 68, 1, 1);
      label.sprite.setAlpha(0);
      if (!label.label)
        label.label = this.add
          .text(EXIT.x, EXIT.y + 68, "", {
            fontFamily: '"Microsoft YaHei",sans-serif',
            fontSize: "13px",
            fontStyle: "bold",
            color: "#d9e9b3",
            stroke: "#091219",
            strokeThickness: 5,
            resolution: 2,
          })
          .setOrigin(0.5)
          .setDepth(82);
      const text = s.exitOpen
        ? `▼ 撤离口已开启 · 全员集合 ${Math.round(Math.min(1, s.exitProgress / 1.5) * 100)}%`
        : `撤离口锁定 · 先完成任务 ${s.objective.progress}/${s.objective.target}`;
      if (label.label.text !== text) label.label.setText(text);
      label.label
        .setPosition(EXIT.x, EXIT.y + 66 + Math.sin(t * 2) * 3)
        .setAlpha(s.exitOpen ? 0.8 + Math.sin(t * 4) * 0.2 : 0.6);
    }
    const relays = !s
      ? RELAYS.map((r) => ({ ...r, active: false, charge: 0 }))
      : s.objective.type === "relay"
        ? s.objective.relays
        : [];
    for (let i = 0; i < relays.length; i++) {
      const r = relays[i],
        item = this.item(
          "relay-" + i,
          r.active ? "relay-on" : "relay",
          r.x,
          r.y - 5,
          43,
          52,
        );
      if (!item.label)
        item.label = this.add
          .text(r.x, r.y + 31, "", {
            fontFamily: "Consolas,monospace",
            fontSize: "10px",
            color: "#d8edcd",
            stroke: "#193747",
            strokeThickness: 3,
            resolution: 2,
          })
          .setOrigin(0.5)
          .setDepth(80);
      const label = r.active
        ? "ONLINE"
        : r.charge > 0
          ? Math.floor(r.charge * 100) + "%"
          : "[E] 充能";
      if (item.label.text !== label) item.label.setText(label);
      this.fx
        .lineStyle(1, r.active ? 0xb9ef82 : 0xa9e4df, 0.28)
        .strokeCircle(r.x, r.y, 37);
      if (!r.active && r.charge > 0)
        this.fx
          .lineStyle(3, 0xc3edac, 0.9)
          .beginPath()
          .arc(
            r.x,
            r.y,
            39,
            -Math.PI / 2,
            -Math.PI / 2 + r.charge * Math.PI * 2,
            false,
          )
          .strokePath();
      const glow = this.item("relay-glow" + i, "glow", r.x, r.y - 15, 60, 60);
      glow.sprite
        .setAlpha(0.18 + Math.sin(t * 3 + i) * 0.05)
        .setBlendMode(Phaser.BlendModes.ADD);
    }
    if (s?.objective.type === "escort") {
      const d = s.objective.drone;
      this.item("drone", "drone", d.x, d.y + Math.sin(t * 3) * 1.5, 55, 50);
      this.fx.lineStyle(1, 0x83cfdb, 0.2).strokeCircle(d.x, d.y, 125);
      for (let i = 0; i < 3; i++) {
        const x = d.x + 45 + i * 14;
        this.fx
          .lineStyle(2, 0xa5d8ce, 0.4)
          .lineBetween(x, d.y - 4, x + 5, d.y)
          .lineBetween(x + 5, d.y, x, d.y + 4);
      }
    }
    if (s && s.event.kind === "fog") {
      const phase = s.stageTime % 9;
      if (phase > 4)
        for (const z of s.world.points.filter((_, i) => i % 4 === 2)) {
          const active = phase > 6;
          this.fx
            .fillStyle(active ? 0x838d65 : 0xc8aa64, active ? 0.15 : 0.06)
            .fillCircle(z.x, z.y, 115);
          this.fx
            .lineStyle(2, active ? 0xa7ac7f : 0xe1bc79, 0.55)
            .strokeCircle(z.x, z.y, 115);
        }
    }
    if (s) {
      for (const obj of s.objects) {
        if (obj.used) continue;
        const marker = this.item(
          "object-" + obj.id,
          obj.kind === "fountain"
            ? "relay-on"
            : obj.kind === "shrine"
              ? "crystal"
              : "relay",
          obj.x,
          obj.y,
          obj.kind === "shrine" ? 29 : 38,
          obj.kind === "shrine" ? 44 : 43,
        );
        marker.sprite.setTint(
          obj.kind === "shrine"
            ? 0xb28aaa
            : obj.kind === "fountain"
              ? 0x97bbb0
              : 0xcbb684,
        );
        if (!marker.label)
          marker.label = this.add
            .text(obj.x, obj.y + 31, "E · " + obj.label, {
              fontFamily: '"Microsoft YaHei",sans-serif',
              fontSize: "10px",
              color: "#d1b88c",
              stroke: "#10151d",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(81);
        const local =
          s.players.find((p) => p.id === this.bridge.playerId) || s.players[0];
        marker.label.setVisible(
          !!local && Math.hypot(local.x - obj.x, local.y - obj.y) < 280,
        );
      }
    }
    for (const p of s?.players || []) {
      const ch = p.interaction;
      if (!ch) continue;
      this.fx
        .lineStyle(2, ch.status === "blocked" ? 0xd68e76 : 0xc7db9a, 0.8)
        .beginPath()
        .arc(
          ch.targetX,
          ch.targetY,
          36,
          -Math.PI / 2,
          -Math.PI / 2 +
            Math.max(
              0.015,
              ch.status === "charging"
                ? Math.min(
                    0.98,
                    ch.progress +
                      this.age *
                        (ch.type === "object"
                          ? 1 / 0.7
                          : ch.type === "relay"
                            ? 0.14
                            : (p.role === "medic" ? 1.5 : 1) / 2.7),
                  )
                : ch.progress,
            ) *
              Math.PI *
              2,
        )
        .strokePath();
    }
    for (const prop of s?.officeProps || []) {
      const item = this.item(
        "office-" + prop.id,
        "office-" + prop.kind,
        prop.x,
        prop.y +
          (prop.active && (prop.kind === "cabinet" || prop.kind === "shutter")
            ? 50
            : 0),
        prop.kind === "shutter" && prop.active ? 94 : 44,
        44,
      );
      item.sprite
        .setAlpha(prop.cd && !prop.active ? 0.5 : 1)
        .setAngle(prop.kind === "cabinet" && prop.active ? 90 : 0);
      if (!item.label)
        item.label = this.add
          .text(prop.x, prop.y + 31, "", {
            fontFamily: "Microsoft YaHei",
            fontSize: "9px",
            color: "#e1d9b5",
            stroke: "#142a35",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(83);
      const text = prop.active
        ? `${prop.label.split("：")[0]} ${Math.ceil(prop.active)}s`
        : prop.cd
          ? `冷却 ${Math.ceil(prop.cd)}s`
          : `E · ${prop.label}`;
      if (item.label.text !== text) item.label.setText(text);
      if (prop.active && !this.officeSounds.get(prop.id))
        this.bridge.sound(prop.kind === "printer" ? "printer" : "skill");
      this.officeSounds.set(prop.id, !!prop.active);
      const local =
        s?.players.find((p) => p.id === this.bridge.playerId) || s?.players[0];
      item.label.setVisible(
        !!local && Math.hypot(local.x - prop.x, local.y - prop.y) < 300,
      );
      if (prop.kind === "sprinkler" && prop.active) {
        this.fx.lineStyle(1, 0xa7d5dc, 0.4).strokeCircle(prop.x, prop.y, 170);
        for (let i = 0; i < 10; i++) {
          const a = time * 0.001 + (i * Math.PI) / 5;
          this.fx
            .lineStyle(1, 0xb6d8dc, 0.45)
            .lineBetween(
              prop.x + Math.cos(a) * 50,
              prop.y + Math.sin(a) * 50,
              prop.x + Math.cos(a) * 155,
              prop.y + Math.sin(a) * 155,
            );
        }
      }
    }
    for (const noise of s?.noises || []) {
      if (noise.life < 2 || noise.radius < 600) continue;
      this.fx
        .lineStyle(1, 0xd0b882, 0.22)
        .strokeCircle(noise.x, noise.y, 30 + Math.sin(time * 0.004) * 5);
      const tag = this.item(
        "noise-" + noise.id,
        "glow",
        noise.x,
        noise.y,
        1,
        1,
      );
      tag.sprite.setAlpha(0);
      if (!tag.label)
        tag.label = this.add
          .text(noise.x, noise.y - 42, "🔊 " + noise.label, {
            fontFamily: "Microsoft YaHei",
            fontSize: "9px",
            color: "#d8ca9c",
            stroke: "#183340",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(83);
    }
    for (const ping of s?.pings || []) {
      this.fx
        .lineStyle(2, ping.kind === "danger" ? 0xe49b79 : 0xb8d3ba, 0.85)
        .strokeCircle(ping.x, ping.y, 24 + Math.sin(time * 0.006) * 4);
      const label = this.item(
        "ping-label-" + ping.id,
        "glow",
        ping.x,
        ping.y,
        1,
        1,
      );
      label.sprite.setAlpha(0);
      if (!label.label)
        label.label = this.add
          .text(
            ping.x,
            ping.y - 36,
            `${ping.name} · ${ping.kind === "danger" ? "危险" : ping.kind === "supply" ? "补给" : "集合"}`,
            {
              fontFamily: "Microsoft YaHei",
              fontSize: "11px",
              color: "#ece0bd",
              stroke: "#123140",
              strokeThickness: 4,
            },
          )
          .setOrigin(0.5)
          .setDepth(85);
    }
    const me = s?.players.find((p) => p.id === this.bridge.playerId),
      actor = me ? this.actors.get(me.id) : null;
    if (me && actor && !me.alive) {
      this.fx.lineStyle(2, 0xf2b697, 0.8).strokeCircle(actor.x, actor.y, 29);
      this.fx
        .fillStyle(0xfbd0b2)
        .fillRect(actor.x - 2, actor.y - 7, 4, 14)
        .fillRect(actor.x - 7, actor.y - 2, 14, 4);
    }
    if (me && actor && s?.exitOpen) {
      const angle = Math.atan2(EXIT.y - actor.y, EXIT.x - actor.x),
        x = actor.x + Math.cos(angle) * 50,
        y = actor.y + Math.sin(angle) * 50;
      this.fx
        .fillStyle(0xd5f8bc, 0.9)
        .fillTriangle(
          x + Math.cos(angle) * 7,
          y + Math.sin(angle) * 7,
          x + Math.cos(angle + 2.5) * 7,
          y + Math.sin(angle + 2.5) * 7,
          x + Math.cos(angle - 2.5) * 7,
          y + Math.sin(angle - 2.5) * 7,
        );
    }
  }
  private drawEffects(s: GameState, time: number) {
    for (const enemy of s.enemies) {
      const actor = this.actors.get("e" + enemy.id);
      if (!actor || !actor.rig?.visible) continue;
      if ((enemy.windup || 0) > 0) {
        const p = windupProgress(
            enemy.windup!,
            enemy.windupTotal || ENEMY_DEFS[enemy.kind].windup,
            this.age,
          ),
          height = enemy.kind === "boss" ? 95 : enemy.kind === "tank" ? 66 : 49;
        const x = actor.x,
          y = actor.y - height;
        this.fx
          .lineStyle(2.5, 0xffd08e, 0.7 + p * 0.3)
          .lineBetween(x, y - 6, x, y + 1)
          .fillStyle(0xffd08e, 0.8)
          .fillCircle(x, y + 6, 1.8);
        this.fx
          .lineStyle(1.4, 0xd68b5b, 0.75)
          .strokeCircle(x, y, 13)
          .lineStyle(2, 0xffdc99, 1)
          .beginPath()
          .arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false)
          .strokePath();
        const light = this.item(
          "enemy-charge-" + enemy.id,
          "glow",
          actor.x + Math.cos(enemy.angle) * 13,
          actor.y - 15,
          35,
          35,
        );
        light.sprite
          .setTint(
            enemy.kind === "bomber"
              ? 0xe78b5c
              : enemy.kind === "shooter"
                ? 0xbdcf84
                : 0xffcc79,
          )
          .setAlpha(0.13 + p * 0.22)
          .setDepth(28 + actor.y * 0.005);
      }
      const attackAge = s.elapsed + this.age - (enemy.attackStartedAt ?? -999);
      if (attackAge >= 0 && attackAge < 0.32) {
        const t = attackAge / 0.32,
          a = 1 - t,
          angle = enemy.angle,
          dx = Math.cos(angle),
          dy = Math.sin(angle),
          x = actor.x + dx * 22,
          y = actor.y - 19 + dy * 13;
        if (enemy.kind === "tank") {
          this.fx
            .lineStyle(2.5, 0xd9bc85, a * 0.8)
            .strokeEllipse(x, y + 13, 22 + t * 80, 9 + t * 27);
          for (const side of [-1, 1])
            this.fx
              .lineStyle(3, 0xffdc9d, a)
              .lineBetween(
                x - dy * side * 9,
                y + dx * side * 9 - 9 * (1 - t),
                x - dy * side * 9 + dx * 13 * t,
                y + dx * side * 9 + 12 * t,
              );
        } else if (enemy.kind === "shooter") {
          for (let i = 0; i < 5; i++) {
            const spread = (i - 2) * 0.22,
              r = 8 + t * (18 + i * 2);
            this.fx
              .fillStyle(i % 2 ? 0xd6df9c : 0x96ad64, a)
              .fillEllipse(
                x + Math.cos(angle + spread) * r,
                y + Math.sin(angle + spread) * r,
                3 + t * 3,
                2 + t * 2,
              );
          }
        } else if (enemy.kind === "wraith" || enemy.kind === "boss") {
          for (let i = 0; i < 3; i++)
            this.fx
              .lineStyle(
                1.8,
                enemy.kind === "wraith" ? 0xc7a9c1 : 0xe3c693,
                a * (1 - i * 0.18),
              )
              .beginPath()
              .arc(x, y, 9 + t * 35 + i * 7, angle - 0.9, angle + 0.9, false)
              .strokePath();
        } else if (enemy.kind !== "bomber") {
          for (let i = -1; i <= 1; i++) {
            const ox = -dy * i * 5,
              oy = dx * i * 5;
            this.fx
              .lineStyle(1.8, 0xe6d1a4, a)
              .lineBetween(
                x + ox - dx * 7,
                y + oy - dy * 7,
                x + ox + dx * (12 + t * 13),
                y + oy + dy * (12 + t * 13),
              );
          }
        }
      }
    }
    for (const e of s.effects) {
      const life = Math.max(0, e.life - this.age),
        f = 1 - life / e.maxLife;
      if (life <= 0) continue;
      const view = this.cameras.main.worldView,
        pad = Math.max(180, e.size || 0);
      const offscreen =
        e.x + pad < view.x ||
        e.x - pad > view.right ||
        e.y + pad < view.y ||
        e.y - pad > view.bottom;
      if (offscreen) {
        this.seenEffects.add(e.id);
        continue;
      }
      const crowded = s.effects.length > 65;
      if (
        crowded &&
        e.kind === "hit" &&
        e.id % 3 !== 0 &&
        !e.critical &&
        e.owner !== "enemy"
      ) {
        this.seenEffects.add(e.id);
        continue;
      }
      if (isBlastWarning(e)) {
        const x = e.toX ?? e.x,
          y = e.toY ?? e.y;
        this.fx.lineStyle(2, 0xec8a6a, 0.55 + f * 0.4).strokeCircle(x, y, 118);
        this.fx.fillStyle(0xc45e49, 0.035 + f * 0.08).fillCircle(x, y, 118);
        this.fx
          .lineStyle(2, 0xffd1a1, 0.55)
          .beginPath()
          .arc(x, y, 111, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2, false)
          .strokePath();
      }
      this.combatFX.draw(this.fx, e, time, e.maxLife - life);
      if (e.kind === "rescue") {
        this.fx
          .lineStyle(2, 0xe8a76b, 1 - f)
          .strokeCircle(e.x, e.y, 30 + f * e.size);
      }
      if ((e.kind === "skill" && !e.ability) || e.kind === "heal") {
        const item = this.item(
          "effect-" + e.id,
          "glow",
          e.x,
          e.y,
          e.size * (0.7 + f) * 2,
          e.size * (0.7 + f) * 2,
        );
        item.sprite
          .setTint(color(e.color))
          .setAlpha((1 - f) * 0.38)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.fx
          .lineStyle(2, color(e.color), (1 - f) * 0.65)
          .strokeCircle(e.x, e.y, e.size * f);
      } else if (
        !e.ability &&
        (e.kind !== "hit" || !e.amount) &&
        !["attack", "lightning"].includes(e.kind)
      ) {
        for (let j = 0; j < 4; j++) {
          const a = (j * Math.PI) / 2 + e.id;
          this.fx
            .fillStyle(color(e.color), (1 - f) * 0.8)
            .fillCircle(
              e.x + Math.cos(a) * e.size * f,
              e.y + Math.sin(a) * e.size * f,
              Math.max(1, 2.8 * (1 - f)),
            );
        }
      }
      if (!this.seenEffects.has(e.id)) {
        this.seenEffects.add(e.id);
        this.combatFX.burst(e, time, this.bridge.settings.lowMotion);
        if (e.critical) this.bridge.sound("critical");
        if (e.amount && this.bridge.settings.showDamage) {
          const float =
            this.floats.find((v) => !v.active) ||
            this.floats.reduce((a, b) => (a.born < b.born ? a : b));
          float.active = true;
          float.born = time;
          float.x = e.x;
          float.y = e.y - 25;
          float.text
            .setText(
              (e.owner === "enemy" ? "− " : e.critical ? "暴击! " : "") +
                String(Math.round(e.amount)),
            )
            .setTint(color(e.critical ? "#ffe3a2" : e.color))
            .setFontSize(e.critical ? 22 : 15)
            .setVisible(true)
            .setAlpha(1);
          const own = this.actors.get(this.bridge.playerId)?.vitals;
          if (own?.visible) {
            const b = own.getBounds(),
              pad = float.text.width / 2 + 12;
            if (
              float.x > b.left - pad &&
              float.x < b.right + pad &&
              float.y + 12 > b.top &&
              float.y - 38 < b.bottom
            ) {
              float.x = float.x < own.x ? b.left - pad : b.right + pad;
            }
          }
        }
        if (
          ["death", "collect", "heal", "skill"].includes(e.kind) ||
          (e.kind === "attack" && e.owner === this.bridge.playerId)
        )
          this.bridge.sound(
            e.attackSkill && ["bat", "mop", "wrench"].includes(e.attackSkill)
              ? "melee"
              : e.kind === "attack"
                ? "skill"
                : e.kind,
          );
      }
    }
    for (const p of s.players) {
      if (!p.alive || p.shield <= 0) continue;
      const actor = this.actors.get(p.id);
      if (!actor) continue;
      const r = 31 + Math.sin(time * 0.003) * 1.2;
      this.fx.lineStyle(1.2, 0xa4c9e4, 0.4);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        this.fx.lineBetween(
          actor.x + Math.cos(a) * r,
          actor.y - 7 + Math.sin(a) * r,
          actor.x + Math.cos(a + Math.PI / 3) * r,
          actor.y - 7 + Math.sin(a + Math.PI / 3) * r,
        );
      }
    }
    if (this.seenEffects.size > 400)
      this.seenEffects = new Set(s.effects.map((e) => e.id));
  }
  private readInput(time: number, me: Player | undefined, s: GameState) {
    if (
      !this.bridge.enabled ||
      s.phase !== "playing" ||
      !me?.alive ||
      document.hidden
    ) {
      this.control = { ...EMPTY_INPUT };
      this.held.clear();
      this.pendingSkill = false;
      this.pendingDash = false;
      if (time - this.inputAt > 60) {
        this.bridge.send(this.control);
        this.inputAt = time;
      }
      return;
    }
    const k = this.keys,
      t = this.bridge.touch;
    let x =
        (this.held.has("KeyD") || this.held.has("ArrowRight") ? 1 : 0) -
        (this.held.has("KeyA") || this.held.has("ArrowLeft") ? 1 : 0) +
        t.x,
      y =
        (this.held.has("KeyS") || this.held.has("ArrowDown") ? 1 : 0) -
        (this.held.has("KeyW") || this.held.has("ArrowUp") ? 1 : 0) +
        t.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const ptr = this.input.activePointer;
    let fire = ptr.leftButtonDown() || t.fire;
    if (ptr.leftButtonDown()) {
      // Manual aim and the fire edge must enter the same network packet.
      const pos = ptr.positionToCamera(
        this.cameras.main,
      ) as Phaser.Math.Vector2;
      this.aim = { x: pos.x - me.x, y: pos.y - me.y };
      this.control.fire = fire;
    } else if (time - this.aimAt > 25) {
      this.aimAt = time;
      let nearest: Vec | undefined,
        best = 470 * 470;
      for (const e of s.enemies) {
        const d = (e.x - me.x) ** 2 + (e.y - me.y) ** 2;
        if (d >= best) continue;
        const steps = Math.ceil(Math.sqrt(d) / 22);
        let clear = true;
        for (let j = 1; j < steps; j++) {
          const px = me.x + ((e.x - me.x) * j) / steps,
            py = me.y + ((e.y - me.y) * j) / steps;
          if (worldBlocked(s.world, px, py, 3)) {
            clear = false;
            break;
          }
        }
        if (clear) {
          nearest = e;
          best = d;
        }
      }
      if (
        nearest &&
        (this.bridge.settings.autoFire || t.fire) &&
        !ptr.leftButtonDown()
      ) {
        this.aim = { x: nearest.x - me.x, y: nearest.y - me.y };
        fire = true;
      } else if (len > 0) this.aim = this.movementFacing.sample(x, y, time);
      this.control.fire = fire;
    }
    const al = Math.hypot(this.aim.x, this.aim.y) || 1;
    const old = this.control;
    this.control = {
      x,
      y,
      aimX: this.aim.x / al,
      aimY: this.aim.y / al,
      fire: fire || ((this.bridge.settings.autoFire || t.fire) && old.fire),
      dash: t.dash || this.pendingDash,
      skill: t.skill || this.pendingSkill,
      interact: this.held.has("KeyE") || t.interact,
    };
    if (this.control.dash && me.dashCd <= 0 && time > this.nextDashAt) {
      const actor = this.actors.get(me.id);
      if (actor) {
        const direction =
          Math.hypot(x, y) > 0
            ? { x, y }
            : { x: this.control.aimX, y: this.control.aimY };
        const len = Math.hypot(direction.x, direction.y) || 1;
        this.dashDirection = { x: direction.x / len, y: direction.y / len };
        this.localDashUntil = time + 220;
        this.dashPredictedUntil = time + 310;
        this.nextDashAt =
          time +
          Math.max(
            1400,
            (3 - me.upgrades.filter((u) => u === "speed").length * 0.18) *
              1000 -
              150,
          );
      }
    }
    const changed =
      x !== old.x ||
      y !== old.y ||
      (this.control.dash && !old.dash) ||
      (this.control.skill && !old.skill) ||
      this.control.interact !== old.interact;
    if (time - this.inputAt >= 16 || changed) {
      this.bridge.send(this.control);
      this.inputAt = time;
      t.dash = false;
      t.skill = false;
      this.pendingDash = false;
      this.pendingSkill = false;
    }
  }
}
