import { TILE, COLS, ROWS } from "@/game/constants.js";
import { SOLID } from "@/game/resources.js";

export const PLACE_RANGE = 3; // tiles (Chebyshev) from the player

export const PLACEABLES: Record<string, { item: string }> = {
  wall: { item: "wall" },
  furnace: { item: "furnace" },
  //  chest added in the next piece
};

// true if a player/mob can't move into this world position
export function isBlocked(state: any, x: number, y: number): boolean {
  const c = Math.floor(x / TILE),
    r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  if (SOLID.has(state.tiles[r * COLS + c])) return true;
  return state.placed.has(String(r * COLS + c));
}

export const STATION_RANGE = 2; // tiles

export function nearStation(
  state: any,
  x: number,
  y: number,
  kind: string,
): boolean {
  const pc = Math.floor(x / TILE),
    pr = Math.floor(y / TILE);
  let found = false;
  state.placed.forEach((p: any) => {
    if (found || p.kind !== kind) return;
    const c = p.index % COLS,
      r = Math.floor(p.index / COLS);
    if (Math.abs(c - pc) <= STATION_RANGE && Math.abs(r - pr) <= STATION_RANGE)
      found = true;
  });
  return found;
}