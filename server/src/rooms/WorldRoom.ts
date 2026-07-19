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
  private tools = new Map<string, Set<string>>();
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
          data: {
            x: player.x,
            y: player.y,
            inventory: JSON.stringify(inv),
            tools: JSON.stringify([...(this.tools.get(id) ?? [])]),
          },
        })
        .catch(() => {});
    }
  }

  private async saveOne(name: string, inv: any) {
    await prisma.character
      .update({ where: { name }, data: { inventory: JSON.stringify(inv) } })
      .catch(() => {});
  }

  private playerCaps(sessionId: string): Set<string> {
    const caps = new Set<string>();
    for (const t of this.tools.get(sessionId) ?? []) {
      for (const cap of TOOL_CAPS[t] ?? []) caps.add(cap);
    }
    return caps;
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

      // TEMP dev command to test tool-gating before crafting exists — remove later
      if (clean.startsWith("/tool ")) {
        const t = clean.slice(6).trim();
        if (!TOOL_CAPS[t]) {
          client.send("notice", `Unknown tool: ${t}`);
          return;
        }
        const set = this.tools.get(client.sessionId) ?? new Set<string>();
        set.add(t);
        this.tools.set(client.sessionId, set);
        client.send("notice", `Granted ${t} (dev).`);
        return;
      }

      this.broadcast("chat", { name: player?.name || "Anon", text: clean });
    });

    // send a player their inventory once they're ready to receive it
    this.onMessage("ready", (client) => {
      client.send("inventory", this.inventories.get(client.sessionId) ?? {});
    });

    // harvesting materials
    this.onMessage("harvest", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const pc = Math.floor(player.x / TILE);
      const pr = Math.floor(player.y / TILE);

      // nearest harvestable tile in the 3x3 around the player
      let best = -1,
        bestType = -1,
        bestDist = Infinity;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const c = pc + dc,
            r = pr + dr;
          if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
          const i = r * COLS + c;
          if (!RESOURCES[this.state.tiles[i]]) continue;
          const cx = c * TILE + TILE / 2,
            cy = r * TILE + TILE / 2;
          const d = (cx - player.x) ** 2 + (cy - player.y) ** 2;
          if (d < bestDist) {
            bestDist = d;
            best = i;
            bestType = this.state.tiles[i];
          }
        }
      if (best < 0) return; // nothing in range

      const res = RESOURCES[bestType];
      if (
        res.requires &&
        !this.playerCaps(client.sessionId).has(res.requires)
      ) {
        client.send(
          "notice",
          `You need ${REQ_LABEL[res.requires]} to harvest ${res.drop}.`,
        );
        return;
      }

      // deplete, grant drop, respawn to the original resource type
      this.state.tiles[best] = 0;
      this.broadcast("tileUpdate", { index: best, type: 0 });

      const inv = this.inventories.get(client.sessionId) ?? {};
      inv[res.drop] = (inv[res.drop] ?? 0) + 1;
      this.inventories.set(client.sessionId, inv);
      client.send("inventory", inv);

      this.clock.setTimeout(() => {
        this.state.tiles[best] = bestType;
        this.broadcast("tileUpdate", { index: best, type: bestType });
      }, res.respawn);
    });

    // post a trade offer to the whole server
    this.onMessage("offer", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      const give = normItem(data?.give);
      const want = data?.want ? normItem(data?.want) : null; // no want = free gift
      if (!give) return;
      if (data?.want && !want) return; // want was specified but invalid

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
      }, 120000);
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
      if (offer.want && !invHas(buyerInv, offer.want.item, offer.want.count)) {
        client.send(
          "offerError",
          `You don't have ${offer.want.count} ${offer.want.item}.`,
        );
        return;
      }

      // atomic swap (synchronous — no await between check and mutation)
      invSub(sellerInv, offer.give.item, offer.give.count);
      invAdd(buyerInv, offer.give.item, offer.give.count);
      if (offer.want) {
        invSub(buyerInv, offer.want.item, offer.want.count);
        invAdd(sellerInv, offer.want.item, offer.want.count);
      }
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

    // discard items
    this.onMessage("discard", (client, data) => {
      const item = String(data?.item ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
      let count = Math.floor(Number(data?.count));
      const inv = this.inventories.get(client.sessionId);
      if (!inv || !item || !Number.isFinite(count) || count < 1) return;
      const have = inv[item] ?? 0;
      if (have <= 0) return;
      invSub(inv, item, Math.min(count, have));
      client.send("inventory", inv);
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
    let toolset: string[] = [];
    try {
      toolset = JSON.parse(record.tools || "[]");
    } catch {}
    this.tools.set(client.sessionId, new Set(toolset));
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
          data: {
            x: player.x,
            y: player.y,
            inventory: JSON.stringify(inv),
            tools: JSON.stringify([
              ...(this.tools.get(client.sessionId) ?? []),
            ]),
          },
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
    this.tools.delete(client.sessionId);
    this.inventories.delete(client.sessionId);
  }
}

function tileAt(state: WorldState, x: number, y: number): number {
  const c = Math.floor(x / TILE);
  const r = Math.floor(y / TILE);
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 1; // treat out-of-bounds as solid
  return state.tiles[r * COLS + c];
}

const SOLID = new Set([1, 3, 4, 5]); // water, tree, rock, ore

// each harvestable tile: what it drops, the capability it needs (null = hands), respawn ms
const RESOURCES: Record<
  number,
  { drop: string; requires: string | null; respawn: number }
> = {
  3: { drop: "wood", requires: "chop", respawn: 10000 },
  4: { drop: "stone", requires: "mine", respawn: 20000 },
  5: { drop: "ore", requires: "mine2", respawn: 30000 },
  6: { drop: "stick", requires: null, respawn: 15000 },
  7: { drop: "flint", requires: null, respawn: 20000 },
};

// tools are permanent unlocks; each grants capabilities
const TOOL_CAPS: Record<string, string[]> = {
  flint_hatchet: ["chop"],
  flint_pickaxe: ["mine"],
  stone_hatchet: ["chop"],
  stone_pickaxe: ["mine", "mine2"],
};

const REQ_LABEL: Record<string, string> = {
  chop: "a hatchet",
  mine: "a pickaxe",
  mine2: "a stone pickaxe",
};

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
