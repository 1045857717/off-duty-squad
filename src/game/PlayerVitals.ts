import Phaser from "phaser";
import type { Player } from "../../shared/types";
import { healthReadout, VitalTrail } from "../healthDisplay";
/** Four stable world-space vitals; independent shield, readable digits and hit loss. */
export class PlayerVitals extends Phaser.GameObjects.Container {
  private panel: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private armor: Phaser.GameObjects.Text;
  private trail = new VitalTrail();
  private previousShield = 0;
  private hitSeq = -1;
  private brokenUntil = 0;
  private flashUntil = 0;
  private cache = "";
  constructor(scene: Phaser.Scene, id: string) {
    super(scene, 0, 0);
    this.name = "vitals-" + id;
    this.panel = new Phaser.GameObjects.Graphics(scene);
    const style = {
      fontFamily: "Arial, Microsoft YaHei, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      color: "#fffbed",
      stroke: "#07130f",
      strokeThickness: 3,
      resolution: 2,
    };
    this.label = new Phaser.GameObjects.Text(scene, 0, 5, "", style).setOrigin(
      0.5,
    );
    this.armor = new Phaser.GameObjects.Text(scene, 0, 17, "", {
      ...style,
      fontSize: "9px",
      color: "#ccf0ff",
    }).setOrigin(0.5);
    this.add([this.panel, this.label, this.armor]);
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
      ),
      changed = this.hitSeq >= 0 && this.hitSeq !== player.hitSeq;
    const broken =
      changed && this.previousShield > 0 && v.shield === 0 && player.hitShield;
    if (broken) this.brokenUntil = time + 900;
    if (changed) this.flashUntil = time + 240;
    this.hitSeq = player.hitSeq;
    this.previousShield = v.shield;
    const ghost = this.trail.sample(v.ratio, time),
      width = local ? 76 : 64,
      hasShield = v.shield > 0,
      flash = time < this.flashUntil;
    this.setPosition(x, y + (local ? 19 : -58)).setScale(
      Math.min(1.35, Math.max(0.9, 1 / Math.max(0.1, zoom))),
    );
    this.setDepth(local ? 92 : 84);
    const text = !player.alive
      ? rescuable
        ? "倒地 · E救援"
        : "行动结束"
      : (local ? "你  " : "") + v.hp + " / " + v.maxHp;
    if (this.label.text !== text) {
      this.label.setText(text);
      this.label.setScale(
        Math.min(1, (width - 8) / Math.max(1, this.label.width)),
      );
    }
    const armorText =
      time < this.brokenUntil ? "护盾破裂" : hasShield ? "盾 " + v.shield : "";
    if (this.armor.text !== armorText) this.armor.setText(armorText);
    this.armor.setVisible(!!armorText);
    const key = [
      width,
      Math.round(v.ratio * 500),
      Math.round(ghost * 500),
      Math.round(v.shieldRatio * 100),
      v.status,
      hasShield,
      time < this.brokenUntil,
      flash,
      Math.round(player.revive * 30),
    ].join(":");
    if (key !== this.cache) {
      this.cache = key;
      const g = this.panel.clear(),
        left = -width / 2;
      g.fillStyle(0x081912, 0.96).fillRoundedRect(
        left - 3,
        -3,
        width + 6,
        armorText ? 24 : 15,
        5,
      );
      g.lineStyle(
        local ? 1.2 : 1,
        flash
          ? 0xfff5c9
          : v.status === "critical"
            ? 0xff8c77
            : local
              ? 0xf4dfad
              : 0xa8c6b8,
        local ? 0.95 : 0.75,
      ).strokeRoundedRect(left - 3, -3, width + 6, armorText ? 24 : 15, 5);
      g.fillStyle(0x253b30).fillRoundedRect(left, -1, width, 11, 2);
      g.fillStyle(0xf4cd80, 0.9).fillRect(left + 1, 0, (width - 2) * ghost, 9);
      g.fillStyle(v.color).fillRect(
        left + 1,
        0,
        (width - 2) *
          (player.alive ? v.ratio : Math.min(1, player.revive / 2.5)),
        9,
      );
      for (let i = 1; i < 5; i++)
        g.lineStyle(1, 0x112c22, 0.45).lineBetween(
          left + (i * width) / 5,
          0,
          left + (i * width) / 5,
          9,
        );
      if (local) {
        g.fillStyle(0xf9e3a8).fillTriangle(-4, -8, 4, -8, 0, -4);
      }
      if (hasShield) {
        g.fillStyle(0x153b50).fillRect(left + 1, 13, width - 2, 7);
        g.fillStyle(0x4898bc).fillRect(
          left + 1,
          13,
          (width - 2) * v.shieldRatio,
          7,
        );
      }
      this.setData("vitals", {
        ...v,
        ghost,
        width,
        local,
        placement: local ? "below-feet" : "above-head",
        flash,
        broken: time < this.brokenUntil,
      });
    }
    return !!broken;
  }
}
