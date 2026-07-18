import { Room, Client } from "colyseus";
import { WorldState, Player } from "./schema/WorldState.js";
import { prisma } from "../db.js";

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
  private inventories = new Map<string, Record<string, number>>();
  private offers = new Map<string, any>();
  private offerSeq = 0;

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

  private async saveAll() {
    for (const [id, player] of this.state.players) {
      const inv = this.inventories.get(id) ?? {};
      await prisma.character
        .update({
          where: { name: player.name },
          data: { x: player.x, y: player.y, inventory: JSON.stringify(inv) },
        })
        .catch(() => {});
    }
  }

  private async saveOne(name: string, inv: any) {
    await prisma.character
      .update({ where: { name }, data: { inventory: JSON.stringify(inv) } })
      .catch(() => {});
  }

  private randomSpawn(): { x: number; y: number } {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * WORLD.w;
      const y = Math.random() * WORLD.h;
      if (!SOLID.has(tileAt(this.state, x, y))) return { x, y };
    }
    // fallback: center of the crossroads (always walkable path)
    return { x: 16 * TILE + TILE / 2, y: 16 * TILE + TILE / 2 };
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

    // send a player their inventory once they're ready to receive it
    this.onMessage("ready", (client) => {
      client.send("inventory", this.inventories.get(client.sessionId) ?? {});
    });

    // chop a nearby tree
    this.onMessage("harvest", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const pc = Math.floor(player.x / TILE);
      const pr = Math.floor(player.y / TILE);

      // find the closest tree tile in the 3x3 around the player
      let best = -1,
        bestDist = Infinity;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const c = pc + dc,
            r = pr + dr;
          if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
          const i = r * COLS + c;
          if (this.state.tiles[i] !== 3) continue;
          const cx = c * TILE + TILE / 2,
            cy = r * TILE + TILE / 2;
          const d = (cx - player.x) ** 2 + (cy - player.y) ** 2;
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
      if (best < 0) return; // no tree in range

      // remove it (turns walkable), grant wood, tell everyone the tile changed
      this.state.tiles[best] = 0;
      this.broadcast("tileUpdate", { index: best, type: 0 });

      const inv = this.inventories.get(client.sessionId) ?? {};
      inv.wood = (inv.wood ?? 0) + 1;
      this.inventories.set(client.sessionId, inv);
      client.send("inventory", inv);

      // respawn the tree after 10s
      this.clock.setTimeout(() => {
        this.state.tiles[best] = 3;
        this.broadcast("tileUpdate", { index: best, type: 3 });
      }, 10000);
    });

    // post a trade offer to the whole server
    this.onMessage("offer", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const give = normItem(data?.give);
      const want = normItem(data?.want);
      if (!give || !want) return;

      const inv = this.inventories.get(client.sessionId) ?? {};
      if (!invHas(inv, give.item, give.count)) {
        client.send("offerError", `You don't have ${give.count} ${give.item}.`);
        return;
      }

      const id = "o" + ++this.offerSeq;
      this.offers.set(id, {
        id,
        fromId: client.sessionId,
        fromName: player.name,
        give,
        want,
      });
      this.broadcast("offerPosted", { id, fromName: player.name, give, want });

      this.clock.setTimeout(() => {
        if (this.offers.delete(id))
          this.broadcast("offerClosed", { id, status: "expired" });
      }, 120000); // auto-expire after 2 min
    });

    // accept someone's offer — re-validates BOTH sides, then swaps atomically
    this.onMessage("accept", (client, data) => {
      const offer = this.offers.get(data?.id);
      if (!offer) {
        client.send("offerError", "That offer is no longer available.");
        return;
      }
      if (offer.fromId === client.sessionId) return;

      const sellerInv = this.inventories.get(offer.fromId);
      const buyerInv = this.inventories.get(client.sessionId);
      if (!sellerInv || !buyerInv) {
        this.offers.delete(offer.id);
        this.broadcast("offerClosed", { id: offer.id, status: "cancelled" });
        client.send("offerError", "That offer is no longer available.");
        return;
      }
      if (!invHas(sellerInv, offer.give.item, offer.give.count)) {
        this.offers.delete(offer.id);
        this.broadcast("offerClosed", { id: offer.id, status: "cancelled" });
        client.send("offerError", "The offerer no longer has the goods.");
        return;
      }
      if (!invHas(buyerInv, offer.want.item, offer.want.count)) {
        client.send(
          "offerError",
          `You don't have ${offer.want.count} ${offer.want.item}.`,
        );
        return;
      }

      // atomic swap (synchronous — no await between check and mutation)
      invSub(sellerInv, offer.give.item, offer.give.count);
      invAdd(buyerInv, offer.give.item, offer.give.count);
      invSub(buyerInv, offer.want.item, offer.want.count);
      invAdd(sellerInv, offer.want.item, offer.want.count);
      this.offers.delete(offer.id);

      const buyerName =
        this.state.players.get(client.sessionId)?.name ?? "someone";
      client.send("inventory", buyerInv);
      this.clients
        .find((c) => c.sessionId === offer.fromId)
        ?.send("inventory", sellerInv);
      this.broadcast("offerClosed", {
        id: offer.id,
        status: "completed",
        by: buyerName,
      });

      // persist both sides immediately (best-effort)
      this.saveOne(offer.fromName, sellerInv);
      this.saveOne(buyerName, buyerInv);
    });

    // cancel your own offer
    this.onMessage("cancelOffer", (client, data) => {
      const offer = this.offers.get(data?.id);
      if (!offer || offer.fromId !== client.sessionId) return;
      this.offers.delete(offer.id);
      this.broadcast("offerClosed", { id: offer.id, status: "cancelled" });
    });

    // fixed simulation tick — 30fps
    this.setSimulationInterval((dt) => this.update(dt), 1000 / 30);
    this.clock.setInterval(() => this.saveAll(), 15000);
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

  async onJoin(client: Client, options: { name?: string }) {
    const name = (options?.name || "Anon").slice(0, 16);
    const spawn = this.randomSpawn();
    const record = await prisma.character.upsert({
      where: { name },
      update: {},
      create: { name, x: spawn.x, y: spawn.y, color: randomColor() },
    });

    const player = new Player();
    player.x = record.x;
    player.y = record.y;
    player.color = record.color;
    player.name = record.name;
    this.state.players.set(client.sessionId, player);
    let inv: Record<string, number> = {};
    try {
      inv = JSON.parse(record.inventory || "{}");
    } catch {}
    this.inventories.set(client.sessionId, inv);
    this.inputs.set(client.sessionId, {
      up: false,
      down: false,
      left: false,
      right: false,
    });
  }

  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      const inv = this.inventories.get(client.sessionId) ?? {};
      await prisma.character
        .update({
          where: { name: player.name },
          data: { x: player.x, y: player.y, inventory: JSON.stringify(inv) },
        })
        .catch(() => {});
    }
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    for (const [id, offer] of this.offers) {
      if (offer.fromId === client.sessionId) {
        this.offers.delete(id);
        this.broadcast("offerClosed", { id, status: "cancelled" });
      }
    }
    this.inventories.delete(client.sessionId);
  }
}

function tileAt(state: WorldState, x: number, y: number): number {
  const c = Math.floor(x / TILE);
  const r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 1; // treat out-of-bounds as solid
  return state.tiles[r * COLS + c];
}

const SOLID = new Set([1, 3]); // water, tree

function invHas(inv: any, item: string, count: number) {
  return (inv[item] ?? 0) >= count;
}
function invAdd(inv: any, item: string, count: number) {
  inv[item] = (inv[item] ?? 0) + count;
}
function invSub(inv: any, item: string, count: number) {
  const left = (inv[item] ?? 0) - count;
  if (left > 0) inv[item] = left;
  else delete inv[item];
}
function normItem(o: any) {
  if (!o) return null;
  const item = String(o.item ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  const count = Math.floor(Number(o.count));
  if (!item || !Number.isFinite(count) || count < 1 || count > 100000)
    return null;
  return { item, count };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const randomColor = () =>
  "#" +
  Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
