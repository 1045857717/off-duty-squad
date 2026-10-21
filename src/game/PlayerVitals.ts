import Phaser from "phaser";
import type { Player } from "../../shared/types";
import { healthReadout, VitalTrail } from "../healthDisplay";

/** Four persistent, high-contrast meters; enemy health rendering stays batched. */
export class PlayerVitals extends Phaser.GameObjects.Container {
  private panel: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private trail = new VitalTrail();
  private previousShield = 0;
  private hitSeq = -1;
  private brokenUntil = 0;
  private cache = "";
  constructor(scene: Phaser.Scene, id: string) {
    super(scene, 0, 0);
    this.name = "vitals-" + id;
    this.panel = new Phaser.GameObjects.Graphics(scene);
    this.label = new Phaser.GameObjects.Text(scene, 0, 5, "", {
      fontFamily: "Arial, Microsoft YaHei, sans-serif",
      fontSize: "10px",
      fontStyle: "bold",
      color: "#fff9e8",
      stroke: "#10201d",
      strokeThickness: 2,
      resolution: 2,
    }).setOrigin(0.5);
    this.add([this.panel, this.label]);
    this.setDepth(84);
    scene.add.existing(this);
  }
  updatePlayer(
    player: Player,
    x: number,
    y: number,
    time: number,
    local: boolean,
    zoom: number,
    rescuable = true,
  ) {
    const v = healthReadout(
      player.hp,
      player.maxHp,
      player.shield,
      player.shieldCap,
      player.alive,
    );
    const broken =
      this.hitSeq >= 0 &&
      this.hitSeq !== player.hitSeq &&
      this.previousShield > 0 &&
      v.shield === 0 &&
      player.hitShield;
    if (broken) this.brokenUntil = time + 900;
    this.hitSeq = player.hitSeq;
    this.previousShield = v.shield;
    const ghost = this.trail.sample(v.ratio, time);
    const width = local ? 82 : 68;
    const hasShield = v.shield > 0;
    this.setPosition(x, y - 60).setScale(
      Math.min(1.45, Math.max(1, 1 / Math.max(0.1, zoom))),
    );
    const text = !player.alive
      ? rescuable
        ? "倒地 · E救援"
        : "行动结束"
      : time < this.brokenUntil
        ? "护盾破裂"
        : v.hp + "/" + v.maxHp + (hasShield ? " +" + v.shield + "盾" : "");
    if (this.label.text !== text) {
      this.label.setText(text);
      this.label.setScale(
        Math.min(1, (width - 5) / Math.max(1, this.label.width)),
      );
    }
    const key = [
      width,
      Math.round(v.ratio * 500),
      Math.round(ghost * 500),
      Math.round(v.shieldRatio * 100),
      v.status,
      hasShield,
      time < this.brokenUntil,
    ].join(":");
    if (key !== this.cache) {
      this.cache = key;
      const g = this.panel.clear(),
        left = -width / 2;
      g.fillStyle(0x081310, 0.88).fillRoundedRect(
        left - 2,
        -3,
        width + 4,
        hasShield ? 23 : 18,
        5,
      );
      g.fillStyle(0x203831, 1).fillRoundedRect(left, -1, width, 13, 3);
      g.lineStyle(
        local ? 1.5 : 1,
        v.status === "critical" ? 0xff8d7e : 0xe7edd9,
        local ? 0.9 : 0.6,
      ).strokeRoundedRect(left, -1, width, 13, 3);
      g.fillStyle(0xf2cf82, 0.9).fillRect(left + 2, 1, (width - 4) * ghost, 9);
      g.fillStyle(v.color, 1).fillRect(
        left + 2,
        1,
        (width - 4) *
          (player.alive ? v.ratio : Math.min(1, player.revive / 2.5)),
        9,
      );
      for (let i = 1; i < 4; i++)
        g.lineStyle(1, 0x122b24, 0.38).lineBetween(
          left + (i * width) / 4,
          1,
          left + (i * width) / 4,
          10,
        );
      if (hasShield) {
        g.fillStyle(0x183348).fillRect(left + 2, 15, width - 4, 3);
        g.fillStyle(0x93ddff).fillRect(
          left + 2,
          15,
          (width - 4) * v.shieldRatio,
          3,
        );
      }
      this.setData("vitals", {
        ...v,
        ghost,
        width,
        broken: time < this.brokenUntil,
      });
    }
    return broken;
  }
}
