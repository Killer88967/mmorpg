import { Room, Client } from "colyseus";
import { randomBytes } from "node:crypto";
import { WorldState, Player, Placed } from "@/rooms/schema/WorldState.js";
import { prisma } from "@/db.js";
import { TILE, SPEED, WORLD } from "@/game/constants.js";
import { SOLID, TOOL_CAPS } from "@/game/resources.js";
import { generateMap, tileAt, clamp, randomColor } from "@/game/map.js";
import { registerHarvest } from "@/handlers/harvest.js";
import { registerTrade } from "@/handlers/trade.js";
import { registerDiscard } from "@/handlers/discard.js";
import { registerCraft } from "@/handlers/craft.js";
import { registerMobs } from "@/game/mobs.js";
import { registerCombat } from "@/handlers/combat.js";
import { registerBuilding } from "@/handlers/building.js";
import { registerChest } from "@/handlers/chest.js";
import { isBlocked } from "@/game/building.js";

type Input = { up: boolean; down: boolean; left: boolean; right: boolean };
const MAX_PLAYERS = 32;

export class WorldRoom extends Room {
  state = new WorldState();
  maxClients = 40;

  private characterIds = new Map<string, string>();
  private inputs = new Map<string, Input>();
  private lastDamaged = new Map<string, number>();
  private _worldDirty = false;
  private spectators = new Set<string>();
  private spectatorNames = new Map<string, string>();
  inventories = new Map<string, Record<string, number>>();
  chests = new Map<number, Record<string, number>>();
  tools = new Map<string, Set<string>>();
  offers = new Map<string, any>();
  offerSeq = 0;

  private async saveAll() {
    for (const [id, player] of this.state.players) {
      const characterId = this.characterIds.get(id);
      if (!characterId) continue;

      const inv = this.inventories.get(id) ?? {};

      try {
        await prisma.character.update({
          where: {
            characterId,
          },
          data: {
            x: player.x,
            y: player.y,
            inventory: JSON.stringify(inv),
            tools: JSON.stringify([...(this.tools.get(id) ?? [])]),
          },
        });
      } catch (error) {
        console.error(`Failed to save character "${player.name}":`, error);
      }
    }
  }

  async saveOne(sessionId: string, inv: Record<string, number>) {
    const characterId = this.characterIds.get(sessionId);
    if (!characterId) return;

    try {
      await prisma.character.update({
        where: {
          characterId,
        },
        data: {
          inventory: JSON.stringify(inv),
        },
      });
    } catch (error) {
      console.error(
        `Failed to save inventory for character "${characterId}":`,
        error,
      );
    }
  }

  async loadWorld(): Promise<void> {
    let row;
    try {
      row = await prisma.worldData.findUnique({
        where: { id: 1 },
      });
    } catch (error) {
      console.error("Failed to load world data:", error);
      return;
    }
    if (!row) return;
    let arr: any[] = [];
    try {
      arr = JSON.parse(row.placed || "[]");
    } catch (error) {
      console.error("Failed to parse placed world data:", error);
    }
    for (const o of arr) {
      if (typeof o?.index !== "number") continue;
      const p = new Placed();
      p.index = o.index;
      p.kind = o.kind ?? "wall";
      p.owner = o.owner ?? "";
      this.state.placed.set(String(o.index), p);
    }
    try {
      const chestObj = JSON.parse(row.chests || "{}");
      for (const [k, v] of Object.entries(chestObj)) {
        this.chests.set(Number(k), v as Record<string, number>);
      }
    } catch (error) {
      console.error("Failed to parse chest world data:", error);
    }
  }

  async saveWorld(): Promise<void> {
    const arr: any[] = [];
    this.state.placed.forEach((p) =>
      arr.push({ index: p.index, kind: p.kind, owner: p.owner }),
    );
    const chestObj: any = {};
    this.chests.forEach((items, index) => (chestObj[index] = items));
    const placed = JSON.stringify(arr);
    const chests = JSON.stringify(chestObj);
    try {
      await prisma.worldData.upsert({
        where: { id: 1 },
        update: { placed, chests },
        create: { id: 1, placed, chests },
      });
    } catch (error) {
      console.error("Failed to save world data:", error);
    }
  }

