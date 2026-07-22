import { TILE, COLS, ROWS } from "@/game/constants.js";
import { SOLID } from "@/game/resources.js";

export const PLACE_RANGE = 3; // tiles (Chebyshev) from the player

export const PLACEABLES: Record<string, { item: string }> = {
  wall: { item: "wall" },
  // furnace, chest added in the next pieces
};

// true if a player/mob can't move into this world position
export function isBlocked(state: any, x: number, y: number): boolean {
  const c = Math.floor(x / TILE),
    r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
  if (SOLID.has(state.tiles[r * COLS + c])) return true;
  return state.placed.has(String(r * COLS + c));
}