import type { WorldRoom } from "@/rooms/WorldRoom.js";
import { TILE, COLS } from "@/game/constants.js";
import { invAdd, invSub } from "@/game/inventory.js";

const REACH = 2; // tiles

function near(room: WorldRoom, sessionId: string, index: number): boolean {
  const player = room.state.players.get(sessionId);
  if (!player) return false;
  const c = index % COLS,
    r = Math.floor(index / COLS);
  const pc = Math.floor(player.x / TILE),
    pr = Math.floor(player.y / TILE);
  return Math.abs(c - pc) <= REACH && Math.abs(r - pr) <= REACH;
}

function ownsChest(room: WorldRoom, sessionId: string, index: number): boolean {
  const placed = room.state.placed.get(String(index));
  const player = room.state.players.get(sessionId);
  return (
    !!placed &&
    placed.kind === "chest" &&
    !!player &&
    placed.owner === player.name
  );
}

export function registerChest(room: WorldRoom) {
  room.onMessage("openChest", (client, data: any) => {
    const index = Math.floor(Number(data?.index));
    if (
      !ownsChest(room, client.sessionId, index) ||
      !near(room, client.sessionId, index)
    )
      return;
    client.send("chestData", { index, items: room.chests.get(index) ?? {} });
  });

  room.onMessage("chestMove", (client, data: any) => {
    const index = Math.floor(Number(data?.index));
    const item = String(data?.item ?? "").toLowerCase();
    let count = Math.floor(Number(data?.count));
    const dir = data?.dir;
    if (!item || !Number.isFinite(count) || count < 1) return;
    if (!ownsChest(room, client.sessionId, index)) return;
    if (!near(room, client.sessionId, index)) {
      client.send("notice", "Too far from chest.");
      return;
    }

    const inv = room.inventories.get(client.sessionId) ?? {};
    const chest = room.chests.get(index) ?? {};

    if (dir === "deposit") {
      count = Math.min(count, inv[item] ?? 0);
      if (count < 1) return;
      invSub(inv, item, count);
      chest[item] = (chest[item] ?? 0) + count;
    } else {
      count = Math.min(count, chest[item] ?? 0);
      if (count < 1) return;
      chest[item] -= count;
      if (chest[item] <= 0) delete chest[item];
      invAdd(inv, item, count);
    }

    room.inventories.set(client.sessionId, inv);
    room.chests.set(index, chest);
    client.send("inventory", inv);
    client.send("chestData", { index, items: chest });
    room.persist(client.sessionId);
    room.markWorldDirty();
  });
}