  // coalesce bursts of building into one write every couple seconds
  markWorldDirty(): void {
    if (this._worldDirty) return;
    this._worldDirty = true;
    this.clock.setTimeout(() => {
      this._worldDirty = false;
      this.saveWorld();
    }, 2000);
  }

  damagePlayer(sessionId: string, amount: number) {
    const player = this.state.players.get(sessionId);
    if (!player || player.hp <= 0) return;
    player.hp = Math.max(0, player.hp - amount);
    this.lastDamaged.set(sessionId, Date.now());
    const client = this.clients.find((c) => c.sessionId === sessionId);
    client?.send("playerHit", { amount, hp: player.hp });
    if (player.hp <= 0) this.killPlayer(sessionId);
  }

  killPlayer(sessionId: string) {
    const player = this.state.players.get(sessionId);
    if (!player) return;
    const spawn = this.randomSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
    player.hp = player.maxHp;
    this.lastDamaged.delete(sessionId);
    const client = this.clients.find((c) => c.sessionId === sessionId);
    client?.send("died", {});
  }

  private regen() {
    const now = Date.now();
    this.state.players.forEach((player, id) => {
      if (player.hp <= 0 || player.hp >= player.maxHp) return;
      if (now - (this.lastDamaged.get(id) ?? 0) < 5000) return;
      player.hp = Math.min(player.maxHp, player.hp + 5);
    });
  }

  async persist(sessionId: string) {
    const player = this.state.players.get(sessionId);
    const characterId = this.characterIds.get(sessionId);

    if (!player || !characterId) return;

    try {
      await prisma.character.update({
        where: {
          characterId,
        },
        data: {
          inventory: JSON.stringify(this.inventories.get(sessionId) ?? {}),
          tools: JSON.stringify([...(this.tools.get(sessionId) ?? [])]),
        },
      });
    } catch (error) {
      console.error(`Failed to persist character "${player.name}":`, error);
    }
  }

  playerCaps(sessionId: string): Set<string> {
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

  async onCreate() {
    generateMap(this.state);
    await this.loadWorld();

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
      const spectatorName = this.spectatorNames.get(client.sessionId);
      const clean = String(text).slice(0, 200).trim();
      if (!clean) return;

      // TEMP dev command to test tool-gating before crafting exists — remove later
      if (
        player &&
        process.env.NODE_ENV !== "production" &&
        clean.startsWith("/tool ")
      ) {
        const t = clean.slice(6).trim();
        if (!TOOL_CAPS[t]) {
          client.send("notice", `Unknown tool: ${t}`);
          return;
        }
        const set = this.tools.get(client.sessionId) ?? new Set<string>();
        set.add(t);
        this.tools.set(client.sessionId, set);
        client.send("notice", `Granted ${t} (dev).`);
        client.send("toolsUpdate", [...set]);
        return;
      }

      this.broadcast("chat", {
        name: player?.name ?? spectatorName ?? "Anon",
        text: clean,
      });
    });

    // send a player their inventory once they're ready to receive it
    this.onMessage("ready", (client) => {
      const characterId = this.characterIds.get(client.sessionId);
      const player = this.state.players.get(client.sessionId);

      if (characterId && player) {
        client.send("identity", {
          characterId,
          name: player.name,
        });
      }

      client.send("inventory", this.inventories.get(client.sessionId) ?? {});
      client.send("toolsUpdate", [...(this.tools.get(client.sessionId) ?? [])]);
    });

    registerMobs(this);
    registerCombat(this);
    registerHarvest(this);
    registerTrade(this);
    registerDiscard(this);
    registerCraft(this);
    registerBuilding(this);
    registerChest(this);

