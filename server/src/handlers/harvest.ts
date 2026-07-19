import type { WorldRoom } from "@/rooms/WorldRoom.js";
import { TILE, COLS, ROWS } from "@/game/constants.js";
import { RESOURCES, REQ_LABEL } from "@/game/resources.js";

export function registerHarvest(room: WorldRoom) {
  // harvesting materials
  room.onMessage("harvest", (client) => {
    const player = room.state.players.get(client.sessionId);
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
        if (!RESOURCES[room.state.tiles[i]]) continue;
        const cx = c * TILE + TILE / 2,
          cy = r * TILE + TILE / 2;
        const d = (cx - player.x) ** 2 + (cy - player.y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          best = i;
          bestType = room.state.tiles[i];
        }
      }
    if (best < 0) return; // nothing in range

    const res = RESOURCES[bestType];
    if (
      res.requires &&
      !room.playerCaps(client.sessionId).has(res.requires)
    ) {
      client.send(
        "notice",
        `You need ${REQ_LABEL[res.requires]} to harvest ${res.drop}.`,
      );
      return;
    }

    // deplete, grant drop, respawn to the original resource type
    room.state.tiles[best] = 0;
    room.broadcast("tileUpdate", { index: best, type: 0 });

    const inv = room.inventories.get(client.sessionId) ?? {};
    inv[res.drop] = (inv[res.drop] ?? 0) + 1;
    room.inventories.set(client.sessionId, inv);
    client.send("inventory", inv);

    room.clock.setTimeout(() => {
      room.state.tiles[best] = bestType;
      room.broadcast("tileUpdate", { index: best, type: bestType });
    }, res.respawn);
  });
}
