// @ts-nocheck
import { Graphics } from "pixi.js";
import { PLACE_INFO } from "@/data/placeables";

export function initPlaced({ world, room, $ }) {
  const gfx = new Map();

  function draw(index, kind) {
    const t = room.state.tile || 64;
    const C = room.state.cols || 32;
    const c = index % C,
      r = Math.floor(index / C);
    const info = PLACE_INFO[kind] || { color: 0x888888 };
    const g = new Graphics().rect(c * t, r * t, t, t).fill(info.color);
    g.stroke({ width: 2, color: 0x000000, alpha: 0.35 });
    world.addChild(g);
    gfx.set(index, g);
  }

  $.onAdd("placed", (p) => draw(p.index, p.kind));
  $.onRemove("placed", (p) => {
    const g = gfx.get(p.index);
    if (g) {
      g.destroy();
      gfx.delete(p.index);
    }
  });
}