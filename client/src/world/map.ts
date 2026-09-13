import { Graphics, type Container } from "pixi.js";
import type { WorldState } from "@/server/schema/WorldState";

const COLORS: Record<number, number> = {
  0: 0x2e7d32,
  1: 0x1565c0,
  2: 0xb08968,
  3: 0x1b3a1b,
  4: 0x6d7079,
  5: 0x9c7a3c,
  6: 0x4a9a4a,
  7: 0x55564a,
};

export function createMap(world: Container) {
  let localTiles: number[] = [];
  let mapMeta = { cols: 0, rows: 0, tile: 0 };
  let groundGfx: Graphics | null = null;
  let mapBuilt = false;

  function buildMap() {
    if (groundGfx) groundGfx.destroy();
    const g = new Graphics();
    const t = mapMeta.tile;
    for (let r = 0; r < mapMeta.rows; r++)
      for (let c = 0; c < mapMeta.cols; c++)
        g.rect(c * t, r * t, t, t).fill(
          COLORS[localTiles[r * mapMeta.cols + c]] ?? 0x000000,
        );
    world.addChildAt(g, 0);
    groundGfx = g;
  }

  function onStateChange(state: WorldState) {
    if (mapBuilt || state.tiles.length === 0) return;
    mapBuilt = true;
    mapMeta = {
      cols: state.cols,
      rows: state.rows,
      tile: state.tile,
    };
    localTiles = Array.from(state.tiles);
    buildMap();
  }

  // live tile changes (harvested / respawned trees)
  function onTileUpdate({ index, type }: { index: number; type: number }) {
    localTiles[index] = type;
    buildMap();
  }

  return { onStateChange, onTileUpdate };
}
