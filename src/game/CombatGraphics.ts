import Phaser from "phaser";
import { circleRing, arcSpan } from "./circleTessellation";
/** Direct triangle fans avoid ear-clipping every tiny particle on every display tick. */
export class CombatGraphics extends Phaser.GameObjects.Graphics {
  private pathPoint = false;
  /** A two-sided melee strip has known connectivity; skip general polygon ear clipping. */
  fillRibbon(points: readonly { x: number; y: number }[]) {
    const half = points.length / 2;
    for (let i = 0; i < half - 1; i++) {
      const a = points[i],
        b = points[i + 1],
        c = points[points.length - 1 - i],
        d = points[points.length - 2 - i];
      this.fillTriangle(a.x, a.y, b.x, b.y, d.x, d.y);
      this.fillTriangle(a.x, a.y, d.x, d.y, c.x, c.y);
    }
    return this;
  }
  /** Small HUD panels need eight edges, not four dense arc paths tessellated every render. */
  fillBevelRect(x: number, y: number, w: number, h: number, cut = 3) {
    const c = Math.min(cut, w / 2, h / 2);
    this.fillRect(x + c, y, w - 2 * c, h).fillRect(x, y + c, w, h - 2 * c);
    this.fillTriangle(x + c, y, x + c, y + c, x, y + c);
    this.fillTriangle(x + w - c, y, x + w, y + c, x + w - c, y + c);
    this.fillTriangle(x + w, y + h - c, x + w - c, y + h, x + w - c, y + h - c);
    this.fillTriangle(x, y + h - c, x + c, y + h - c, x + c, y + h);
    return this;
  }
  strokeBevelRect(x: number, y: number, w: number, h: number, cut = 3) {
    const c = Math.min(cut, w / 2, h / 2);
    return this.beginPath()
      .moveTo(x + c, y)
      .lineTo(x + w - c, y)
      .lineTo(x + w, y + c)
      .lineTo(x + w, y + h - c)
      .lineTo(x + w - c, y + h)
      .lineTo(x + c, y + h)
      .lineTo(x, y + h - c)
      .lineTo(x, y + c)
      .closePath()
      .strokePath();
  }
  override beginPath() {
    this.pathPoint = false;
    return super.beginPath();
  }
  override moveTo(x: number, y: number) {
    this.pathPoint = true;
    return super.moveTo(x, y);
  }
  override lineTo(x: number, y: number) {
    this.pathPoint = true;
    return super.lineTo(x, y);
  }
  override arc(
    x: number,
    y: number,
    radius: number,
    start: number,
    end: number,
    anticlockwise = false,
    _overshoot = 0,
  ) {
    if (radius <= 0) return this;
    const span = arcSpan(start, end, anticlockwise),
      count = Math.max(
        1,
        Math.ceil(
          ((circleRing(radius).length / 2 - 1) * Math.abs(span)) /
            (Math.PI * 2),
        ),
      );
    let px = Math.cos(start),
      py = Math.sin(start);
    const cos = Math.cos(span / count),
      sin = Math.sin(span / count);
    if (this.pathPoint) this.lineTo(x + px * radius, y + py * radius);
    else this.moveTo(x + px * radius, y + py * radius);
    for (let i = 0; i < count; i++) {
      const next = px * cos - py * sin;
      py = px * sin + py * cos;
      px = next;
      this.lineTo(x + px * radius, y + py * radius);
    }
    return this;
  }
  override fillCircle(x: number, y: number, radius: number) {
    return this.fillEllipse(x, y, radius * 2, radius * 2);
  }
  override strokeCircle(x: number, y: number, radius: number) {
    return this.strokeEllipse(x, y, radius * 2, radius * 2);
  }
  override fillEllipse(
    x: number,
    y: number,
    width: number,
    height: number,
    _smoothness?: number,
  ) {
    if (width <= 0 || height <= 0) return this;
    const r = circleRing(Math.max(width, height) / 2),
      rx = width / 2,
      ry = height / 2;
    for (let i = 0; i < r.length - 2; i += 2)
      this.fillTriangle(
        x,
        y,
        x + r[i] * rx,
        y + r[i + 1] * ry,
        x + r[i + 2] * rx,
        y + r[i + 3] * ry,
      );
    return this;
  }
  override strokeEllipse(
    x: number,
    y: number,
    width: number,
    height: number,
    _smoothness?: number,
  ) {
    if (width <= 0 || height <= 0) return this;
    const r = circleRing(Math.max(width, height) / 2),
      rx = width / 2,
      ry = height / 2;
    this.beginPath().moveTo(x + r[0] * rx, y + r[1] * ry);
    for (let i = 2; i < r.length - 2; i += 2)
      this.lineTo(x + r[i] * rx, y + r[i + 1] * ry);
    return this.closePath().strokePath();
  }
}
