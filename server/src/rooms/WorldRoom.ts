import { Room, Client } from "colyseus";
import { WorldState, Player } from "./schema/WorldState.js";

const TILE = 64;
const COLS = 32;
const ROWS = 32;
const SPEED = 200; // px/sec
const WORLD = { w: COLS * TILE, h: ROWS * TILE };

type Input = { up: boolean; down: boolean; left: boolean; right: boolean };

export class WorldRoom extends Room {
  state = new WorldState();
  maxClients = 32;

  private inputs = new Map<string, Input>();

  private generateMap() {
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
    this.state.cols = COLS;
    this.state.rows = ROWS;
    this.state.tile = TILE;
    this.state.tiles.push(...tiles);
  }

  onCreate() {
    this.generateMap();

    this.onMessage("input", (client, data: Input) => {
      this.inputs.set(client.sessionId, {
        up: !!data.up,
        down: !!data.down,
        left: !!data.left,
        right: !!data.right,
      });
    });

    this.onMessage("chat", (client, text: string) => {
      const player = this.state.players.get(client.sessionId);
      const clean = String(text).slice(0, 200).trim();
      if (!clean) return;
      this.broadcast("chat", { name: player?.name || "Anon", text: clean });
    });

    // fixed simulation tick — 30fps
    this.setSimulationInterval((dt) => this.update(dt), 1000 / 30);
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;
    this.state.players.forEach((player, id) => {
      const input = this.inputs.get(id);
      if (!input) return;
      let dx = 0,
        dy = 0;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (dx && dy) {
        const k = Math.SQRT1_2;
        dx *= k;
        dy *= k;
      } // normalize diagonal
      const nextX = clamp(player.x + dx * SPEED * dt, 0, WORLD.w);
      const nextY = clamp(player.y + dy * SPEED * dt, 0, WORLD.h);
      // axis-separated so sliding along a wall still works
      if (!SOLID.has(tileAt(this.state, nextX, player.y))) player.x = nextX;
      if (!SOLID.has(tileAt(this.state, player.x, nextY))) player.y = nextY;
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    const player = new Player();
    player.x = Math.random() * 400 + 100;
    player.y = Math.random() * 400 + 100;
    player.color = randomColor();
    player.name = (options?.name || "Anon").slice(0, 16);
    this.state.players.set(client.sessionId, player);
    this.inputs.set(client.sessionId, {
      up: false,
      down: false,
      left: false,
      right: false,
    });
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
  }
}

function tileAt(state: WorldState, x: number, y: number): number {
  const c = Math.floor(x / TILE);
  const r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 1; // treat out-of-bounds as solid
  return state.tiles[r * COLS + c];
}

const SOLID = new Set([1, 3]); // water, tree

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const randomColor = () =>
  "#" +
  Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
