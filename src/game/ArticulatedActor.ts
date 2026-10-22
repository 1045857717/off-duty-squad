import Phaser from "phaser";
import type {
  Player,
  Role,
  Enemy,
  EnemyKind,
  AttackId,
} from "../../shared/types";
import {
  ZOMBIE_PARTS,
  ZOMBIE_DESIGNS,
  zombieGeometry,
  zombiePose,
} from "./zombieRig";
import { gameplayModel } from "./paintedActors";
import { directionView, locomotionWeight, windupProgress } from "./actorPose";
import {
  JOINT_PARTS,
  articulatedPose,
  AttackTimeline,
  enemyAttackFrame,
  type AttackFrame,
  rigPartGeometry,
} from "./joints";
import { ensureRigAtlas } from "./RigAtlas";
import { ENEMY_DEFS, SIGNATURE_MOTIONS } from "../../shared/combatProfiles";
type Pose = ReturnType<typeof articulatedPose>;

type Bone = {
  x: number;
  y: number;
  rotation: number;
  sy: number;
  parent: number;
  matrix: Float64Array;
  image: Phaser.GameObjects.Image;
  width: number;
  height: number;
};
const BONE_ORDER = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13];
const ZOMBIE_BONE_ORDER = [...BONE_ORDER, 14];
/** All joint images and props share one GPU texture, including the enemies. */
export class ArticulatedActor extends Phaser.GameObjects.Container {
  readonly role: Role;
  readonly enemyKind?: EnemyKind;
  private parts: readonly { name: string; parent: string }[];
  private model: string;
  private batchJointQuads = false;
  private deathPose: { rotation: number; parts: number[][] } | null = null;
  private geometry(column: number, name: string) {
    return this.enemyKind
      ? zombieGeometry(column, name, this.enemyKind)
      : rigPartGeometry(column, name, this.model);
  }
  private layers: {
    group: Phaser.GameObjects.Container;
    nodes: Map<string, Bone>;
    bones: Bone[];
    images: Map<string, Phaser.GameObjects.Image>;
    dir: number;
  }[] = [];
  private layerIndex = 0;
  private currentDir = -1;
  private changedAt = -999;
  private incomingAlpha = 0;
  private outgoingAlpha = 1;
  private weight = 0;
  private phase = 0;
  private clock = new AttackTimeline();
  attackFrame: AttackFrame = this.clock.sample(undefined, -1, 0);
  private gear: Phaser.GameObjects.Image;
  private blink: Phaser.GameObjects.Image;
  private lastTint: number | null = null;
  private castSeq = -1;
  private castStarted = -9999;
  private diag: Record<string, number | string | boolean> = {};
  pose: Record<string, number | string | boolean> = {};
  constructor(
    scene: Phaser.Scene,
    role: Role,
    id: string,
    enemyKind?: EnemyKind,
  ) {
    super(scene, 0, 0);
    this.role = role;
    this.enemyKind = enemyKind;
    this.parts = enemyKind ? ZOMBIE_PARTS : JOINT_PARTS;
    this.model = enemyKind ? "zombie-" + enemyKind : gameplayModel(role);
    this.name = "rig-" + id;
    this.batchJointQuads =
      !!enemyKind && scene.game.renderer.type === Phaser.WEBGL;
    if (this.batchJointQuads)
      (
        this as unknown as { renderWebGL: ArticulatedActor["renderRigWebGL"] }
      ).renderWebGL = this.renderRigWebGL;
    const key = ensureRigAtlas(scene),
      model = this.model;
    for (let l = 0; l < 2; l++) {
      const group = new Phaser.GameObjects.Container(scene, 0, 0).setAlpha(
          l === 0 ? 1 : 0,
        ),
        nodes = new Map<string, Bone>(),
        images = new Map<string, Phaser.GameObjects.Image>(),
        bones: Bone[] = [];
      for (const part of this.parts) {
        const parent =
            part.parent === "root"
              ? -1
              : this.parts.findIndex((p) => p.name === part.parent),
          pp = parent < 0 ? null : this.geometry(0, part.parent).pivot,
          geometry = this.geometry(0, part.name),
          [px, py] = geometry.pivot,
          [x, y, w, h] = geometry.rect;
        const image = new Phaser.GameObjects.Image(
          scene,
          0,
          0,
          key,
          model + "-0-" + part.name,
        )
          .setOrigin((px - x) / w, (py - y) / h)
          .setDisplaySize(w * 84, h * 105);
        const bone: Bone = {
          x: pp ? (px - pp[0]) * 84 : -42 + px * 84,
          y: pp ? (py - pp[1]) * 105 : -53 + py * 105,
          rotation: 0,
          sy: 1,
          parent,
          matrix: new Float64Array(6),
          image,
          width: w * 84,
          height: h * 105,
        };
        nodes.set(part.name, bone);
        images.set(part.name, image);
        bones.push(bone);
        group.add(image);
      }
      this.add(group);
      this.layers.push({ group, nodes, images, bones, dir: -1 });
    }
    this.gear = new Phaser.GameObjects.Image(
      scene,
      0,
      0,
      key,
      "prop-" + (enemyKind ? "enemy-" + enemyKind : role),
    );
    this.add(this.gear);
    this.blink = new Phaser.GameObjects.Image(
      scene,
      0,
      0,
      key,
      "prop-blink",
    ).setVisible(false);
    this.add(this.blink);
    scene.add.existing(this);
  }
  /** Enemy limb matrices already exist: emit their quads directly through Phaser's
   * normal multi-texture pipeline instead of re-traversing30 Image objects. */
  private renderRigWebGL(
    renderer: Phaser.Renderer.WebGL.WebGLRenderer,
    src: ArticulatedActor,
    camera: Phaser.Cameras.Scene2D.Camera,
    parentMatrix?: Phaser.GameObjects.Components.TransformMatrix,
  ) {
    camera.addToRenderList(src);
    renderer.setBlendMode(
      typeof src.blendMode === "number" && src.blendMode >= 0
        ? src.blendMode
        : Phaser.BlendModes.NORMAL,
    );
    const root = Phaser.GameObjects.GetCalcMatrix(
      src,
      camera,
      parentMatrix,
    ).calc;
    const ra = root.a,
      rb = root.b,
      rc = root.c,
      rd = root.d,
      re = root.e,
      rf = root.f;
    const image = src.layers[0].bones[0].image;
    const pipeline = renderer.pipelines.set(image.pipeline, image);
    renderer.pipelines.preBatch(src);
    const texture = image.frame.glTexture;
    let unit = pipeline.setTexture2D(texture);
    for (const layer of src.layers) {
      const group = layer.group;
      if (!group.visible || group.alpha <= 0) continue;
      const ga = ra * group.scaleX,
        gb = rb * group.scaleX,
        gc = rc * group.scaleY,
        gd = rd * group.scaleY,
        ge = ra * group.x + rc * group.y + re,
        gf = rb * group.x + rd * group.y + rf;
      const tint = Phaser.Renderer.WebGL.Utils.getTintAppendFloatAlpha(
        src.lastTint ?? 0xffffff,
        src.alpha * group.alpha * camera.alpha,
      );
      for (const bone of layer.bones) {
        const m = bone.matrix,
          frame = bone.image.frame;
        const a = ga * m[0] + gc * m[1],
          b = gb * m[0] + gd * m[1],
          c = ga * m[2] + gc * m[3],
          d = gb * m[2] + gd * m[3],
          e = ga * m[4] + gc * m[5] + ge,
          f = gb * m[4] + gd * m[5] + gf;
        const left = -bone.image.originX * bone.width,
          top = -bone.image.originY * bone.height,
          right = left + bone.width,
          bottom = top + bone.height;
        const flushed = pipeline.batchQuad(
          bone.image,
          a * left + c * top + e,
          b * left + d * top + f,
          a * left + c * bottom + e,
          b * left + d * bottom + f,
          a * right + c * bottom + e,
          b * right + d * bottom + f,
          a * right + c * top + e,
          b * right + d * top + f,
          frame.u0,
          frame.v0,
          frame.u1,
          frame.v1,
          tint,
          tint,
          tint,
          tint,
          0,
          texture,
          unit,
        );
        if (flushed) unit = pipeline.setTexture2D(texture);
      }
    }
    renderer.pipelines.postBatch(src);
  }
  private draw(
    aim: number,
    travel: number,
    dt: number,
    time: number,
    pose: Pose,
    assist: boolean,
    alive: boolean,
    connected: boolean,
  ) {
    const { dir } = directionView(aim),
      model = this.model;
    if (dir !== this.currentDir) {
      const outgoing =
        this.layers[0].group.alpha >= this.layers[1].group.alpha ? 0 : 1;
      this.layerIndex = 1 - outgoing;
      this.incomingAlpha = this.layers[this.layerIndex].group.alpha;
      this.outgoingAlpha = this.layers[outgoing].group.alpha;
      this.currentDir = dir;
      this.layers[this.layerIndex].dir = dir;
      this.changedAt = time;
      const view = directionView((dir * Math.PI) / 4);
      for (const part of this.parts) {
        const layer = this.layers[this.layerIndex];
        const geometry = this.geometry(view.column, part.name),
          [px, py] = geometry.pivot,
          [x, y, w, h] = geometry.rect;
        const pp =
          part.parent === "root"
            ? null
            : this.geometry(view.column, part.parent).pivot;
        const bone = layer.nodes.get(part.name)!;
        bone.x = pp ? (px - pp[0]) * 84 : -42 + px * 84;
        bone.y = pp ? (py - pp[1]) * 105 : -53 + py * 105;
        bone.width = w * 84;
        bone.height = h * 105;
        layer.images
          .get(part.name)!
          .setFrame(model + "-" + view.column + "-" + part.name)
          .setOrigin((px - x) / w, (py - y) / h);
      }
    }
    const turn = Math.min(1, (time - this.changedAt) / 75);
    for (let l = 0; l < 2; l++) {
      const layer = this.layers[l],
        view = directionView((layer.dir * Math.PI) / 4),
        active = l === this.layerIndex;
      if (!active && turn >= 1) {
        layer.group.setVisible(false);
        continue;
      }
      layer.group
        .setVisible(true)
        .setAlpha(
          active
            ? this.incomingAlpha + (1 - this.incomingAlpha) * turn
            : this.outgoingAlpha * (1 - turn),
        )
        .setScale(view.flip ? -1 : 1, assist ? 0.86 : 1)
        .setPosition(0, pose.bob);
      for (const part of this.parts)
        layer.nodes.get(part.name)!.rotation = pose[part.name as keyof Pose];
      layer.nodes.get("torso")!.sy = pose.breath;
      this.flattenBones(layer.bones);
    }
    const view = directionView(aim);
    this.gear
      .setPosition(0, pose.bob + Math.sin(aim) * pose.thrust * 0.55)
      .setRotation(pose.torso * 0.7)
      .setScale(view.flip ? -1 : 1, assist ? 0.86 : 1)
      .setVisible(
        this.enemyKind
          ? false
          : view.column < 3 || ["duck", "blametaker"].includes(this.role),
      );
    this.blink
      .setPosition(0, pose.bob)
      .setVisible(
        !this.enemyKind &&
          view.column === 0 &&
          this.role !== "workhorse" &&
          time % 4300 > 4170,
      );
    this.setRotation(alive ? 0 : 1.35).setAlpha(connected ? 1 : 0.35);
    Object.assign(this.diag, {
      phase: this.phase,
      weight: this.weight,
      dir,
      column: view.column,
      leftLeg: pose.leftUpperLeg,
      rightLeg: pose.rightUpperLeg,
      leftArm: pose.leftUpperArm,
      rightArm: pose.rightUpperArm,
      elbow: pose.leftForearm,
      rightElbow: pose.rightForearm,
      knee: pose.leftShin,
      rightKnee: pose.rightShin,
      head: pose.head,
      torso: pose.torso,
      breath: pose.breath,
      parts: this.parts.length,
      model: this.model,
      renderPath: this.batchJointQuads
        ? "joint-quad-batch"
        : "phaser-container",
      jaw: pose.jaw,
      leftHand: pose.leftHand,
      rightHand: pose.rightHand,
      leftFoot: pose.leftFoot,
      rightFoot: pose.rightFoot,
    });
    this.pose = this.diag;
  }
  updatePose(
    p: Player,
    aim: number,
    travel: number,
    dt: number,
    time: number,
    _attackUntil: number,
    _castUntil: number,
    worldElapsed?: number,
  ) {
    this.weight = locomotionWeight(this.weight, travel > 0.02, dt);
    this.phase += (Math.min(travel, 7) * Math.PI * 2) / 84;
    const motion = this.clock.sample(
      p.attackMotion?.id,
      p.attackMotion?.seq ?? -1,
      time,
      worldElapsed === undefined
        ? 0
        : Math.max(0, worldElapsed - (p.attackMotion?.at ?? worldElapsed)) *
            1000,
    );
    this.attackFrame = motion;
    if (p.skillSeq !== this.castSeq) {
      if (this.castSeq >= 0) this.castStarted = time;
      this.castSeq = p.skillSeq;
    }
    const cp = (time - this.castStarted) / 650,
      cast = cp >= 0 && cp < 1 ? Math.sin(cp * Math.PI) : 0,
      assist =
        p.interaction?.type === "revive" && p.interaction.status === "charging";
    const pose = articulatedPose(
      this.phase,
      this.weight,
      time,
      motion,
      0,
      assist,
    );
    const signature = SIGNATURE_MOTIONS[p.ability];
    if (cast > 0) {
      const signatureFrame: AttackFrame = {
        id: undefined,
        kind: signature,
        active: true,
        progress: cp,
        windup:
          Math.sin((Math.min(1, cp / 0.28) * Math.PI) / 2) *
          (1 - Math.max(0, (cp - 0.28) / 0.2)),
        strike: Math.sin(
          Math.max(0, Math.min(1, (cp - 0.22) / 0.55)) * Math.PI,
        ),
        recovery: Math.sin(
          Math.max(0, Math.min(1, (cp - 0.55) / 0.45)) * Math.PI,
        ),
      };
      signatureFrame.windup = Math.max(0, signatureFrame.windup);
      const signaturePose = articulatedPose(
        this.phase,
        this.weight,
        time,
        signatureFrame,
        0,
        assist,
      );
      for (const joint of [
        "leftUpperArm",
        "rightUpperArm",
        "leftForearm",
        "rightForearm",
        "leftHand",
        "rightHand",
        "head",
        "torso",
      ] as const)
        pose[joint] += (signaturePose[joint] - pose[joint]) * cast;
    }
    this.draw(aim, travel, dt, time, pose, assist, p.alive, p.connected);
    Object.assign(this.diag, {
      fire: motion.active ? motion.strike + motion.windup : 0,
      cast,
      attack: motion.id || "",
      attackPhase: motion.progress,
      signature: cast > 0 ? signature : "",
    });
    this.setData("pose", this.diag);
  }
  updateEnemy(
    e: Enemy,
    aim: number,
    travel: number,
    dt: number,
    time: number,
    elapsed: number,
    snapshotAge = 0,
  ) {
    this.weight = locomotionWeight(this.weight, travel > 0.015, dt);
    this.phase +=
      (Math.min(travel, 7) * Math.PI * 2) / ZOMBIE_DESIGNS[e.kind].stride;
    const total = e.windupTotal || ENEMY_DEFS[e.kind].windup,
      windup = e.windup ? windupProgress(e.windup, total, snapshotAge) : 0,
      age = elapsed + snapshotAge - (e.attackStartedAt ?? -999);
    const kind =
      e.kind === "hound"
        ? "sweep"
        : e.kind === "tank"
          ? "overhead"
          : e.kind === "shooter"
            ? "shoot"
            : e.kind === "wraith"
              ? "channel"
              : e.kind === "boss"
                ? "throw"
                : e.kind === "bomber"
                  ? "channel"
                  : "slash";
    const motion = enemyAttackFrame(kind, windup, age);
    const strike = motion.strike;
    const pose = zombiePose(
      e.kind,
      this.phase,
      this.weight,
      time,
      motion,
      Math.max(0, e.hitFlash / 0.14),
    );
    this.draw(aim, travel, dt, time, pose, false, true, true);
    this.gear.y -= e.kind === "tank" ? motion.windup * 15 - strike * 8 : 0;
    Object.assign(this.diag, {
      fire: strike,
      windup: !!e.windup,
      attackPhase: motion.progress,
    });
  }
  private flattenBones(bones: Bone[]) {
    for (const index of this.enemyKind ? ZOMBIE_BONE_ORDER : BONE_ORDER) {
      const bone = bones[index],
        m = bone.matrix,
        c = Math.cos(bone.rotation),
        s = Math.sin(bone.rotation),
        a = c,
        b = s,
        cc = -s * bone.sy,
        d = c * bone.sy;
      if (bone.parent < 0) {
        m[0] = a;
        m[1] = b;
        m[2] = cc;
        m[3] = d;
        m[4] = bone.x;
        m[5] = bone.y;
      } else {
        const p = bones[bone.parent].matrix;
        m[0] = p[0] * a + p[2] * b;
        m[1] = p[1] * a + p[3] * b;
        m[2] = p[0] * cc + p[2] * d;
        m[3] = p[1] * cc + p[3] * d;
        m[4] = p[0] * bone.x + p[2] * bone.y + p[4];
        m[5] = p[1] * bone.x + p[3] * bone.y + p[5];
      }
      if (this.batchJointQuads) continue;
      const sx = Math.hypot(m[0], m[1]),
        sy = (m[0] * m[3] - m[1] * m[2]) / Math.max(0.001, sx),
        part = this.parts[index];
      bone.image
        .setPosition(m[4], m[5])
        .setRotation(Math.atan2(m[1], m[0]))
        .setScale(
          (bone.width / bone.image.frame.realWidth) * sx,
          (bone.height / bone.image.frame.realHeight) * sy,
        );
    }
  }
  handWorld() {
    let x = 0,
      y = 0,
      total = 0;
    for (const layer of this.layers) {
      if (!layer.group.visible || layer.group.alpha <= 0) continue;
      const b = layer.nodes.get("rightHand")!.matrix;
      const m = layer.group.getWorldTransformMatrix();
      const weight = layer.group.alpha;
      x += (m.a * b[4] + m.c * b[5] + m.tx) * weight;
      y += (m.b * b[4] + m.d * b[5] + m.ty) * weight;
      total += weight;
    }
    return { x: total ? x / total : this.x, y: total ? y / total : this.y };
  }
  tint(value: number | null) {
    if (value === this.lastTint) return;
    this.lastTint = value;
    for (const layer of this.layers)
      for (const image of layer.images.values())
        value === null ? image.clearTint() : image.setTint(value);
  }
  fall(time: number, born: number) {
    if (!this.deathPose)
      this.deathPose = {
        rotation: this.rotation,
        parts: this.layers.map((l) => l.bones.map((b) => b.rotation)),
      };
    const t = Math.max(0, Math.min(1, (time - born) / 700)),
      ease = t * t * (3 - 2 * t);
    this.diag.dying = true;
    this.diag.fall = t;
    this.setRotation(
      this.deathPose.rotation + (1.45 - this.deathPose.rotation) * ease,
    ).setAlpha(1 - ease);
    this.layers.forEach((layer, l) => {
      layer.bones.forEach((bone, i) => {
        const name = this.parts[i].name;
        const release =
          name === "head"
            ? 0.32
            : name === "jaw"
              ? 0.24
              : name.includes("Forearm")
                ? name.startsWith("left")
                  ? 0.65
                  : -0.65
                : name.includes("Shin")
                  ? 0.34
                  : name.includes("Foot")
                    ? -0.15
                    : name.includes("UpperArm")
                      ? name.startsWith("left")
                        ? -0.2
                        : 0.2
                      : name.includes("Hand")
                        ? 0.2
                        : name === "torso"
                          ? 0.1
                          : 0;
        bone.rotation =
          this.deathPose!.parts[l][i] * (1 - ease * 0.35) + release * ease;
      });
      this.flattenBones(layer.bones);
    });
  }
}
