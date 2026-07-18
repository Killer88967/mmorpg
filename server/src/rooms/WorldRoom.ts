import { Room, Client } from "colyseus";
import { WorldState, Player } from "./schema/WorldState.js";

const SPEED = 200; // px/sec
const WORLD = { w: 2000, h: 2000 };

type Input = { up: boolean; down: boolean; left: boolean; right: boolean };

export class WorldRoom extends Room {
  state = new WorldState();
  maxClients = 32;

  private inputs = new Map<string, Input>();

  onCreate() {
    this.onMessage("input", (client, data: Input) => {
      this.inputs.set(client.sessionId, {
        up: !!data.up,
        down: !!data.down,
        left: !!data.left,
        right: !!data.right,
      });
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
      player.x = clamp(player.x + dx * SPEED * dt, 0, WORLD.w);
      player.y = clamp(player.y + dy * SPEED * dt, 0, WORLD.h);
    });
  }

  onJoin(client: Client) {
    const player = new Player();
    player.x = Math.random() * 400 + 100;
    player.y = Math.random() * 400 + 100;
    player.color = randomColor();
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

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const randomColor = () =>
  "#" +
  Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");