import Phaser from "phaser";
/** Bounded world-space tip ribbon, synchronized to the visible weapon rather than arbitrary particles. */
export class WeaponRibbon extends Phaser.GameObjects.Graphics {
  private points: { x: number; y: number; at: number }[] = [];
  constructor(scene: Phaser.Scene, id: string) {
    super(scene);
    this.name = "weapon-ribbon-" + id;
    scene.add.existing(this);
  }
  sample(
    x: number,
    y: number,
    active: boolean,
    time: number,
    tint: number,
    lowMotion: boolean,
    depth: number,
  ) {
    this.clear().setDepth(depth);
    while (this.points.length && time - this.points[0].at > 140)
      this.points.shift();
    if (lowMotion) {
      this.points.length = 0;
      return;
    }
    if (active) this.points.push({ x, y, at: time });
    while (this.points.length > 18) this.points.shift();
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1],
        b = this.points[i];
      if (Math.hypot(a.x - b.x, a.y - b.y) > 60) continue;
      const alpha = Math.max(0, 1 - (time - a.at) / 140);
      this.lineStyle(7, 0x142821, alpha * 0.45).lineBetween(a.x, a.y, b.x, b.y);
      this.lineStyle(4.5, tint, alpha * 0.8).lineBetween(a.x, a.y, b.x, b.y);
      this.lineStyle(1.3, 0xfff3d4, alpha * 0.8).lineBetween(
        a.x,
        a.y,
        b.x,
        b.y,
      );
    }
  }
}
