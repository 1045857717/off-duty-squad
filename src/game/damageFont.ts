import type Phaser from "phaser";
/** One static outlined glyph atlas avoids a Canvas upload on every damage number. */
export function ensureDamageFont(scene: Phaser.Scene) {
  const key = "combat-numbers";
  if (scene.cache.bitmapFont.exists(key)) return key;
  const characters = "0123456789−+! 暴击",
    cell = 48,
    canvas = document.createElement("canvas");
  canvas.width = cell * characters.length;
  canvas.height = 64;
  const c = canvas.getContext("2d")!;
  c.font = 'bold 36px Consolas,"Microsoft YaHei",monospace';
  c.textBaseline = "top";
  c.lineJoin = "round";
  c.strokeStyle = "#142d40";
  c.lineWidth = 5;
  c.fillStyle = "#ffffff";
  const chars: Record<
    number,
    Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData & {
      xAdvance: number;
    }
  > = {};
  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i],
      x = i * cell,
      advance = ch === " " ? 12 : Math.ceil(c.measureText(ch).width) + 2;
    c.strokeText(ch, x + 4, 7);
    c.fillText(ch, x + 4, 7);
    chars[ch.charCodeAt(0)] = {
      x,
      y: 0,
      width: cell,
      height: 64,
      centerX: 24,
      centerY: 32,
      xOffset: -4,
      yOffset: -7,
      xAdvance: advance,
      data: {},
      kerning: {},
      u0: x / canvas.width,
      v0: 0,
      u1: (x + cell) / canvas.width,
      v1: 1,
    };
  }
  scene.textures.addCanvas(key, canvas);
  scene.cache.bitmapFont.add(key, {
    data: { font: key, size: 36, lineHeight: 44, retroFont: false, chars },
    texture: key,
    frame: null,
  });
  return key;
}
