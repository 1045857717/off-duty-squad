import Phaser from "phaser";
import { CombatGraphics } from "./CombatGraphics";
import type { Player } from "../../shared/types";
import { healthReadout, VitalTrail } from "../healthDisplay";
/** Four stable world-space vitals; independent shield, readable digits and hit loss. */
export class PlayerVitals extends Phaser.GameObjects.Container {
  private panel: CombatGraphics;
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
    this.panel = new CombatGraphics(scene);
    const style = {
      fontFamily: "Arial, Microsoft YaHei, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      color: "#fffbed",
      stroke: "#201e30",
      strokeThickness: 2,
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
    const compactAlly = !local && player.alive && v.status !== "critical";
    const ghost = this.trail.sample(v.ratio, time),
      width = local ? 76 : compactAlly ? 42 : 64,
      hasShield = v.shield > 0,
      flash = time < this.flashUntil;
    this.setPosition(x, y + (local ? 34 : -58)).setScale(
      Math.min(1.35, Math.max(0.9, 1 / Math.max(0.1, zoom))),
    );
    this.setDepth(local ? 98 : 84);
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
    this.label.setVisible(!compactAlly);
    const armorText =
      time < this.brokenUntil ? "护盾破裂" : hasShield ? "盾 " + v.shield : "";
    if (this.armor.text !== armorText) this.armor.setText(armorText);
    this.armor.setVisible(!!armorText && !compactAlly);
    const key = [
      width,
      v.hp,
      v.maxHp,
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
      if (compactAlly) {
        g.fillStyle(0x211e31, 0.85).fillBevelRect(
          left - 2,
          -2,
          width + 4,
          hasShield ? 11 : 7,
          2,
        );
        g.fillStyle(0xd8b16d, 0.8).fillRect(left, 0, width * ghost, 3);
        g.fillStyle(v.color).fillRect(left, 0, width * v.ratio, 3);
        if (hasShield)
          g.fillStyle(0x719eba).fillRect(left, 6, width * v.shieldRatio, 2);
      } else {
        g.fillStyle(0x211e31, 0.96).fillBevelRect(
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
              ? 0xe98a7d
              : local
                ? 0xdac295
                : 0x91b3ac,
          local ? 0.95 : 0.75,
        ).strokeBevelRect(left - 3, -3, width + 6, armorText ? 24 : 15, 5);
        g.fillStyle(0x383749).fillRect(left, -1, width, 11);
        g.fillStyle(0xd8b16d, 0.9).fillRect(
          left + 1,
          0,
          (width - 2) * ghost,
          9,
        );
        g.fillStyle(v.color).fillRect(
          left + 1,
          0,
          (width - 2) *
            (player.alive ? v.ratio : Math.min(1, player.revive / 2.5)),
          9,
        );
        for (let i = 1; i < 5; i++)
          g.lineStyle(1, 0x222032, 0.45).lineBetween(
            left + (i * width) / 5,
            0,
            left + (i * width) / 5,
            9,
          );
        if (local) {
          g.fillStyle(0xf9e3a8).fillTriangle(-4, -8, 4, -8, 0, -4);
        }
        if (hasShield) {
          g.fillStyle(0x303d54).fillRect(left + 1, 13, width - 2, 7);
          g.fillStyle(0x719eba).fillRect(
            left + 1,
            13,
            (width - 2) * v.shieldRatio,
            7,
          );
        }
      }
      this.setData("vitals", {
        ...v,
        ghost,
        width,
        local,
        compact: compactAlly,
        placement: local ? "below-feet" : "above-head",
        flash,
        broken: time < this.brokenUntil,
      });
    }
    return !!broken;
  }
}
