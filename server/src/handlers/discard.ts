import type { WorldRoom } from "@/rooms/WorldRoom.js";
import { invSub } from "@/game/inventory.js";

export function registerDiscard(room: WorldRoom) {
  // discard items
  room.onMessage("discard", (client, data) => {
    const item = String(data?.item ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    let count = Math.floor(Number(data?.count));
    const inv = room.inventories.get(client.sessionId);
    if (!inv || !item || !Number.isFinite(count) || count < 1) return;
    const have = inv[item] ?? 0;
    if (have <= 0) return;
    invSub(inv, item, Math.min(count, have));
    client.send("inventory", inv);
  });
}
