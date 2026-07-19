import { WorldState } from "@/rooms/schema/WorldState.js";
import { TILE, COLS, ROWS } from "./constants.js";

export function generateMap(state: WorldState) {
  const idx = (c: number, r: number) => r * COLS + c;
  const tiles = new Array(COLS * ROWS).fill(0); // 0 = grass
  for (
    let r = 6;
    r < 12;
    r++ // 1 = water (a lake)
  )
    for (let c = 8; c < 15; c++) tiles[idx(c, r)] = 1;
  for (let c = 0; c < COLS; c++) tiles[idx(c, 16)] = 2; // 2 = path (crossroads)
  for (let r = 0; r < ROWS; r++) tiles[idx(16, r)] = 2;
  for (
    let r = 0;
    r < ROWS;
    r++ // 3 = tree, scattered
  )
    for (let c = 0; c < COLS; c++) {
      if (tiles[idx(c, r)] !== 0) continue;
      if ((Math.imul(c, 73856093) ^ Math.imul(r, 19349663)) % 11 === 0)
        tiles[idx(c, r)] = 3;
    }
  const rhash = (c: number, r: number, s: number) =>
    (Math.imul(c ^ s, 73856093) ^ Math.imul(r ^ s, 19349663)) >>> 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (tiles[idx(c, r)] !== 0) continue; // only replace grass
      if (rhash(c, r, 101) % 13 === 0)
        tiles[idx(c, r)] = 4; // rock
      else if (rhash(c, r, 202) % 47 === 0)
        tiles[idx(c, r)] = 5; // ore
      else if (rhash(c, r, 303) % 9 === 0)
        tiles[idx(c, r)] = 6; // bush
      else if (rhash(c, r, 404) % 19 === 0) tiles[idx(c, r)] = 7; // flint
    }
  state.cols = COLS;
  state.rows = ROWS;
  state.tile = TILE;
  state.tiles.push(...tiles);
}

export function tileAt(state: WorldState, x: number, y: number): number {
  const c = Math.floor(x / TILE);
  const r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 1; // treat out-of-bounds as solid
  return state.tiles[r * COLS + c];
}

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const randomColor = () =>
  "#" +
  Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