    // fixed simulation tick — 30fps
    this.setSimulationInterval((dt) => this.update(dt), 1000 / 30);
    this.clock.setInterval(() => this.saveAll(), 15000);
    this.clock.setInterval(() => this.regen(), 1000);
  }

  async onDispose(): Promise<void> {
    await this.saveWorld();
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
      if (!isBlocked(this.state, nextX, player.y)) player.x = nextX;
      if (!isBlocked(this.state, player.x, nextY)) player.y = nextY;
    });
  }

  async onJoin(
    client: Client,
    options: {
      name?: string;
      characterId?: string;
      spectator?: boolean;
    },
  ) {
    const requestedName =
      (options?.name || "Anon").trim().slice(0, 16) || "Anon";

    if (options?.spectator) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Spectator mode is disabled in production.");
      }

      this.spectators.add(client.sessionId);
      this.spectatorNames.set(client.sessionId, requestedName);

      client.send("spectatorReady", {
        name: requestedName,
      });

      return;
    }

    if (this.state.players.size >= MAX_PLAYERS) {
      throw new Error("World is full.");
    }

    const suppliedCharacterId =
      typeof options?.characterId === "string"
        ? options.characterId.trim()
        : "";

    let record = suppliedCharacterId
      ? await prisma.character.findUnique({
          where: {
            characterId: suppliedCharacterId,
          },
        })
      : null;

    // Temporary migration bridge for characters created before characterId existed.
    if (!record && !suppliedCharacterId) {
      const legacyRecord = await prisma.character.findFirst({
        where: {
          name: requestedName,
          characterId: null,
        },
      });

      if (legacyRecord) {
        record = await prisma.character.update({
          where: {
            id: legacyRecord.id,
          },
          data: {
            characterId: randomBytes(32).toString("hex"),
          },
        });
      }
    }

    if (!record) {
      const characterId = randomBytes(32).toString("hex");
      const spawn = this.randomSpawn();

      record = await prisma.character.create({
        data: {
          characterId,
          name: requestedName,
          x: spawn.x,
          y: spawn.y,
          color: randomColor(),
        },
      });
    }

    this.characterIds.set(client.sessionId, record.characterId);

    const player = new Player();
    player.x = record.x;
    player.y = record.y;
    player.color = record.color;
    player.name = record.name;
    this.state.players.set(client.sessionId, player);
    let inv: Record<string, number> = {};
    try {
      inv = JSON.parse(record.inventory || "{}");
    } catch (error) {
      console.error(`Failed to parse inventory for "${record.name}":`, error);
    }
    let toolset: string[] = [];
    try {
      toolset = JSON.parse(record.tools || "[]");
    } catch (error) {
      console.error(`Failed to parse tools for "${record.name}":`, error);
    }
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
    if (this.spectators.has(client.sessionId)) {
      this.spectators.delete(client.sessionId);
      this.spectatorNames.delete(client.sessionId);
      return;
    }
    const player = this.state.players.get(client.sessionId);
    const characterId = this.characterIds.get(client.sessionId);
    if (player && characterId) {
      const inv = this.inventories.get(client.sessionId) ?? {};
      try {
        await prisma.character.update({
          where: {
            characterId,
          },
          data: {
            x: player.x,
            y: player.y,
            inventory: JSON.stringify(inv),
            tools: JSON.stringify([
              ...(this.tools.get(client.sessionId) ?? []),
            ]),
          },
        });
      } catch (error) {
        console.error(
          `Failed to save character "${player.name}" on disconnect:`,
          error,
        );
      }
    }
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    for (const [id, offer] of this.offers) {
      if (offer.fromId === client.sessionId) {
        this.offers.delete(id);
        this.broadcast("offerClosed", { id, status: "cancelled" });
      }
    }
    this.lastDamaged.delete(client.sessionId);
    this.tools.delete(client.sessionId);
    this.inventories.delete(client.sessionId);
    this.characterIds.delete(client.sessionId);
  }
}
