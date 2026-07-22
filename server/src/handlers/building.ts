import type { WorldRoom } from "@/rooms/WorldRoom.js";
import { Placed } from "@/rooms/schema/WorldState.js";
import { PLACEABLES, PLACE_RANGE } from "@/game/building.js";
import { COLS, ROWS, TILE } from "@/game/constants.js";
import { SOLID } from "@/game/resources.js";
import { invHas, invSub } from "@/game/inventory.js";

export function registerBuilding(room: WorldRoom) {
  room.onMessage("place", (client, data: any) => {
    const kind = String(data?.kind ?? "");
    const index = Math.floor(Number(data?.index));
    const def = PLACEABLES[kind];
    if (!def || !Number.isInteger(index) || index < 0 || index >= COLS * ROWS)
      return;

    const player = room.state.players.get(client.sessionId);
    if (!player) return;

    const c = index % COLS,
      r = Math.floor(index / COLS);
    const pc = Math.floor(player.x / TILE),
      pr = Math.floor(player.y / TILE);
    if (Math.abs(c - pc) > PLACE_RANGE || Math.abs(r - pr) > PLACE_RANGE)
      return;

    if (SOLID.has(room.state.tiles[index])) return; // not on water/tree/rock/ore
    if (room.state.placed.has(String(index))) return; // not on an existing block
    if (pc === c && pr === r) {
      client.send("notice", "Can't build on yourself.");
      return;
    }

    const inv = room.inventories.get(client.sessionId) ?? {};
    if (!invHas(inv, def.item, 1)) {
      client.send("notice", `You need a ${def.item}.`);
      return;
    }

    invSub(inv, def.item, 1);
    room.inventories.set(client.sessionId, inv);
    client.send("inventory", inv);

    const placed = new Placed();
    placed.index = index;
    placed.kind = kind;
    placed.owner = player.name;
    room.state.placed.set(String(index), placed);
    room.persist(client.sessionId);
  });

  room.onMessage("break", (client, data: any) => {
    const index = Math.floor(Number(data?.index));
    const placed = room.state.placed.get(String(index));
    if (!placed) return;
    const player = room.state.players.get(client.sessionId);
    if (!player) return;
    if (placed.owner !== player.name) {
      client.send("notice", "That's not yours to break.");
      return;
    }

    const def = PLACEABLES[placed.kind];
    room.state.placed.delete(String(index));
    if (def) {
      const inv = room.inventories.get(client.sessionId) ?? {};
      inv[def.item] = (inv[def.item] ?? 0) + 1;
      room.inventories.set(client.sessionId, inv);
      client.send("inventory", inv);
      room.persist(client.sessionId);
    }
  });
}