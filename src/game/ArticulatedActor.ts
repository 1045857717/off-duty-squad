import Phaser from "phaser";
import type {
  Player,
  Role,
  Enemy,
  EnemyKind,
  AttackId,
} from "../../shared/types";
import { gameplayModel } from "./paintedActors";
import { directionView, locomotionWeight, windupProgress } from "./actorPose";
import { JOINT_PARTS, articulatedPose, AttackTimeline } from "./joints";
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
};
const BONE_ORDER = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13];
/** All joint images and props share one GPU texture, including the enemies. */
export class ArticulatedActor extends Phaser.GameObjects.Container {
  readonly role: Role;
  readonly enemyKind?: EnemyKind;
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
  private weight = 0;
  private phase = 0;
  private clock = new AttackTimeline();
  private gear: Phaser.GameObjects.Image;
  private blink: Phaser.GameObjects.Image;
  private lastTint: number | null = null;
  private castSeq = 0;
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
    this.name = "rig-" + id;
    const key = ensureRigAtlas(scene),
      model = gameplayModel(role);
    for (let l = 0; l < 2; l++) {
      const group = new Phaser.GameObjects.Container(scene, 0, 0),
        nodes = new Map<string, Bone>(),
        images = new Map<string, Phaser.GameObjects.Image>(),
        bones: Bone[] = [];
      for (const part of JOINT_PARTS) {
        const parent =
            part.parent === "root"
              ? -1
              : JOINT_PARTS.findIndex((p) => p.name === part.parent),
          pp = parent < 0 ? null : JOINT_PARTS[parent].pivot,
          [px, py] = part.pivot,
          [x, y, w, h] = part.rect;
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
      model = gameplayModel(this.role);
    if (dir !== this.currentDir) {
      this.layerIndex = 1 - this.layerIndex;
      this.currentDir = dir;
      this.layers[this.layerIndex].dir = dir;
      this.changedAt = time;
      const view = directionView((dir * Math.PI) / 4);
      for (const part of JOINT_PARTS)
        this.layers[this.layerIndex].images
          .get(part.name)!
          .setFrame(`${model}-${view.column}-${part.name}`);
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
        .setAlpha(active ? turn : 1 - turn)
        .setScale(view.flip ? -1 : 1, assist ? 0.86 : 1)
        .setPosition(0, pose.bob);
      for (const part of JOINT_PARTS)
        layer.nodes.get(part.name)!.rotation = pose[part.name];
      layer.nodes.get("torso")!.sy = pose.breath;
      this.flattenBones(layer.bones);
    }
    const view = directionView(aim);
    this.gear
      .setPosition(0, pose.bob)
      .setRotation(pose.torso * 0.7)
      .setScale(view.flip ? -1 : 1, assist ? 0.86 : 1)
      .setVisible(
        this.enemyKind
          ? true
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
      elbow: pose.leftForearm,
      rightElbow: pose.rightForearm,
      knee: pose.leftShin,
      rightKnee: pose.rightShin,
      head: pose.head,
      torso: pose.torso,
      breath: pose.breath,
      parts: 14,
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
  ) {
    this.weight = locomotionWeight(this.weight, travel > 0.02, dt);
    this.phase += (Math.min(travel, 7) * Math.PI * 2) / 84;
    const motion = this.clock.sample(
      p.attackMotion?.id,
      p.attackMotion?.seq ?? -1,
      time,
    );
    if (p.skillSeq !== this.castSeq) {
      this.castSeq = p.skillSeq;
      this.castStarted = time;
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
      cast,
      assist,
    );
    const signature = SIGNATURE_MOTIONS[p.ability];
    if (cast > 0) {
      if (signature === "overhead") {
        pose.leftForearm += cast * 0.45;
        pose.rightForearm -= cast * 0.45;
        pose.torso += cast * 0.08;
      }
      if (signature === "throw") {
        pose.rightUpperArm -= cast * 0.7;
        pose.rightForearm -= cast * 0.35;
      }
      if (signature === "sweep" || signature === "slash") {
        pose.torso -= cast * 0.18;
        pose.rightHand += cast * 0.3;
      }
      if (signature === "channel" || signature === "summon") {
        pose.leftHand -= cast * 0.2;
        pose.rightHand += cast * 0.2;
      }
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
      (Math.min(travel, 7) * Math.PI * 2) / (e.kind === "mite" ? 58 : 86);
    const total = e.windupTotal || ENEMY_DEFS[e.kind].windup,
      windup = e.windup ? windupProgress(e.windup, total, snapshotAge) : 0,
      age = elapsed - (e.attackStartedAt ?? -999),
      strike = age >= 0 && age < 0.28 ? Math.sin((age / 0.28) * Math.PI) : 0,
      recover = age >= 0.28 && age < 0.58 ? 1 - (age - 0.28) / 0.3 : 0;
    const kind =
      e.kind === "hound"
        ? "sweep"
        : e.kind === "tank"
          ? "overhead"
          : e.kind === "shooter"
            ? "shoot"
            : e.kind === "boss"
              ? "throw"
              : e.kind === "bomber"
                ? "channel"
                : "slash";
    const motion = {
      kind: kind as any,
      id: undefined,
      active: !!e.windup || strike > 0 || recover > 0,
      windup: e.windup ? Math.sin((windup * Math.PI) / 2) : 0,
      strike,
      recovery: recover,
      progress: e.windup
        ? windup * 0.23
        : age >= 0 && age < 0.28
          ? 0.23 + (age / 0.28) * 0.35
          : age >= 0.28 && age < 0.58
            ? 0.58 + ((age - 0.28) / 0.3) * 0.42
            : 1,
    };
    const pose = articulatedPose(
      this.phase,
      this.weight,
      time,
      motion,
      0,
      false,
    );
    if (
      e.kind === "hound" &&
      (e.windup || Math.hypot(e.vx || 0, e.vy || 0) > 80)
    ) {
      pose.torso += 0.16;
      pose.leftShin += 0.26;
      pose.rightShin += 0.26;
      pose.bob += 3;
    }
    if (e.kind === "bomber" && e.windup) {
      pose.leftUpperArm -= 0.2;
      pose.rightUpperArm += 0.2;
      pose.bob += Math.sin(time * 0.045) * 1.2;
    }
    this.draw(aim, travel, dt, time, pose, false, true, true);
    this.gear.y -= e.kind === "tank" ? motion.windup * 15 - strike * 8 : 0;
    Object.assign(this.diag, {
      fire: strike,
      windup: !!e.windup,
      attackPhase: motion.progress,
    });
  }
  private flattenBones(bones: Bone[]) {
    for (const index of BONE_ORDER) {
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
      const sx = Math.hypot(m[0], m[1]),
        sy = (m[0] * m[3] - m[1] * m[2]) / Math.max(0.001, sx),
        part = JOINT_PARTS[index];
      bone.image
        .setPosition(m[4], m[5])
        .setRotation(Math.atan2(m[1], m[0]))
        .setScale(
          ((part.rect[2] * 84) / bone.image.frame.realWidth) * sx,
          ((part.rect[3] * 105) / bone.image.frame.realHeight) * sy,
        );
    }
  }
  handWorld() {
    const layer = this.layers[this.layerIndex],
      b = layer.nodes.get("rightHand")!.matrix,
      m = layer.group.getWorldTransformMatrix();
    return {
      x: m.a * b[4] + m.c * b[5] + m.tx,
      y: m.b * b[4] + m.d * b[5] + m.ty,
    };
  }
  tint(value: number | null) {
    if (value === this.lastTint) return;
    this.lastTint = value;
    for (const layer of this.layers)
      for (const image of layer.images.values())
        value === null ? image.clearTint() : image.setTint(value);
  }
  fall(time: number, born: number) {
    this.diag.dying = true;
    this.diag.fall = (time - born) / 700;
    const t = Math.max(0, Math.min(1, (time - born) / 700));
    this.setRotation(Math.sin((t * Math.PI) / 2) * 1.45)
      .setAlpha(1 - t * 0.8)
      .setScale(this.scaleX, this.scaleY);
    for (const layer of this.layers) {
      layer.nodes.get("head")!.rotation += 0.003;
      layer.nodes.get("leftForearm")!.rotation *= 0.96;
      layer.nodes.get("rightShin")!.rotation *= 0.96;
      this.flattenBones(layer.bones);
    }
  }
}
