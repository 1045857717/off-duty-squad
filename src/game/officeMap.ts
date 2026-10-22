import type { World } from "../../shared/types";
import {
  ENV40,
  clipEnvironmentFloor,
  environmentRect,
  openEnvironmentTile,
  paintDisasterFloor,
  paintEnvironmentFixtures,
  paintFloorEphemera,
  paintFloorPanel,
  paintOfficeRoom,
  paintOfficeSolid,
  paintWallLight,
} from "./environment40";

/** Render-once environment art. Geometry and navigation remain owned by World. */
export function makeOfficeChunk(world: World, chunkX: number, chunkY: number) {
  const out = document.createElement("canvas");
  out.width = 1024;
  out.height = 1024;
  const c = out.getContext("2d")!,
    sx = chunkX * 512,
    sy = chunkY * 512,
    minX = chunkX * 8,
    minY = chunkY * 8,
    maxX = Math.min(world.cols, minX + 8),
    maxY = Math.min(world.rows, minY + 8);
  c.scale(2, 2);
  // Work in world coordinates: panels, light and paper formations join exactly
  // across chunks without an extra canvas, atlas or order-dependent random state.
  c.translate(-sx, -sy);
  environmentRect(c, sx, sy, 512, 512, ENV40.ink);
  for (let y = minY; y < maxY; y++)
    for (let x = minX; x < maxX; x++)
      if (openEnvironmentTile(world, x, y)) paintFloorPanel(c, world, x, y);

  c.save();
  clipEnvironmentFloor(c, world, chunkX, chunkY);
  if (world.biome === "cataclysm") {
    paintDisasterFloor(c, world, sx, sy);
  } else {
    for (let i = 0; i < world.rooms.length; i++) {
      const r = world.rooms[i];
      if (
        r.x + r.w <= sx ||
        r.x >= sx + 512 ||
        r.y + r.h <= sy ||
        r.y >= sy + 512
      )
        continue;
      paintOfficeRoom(c, r, i, world.theme, world.seed);
    }
    // Include adjacent source tiles: a wall light can illuminate another chunk.
    for (let y = Math.max(0, minY - 2); y < Math.min(world.rows, maxY + 2); y++)
      for (
        let x = Math.max(0, minX - 2);
        x < Math.min(world.cols, maxX + 2);
        x++
      )
        if (!openEnvironmentTile(world, x, y)) paintWallLight(c, world, x, y);
  }
  for (let y = minY; y < maxY; y++)
    for (let x = minX; x < maxX; x++)
      if (openEnvironmentTile(world, x, y)) paintFloorEphemera(c, world, x, y);
  c.restore();

  for (let y = minY; y < maxY; y++)
    for (let x = minX; x < maxX; x++)
      if (!openEnvironmentTile(world, x, y)) paintOfficeSolid(c, world, x, y);
  paintEnvironmentFixtures(c, world, sx, sy);
  return out;
}
